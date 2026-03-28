<?php
declare(strict_types=1);

require_once __DIR__ . '/../_auth.php';

$payload = dashboard_get_json_body();
$login = dashboard_normalize_login((string) ($payload['login'] ?? ''));
$password = (string) ($payload['password'] ?? '');

if ($login === '' || $password === '') {
	dashboard_json_response([
		'ok' => false,
		'message' => 'Podaj login i haslo.',
	], 422);
}

$matchedUser = dashboard_find_user_by_login(dashboard_load_users(), $login);
if (!$matchedUser || !password_verify($password, (string) ($matchedUser['passwordHash'] ?? ''))) {
	dashboard_json_response([
		'ok' => false,
		'message' => 'Nieprawidlowy login lub haslo.',
	], 401);
}

$session = dashboard_set_session((string) $matchedUser['id']);

dashboard_json_response([
	'ok' => true,
	'user' => dashboard_sanitize_user($matchedUser),
	'session' => $session,
]);
