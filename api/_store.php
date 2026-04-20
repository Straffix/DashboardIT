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

	$externalConfigPaths = [
		dirname(__DIR__, 4) . '/dashboardit-config/database.php',
		dirname(__DIR__, 3) . '/dashboardit-config/database.php',
		dirname(__DIR__, 2) . '/dashboardit-config/database.php',
	];

	foreach ($externalConfigPaths as $externalConfigPath) {
		if (is_file($externalConfigPath)) {
			return $externalConfigPath;
		}
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

function dashboard_database_driver(): string
{
	$config = dashboard_database_config();
	$driver = strtolower(trim((string) ($config['driver'] ?? 'mysql')));
	if ($driver === 'postgres' || $driver === 'postgresql') {
		return 'pgsql';
	}

	if ($driver === 'mysql' || $driver === 'pgsql') {
		return $driver;
	}

	throw new RuntimeException('Dashboard obsluguje tylko bazy MySQL lub PostgreSQL.');
}

function dashboard_database_mode_label(): string
{
	return dashboard_database_driver() === 'pgsql' ? 'postgresql' : 'mysql';
}

function dashboard_database_identifier(string $identifier): string
{
	if (!preg_match('/^[a-zA-Z0-9_]+$/', $identifier)) {
		throw new RuntimeException('Nieprawidlowy identyfikator bazy danych dashboardu.');
	}

	$quote = dashboard_database_driver() === 'pgsql' ? '"' : '`';
	return $quote . $identifier . $quote;
}

function dashboard_storage_table_identifier(): string
{
	return dashboard_database_identifier(dashboard_database_table_name());
}

function dashboard_storage_column_identifier(string $column): string
{
	return dashboard_database_identifier($column);
}

function dashboard_database(): PDO
{
	static $pdo = null;

	if ($pdo instanceof PDO) {
		return $pdo;
	}

	$config = dashboard_database_config();
	$driver = dashboard_database_driver();
	$host = trim((string) ($config['host'] ?? 'localhost')) ?: 'localhost';
	$port = (int) ($config['port'] ?? ($driver === 'pgsql' ? 5432 : 3306));
	$database = trim((string) ($config['database'] ?? ''));
	$username = trim((string) ($config['username'] ?? ''));
	$password = (string) ($config['password'] ?? '');
	$charset = trim((string) ($config['charset'] ?? 'utf8mb4')) ?: 'utf8mb4';

	if ($database === '' || $username === '') {
		throw new RuntimeException('Uzupelnij nazwe bazy danych i uzytkownika bazy.');
	}

	$dsn = $driver === 'pgsql'
		? sprintf('pgsql:host=%s;port=%d;dbname=%s', $host, $port, $database)
		: sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $database, $charset);
	$options = [
		PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
		PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
		PDO::ATTR_EMULATE_PREPARES => false,
	];

	if ($driver === 'mysql' && defined('PDO::MYSQL_ATTR_INIT_COMMAND')) {
		$options[PDO::MYSQL_ATTR_INIT_COMMAND] = sprintf("SET NAMES %s COLLATE %s_unicode_ci", $charset, $charset);
	}

	try {
		$pdo = new PDO($dsn, $username, $password, $options);
	} catch (PDOException $error) {
		throw new RuntimeException('Nie udalo sie polaczyc z baza danych dashboardu.');
	}

	if ($driver === 'pgsql') {
		$pdo->exec("SET NAMES 'UTF8'");
	}

	dashboard_ensure_storage_table($pdo);
	return $pdo;
}

function dashboard_storage_column_exists(PDO $pdo, string $column): bool
{
	$driver = dashboard_database_driver();
	$table = dashboard_database_table_name();

	$statement = $driver === 'pgsql'
		? $pdo->prepare(
			'SELECT COUNT(*) FROM information_schema.columns
			WHERE table_schema = current_schema() AND table_name = :table_name AND column_name = :column_name'
		)
		: $pdo->prepare(
			'SELECT COUNT(*) FROM information_schema.COLUMNS
			WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name AND COLUMN_NAME = :column_name'
		);

	$statement->execute([
		'table_name' => $table,
		'column_name' => $column,
	]);

	return (int) $statement->fetchColumn() > 0;
}

