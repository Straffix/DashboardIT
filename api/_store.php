<?php
declare(strict_types=1);

const DASHBOARD_REMOTE_STORAGE_FILES = [
	'dashboard_user_bookmarks' => 'bookmarks',
	'dashboard_lunch_reservations' => 'lunch',
	'dashboard_notes_entries' => 'notes',
	'dashboard_notes_announcements' => 'announcements',
	'dashboard_notes_tasks' => 'tasks',
	'dashboard_testers_feedback' => 'testers-feedback',
	'monitor_laptopow_dane' => 'monitor',
	'nowe_zatrudnienia_dane' => 'hires',
	'wymiana_sprzetu_dane' => 'exchanges',
];

function dashboard_database_config_path(): string
{
	$environmentPath = trim((string) getenv('DASHBOARD_DATABASE_CONFIG'));
	if ($environmentPath !== '') {
		return $environmentPath;
	}

	$externalConfigPath = dirname(__DIR__, 2) . '/dashboardit-config/database.php';
	if (is_file($externalConfigPath)) {
		return $externalConfigPath;
	}

	return __DIR__ . '/config/database.php';
}

function dashboard_database_config(): array
{
	static $config = null;

	if (is_array($config)) {
		return $config;
	}

	$configPath = dashboard_database_config_path();
	if (!is_file($configPath)) {
		throw new RuntimeException('Brak konfiguracji bazy danych dashboardu.');
	}

	$config = require $configPath;
	if (!is_array($config)) {
		throw new RuntimeException('Nieprawidlowa konfiguracja bazy danych dashboardu.');
	}

	return $config;
}

function dashboard_database_table_name(): string
{
	$config = dashboard_database_config();
	$table = trim((string) ($config['table'] ?? 'dashboard_storage'));
	if (!preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
		throw new RuntimeException('Nieprawidlowa nazwa tabeli danych dashboardu.');
	}

	return $table;
}

function dashboard_database(): PDO
{
	static $pdo = null;

	if ($pdo instanceof PDO) {
		return $pdo;
	}

	$config = dashboard_database_config();
	$driver = strtolower(trim((string) ($config['driver'] ?? 'mysql')));
	if ($driver !== 'mysql') {
		throw new RuntimeException('Dashboard obsluguje teraz tylko baze MySQL.');
	}

	$host = trim((string) ($config['host'] ?? 'localhost')) ?: 'localhost';
	$port = (int) ($config['port'] ?? 3306);
	$database = trim((string) ($config['database'] ?? ''));
	$username = trim((string) ($config['username'] ?? ''));
	$password = (string) ($config['password'] ?? '');
	$charset = trim((string) ($config['charset'] ?? 'utf8mb4')) ?: 'utf8mb4';

	if ($database === '' || $username === '') {
		throw new RuntimeException('Uzupelnij nazwe bazy danych i uzytkownika bazy.');
	}

	$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $database, $charset);
	$options = [
		PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
		PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
		PDO::ATTR_EMULATE_PREPARES => false,
	];

	if (defined('PDO::MYSQL_ATTR_INIT_COMMAND')) {
		$options[PDO::MYSQL_ATTR_INIT_COMMAND] = sprintf("SET NAMES %s COLLATE %s_unicode_ci", $charset, $charset);
	}

	try {
		$pdo = new PDO($dsn, $username, $password, $options);
	} catch (PDOException $error) {
		throw new RuntimeException('Nie udalo sie polaczyc z baza danych dashboardu.');
	}

	dashboard_ensure_storage_table($pdo);
	return $pdo;
}

function dashboard_ensure_storage_table(?PDO $pdo = null): void
{
	static $ensured = false;

	if ($ensured) {
		return;
	}

	$pdo = $pdo ?: dashboard_database();
	$table = dashboard_database_table_name();
	$pdo->exec(
		"CREATE TABLE IF NOT EXISTS `{$table}` (
			`storage_key` varchar(191) NOT NULL,
			`storage_value` longtext NOT NULL,
			`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
			`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			PRIMARY KEY (`storage_key`)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
	);

	$ensured = true;
}

function dashboard_storage_backend_status(): array
{
	$config = dashboard_database_config();
	$pdo = dashboard_database();
	$statement = $pdo->query('SELECT 1 AS ok');
	$statement->fetch();

	return [
		'mode' => 'mysql',
		'host' => (string) ($config['host'] ?? ''),
		'database' => (string) ($config['database'] ?? ''),
		'table' => dashboard_database_table_name(),
	];
}

