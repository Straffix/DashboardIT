<?php
declare(strict_types=1);

require_once __DIR__ . '/../_auth.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
	dashboard_json_response([
		'ok' => true,
		'session' => dashboard_get_session_payload(),
		'user' => ($currentUser = dashboard_get_current_user()) ? dashboard_sanitize_user($currentUser) : null,
	]);
}

if ($method === 'DELETE') {
	dashboard_clear_session();
	dashboard_json_response([
		'ok' => true,
	]);
}

dashboard_json_response([
	'ok' => false,
	'message' => 'Niedozwolona metoda HTTP.',
], 405);
