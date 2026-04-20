<?php
declare(strict_types=1);

require_once __DIR__ . '/../_auth.php';

try {
	$currentUser = dashboard_require_authenticated_user();
	$payload = dashboard_get_json_body();
	$currentPassword = (string) ($payload['currentPassword'] ?? '');
	$newPassword = (string) ($payload['newPassword'] ?? '');

	if ($currentPassword === '') {
		dashboard_json_response(['ok' => false, 'message' => 'Wpisz aktualne haslo.'], 422);
	}

	if (mb_strlen($newPassword) < DASHBOARD_MIN_PASSWORD_LENGTH) {
		dashboard_json_response(['ok' => false, 'message' => sprintf('Nowe haslo musi miec co najmniej %d znakow.', DASHBOARD_MIN_PASSWORD_LENGTH)], 422);
	}

	if (!password_verify($currentPassword, (string) ($currentUser['passwordHash'] ?? ''))) {
		dashboard_json_response(['ok' => false, 'message' => 'Aktualne haslo jest nieprawidlowe.'], 401);
	}

	$updatedUser = null;
	dashboard_update_json_file(dashboard_users_path(), [], function ($users) use (&$updatedUser, $currentUser, $newPassword) {
		$users = dashboard_normalize_users_array($users);

		foreach ($users as $index => $user) {
			if ((string) ($user['id'] ?? '') !== (string) ($currentUser['id'] ?? '')) {
				continue;
			}

			$updatedUser = [
				...$user,
				'passwordHash' => password_hash($newPassword, PASSWORD_DEFAULT),
				'updatedAt' => gmdate('c'),
			];
			$users[$index] = $updatedUser;
			break;
		}

		return $users;
	});

	if (!$updatedUser) {
		throw new RuntimeException('Nie znaleziono konta do zmiany hasla.');
	}

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
		'message' => 'Nie udalo sie zmienic hasla.',
	], 500);
}
