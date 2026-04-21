<?php
declare(strict_types=1);

require_once __DIR__ . '/../_auth.php';

try {
	$currentAdmin = dashboard_require_admin_user();
	$payload = dashboard_get_json_body();
	$userId = trim((string) ($payload['userId'] ?? ''));
	$fullName = trim((string) ($payload['fullName'] ?? ''));
	$login = dashboard_normalize_login((string) ($payload['login'] ?? ''));
	$role = dashboard_normalize_role((string) ($payload['role'] ?? 'user'));
	$permissions = $role === 'admin'
		? dashboard_get_all_permission_ids()
		: dashboard_normalize_permissions($payload['permissions'] ?? []);

	if ($userId === '') {
		dashboard_json_response(['ok' => false, 'message' => 'Brak wskazanego uzytkownika.'], 422);
	}

	if ($fullName === '') {
		dashboard_json_response(['ok' => false, 'message' => 'Wpisz imie i nazwisko uzytkownika.'], 422);
	}

	if ($login === '') {
		dashboard_json_response(['ok' => false, 'message' => 'Wpisz poprawny login uzytkownika.'], 422);
	}

	if ($userId === (string) ($currentAdmin['id'] ?? '')) {
		dashboard_json_response(['ok' => false, 'message' => 'Nie zmienisz tutaj wlasnych uprawnien lidera.'], 422);
	}

	$updatedUser = null;
	$updatedUsers = dashboard_update_json_file(dashboard_users_path(), [], function ($users) use (&$updatedUser, $userId, $fullName, $login, $role, $permissions) {
		$users = dashboard_normalize_users_array($users);

		foreach ($users as $user) {
			if ((string) ($user['id'] ?? '') !== $userId && dashboard_normalize_login((string) ($user['login'] ?? '')) === $login) {
				throw new RuntimeException('Ten login jest juz zajety.');
			}
		}

		foreach ($users as $index => $user) {
			if ((string) ($user['id'] ?? '') !== $userId) {
				continue;
			}

			$updatedUser = [
				...$user,
				'fullName' => $fullName,
				'login' => $login,
				'role' => $role,
				'permissions' => $permissions,
				'updatedAt' => gmdate('c'),
			];
			$users[$index] = $updatedUser;
			break;
		}

		return $users;
	});

	if (!$updatedUser) {
		dashboard_json_response(['ok' => false, 'message' => 'Nie znaleziono wskazanego uzytkownika.'], 404);
	}

	dashboard_export_users_config_snapshot($updatedUsers);

	dashboard_json_response([
		'ok' => true,
		'user' => dashboard_sanitize_user($updatedUser),
	]);
} catch (RuntimeException $error) {
	dashboard_json_response([
		'ok' => false,
		'message' => $error->getMessage(),
	], 409);
} catch (Throwable $error) {
	dashboard_json_response([
		'ok' => false,
		'message' => 'Nie udalo sie zapisac uprawnien uzytkownika.',
	], 500);
}