function dashboard_storage_primary_key_exists(PDO $pdo): bool
{
	$driver = dashboard_database_driver();
	$table = dashboard_database_table_name();

	$statement = $driver === 'pgsql'
		? $pdo->prepare(
			'SELECT COUNT(*) FROM information_schema.table_constraints tc
			INNER JOIN information_schema.key_column_usage kcu
				ON tc.constraint_schema = kcu.constraint_schema
					AND tc.constraint_name = kcu.constraint_name
					AND tc.table_name = kcu.table_name
			WHERE tc.table_schema = current_schema()
				AND tc.table_name = :table_name
				AND tc.constraint_type = :constraint_type
				AND kcu.column_name = :column_name'
		)
		: $pdo->prepare(
			'SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = :table_name
				AND CONSTRAINT_NAME = :constraint_type
				AND COLUMN_NAME = :column_name'
		);

	$statement->execute([
		'table_name' => $table,
		'constraint_type' => $driver === 'pgsql' ? 'PRIMARY KEY' : 'PRIMARY',
		'column_name' => 'storage_key',
	]);

	return (int) $statement->fetchColumn() > 0;
}

function dashboard_ensure_storage_columns(PDO $pdo): void
{
	$driver = dashboard_database_driver();
	$table = dashboard_storage_table_identifier();
	$keyColumn = dashboard_storage_column_identifier('storage_key');
	$valueColumn = dashboard_storage_column_identifier('storage_value');
	$createdColumn = dashboard_storage_column_identifier('created_at');
	$updatedColumn = dashboard_storage_column_identifier('updated_at');

	if ($driver === 'pgsql') {
		$pdo->exec("ALTER TABLE {$table} ADD COLUMN IF NOT EXISTS {$keyColumn} varchar(191) NOT NULL");
		$pdo->exec("ALTER TABLE {$table} ADD COLUMN IF NOT EXISTS {$valueColumn} text NOT NULL DEFAULT '[]'");
		$pdo->exec("ALTER TABLE {$table} ADD COLUMN IF NOT EXISTS {$createdColumn} timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP");
		$pdo->exec("ALTER TABLE {$table} ADD COLUMN IF NOT EXISTS {$updatedColumn} timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP");

		if (!dashboard_storage_primary_key_exists($pdo)) {
			$pdo->exec("ALTER TABLE {$table} ADD PRIMARY KEY ({$keyColumn})");
		}
		return;
	}

	$definitions = [
		'storage_key' => "{$keyColumn} varchar(191) NOT NULL",
		'storage_value' => "{$valueColumn} longtext NULL",
		'created_at' => "{$createdColumn} timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",
		'updated_at' => "{$updatedColumn} timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
	];

	foreach ($definitions as $column => $definition) {
		if (!dashboard_storage_column_exists($pdo, $column)) {
			$pdo->exec("ALTER TABLE {$table} ADD COLUMN {$definition}");
		}
	}

	if (!dashboard_storage_primary_key_exists($pdo)) {
		$pdo->exec("ALTER TABLE {$table} ADD PRIMARY KEY ({$keyColumn})");
	}
}

function dashboard_ensure_storage_table(?PDO $pdo = null): void
{
	static $ensured = false;

	if ($ensured) {
		return;
	}

	$pdo = $pdo ?: dashboard_database();
	$driver = dashboard_database_driver();
	$table = dashboard_storage_table_identifier();
	$keyColumn = dashboard_storage_column_identifier('storage_key');
	$valueColumn = dashboard_storage_column_identifier('storage_value');
	$createdColumn = dashboard_storage_column_identifier('created_at');
	$updatedColumn = dashboard_storage_column_identifier('updated_at');

	if ($driver === 'pgsql') {
		$pdo->exec(
			"CREATE TABLE IF NOT EXISTS {$table} (
				{$keyColumn} varchar(191) NOT NULL,
				{$valueColumn} text NOT NULL,
				{$createdColumn} timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				{$updatedColumn} timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY ({$keyColumn})
			)"
		);
	} else {
		$pdo->exec(
			"CREATE TABLE IF NOT EXISTS {$table} (
				{$keyColumn} varchar(191) NOT NULL,
				{$valueColumn} longtext NOT NULL,
				{$createdColumn} timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				{$updatedColumn} timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				PRIMARY KEY ({$keyColumn})
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
		);
	}

	dashboard_ensure_storage_columns($pdo);

	$ensured = true;
}

