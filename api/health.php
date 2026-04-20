<?php
declare(strict_types=1);

require_once __DIR__ . '/_response.php';
require_once __DIR__ . '/_store.php';

try {
	$backend = dashboard_storage_backend_status();

	dashboard_json_response([
		'ok' => true,
		'mode' => $backend['mode'],
		'database' => $backend['database'],
		'table' => $backend['table'],
		'version' => 2,
	]);
} catch (Throwable $error) {
	dashboard_json_response([
		'ok' => false,
		'message' => 'Nie udalo sie polaczyc z baza danych dashboardu.',
		'version' => 2,
	], 500);
}
