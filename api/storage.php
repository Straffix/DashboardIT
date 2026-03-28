<?php
declare(strict_types=1);

require_once __DIR__ . '/_response.php';
require_once __DIR__ . '/_store.php';

try {
	$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

	if ($method === 'GET') {
		$key = (string) ($_GET['key'] ?? '');
		$path = dashboard_storage_file_for_key($key);

		dashboard_json_response([
			'ok' => true,
			'value' => dashboard_read_json_file($path, []),
		]);
	}

	if ($method === 'POST') {
		$payload = dashboard_get_json_body();
		$key = (string) ($payload['key'] ?? '');
		$path = dashboard_storage_file_for_key($key);

		dashboard_write_json_file($path, $payload['value'] ?? []);

		dashboard_json_response([
			'ok' => true,
		]);
	}

	if ($method === 'DELETE') {
		$key = (string) ($_GET['key'] ?? '');
		$path = dashboard_storage_file_for_key($key);
		dashboard_write_json_file($path, []);

		dashboard_json_response([
			'ok' => true,
		]);
	}

	dashboard_json_response([
		'ok' => false,
		'message' => 'Niedozwolona metoda HTTP.',
	], 405);
} catch (InvalidArgumentException $error) {
	dashboard_json_response([
		'ok' => false,
		'message' => $error->getMessage(),
	], 400);
} catch (Throwable $error) {
	dashboard_json_response([
		'ok' => false,
		'message' => 'Wystapil blad podczas obslugi danych na serwerze.',
	], 500);
}
