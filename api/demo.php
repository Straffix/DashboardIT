<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';

function dashboard_find_demo_session_user_id(array $sessionPayload, array $users): ?string
{
	$userId = trim((string) ($sessionPayload['userId'] ?? ''));
	if ($userId === '') {
		return null;
	}

	foreach ($users as $user) {
		if (!is_array($user)) {
			continue;
		}

		if ((string) ($user['id'] ?? '') === $userId && !empty($user['isDemo'])) {
			return $userId;
		}
	}

	return null;
}

function dashboard_mark_demo_records(array $records): array
{
	$markedRecords = [];

	foreach ($records as $record) {
		if (!is_array($record)) {
			continue;
		}

		$markedRecords[] = [
			...$record,
			'isDemo' => true,
		];
	}

	return $markedRecords;
}

function dashboard_convert_demo_users(array $users): array
{
	$convertedUsers = [];

	foreach ($users as $user) {
		if (!is_array($user)) {
			continue;
		}

		$encodedPassword = (string) ($user['passwordHash'] ?? '');
		$decodedPassword = base64_decode($encodedPassword, true);
		$plainPassword = $decodedPassword !== false && $decodedPassword !== '' ? $decodedPassword : 'demo123';
		$role = dashboard_normalize_role((string) ($user['role'] ?? 'user'));

		$convertedUsers[] = [
			'id' => (string) ($user['id'] ?? sprintf('demo-%s', bin2hex(random_bytes(4)))),
			'fullName' => trim((string) ($user['fullName'] ?? 'Demo User')),
			'login' => dashboard_normalize_login((string) ($user['login'] ?? 'demo.user')),
			'passwordHash' => password_hash($plainPassword, PASSWORD_DEFAULT),
			'role' => $role,
			'permissions' => $role === 'admin'
				? dashboard_get_all_permission_ids()
				: dashboard_normalize_permissions($user['permissions'] ?? []),
			'avatarId' => trim((string) ($user['avatarId'] ?? 'violet')) ?: 'violet',
			'avatarImage' => dashboard_normalize_avatar_image((string) ($user['avatarImage'] ?? '')),
			'createdAt' => (string) ($user['createdAt'] ?? gmdate('c')),
			'updatedAt' => (string) ($user['updatedAt'] ?? gmdate('c')),
			'isDemo' => true,
		];
	}

	return $convertedUsers;
}

function dashboard_merge_demo_records(string $path, array $incomingRecords, bool $usersMode = false): void
{
	dashboard_update_json_file($path, [], function ($existingRecords) use ($incomingRecords, $usersMode) {
		$existingRecords = is_array($existingRecords) ? array_values(array_filter($existingRecords, static fn ($record): bool => is_array($record))) : [];
		$cleanRecords = array_values(array_filter($existingRecords, static fn ($record): bool => empty($record['isDemo'])));
		$demoRecords = $usersMode ? dashboard_convert_demo_users($incomingRecords) : dashboard_mark_demo_records($incomingRecords);

		return [...$cleanRecords, ...$demoRecords];
	});
}

function dashboard_clear_demo_records(string $path): void
{
	dashboard_update_json_file($path, [], function ($existingRecords) {
		$existingRecords = is_array($existingRecords) ? array_values(array_filter($existingRecords, static fn ($record): bool => is_array($record))) : [];
		return array_values(array_filter($existingRecords, static fn ($record): bool => empty($record['isDemo'])));
	});
}

function dashboard_set_demo_marker(bool $isSeeded): void
{
	$markerPath = dashboard_demo_marker_path();

	if (!$isSeeded) {
		dashboard_delete_json_file($markerPath);
		return;
	}

	dashboard_write_json_file($markerPath, [
		'seededAt' => gmdate('c'),
	]);
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
	dashboard_json_response([
		'ok' => true,
		'seeded' => dashboard_json_file_exists(dashboard_demo_marker_path()),
	]);
}