function dashboard_storage_file_for_key(string $key): string
{
	if (!array_key_exists($key, DASHBOARD_REMOTE_STORAGE_FILES)) {
		throw new InvalidArgumentException('Nieznany klucz danych.');
	}

	return $key;
}

function dashboard_users_path(): string
{
	return 'dashboard_users';
}

function dashboard_demo_marker_path(): string
{
	return 'dashboard_demo_marker';
}

function dashboard_decode_json_or_fallback(string $jsonContent, mixed $fallback): mixed
{
	$decodedValue = json_decode($jsonContent, true);
	return json_last_error() === JSON_ERROR_NONE ? $decodedValue : $fallback;
}

function dashboard_read_json_file(string $path, mixed $fallback): mixed
{
	$pdo = dashboard_database();
	$table = dashboard_database_table_name();
	$statement = $pdo->prepare("SELECT `storage_value` FROM `{$table}` WHERE `storage_key` = :storage_key LIMIT 1");
	$statement->execute(['storage_key' => $path]);
	$row = $statement->fetch();
	if (!is_array($row)) {
		return $fallback;
	}

	return dashboard_decode_json_or_fallback((string) ($row['storage_value'] ?? ''), $fallback);
}

function dashboard_write_json_file(string $path, mixed $data): void
{
	$encodedValue = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
	if ($encodedValue === false) {
		throw new RuntimeException('Nie udalo sie zakodowac danych do zapisu.');
	}

	$pdo = dashboard_database();
	$table = dashboard_database_table_name();
	$statement = $pdo->prepare(
		"INSERT INTO `{$table}` (`storage_key`, `storage_value`)
		VALUES (:storage_key, :storage_value)
		ON DUPLICATE KEY UPDATE `storage_value` = VALUES(`storage_value`), `updated_at` = CURRENT_TIMESTAMP"
	);
	$statement->execute([
		'storage_key' => $path,
		'storage_value' => $encodedValue,
	]);
}

function dashboard_update_json_file(string $path, mixed $fallback, callable $updater): mixed
{
	$pdo = dashboard_database();
	$table = dashboard_database_table_name();

	try {
		$pdo->beginTransaction();

		$fallbackValue = json_encode($fallback, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
		if ($fallbackValue === false) {
			throw new RuntimeException('Nie udalo sie zakodowac wartosci domyslnej.');
		}

		$insertFallbackStatement = $pdo->prepare(
			"INSERT IGNORE INTO `{$table}` (`storage_key`, `storage_value`)
			VALUES (:storage_key, :storage_value)"
		);
		$insertFallbackStatement->execute([
			'storage_key' => $path,
			'storage_value' => $fallbackValue,
		]);

		$readStatement = $pdo->prepare("SELECT `storage_value` FROM `{$table}` WHERE `storage_key` = :storage_key LIMIT 1 FOR UPDATE");
		$readStatement->execute(['storage_key' => $path]);
		$row = $readStatement->fetch();
		$currentValue = is_array($row)
			? dashboard_decode_json_or_fallback((string) ($row['storage_value'] ?? ''), $fallback)
			: $fallback;
		$nextValue = $updater($currentValue);

		$encodedValue = json_encode($nextValue, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
		if ($encodedValue === false) {
			throw new RuntimeException('Nie udalo sie zakodowac danych po aktualizacji.');
		}

		$writeStatement = $pdo->prepare(
			"INSERT INTO `{$table}` (`storage_key`, `storage_value`)
			VALUES (:storage_key, :storage_value)
			ON DUPLICATE KEY UPDATE `storage_value` = VALUES(`storage_value`), `updated_at` = CURRENT_TIMESTAMP"
		);
		$writeStatement->execute([
			'storage_key' => $path,
			'storage_value' => $encodedValue,
		]);

		$pdo->commit();

		return $nextValue;
	} catch (Throwable $error) {
		if ($pdo->inTransaction()) {
			$pdo->rollBack();
		}
		throw $error;
	}
}

function dashboard_delete_json_file(string $path): void
{
	$pdo = dashboard_database();
	$table = dashboard_database_table_name();
	$statement = $pdo->prepare("DELETE FROM `{$table}` WHERE `storage_key` = :storage_key");
	$statement->execute(['storage_key' => $path]);
}

function dashboard_json_file_exists(string $path): bool
{
	$pdo = dashboard_database();
	$table = dashboard_database_table_name();
	$statement = $pdo->prepare("SELECT 1 FROM `{$table}` WHERE `storage_key` = :storage_key LIMIT 1");
	$statement->execute(['storage_key' => $path]);
	return (bool) $statement->fetchColumn();
}
