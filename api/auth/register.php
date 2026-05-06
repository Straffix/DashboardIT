<?php
declare(strict_types=1);

require_once __DIR__ . '/../_auth.php';

try {
	$payload = dashboard_get_json_body();
	$fullName = trim((string) ($payload['fullName'] ?? ''));
	$login = dashboard_normalize_login((string) ($payload['login'] ?? ''));
	$password = (string) ($payload['password'] ?? '');
	$avatarId = trim((string) ($payload['avatarId'] ?? 'violet')) ?: 'violet';
	$avatarImage = dashboard_normalize_avatar_image((string) ($payload['avatarImage'] ?? ''));
	$profileAccentColor = dashboard_normalize_profile_accent_color((string) ($payload['profileAccentColor'] ?? '#0f766e'));

	if ($fullName === '') {
		dashboard_json_response(['ok' => false, 'message' => 'Wpisz imie i nazwisko.'], 422);
	}

	if ($login === '') {
		dashboard_json_response(['ok' => false, 'message' => 'Wpisz poprawny login.'], 422);
	}

	if (mb_strlen($password) < DASHBOARD_MIN_PASSWORD_LENGTH) {
		dashboard_json_response(['ok' => false, 'message' => sprintf('Haslo musi miec co najmniej %d znakow.', DASHBOARD_MIN_PASSWORD_LENGTH)], 422);
	}

	$createdUser = null;
	$users = dashboard_update_json_file(dashboard_users_path(), [], function ($users) use (&$createdUser, $fullName, $login, $password, $avatarId, $avatarImage, $profileAccentColor) {
		$users = dashboard_normalize_users_array($users);

		if (dashboard_find_user_by_login($users, $login)) {
			throw new RuntimeException('Taki login juz istnieje.');
		}

		$now = gmdate('c');
		$createdUser = [
			'id' => sprintf('user-%s-%s', time(), bin2hex(random_bytes(4))),
			'fullName' => $fullName,
			'login' => $login,
			'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
			'role' => count($users) === 0 ? 'admin' : 'user',
			'permissions' => count($users) === 0 ? dashboard_get_all_permission_ids() : [],
			'avatarId' => $avatarId,
			'avatarImage' => $avatarImage,
			'profileTitle' => '',
			'profileBio' => '',
			'profileAccentColor' => $profileAccentColor,
			'profileCoverImage' => '',
			'createdAt' => $now,
			'updatedAt' => $now,
		];

		$users[] = $createdUser;
		return $users;
	});

	if (!$createdUser || !is_array($users)) {
		throw new RuntimeException('Nie udalo sie utworzyc konta.');
	}

	dashboard_export_users_config_snapshot($users);

	$session = dashboard_set_session((string) $createdUser['id']);

	dashboard_json_response([
		'ok' => true,
		'user' => dashboard_sanitize_user($createdUser),
		'session' => $session,
	], 201);
} catch (RuntimeException $error) {
	dashboard_json_response([
		'ok' => false,
		'message' => $error->getMessage(),
	], 409);
} catch (Throwable $error) {
	dashboard_json_response([
		'ok' => false,
		'message' => 'Nie udalo sie zalozyc konta na serwerze.',
	], 500);
}