if ($method === 'POST') {
	try {
		$payload = dashboard_get_json_body();
		$currentSession = dashboard_get_session_payload();

		dashboard_merge_demo_records(dashboard_users_path(), is_array($payload['users'] ?? null) ? $payload['users'] : [], true);
		dashboard_merge_demo_records(dashboard_storage_file_for_key('nowe_zatrudnienia_dane'), is_array($payload['hires'] ?? null) ? $payload['hires'] : []);
		dashboard_merge_demo_records(dashboard_storage_file_for_key('monitor_laptopow_dane'), is_array($payload['monitor'] ?? null) ? $payload['monitor'] : []);
		dashboard_merge_demo_records(dashboard_storage_file_for_key('wymiana_sprzetu_dane'), is_array($payload['exchanges'] ?? null) ? $payload['exchanges'] : []);
		dashboard_merge_demo_records(dashboard_storage_file_for_key('dashboard_user_bookmarks'), is_array($payload['bookmarks'] ?? null) ? $payload['bookmarks'] : []);
		dashboard_merge_demo_records(dashboard_storage_file_for_key('dashboard_lunch_reservations'), is_array($payload['lunchReservations'] ?? null) ? $payload['lunchReservations'] : []);
		dashboard_merge_demo_records(dashboard_storage_file_for_key('dashboard_notes_entries'), is_array($payload['notes'] ?? null) ? $payload['notes'] : []);
		dashboard_merge_demo_records(dashboard_storage_file_for_key('dashboard_notes_announcements'), is_array($payload['announcements'] ?? null) ? $payload['announcements'] : []);
		dashboard_merge_demo_records(dashboard_storage_file_for_key('dashboard_notes_tasks'), is_array($payload['noteTasks'] ?? null) ? $payload['noteTasks'] : []);

		$sessionPayload = is_array($payload['session'] ?? null) ? $payload['session'] : [];
		$seededUsers = dashboard_load_users();
		$shouldReplaceSession = $currentSession === null || dashboard_find_demo_session_user_id($currentSession, $seededUsers) !== null;
		$demoSessionUserId = dashboard_find_demo_session_user_id($sessionPayload, $seededUsers);

		if ($shouldReplaceSession && $demoSessionUserId !== null) {
			dashboard_set_session($demoSessionUserId);
		}

		dashboard_set_demo_marker(true);

		dashboard_json_response([
			'ok' => true,
			'seeded' => true,
			'sessionAssigned' => $shouldReplaceSession && $demoSessionUserId !== null,
		]);
	} catch (Throwable $error) {
		dashboard_json_response([
			'ok' => false,
			'message' => 'Nie udalo sie zapisac danych demo na serwerze.',
		], 500);
	}
}

if ($method === 'DELETE') {
	try {
		$currentSession = dashboard_get_session_payload();

		dashboard_clear_demo_records(dashboard_users_path());
		dashboard_clear_demo_records(dashboard_storage_file_for_key('nowe_zatrudnienia_dane'));
		dashboard_clear_demo_records(dashboard_storage_file_for_key('monitor_laptopow_dane'));
		dashboard_clear_demo_records(dashboard_storage_file_for_key('wymiana_sprzetu_dane'));
		dashboard_clear_demo_records(dashboard_storage_file_for_key('dashboard_user_bookmarks'));
		dashboard_clear_demo_records(dashboard_storage_file_for_key('dashboard_lunch_reservations'));
		dashboard_clear_demo_records(dashboard_storage_file_for_key('dashboard_notes_entries'));
		dashboard_clear_demo_records(dashboard_storage_file_for_key('dashboard_notes_announcements'));
		dashboard_clear_demo_records(dashboard_storage_file_for_key('dashboard_notes_tasks'));
		dashboard_set_demo_marker(false);

		if ($currentSession) {
			$currentUser = dashboard_get_current_user();
			if ($currentUser === null) {
				dashboard_clear_session();
			}
		}

		dashboard_json_response([
			'ok' => true,
			'seeded' => false,
		]);
	} catch (Throwable $error) {
		dashboard_json_response([
			'ok' => false,
			'message' => 'Nie udalo sie usunac danych demo z serwera.',
		], 500);
	}
}

dashboard_json_response([
	'ok' => false,
	'message' => 'Niedozwolona metoda HTTP.',
], 405);
