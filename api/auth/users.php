<?php
declare(strict_types=1);

require_once __DIR__ . '/../_auth.php';

$users = array_map('dashboard_sanitize_user', dashboard_load_users());

dashboard_json_response([
	'ok' => true,
	'users' => $users,
]);
