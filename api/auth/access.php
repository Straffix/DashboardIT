<?php
declare(strict_types=1);

require_once __DIR__ . '/../_auth.php';

try {
	$currentAdmin = dashboard_require_admin_user();
	$payload = dashboard_get_json_body();
	$userId = trim((string) ($payload['userId'] ?? ''));
	$role = dashboard_normalize_role((string) ($payload['role'] ?? 'user'));
	$permissions = $role === 'admin'
		? dashboard_get_all_permission_ids()
		: dashboard_normalize_permissions($payload['permissions'] ?? []);

	if ($userId === '') {
		dashboard_json_response(['ok' => false, 'message' => 'Brak wskazanego uzytkownika.'], 422);
	}

	if ($userId === (string) ($currentAdmin['id'] ?? '')) {
		dashboard_json_response(['ok' => false, 'message' => 'Nie zmienisz tutaj wlasnych uprawnien lidera.'], 422);
	}

	$updatedUser = null;
	dashboard_update_json_file(dashboard_users_path(), [], function ($users) use (&$updatedUser, $userId, $role, $permissions) {
		$users = dashboard_normalize_users_array($users);

		foreach ($users as $index => $user) {
			if ((string) ($user['id'] ?? '') !== $userId) {
				continue;
			}

			$updatedUser = [
				...$user,
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

	dashboard_json_response([
		'ok' => true,
		'user' => dashboard_sanitize_user($updatedUser),
	]);
} catch (Throwable $error) {
	dashboard_json_response([
		'ok' => false,
		'message' => 'Nie udalo sie zapisac uprawnien uzytkownika.',
	], 500);
}
