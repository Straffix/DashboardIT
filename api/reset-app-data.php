<?php
declare(strict_types=1);

require_once __DIR__ . '/_response.php';
require_once __DIR__ . '/_store.php';

function dashboard_reset_history_table(): string
{
	return 'dashboard_reset_history';
}

function dashboard_reset_target_tables(): array
{
	return [
		'dashboard_user_permissions',
		'dashboard_bookmarks',
		'dashboard_active_users',
		'dashboard_lunch_reservations',
		'dashboard_notes',
		'dashboard_notes_active_viewers',
		'dashboard_announcements',
		'dashboard_tasks',
		'dashboard_monitor_devices',
		'dashboard_hires',
		'dashboard_exchanges',
		'dashboard_users',
	];
}

function dashboard_one_time_reset_config(): array
{
	$config = dashboard_database_config();
	$resetConfig = $config['one_time_reset'] ?? [];

	return [
		'enabled' => (bool) ($resetConfig['enabled'] ?? false),
		'version' => trim((string) ($resetConfig['version'] ?? '')),
	];
}

try {
	$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
	if ($method !== 'POST') {
		dashboard_json_response([
			'ok' => false,
			'message' => 'Niedozwolona metoda HTTP.',
		], 405);
	}

	$resetConfig = dashboard_one_time_reset_config();
	if (!$resetConfig['enabled'] || $resetConfig['version'] === '') {
		dashboard_json_response([
			'ok' => false,
			'message' => 'Jednorazowy reset danych jest wylaczony.',
		], 403);
	}

	$payload = dashboard_get_json_body();
	$requestedVersion = trim((string) ($payload['version'] ?? ''));
	if ($requestedVersion === '' || $requestedVersion !== $resetConfig['version']) {
		dashboard_json_response([
			'ok' => false,
			'message' => 'Nieprawidlowy identyfikator resetu danych.',
		], 403);
	}

	$pdo = dashboard_database();
	dashboard_ensure_relational_schema($pdo);

	$historyTable = dashboard_database_identifier(dashboard_reset_history_table());
	$pdo->beginTransaction();
	$pdo->exec(
		"CREATE TABLE IF NOT EXISTS {$historyTable} (
			reset_key varchar(191) PRIMARY KEY,
			executed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
		)"
	);

	$lookupStatement = $pdo->prepare("SELECT executed_at FROM {$historyTable} WHERE reset_key = :reset_key LIMIT 1");
	$lookupStatement->execute([
		'reset_key' => $resetConfig['version'],
	]);
	$existingReset = $lookupStatement->fetch();

	if ($existingReset) {
		$pdo->commit();
		dashboard_json_response([
			'ok' => true,
			'alreadyApplied' => true,
			'version' => $resetConfig['version'],
			'executedAt' => (string) ($existingReset['executed_at'] ?? ''),
		]);
	}

	$tableList = implode(', ', array_map('dashboard_database_identifier', dashboard_reset_target_tables()));
	$pdo->exec("TRUNCATE TABLE {$tableList} RESTART IDENTITY CASCADE");

	$insertStatement = $pdo->prepare("INSERT INTO {$historyTable} (reset_key) VALUES (:reset_key)");
	$insertStatement->execute([
		'reset_key' => $resetConfig['version'],
	]);

	$lookupStatement->execute([
		'reset_key' => $resetConfig['version'],
	]);
	$appliedReset = $lookupStatement->fetch();

	$pdo->commit();

	dashboard_json_response([
		'ok' => true,
		'alreadyApplied' => false,
		'version' => $resetConfig['version'],
		'executedAt' => (string) ($appliedReset['executed_at'] ?? ''),
	]);
} catch (Throwable $error) {
	if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
		$pdo->rollBack();
	}

	dashboard_json_response([
		'ok' => false,
		'message' => 'Nie udalo sie wyczyscic danych aplikacji.',
	], 500);
}