function dashboard_storage_backend_status(): array
{
	$config = dashboard_database_config();
	$pdo = dashboard_database();
	$statement = $pdo->query('SELECT 1 AS ok');
	$statement->fetch();

	return [
		'mode' => dashboard_database_mode_label(),
		'host' => (string) ($config['host'] ?? ''),
		'database' => (string) ($config['database'] ?? ''),
		'table' => dashboard_database_table_name(),
	];
}

function dashboard_insert_empty_json_if_missing(PDO $pdo, string $path, string $encodedFallback): void
{
	$driver = dashboard_database_driver();
	$table = dashboard_storage_table_identifier();
	$keyColumn = dashboard_storage_column_identifier('storage_key');
	$valueColumn = dashboard_storage_column_identifier('storage_value');

	$sql = $driver === 'pgsql'
		? "INSERT INTO {$table} ({$keyColumn}, {$valueColumn})
			VALUES (:storage_key, :storage_value)
			ON CONFLICT ({$keyColumn}) DO NOTHING"
		: "INSERT IGNORE INTO {$table} ({$keyColumn}, {$valueColumn})
			VALUES (:storage_key, :storage_value)";

	$statement = $pdo->prepare($sql);
	$statement->execute([
		'storage_key' => $path,
		'storage_value' => $encodedFallback,
	]);
}

function dashboard_upsert_json_value(PDO $pdo, string $path, string $encodedValue): void
{
	$driver = dashboard_database_driver();
	$table = dashboard_storage_table_identifier();
	$keyColumn = dashboard_storage_column_identifier('storage_key');
	$valueColumn = dashboard_storage_column_identifier('storage_value');
	$updatedColumn = dashboard_storage_column_identifier('updated_at');

	$sql = $driver === 'pgsql'
		? "INSERT INTO {$table} ({$keyColumn}, {$valueColumn})
			VALUES (:storage_key, :storage_value)
			ON CONFLICT ({$keyColumn}) DO UPDATE
			SET {$valueColumn} = EXCLUDED.{$valueColumn}, {$updatedColumn} = CURRENT_TIMESTAMP"
		: "INSERT INTO {$table} ({$keyColumn}, {$valueColumn})
			VALUES (:storage_key, :storage_value)
			ON DUPLICATE KEY UPDATE {$valueColumn} = VALUES({$valueColumn}), {$updatedColumn} = CURRENT_TIMESTAMP";

	$statement = $pdo->prepare($sql);
	$statement->execute([
		'storage_key' => $path,
		'storage_value' => $encodedValue,
	]);
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
	$table = dashboard_storage_table_identifier();
	$keyColumn = dashboard_storage_column_identifier('storage_key');
	$valueColumn = dashboard_storage_column_identifier('storage_value');
	$statement = $pdo->prepare("SELECT {$valueColumn} FROM {$table} WHERE {$keyColumn} = :storage_key LIMIT 1");
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
	dashboard_upsert_json_value($pdo, $path, $encodedValue);
}

function dashboard_update_json_file(string $path, mixed $fallback, callable $updater): mixed
{
	$pdo = dashboard_database();
	$table = dashboard_storage_table_identifier();
	$keyColumn = dashboard_storage_column_identifier('storage_key');
	$valueColumn = dashboard_storage_column_identifier('storage_value');

	try {
		$pdo->beginTransaction();

		$fallbackValue = json_encode($fallback, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
		if ($fallbackValue === false) {
			throw new RuntimeException('Nie udalo sie zakodowac wartosci domyslnej.');
		}

		dashboard_insert_empty_json_if_missing($pdo, $path, $fallbackValue);

		$readStatement = $pdo->prepare("SELECT {$valueColumn} FROM {$table} WHERE {$keyColumn} = :storage_key LIMIT 1 FOR UPDATE");
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

		dashboard_upsert_json_value($pdo, $path, $encodedValue);

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
	$table = dashboard_storage_table_identifier();
	$keyColumn = dashboard_storage_column_identifier('storage_key');
	$statement = $pdo->prepare("DELETE FROM {$table} WHERE {$keyColumn} = :storage_key");
	$statement->execute(['storage_key' => $path]);
}

function dashboard_json_file_exists(string $path): bool
{
	$pdo = dashboard_database();
	$table = dashboard_storage_table_identifier();
	$keyColumn = dashboard_storage_column_identifier('storage_key');
	$statement = $pdo->prepare("SELECT 1 FROM {$table} WHERE {$keyColumn} = :storage_key LIMIT 1");
	$statement->execute(['storage_key' => $path]);
	return (bool) $statement->fetchColumn();
}
