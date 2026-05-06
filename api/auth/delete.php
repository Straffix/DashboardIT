<?php
declare(strict_types=1);

require_once __DIR__ . '/../_auth.php';

try {
	$currentAdmin = dashboard_require_admin_user();
	$payload = dashboard_get_json_body();
	$userId = trim((string) ($payload['userId'] ?? ''));

	if ($userId === '') {
		dashboard_json_response(['ok' => false, 'message' => 'Brak wskazanego uzytkownika.'], 422);
	}

	if ($userId === (string) ($currentAdmin['id'] ?? '')) {
		dashboard_json_response(['ok' => false, 'message' => 'Nie usuniesz tutaj wlasnego konta lidera.'], 422);
	}

	$deletedUser = null;
	$updatedUsers = dashboard_update_json_file(dashboard_users_path(), [], function ($users) use (&$deletedUser, $userId) {
		$users = dashboard_normalize_users_array($users);
		$nextUsers = [];

		foreach ($users as $user) {
			if ((string) ($user['id'] ?? '') === $userId) {
				$deletedUser = $user;
				continue;
			}

			$nextUsers[] = $user;
		}

		return $nextUsers;
	});

	if (!$deletedUser) {
		dashboard_json_response(['ok' => false, 'message' => 'Nie znaleziono wskazanego uzytkownika.'], 404);
	}

	dashboard_export_users_config_snapshot($updatedUsers);

	dashboard_json_response([
		'ok' => true,
		'user' => dashboard_sanitize_user($deletedUser),
	]);
} catch (Throwable $error) {
	dashboard_json_response([
		'ok' => false,
		'message' => 'Nie udalo sie usunac konta uzytkownika.',
	], 500);
}
