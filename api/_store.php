<?php
declare(strict_types=1);

const DASHBOARD_REMOTE_STORAGE_FILES = [
	'dashboard_user_bookmarks' => 'dashboard_bookmarks',
	'dashboard_active_users' => 'dashboard_active_users',
	'dashboard_lunch_reservations' => 'dashboard_lunch_reservations',
	'dashboard_notes_entries' => 'dashboard_notes',
	'dashboard_notes_active_viewers' => 'dashboard_notes_active_viewers',
	'dashboard_notes_announcements' => 'dashboard_announcements',
	'dashboard_notes_tasks' => 'dashboard_tasks',
	'dashboard_testers_feedback' => 'dashboard_tester_feedback',
	'monitor_laptopow_dane' => 'dashboard_monitor_devices',
	'nowe_zatrudnienia_dane' => 'dashboard_hires',
	'wymiana_sprzetu_dane' => 'dashboard_exchanges',
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

function dashboard_database_driver(): string
{
	$config = dashboard_database_config();
	$driver = strtolower(trim((string) ($config['driver'] ?? 'pgsql')));
	if ($driver === 'postgres' || $driver === 'postgresql' || $driver === 'pgsql') {
		return 'pgsql';
	}

	throw new RuntimeException('Dashboard jest skonfigurowany do pracy z baza PostgreSQL.');
}

function dashboard_database_mode_label(): string
{
	return 'postgresql';
}

function dashboard_database_identifier(string $identifier): string
{
	if (!preg_match('/^[a-zA-Z0-9_]+$/', $identifier)) {
		throw new RuntimeException('Nieprawidlowy identyfikator bazy danych dashboardu.');
	}

	return '"' . $identifier . '"';
}

function dashboard_database(): PDO
{
	static $pdo = null;

	if ($pdo instanceof PDO) {
		return $pdo;
	}

	$config = dashboard_database_config();
	$host = trim((string) ($config['host'] ?? 'localhost')) ?: 'localhost';
	$port = (int) ($config['port'] ?? 5432);
	$database = trim((string) ($config['database'] ?? ''));
	$username = trim((string) ($config['username'] ?? ''));
	$password = (string) ($config['password'] ?? '');
	$sslmode = strtolower(trim((string) ($config['sslmode'] ?? '')));

	if ($database === '' || $username === '') {
		throw new RuntimeException('Uzupelnij nazwe bazy danych i uzytkownika bazy.');
	}

	dashboard_database_driver();

	$dsnParts = [
		sprintf('host=%s', $host),
		sprintf('port=%d', $port),
		sprintf('dbname=%s', $database),
	];
	if ($sslmode !== '') {
		$dsnParts[] = sprintf('sslmode=%s', $sslmode);
	}

	$options = [
		PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
		PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
		PDO::ATTR_EMULATE_PREPARES => false,
	];

	try {
		$pdo = new PDO('pgsql:' . implode(';', $dsnParts), $username, $password, $options);
	} catch (PDOException $error) {
		throw new RuntimeException('Nie udalo sie polaczyc z baza danych dashboardu.');
	}

	$pdo->exec("SET NAMES 'UTF8'");
	dashboard_ensure_relational_schema($pdo);

	return $pdo;
}

function dashboard_users_path(): string
{
	return 'dashboard_users';
}

function dashboard_storage_file_for_key(string $key): string
{
	if (!array_key_exists($key, DASHBOARD_REMOTE_STORAGE_FILES)) {
		throw new InvalidArgumentException('Nieznany klucz danych.');
	}

	return $key;
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
		'table' => 'dashboard_users',
	];
}

function dashboard_read_json_file(string $path, $fallback)
{
	$pdo = dashboard_database();
	return dashboard_read_path_from_database($pdo, $path, $fallback);
}

function dashboard_write_json_file(string $path, $data): void
{
	$pdo = dashboard_database();
	dashboard_write_path_to_database($pdo, $path, $data);
}

function dashboard_update_json_file(string $path, $fallback, callable $updater)
{
	$pdo = dashboard_database();

	try {
		$pdo->beginTransaction();
		dashboard_lock_storage_path($pdo, $path);

		$currentValue = dashboard_read_path_from_database($pdo, $path, $fallback);
		$nextValue = $updater($currentValue);
		dashboard_write_path_to_database($pdo, $path, $nextValue);

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
	dashboard_delete_path_from_database($pdo, $path);
}

function dashboard_json_file_exists(string $path): bool
{
	$pdo = dashboard_database();
	return dashboard_path_exists_in_database($pdo, $path);
}

function dashboard_read_path_from_database(PDO $pdo, string $path, $fallback)
{
	switch ($path) {
		case 'dashboard_users':
			return dashboard_fetch_users_collection($pdo);
		case 'dashboard_user_bookmarks':
			return dashboard_fetch_bookmarks_collection($pdo);
		case 'dashboard_active_users':
			return dashboard_fetch_active_users_collection($pdo);
		case 'dashboard_lunch_reservations':
			return dashboard_fetch_lunch_collection($pdo);
		case 'dashboard_notes_entries':
			return dashboard_fetch_notes_collection($pdo);
		case 'dashboard_notes_active_viewers':
			return dashboard_fetch_notes_active_viewers_collection($pdo);
		case 'dashboard_notes_announcements':
			return dashboard_fetch_announcements_collection($pdo);
		case 'dashboard_notes_tasks':
			return dashboard_fetch_tasks_collection($pdo);
		case 'dashboard_testers_feedback':
			return dashboard_fetch_tester_feedback_collection($pdo);
		case 'monitor_laptopow_dane':
			return dashboard_fetch_monitor_collection($pdo);
		case 'nowe_zatrudnienia_dane':
			return dashboard_fetch_hires_collection($pdo);
		case 'wymiana_sprzetu_dane':
			return dashboard_fetch_exchanges_collection($pdo);
		default:
			throw new InvalidArgumentException('Nieznany klucz danych.');
	}
}

function dashboard_write_path_to_database(PDO $pdo, string $path, $data): void
{
	switch ($path) {
		case 'dashboard_users':
			dashboard_replace_users_collection($pdo, $data);
			return;
		case 'dashboard_user_bookmarks':
			dashboard_replace_bookmarks_collection($pdo, $data);
			return;
		case 'dashboard_active_users':
			dashboard_replace_active_users_collection($pdo, $data);
			return;
		case 'dashboard_lunch_reservations':
			dashboard_replace_lunch_collection($pdo, $data);
			return;
		case 'dashboard_notes_entries':
			dashboard_replace_notes_collection($pdo, $data);
			return;
		case 'dashboard_notes_active_viewers':
			dashboard_replace_notes_active_viewers_collection($pdo, $data);
			return;
		case 'dashboard_notes_announcements':
			dashboard_replace_announcements_collection($pdo, $data);
			return;
		case 'dashboard_notes_tasks':
			dashboard_replace_tasks_collection($pdo, $data);
			return;
		case 'dashboard_testers_feedback':
			dashboard_replace_tester_feedback_collection($pdo, $data);
			return;
		case 'monitor_laptopow_dane':
			dashboard_replace_monitor_collection($pdo, $data);
			return;
		case 'nowe_zatrudnienia_dane':
			dashboard_replace_hires_collection($pdo, $data);
			return;
		case 'wymiana_sprzetu_dane':
			dashboard_replace_exchanges_collection($pdo, $data);
			return;
		default:
			throw new InvalidArgumentException('Nieznany klucz danych.');
	}
}

function dashboard_delete_path_from_database(PDO $pdo, string $path): void
{
	dashboard_write_path_to_database($pdo, $path, []);
}

function dashboard_path_exists_in_database(PDO $pdo, string $path): bool
{
	switch ($path) {
		case 'dashboard_users':
			return dashboard_table_has_rows($pdo, 'dashboard_users');
		case 'dashboard_user_bookmarks':
			return dashboard_table_has_rows($pdo, 'dashboard_bookmarks');
		case 'dashboard_active_users':
			return dashboard_table_has_rows($pdo, 'dashboard_active_users');
		case 'dashboard_lunch_reservations':
			return dashboard_table_has_rows($pdo, 'dashboard_lunch_reservations');
		case 'dashboard_notes_entries':
			return dashboard_table_has_rows($pdo, 'dashboard_notes');
		case 'dashboard_notes_active_viewers':
			return dashboard_table_has_rows($pdo, 'dashboard_notes_active_viewers');
		case 'dashboard_notes_announcements':
			return dashboard_table_has_rows($pdo, 'dashboard_announcements');
		case 'dashboard_notes_tasks':
			return dashboard_table_has_rows($pdo, 'dashboard_tasks');
		case 'dashboard_testers_feedback':
			return dashboard_table_has_rows($pdo, 'dashboard_tester_feedback');
		case 'monitor_laptopow_dane':
			return dashboard_table_has_rows($pdo, 'dashboard_monitor_devices');
		case 'nowe_zatrudnienia_dane':
			return dashboard_table_has_rows($pdo, 'dashboard_hires');
		case 'wymiana_sprzetu_dane':
			return dashboard_table_has_rows($pdo, 'dashboard_exchanges');
		default:
			throw new InvalidArgumentException('Nieznany klucz danych.');
	}
}

function dashboard_lock_storage_path(PDO $pdo, string $path): void
{
	$statement = $pdo->prepare('SELECT pg_advisory_xact_lock(hashtext(:lock_key))');
	$statement->execute([
		'lock_key' => sprintf('dashboard_storage:%s', $path),
	]);
}

function dashboard_ensure_relational_schema(?PDO $pdo = null): void
{
	static $ensured = false;

	if ($ensured) {
		return;
	}

	$pdo = $pdo ?: dashboard_database();
	foreach (dashboard_schema_statements() as $statement) {
		$pdo->exec($statement);
	}

	$ensured = true;
}

function dashboard_schema_statements(): array
{
	return [
		"CREATE TABLE IF NOT EXISTS dashboard_users (
			id varchar(191) PRIMARY KEY,
			full_name varchar(200) NOT NULL,
			login varchar(120) NOT NULL UNIQUE,
			password_hash text NOT NULL,
			role varchar(20) NOT NULL DEFAULT 'user',
			avatar_id varchar(50) NOT NULL DEFAULT 'violet',
			avatar_image text NOT NULL DEFAULT '',
			profile_title varchar(80) NOT NULL DEFAULT '',
			profile_bio varchar(240) NOT NULL DEFAULT '',
			profile_accent_color varchar(7) NOT NULL DEFAULT '#0f766e',
			profile_cover_image text NOT NULL DEFAULT '',
			created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT dashboard_users_role_check CHECK (role IN ('user', 'admin'))
		)",
		"CREATE TABLE IF NOT EXISTS dashboard_user_permissions (
			user_id varchar(191) NOT NULL REFERENCES dashboard_users(id) ON DELETE CASCADE,
			permission_id varchar(50) NOT NULL,
			PRIMARY KEY (user_id, permission_id)
		)",
		'CREATE INDEX IF NOT EXISTS dashboard_users_login_idx ON dashboard_users (login)',
		"CREATE TABLE IF NOT EXISTS dashboard_bookmarks (
			id varchar(191) PRIMARY KEY,
			sort_order integer NOT NULL DEFAULT 0,
			user_id varchar(191) NOT NULL REFERENCES dashboard_users(id) ON DELETE CASCADE,
			label varchar(200) NOT NULL,
			url text NOT NULL,
			description text NOT NULL DEFAULT '',
			created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
		)",
		'CREATE INDEX IF NOT EXISTS dashboard_bookmarks_user_idx ON dashboard_bookmarks (user_id, sort_order)',
		"CREATE TABLE IF NOT EXISTS dashboard_active_users (
			tab_id varchar(191) PRIMARY KEY,
			sort_order integer NOT NULL DEFAULT 0,
			user_id varchar(191) NOT NULL REFERENCES dashboard_users(id) ON DELETE CASCADE,
			login varchar(120) NOT NULL DEFAULT '',
			full_name varchar(200) NOT NULL DEFAULT '',
			avatar_id varchar(50) NOT NULL DEFAULT '',
			avatar_image text NOT NULL DEFAULT '',
			profile_accent_color varchar(7) NOT NULL DEFAULT '#0f766e',
			profile_cover_image text NOT NULL DEFAULT '',
			last_seen_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
		)",
		'CREATE INDEX IF NOT EXISTS dashboard_active_users_seen_idx ON dashboard_active_users (last_seen_at)',
		"CREATE TABLE IF NOT EXISTS dashboard_lunch_reservations (
			id varchar(191) PRIMARY KEY,
			sort_order integer NOT NULL DEFAULT 0,
			reservation_date date NOT NULL,
			time_slot varchar(10) NOT NULL,
			user_id varchar(191) NOT NULL REFERENCES dashboard_users(id) ON DELETE CASCADE,
			created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			status varchar(20) NOT NULL DEFAULT 'active',
			CONSTRAINT dashboard_lunch_status_check CHECK (status IN ('active', 'cancelled'))
		)",
		'CREATE INDEX IF NOT EXISTS dashboard_lunch_schedule_idx ON dashboard_lunch_reservations (reservation_date, time_slot, status)',
		"CREATE UNIQUE INDEX IF NOT EXISTS dashboard_lunch_active_user_per_day_idx
			ON dashboard_lunch_reservations (reservation_date, user_id)
			WHERE status = 'active'",
		"CREATE TABLE IF NOT EXISTS dashboard_notes (
			id varchar(191) PRIMARY KEY,
			sort_order integer NOT NULL DEFAULT 0,
			content text NOT NULL,
			author_id varchar(191) REFERENCES dashboard_users(id) ON DELETE SET NULL,
			created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			is_pinned boolean NOT NULL DEFAULT false,
			pinned_at timestamptz NULL,
			pinned_by varchar(191) NULL
		)",
		'CREATE INDEX IF NOT EXISTS dashboard_notes_sort_idx ON dashboard_notes (sort_order, created_at)',
		"CREATE TABLE IF NOT EXISTS dashboard_notes_active_viewers (
			tab_id varchar(191) PRIMARY KEY,
			sort_order integer NOT NULL DEFAULT 0,
			user_id varchar(191) NOT NULL REFERENCES dashboard_users(id) ON DELETE CASCADE,
			login varchar(120) NOT NULL DEFAULT '',
			full_name varchar(200) NOT NULL DEFAULT '',
			avatar_id varchar(50) NOT NULL DEFAULT '',
			avatar_image text NOT NULL DEFAULT '',
			last_seen_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
		)",
		'CREATE INDEX IF NOT EXISTS dashboard_notes_active_viewers_seen_idx ON dashboard_notes_active_viewers (last_seen_at)',
		"CREATE TABLE IF NOT EXISTS dashboard_announcements (
			id varchar(191) PRIMARY KEY,
			sort_order integer NOT NULL DEFAULT 0,
			title varchar(200) NOT NULL,
			content text NOT NULL,
			author_id varchar(191) REFERENCES dashboard_users(id) ON DELETE SET NULL,
			created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			is_pinned boolean NOT NULL DEFAULT true
		)",
		'CREATE INDEX IF NOT EXISTS dashboard_announcements_sort_idx ON dashboard_announcements (sort_order, updated_at)',
		"CREATE TABLE IF NOT EXISTS dashboard_tasks (
			id varchar(191) PRIMARY KEY,
			sort_order integer NOT NULL DEFAULT 0,
			title varchar(200) NOT NULL,
			description text NOT NULL,
			assigned_to_user_id varchar(191) REFERENCES dashboard_users(id) ON DELETE SET NULL,
			created_by varchar(191) NOT NULL DEFAULT '',
			updated_by varchar(191) NOT NULL DEFAULT '',
			created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			status varchar(20) NOT NULL DEFAULT 'todo',
			priority varchar(20) NOT NULL DEFAULT 'medium',
			CONSTRAINT dashboard_tasks_status_check CHECK (status IN ('todo', 'in_progress', 'done')),
			CONSTRAINT dashboard_tasks_priority_check CHECK (priority IN ('low', 'medium', 'high'))
		)",
		'CREATE INDEX IF NOT EXISTS dashboard_tasks_sort_idx ON dashboard_tasks (sort_order, updated_at)',
		"CREATE TABLE IF NOT EXISTS dashboard_tester_feedback (
			id varchar(191) PRIMARY KEY,
			sort_order integer NOT NULL DEFAULT 0,
			author_name varchar(200) NOT NULL,
			author_id varchar(191) REFERENCES dashboard_users(id) ON DELETE SET NULL,
			author_avatar_id varchar(50) NOT NULL DEFAULT 'blue',
			author_avatar_image text NOT NULL DEFAULT '',
			area varchar(200) NOT NULL DEFAULT '',
			category varchar(20) NOT NULL DEFAULT 'bug',
			severity varchar(20) NOT NULL DEFAULT 'medium',
			message text NOT NULL,
			created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT dashboard_tester_feedback_category_check CHECK (category IN ('bug', 'ux', 'idea', 'note')),
			CONSTRAINT dashboard_tester_feedback_severity_check CHECK (severity IN ('critical', 'high', 'medium', 'low'))
		)",
		'CREATE INDEX IF NOT EXISTS dashboard_tester_feedback_sort_idx ON dashboard_tester_feedback (sort_order, updated_at)',
		"CREATE TABLE IF NOT EXISTS dashboard_monitor_devices (
			id bigserial PRIMARY KEY,
			sort_order integer NOT NULL DEFAULT 0,
			external_id varchar(191) NULL,
			name varchar(200) NOT NULL,
			ru varchar(120) NOT NULL,
			sn varchar(120) NOT NULL,
			device_date date NULL,
			last_extended_on date NULL,
			created_by_actor jsonb NULL,
			updated_by_actor jsonb NULL,
			created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
		)",
		'CREATE INDEX IF NOT EXISTS dashboard_monitor_devices_sort_idx ON dashboard_monitor_devices (sort_order, updated_at)',
		'CREATE INDEX IF NOT EXISTS dashboard_monitor_devices_lookup_idx ON dashboard_monitor_devices (ru, sn)',
		"CREATE TABLE IF NOT EXISTS dashboard_hires (
			id bigserial PRIMARY KEY,
			sort_order integer NOT NULL DEFAULT 0,
			external_id varchar(191) NULL,
			name varchar(200) NOT NULL,
			ru varchar(200) NOT NULL,
			sn varchar(120) NOT NULL,
			hire_date date NULL,
			accessories jsonb NOT NULL DEFAULT '[]'::jsonb,
			created_by_actor jsonb NULL,
			updated_by_actor jsonb NULL,
			created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
		)",
		'CREATE INDEX IF NOT EXISTS dashboard_hires_sort_idx ON dashboard_hires (sort_order, updated_at)',
		'CREATE INDEX IF NOT EXISTS dashboard_hires_lookup_idx ON dashboard_hires (sn, hire_date)',
		"CREATE TABLE IF NOT EXISTS dashboard_exchanges (
			id bigserial PRIMARY KEY,
			sort_order integer NOT NULL DEFAULT 0,
			external_id varchar(191) NULL,
			name varchar(200) NOT NULL,
			planned_date date NULL,
			old_sn varchar(120) NOT NULL DEFAULT '',
			new_sn varchar(120) NOT NULL DEFAULT '',
			accessories jsonb NOT NULL DEFAULT '[]'::jsonb,
			notes text NOT NULL DEFAULT '',
			status varchar(20) NOT NULL DEFAULT 'pending',
			created_by_actor jsonb NULL,
			updated_by_actor jsonb NULL,
			created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT dashboard_exchanges_status_check CHECK (status IN ('pending', 'done'))
		)",
		'CREATE INDEX IF NOT EXISTS dashboard_exchanges_sort_idx ON dashboard_exchanges (sort_order, updated_at)',
		'CREATE INDEX IF NOT EXISTS dashboard_exchanges_lookup_idx ON dashboard_exchanges (planned_date, old_sn, new_sn)',
	];
}

function dashboard_now_iso(): string
{
	return gmdate('c');
}

function dashboard_trim_string($value, int $maxLength = 0): string
{
	$stringValue = trim((string) $value);
	if ($maxLength > 0 && function_exists('mb_substr')) {
		return mb_substr($stringValue, 0, $maxLength);
	}
	if ($maxLength > 0) {
		return substr($stringValue, 0, $maxLength);
	}

	return $stringValue;
}

function dashboard_store_normalize_login(string $login): string
{
	$normalizedLogin = strtolower(trim($login));
	$normalizedLogin = preg_replace('/\s+/', '', $normalizedLogin) ?? '';
	return preg_replace('/[^a-z0-9._-]/', '', $normalizedLogin) ?? '';
}

function dashboard_store_normalize_role(string $role): string
{
	return $role === 'admin' ? 'admin' : 'user';
}

function dashboard_store_permission_ids(): array
{
	return ['it_support', 'network', 'printers', 'rooms'];
}

function dashboard_store_normalize_permissions($permissions): array
{
	if (!is_array($permissions)) {
		return [];
	}

	$allowedPermissions = array_flip(dashboard_store_permission_ids());
	$normalizedPermissions = [];

	foreach ($permissions as $permission) {
		$normalizedPermission = trim((string) $permission);
		if ($normalizedPermission !== '' && isset($allowedPermissions[$normalizedPermission])) {
			$normalizedPermissions[$normalizedPermission] = true;
		}
	}

	return array_keys($normalizedPermissions);
}

function dashboard_normalize_date_value($value): ?string
{
	$stringValue = trim((string) $value);
	if ($stringValue === '') {
		return null;
	}

	try {
		return (new DateTimeImmutable($stringValue))->format('Y-m-d');
	} catch (Throwable $error) {
		return null;
	}
}

function dashboard_normalize_datetime_value($value, ?string $fallback = null): ?string
{
	$stringValue = trim((string) $value);
	if ($stringValue === '') {
		return $fallback;
	}

	try {
		return (new DateTimeImmutable($stringValue))->setTimezone(new DateTimeZone('UTC'))->format('c');
	} catch (Throwable $error) {
		return $fallback;
	}
}

function dashboard_format_datetime_output($value): string
{
	$formattedValue = dashboard_normalize_datetime_value($value);
	return $formattedValue ?? '';
}

function dashboard_format_date_output($value): string
{
	$formattedValue = dashboard_normalize_date_value($value);
	return $formattedValue ?? '';
}

function dashboard_decode_json_or_fallback($jsonContent, $fallback)
{
	if (is_array($jsonContent)) {
		return $jsonContent;
	}

	if ($jsonContent === null) {
		return $fallback;
	}

	$decodedValue = json_decode((string) $jsonContent, true);
	return json_last_error() === JSON_ERROR_NONE ? $decodedValue : $fallback;
}

function dashboard_encode_json_value($value): string
{
	$encodedValue = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
	if ($encodedValue === false) {
		throw new RuntimeException('Nie udalo sie zakodowac danych do zapisu.');
	}

	return $encodedValue;
}

function dashboard_boolean_from_database($value): bool
{
	return $value === true || $value === 1 || $value === '1' || $value === 't' || $value === 'true';
}

function dashboard_normalize_string_array($values): array
{
	if (!is_array($values)) {
		return [];
	}

	$normalizedValues = [];
	foreach ($values as $value) {
		$normalizedValue = dashboard_trim_string($value);
		if ($normalizedValue !== '') {
			$normalizedValues[$normalizedValue] = true;
		}
	}

	return array_keys($normalizedValues);
}

function dashboard_normalize_actor_snapshot($actor): ?array
{
	if (!is_array($actor)) {
		return null;
	}

	$actorId = dashboard_trim_string($actor['id'] ?? '');
	$fullName = dashboard_trim_string($actor['fullName'] ?? '');
	$login = dashboard_store_normalize_login((string) ($actor['login'] ?? ''));
	$role = dashboard_store_normalize_role((string) ($actor['role'] ?? 'user'));
	$avatarId = dashboard_trim_string($actor['avatarId'] ?? 'violet') ?: 'violet';

	if ($actorId === '' && $fullName === '' && $login === '') {
		return null;
	}

	return [
		'id' => $actorId,
		'fullName' => $fullName,
		'login' => $login,
		'role' => $role,
		'avatarId' => $avatarId,
	];
}

function dashboard_make_fallback_id(string $prefix, string $seed): string
{
	return sprintf('%s-%s', $prefix, substr(md5($seed), 0, 12));
}

function dashboard_table_has_rows(PDO $pdo, string $table): bool
{
	$tableIdentifier = dashboard_database_identifier($table);
	$statement = $pdo->query("SELECT 1 FROM {$tableIdentifier} LIMIT 1");
	return (bool) $statement->fetchColumn();
}

function dashboard_replace_rows(PDO $pdo, string $table, array $rows, array $jsonColumns = []): void
{
	$tableIdentifier = dashboard_database_identifier($table);
	$pdo->exec("DELETE FROM {$tableIdentifier}");

	if ($rows === []) {
		return;
	}

	$columns = array_keys($rows[0]);
	$columnList = implode(', ', array_map('dashboard_database_identifier', $columns));
	$valueList = implode(', ', array_map(static function (string $column) use ($jsonColumns): string {
		$parameter = ':' . $column;
		return in_array($column, $jsonColumns, true) ? "CAST({$parameter} AS jsonb)" : $parameter;
	}, $columns));

	$statement = $pdo->prepare("INSERT INTO {$tableIdentifier} ({$columnList}) VALUES ({$valueList})");

	foreach ($rows as $row) {
		$parameters = [];
		foreach ($columns as $column) {
			$parameters[$column] = $row[$column] ?? null;
		}

		$statement->execute($parameters);
	}
}

function dashboard_fetch_users_collection(PDO $pdo): array
{
	$statement = $pdo->query(
		"SELECT
			u.id,
			u.full_name,
			u.login,
			u.password_hash,
			u.role,
			u.avatar_id,
			u.avatar_image,
			u.profile_title,
			u.profile_bio,
			u.profile_accent_color,
			u.profile_cover_image,
			u.created_at,
			u.updated_at,
			COALESCE(
				json_agg(up.permission_id ORDER BY up.permission_id) FILTER (WHERE up.permission_id IS NOT NULL),
				'[]'::json
			) AS permissions_json
		FROM dashboard_users u
		LEFT JOIN dashboard_user_permissions up ON up.user_id = u.id
		GROUP BY
			u.id,
			u.full_name,
			u.login,
			u.password_hash,
			u.role,
			u.avatar_id,
			u.avatar_image,
			u.profile_title,
			u.profile_bio,
			u.profile_accent_color,
			u.profile_cover_image,
			u.created_at,
			u.updated_at
		ORDER BY u.created_at ASC, u.full_name ASC, u.login ASC"
	);

	$users = [];
	while ($row = $statement->fetch()) {
		$permissions = dashboard_store_normalize_permissions(
			dashboard_decode_json_or_fallback($row['permissions_json'] ?? '[]', [])
		);

		$users[] = [
			'id' => (string) ($row['id'] ?? ''),
			'fullName' => dashboard_trim_string($row['full_name'] ?? ''),
			'login' => dashboard_store_normalize_login((string) ($row['login'] ?? '')),
			'passwordHash' => (string) ($row['password_hash'] ?? ''),
			'role' => dashboard_store_normalize_role((string) ($row['role'] ?? 'user')),
			'permissions' => $permissions,
			'avatarId' => dashboard_trim_string($row['avatar_id'] ?? 'violet') ?: 'violet',
			'avatarImage' => dashboard_trim_string($row['avatar_image'] ?? ''),
			'profileTitle' => dashboard_trim_string($row['profile_title'] ?? '', 80),
			'profileBio' => dashboard_trim_string($row['profile_bio'] ?? '', 240),
			'profileAccentColor' => dashboard_trim_string($row['profile_accent_color'] ?? '#0f766e') ?: '#0f766e',
			'profileCoverImage' => dashboard_trim_string($row['profile_cover_image'] ?? ''),
			'createdAt' => dashboard_format_datetime_output($row['created_at'] ?? ''),
			'updatedAt' => dashboard_format_datetime_output($row['updated_at'] ?? ''),
		];
	}

	return $users;
}

function dashboard_replace_users_collection(PDO $pdo, $users): void
{
	$records = is_array($users) ? array_values(array_filter($users, 'is_array')) : [];
	$normalizedUsers = [];

	foreach ($records as $index => $user) {
		$login = dashboard_store_normalize_login((string) ($user['login'] ?? ''));
		$userId = dashboard_trim_string($user['id'] ?? '') ?: dashboard_make_fallback_id('user', $login . ':' . $index);
		$now = dashboard_now_iso();
		$role = dashboard_store_normalize_role((string) ($user['role'] ?? 'user'));
		$permissions = $role === 'admin'
			? dashboard_store_permission_ids()
			: dashboard_store_normalize_permissions($user['permissions'] ?? []);

		$normalizedUsers[] = [
			'id' => $userId,
			'fullName' => dashboard_trim_string($user['fullName'] ?? ''),
			'login' => $login,
			'passwordHash' => (string) ($user['passwordHash'] ?? ''),
			'role' => $role,
			'permissions' => $permissions,
			'avatarId' => dashboard_trim_string($user['avatarId'] ?? 'violet') ?: 'violet',
			'avatarImage' => dashboard_trim_string($user['avatarImage'] ?? ''),
			'profileTitle' => dashboard_trim_string($user['profileTitle'] ?? '', 80),
			'profileBio' => dashboard_trim_string($user['profileBio'] ?? '', 240),
			'profileAccentColor' => dashboard_trim_string($user['profileAccentColor'] ?? '#0f766e') ?: '#0f766e',
			'profileCoverImage' => dashboard_trim_string($user['profileCoverImage'] ?? ''),
			'createdAt' => dashboard_normalize_datetime_value($user['createdAt'] ?? '', $now) ?? $now,
			'updatedAt' => dashboard_normalize_datetime_value($user['updatedAt'] ?? '', $now) ?? $now,
		];
	}

	$userTable = dashboard_database_identifier('dashboard_users');
	$permissionsTable = dashboard_database_identifier('dashboard_user_permissions');

	$upsertStatement = $pdo->prepare(
		"INSERT INTO {$userTable} (
			id,
			full_name,
			login,
			password_hash,
			role,
			avatar_id,
			avatar_image,
			profile_title,
			profile_bio,
			profile_accent_color,
			profile_cover_image,
			created_at,
			updated_at
		) VALUES (
			:id,
			:full_name,
			:login,
			:password_hash,
			:role,
			:avatar_id,
			:avatar_image,
			:profile_title,
			:profile_bio,
			:profile_accent_color,
			:profile_cover_image,
			:created_at,
			:updated_at
		)
		ON CONFLICT (id) DO UPDATE SET
			full_name = EXCLUDED.full_name,
			login = EXCLUDED.login,
			password_hash = EXCLUDED.password_hash,
			role = EXCLUDED.role,
			avatar_id = EXCLUDED.avatar_id,
			avatar_image = EXCLUDED.avatar_image,
			profile_title = EXCLUDED.profile_title,
			profile_bio = EXCLUDED.profile_bio,
			profile_accent_color = EXCLUDED.profile_accent_color,
			profile_cover_image = EXCLUDED.profile_cover_image,
			created_at = EXCLUDED.created_at,
			updated_at = EXCLUDED.updated_at"
	);
	$deletePermissionsStatement = $pdo->prepare("DELETE FROM {$permissionsTable} WHERE user_id = :user_id");
	$insertPermissionStatement = $pdo->prepare(
		"INSERT INTO {$permissionsTable} (user_id, permission_id) VALUES (:user_id, :permission_id)"
	);

	foreach ($normalizedUsers as $user) {
		$upsertStatement->execute([
			'id' => $user['id'],
			'full_name' => $user['fullName'],
			'login' => $user['login'],
			'password_hash' => $user['passwordHash'],
			'role' => $user['role'],
			'avatar_id' => $user['avatarId'],
			'avatar_image' => $user['avatarImage'],
			'profile_title' => $user['profileTitle'],
			'profile_bio' => $user['profileBio'],
			'profile_accent_color' => $user['profileAccentColor'],
			'profile_cover_image' => $user['profileCoverImage'],
			'created_at' => $user['createdAt'],
			'updated_at' => $user['updatedAt'],
		]);

		$deletePermissionsStatement->execute(['user_id' => $user['id']]);
		foreach ($user['permissions'] as $permissionId) {
			$insertPermissionStatement->execute([
				'user_id' => $user['id'],
				'permission_id' => $permissionId,
			]);
		}
	}

	$userIds = array_values(array_map(static fn (array $user): string => $user['id'], $normalizedUsers));
	if ($userIds === []) {
		$pdo->exec("DELETE FROM {$userTable}");
		return;
	}

	$placeholders = [];
	$parameters = [];
	foreach ($userIds as $index => $userId) {
		$key = 'user_id_' . $index;
		$placeholders[] = ':' . $key;
		$parameters[$key] = $userId;
	}

	$deleteStatement = $pdo->prepare(
		"DELETE FROM {$userTable} WHERE id NOT IN (" . implode(', ', $placeholders) . ')'
	);
	$deleteStatement->execute($parameters);
}

function dashboard_fetch_bookmarks_collection(PDO $pdo): array
{
	$statement = $pdo->query(
		'SELECT id, user_id, label, url, description, created_at, updated_at
		FROM dashboard_bookmarks
		ORDER BY sort_order ASC, created_at ASC, id ASC'
	);

	$records = [];
	while ($row = $statement->fetch()) {
		$records[] = [
			'id' => (string) ($row['id'] ?? ''),
			'userId' => (string) ($row['user_id'] ?? ''),
			'label' => dashboard_trim_string($row['label'] ?? ''),
			'url' => dashboard_trim_string($row['url'] ?? ''),
			'description' => dashboard_trim_string($row['description'] ?? ''),
			'createdAt' => dashboard_format_datetime_output($row['created_at'] ?? ''),
			'updatedAt' => dashboard_format_datetime_output($row['updated_at'] ?? ''),
		];
	}

	return $records;
}

function dashboard_replace_bookmarks_collection(PDO $pdo, $records): void
{
	$list = is_array($records) ? array_values(array_filter($records, 'is_array')) : [];
	$now = dashboard_now_iso();
	$rows = [];

	foreach ($list as $index => $record) {
		$userId = dashboard_trim_string($record['userId'] ?? '');
		$label = dashboard_trim_string($record['label'] ?? '');
		$url = dashboard_trim_string($record['url'] ?? '');
		if ($userId === '' || $label === '' || $url === '') {
			continue;
		}

		$seed = $userId . ':' . $label . ':' . $url . ':' . $index;
		$rows[] = [
			'id' => dashboard_trim_string($record['id'] ?? '') ?: dashboard_make_fallback_id('bookmark', $seed),
			'sort_order' => $index,
			'user_id' => $userId,
			'label' => $label,
			'url' => $url,
			'description' => dashboard_trim_string($record['description'] ?? ''),
			'created_at' => dashboard_normalize_datetime_value($record['createdAt'] ?? '', $now) ?? $now,
			'updated_at' => dashboard_normalize_datetime_value($record['updatedAt'] ?? '', $now) ?? $now,
		];
	}

	dashboard_replace_rows($pdo, 'dashboard_bookmarks', $rows);
}

function dashboard_fetch_active_users_collection(PDO $pdo): array
{
	$statement = $pdo->query(
		'SELECT tab_id, user_id, login, full_name, avatar_id, avatar_image, profile_accent_color, profile_cover_image, last_seen_at
		FROM dashboard_active_users
		ORDER BY sort_order ASC, last_seen_at ASC, tab_id ASC'
	);

	$records = [];
	while ($row = $statement->fetch()) {
		$records[] = [
			'tabId' => (string) ($row['tab_id'] ?? ''),
			'userId' => (string) ($row['user_id'] ?? ''),
			'login' => dashboard_trim_string($row['login'] ?? ''),
			'fullName' => dashboard_trim_string($row['full_name'] ?? ''),
			'avatarId' => dashboard_trim_string($row['avatar_id'] ?? ''),
			'avatarImage' => dashboard_trim_string($row['avatar_image'] ?? ''),
			'profileAccentColor' => dashboard_trim_string($row['profile_accent_color'] ?? ''),
			'profileCoverImage' => dashboard_trim_string($row['profile_cover_image'] ?? ''),
			'lastSeenAt' => dashboard_format_datetime_output($row['last_seen_at'] ?? ''),
		];
	}

	return $records;
}

function dashboard_replace_active_users_collection(PDO $pdo, $records): void
{
	$list = is_array($records) ? array_values(array_filter($records, 'is_array')) : [];
	$now = dashboard_now_iso();
	$rows = [];

	foreach ($list as $index => $record) {
		$userId = dashboard_trim_string($record['userId'] ?? '');
		$tabId = dashboard_trim_string($record['tabId'] ?? '');
		if ($userId === '' || $tabId === '') {
			continue;
		}

		$rows[] = [
			'tab_id' => $tabId,
			'sort_order' => $index,
			'user_id' => $userId,
			'login' => dashboard_trim_string($record['login'] ?? ''),
			'full_name' => dashboard_trim_string($record['fullName'] ?? ''),
			'avatar_id' => dashboard_trim_string($record['avatarId'] ?? ''),
			'avatar_image' => dashboard_trim_string($record['avatarImage'] ?? ''),
			'profile_accent_color' => dashboard_trim_string($record['profileAccentColor'] ?? '#0f766e') ?: '#0f766e',
			'profile_cover_image' => dashboard_trim_string($record['profileCoverImage'] ?? ''),
			'last_seen_at' => dashboard_normalize_datetime_value($record['lastSeenAt'] ?? '', $now) ?? $now,
		];
	}

	dashboard_replace_rows($pdo, 'dashboard_active_users', $rows);
}

function dashboard_fetch_lunch_collection(PDO $pdo): array
{
	$statement = $pdo->query(
		'SELECT id, reservation_date, time_slot, user_id, created_at, updated_at, status
		FROM dashboard_lunch_reservations
		ORDER BY sort_order ASC, created_at ASC, id ASC'
	);

	$records = [];
	while ($row = $statement->fetch()) {
		$records[] = [
			'id' => (string) ($row['id'] ?? ''),
			'date' => dashboard_format_date_output($row['reservation_date'] ?? ''),
			'timeSlot' => dashboard_trim_string($row['time_slot'] ?? ''),
			'userId' => (string) ($row['user_id'] ?? ''),
			'createdAt' => dashboard_format_datetime_output($row['created_at'] ?? ''),
			'updatedAt' => dashboard_format_datetime_output($row['updated_at'] ?? ''),
			'status' => dashboard_trim_string($row['status'] ?? 'active') ?: 'active',
		];
	}

	return $records;
}

function dashboard_replace_lunch_collection(PDO $pdo, $records): void
{
	$list = is_array($records) ? array_values(array_filter($records, 'is_array')) : [];
	$now = dashboard_now_iso();
	$rows = [];
	$activeByUser = [];
	$activeBySlot = [];

	foreach ($list as $index => $record) {
		$userId = dashboard_trim_string($record['userId'] ?? '');
		$date = dashboard_normalize_date_value($record['date'] ?? '');
		$timeSlot = dashboard_trim_string($record['timeSlot'] ?? '');
		$status = dashboard_trim_string($record['status'] ?? 'active');
		$status = $status === 'cancelled' ? 'cancelled' : 'active';

		if ($userId === '' || $date === null || $timeSlot === '') {
			continue;
		}

		if ($status === 'active') {
			$userKey = $date . '::' . $userId;
			$slotKey = $date . '::' . $timeSlot;

			if (isset($activeByUser[$userKey])) {
				throw new RuntimeException('Uzytkownik moze miec tylko jedna aktywna rezerwacje obiadowa dziennie.');
			}

			$activeByUser[$userKey] = true;
			$activeBySlot[$slotKey] = (int) ($activeBySlot[$slotKey] ?? 0) + 1;
			if ($activeBySlot[$slotKey] > 4) {
				throw new RuntimeException(sprintf('Slot %s dnia %s przekracza limit 4 osob.', $timeSlot, $date));
			}
		}

		$seed = $date . ':' . $timeSlot . ':' . $userId . ':' . $index;
		$rows[] = [
			'id' => dashboard_trim_string($record['id'] ?? '') ?: dashboard_make_fallback_id('lunch', $seed),
			'sort_order' => $index,
			'reservation_date' => $date,
			'time_slot' => $timeSlot,
			'user_id' => $userId,
			'created_at' => dashboard_normalize_datetime_value($record['createdAt'] ?? '', $now) ?? $now,
			'updated_at' => dashboard_normalize_datetime_value($record['updatedAt'] ?? '', $now) ?? $now,
			'status' => $status,
		];
	}

	dashboard_replace_rows($pdo, 'dashboard_lunch_reservations', $rows);
}

function dashboard_fetch_notes_collection(PDO $pdo): array
{
	$statement = $pdo->query(
		'SELECT id, content, author_id, created_at, updated_at, is_pinned, pinned_at, pinned_by
		FROM dashboard_notes
		ORDER BY sort_order ASC, created_at ASC, id ASC'
	);

	$records = [];
	while ($row = $statement->fetch()) {
		$records[] = [
			'id' => (string) ($row['id'] ?? ''),
			'content' => dashboard_trim_string($row['content'] ?? ''),
			'authorId' => (string) ($row['author_id'] ?? ''),
			'createdAt' => dashboard_format_datetime_output($row['created_at'] ?? ''),
			'updatedAt' => dashboard_format_datetime_output($row['updated_at'] ?? ''),
			'isPinned' => dashboard_boolean_from_database($row['is_pinned'] ?? false),
			'pinnedAt' => dashboard_format_datetime_output($row['pinned_at'] ?? ''),
			'pinnedBy' => dashboard_trim_string($row['pinned_by'] ?? ''),
		];
	}

	return $records;
}

function dashboard_replace_notes_collection(PDO $pdo, $records): void
{
	$list = is_array($records) ? array_values(array_filter($records, 'is_array')) : [];
	$now = dashboard_now_iso();
	$rows = [];

	foreach ($list as $index => $record) {
		$content = dashboard_trim_string($record['content'] ?? '');
		$authorId = dashboard_trim_string($record['authorId'] ?? '');
		if ($content === '' || $authorId === '') {
			continue;
		}

		$seed = $authorId . ':' . $content . ':' . $index;
		$isPinned = !empty($record['isPinned']);
		$rows[] = [
			'id' => dashboard_trim_string($record['id'] ?? '') ?: dashboard_make_fallback_id('note', $seed),
			'sort_order' => $index,
			'content' => $content,
			'author_id' => $authorId,
			'created_at' => dashboard_normalize_datetime_value($record['createdAt'] ?? '', $now) ?? $now,
			'updated_at' => dashboard_normalize_datetime_value($record['updatedAt'] ?? '', $now) ?? $now,
			'is_pinned' => $isPinned,
			'pinned_at' => $isPinned ? dashboard_normalize_datetime_value($record['pinnedAt'] ?? '', $now) : null,
			'pinned_by' => $isPinned ? dashboard_trim_string($record['pinnedBy'] ?? '') : '',
		];
	}

	dashboard_replace_rows($pdo, 'dashboard_notes', $rows);
}

function dashboard_fetch_notes_active_viewers_collection(PDO $pdo): array
{
	$statement = $pdo->query(
		'SELECT tab_id, user_id, login, full_name, avatar_id, avatar_image, last_seen_at
		FROM dashboard_notes_active_viewers
		ORDER BY sort_order ASC, last_seen_at ASC, tab_id ASC'
	);

	$records = [];
	while ($row = $statement->fetch()) {
		$records[] = [
			'tabId' => (string) ($row['tab_id'] ?? ''),
			'userId' => (string) ($row['user_id'] ?? ''),
			'login' => dashboard_trim_string($row['login'] ?? ''),
			'fullName' => dashboard_trim_string($row['full_name'] ?? ''),
			'avatarId' => dashboard_trim_string($row['avatar_id'] ?? ''),
			'avatarImage' => dashboard_trim_string($row['avatar_image'] ?? ''),
			'lastSeenAt' => dashboard_format_datetime_output($row['last_seen_at'] ?? ''),
		];
	}

	return $records;
}

function dashboard_replace_notes_active_viewers_collection(PDO $pdo, $records): void
{
	$list = is_array($records) ? array_values(array_filter($records, 'is_array')) : [];
	$now = dashboard_now_iso();
	$rows = [];

	foreach ($list as $index => $record) {
		$userId = dashboard_trim_string($record['userId'] ?? '');
		$tabId = dashboard_trim_string($record['tabId'] ?? '');
		if ($userId === '' || $tabId === '') {
			continue;
		}

		$rows[] = [
			'tab_id' => $tabId,
			'sort_order' => $index,
			'user_id' => $userId,
			'login' => dashboard_trim_string($record['login'] ?? ''),
			'full_name' => dashboard_trim_string($record['fullName'] ?? ''),
			'avatar_id' => dashboard_trim_string($record['avatarId'] ?? ''),
			'avatar_image' => dashboard_trim_string($record['avatarImage'] ?? ''),
			'last_seen_at' => dashboard_normalize_datetime_value($record['lastSeenAt'] ?? '', $now) ?? $now,
		];
	}

	dashboard_replace_rows($pdo, 'dashboard_notes_active_viewers', $rows);
}

function dashboard_fetch_announcements_collection(PDO $pdo): array
{
	$statement = $pdo->query(
		'SELECT id, title, content, author_id, created_at, updated_at, is_pinned
		FROM dashboard_announcements
		ORDER BY sort_order ASC, updated_at DESC, id ASC'
	);

	$records = [];
	while ($row = $statement->fetch()) {
		$records[] = [
			'id' => (string) ($row['id'] ?? ''),
			'title' => dashboard_trim_string($row['title'] ?? ''),
			'content' => dashboard_trim_string($row['content'] ?? ''),
			'authorId' => (string) ($row['author_id'] ?? ''),
			'createdAt' => dashboard_format_datetime_output($row['created_at'] ?? ''),
			'updatedAt' => dashboard_format_datetime_output($row['updated_at'] ?? ''),
			'isPinned' => dashboard_boolean_from_database($row['is_pinned'] ?? true),
		];
	}

	return $records;
}

function dashboard_replace_announcements_collection(PDO $pdo, $records): void
{
	$list = is_array($records) ? array_values(array_filter($records, 'is_array')) : [];
	$now = dashboard_now_iso();
	$rows = [];

	foreach ($list as $index => $record) {
		$title = dashboard_trim_string($record['title'] ?? '');
		$content = dashboard_trim_string($record['content'] ?? '');
		$authorId = dashboard_trim_string($record['authorId'] ?? '');
		if ($title === '' || $content === '' || $authorId === '') {
			continue;
		}

		$seed = $authorId . ':' . $title . ':' . $index;
		$rows[] = [
			'id' => dashboard_trim_string($record['id'] ?? '') ?: dashboard_make_fallback_id('announcement', $seed),
			'sort_order' => $index,
			'title' => $title,
			'content' => $content,
			'author_id' => $authorId,
			'created_at' => dashboard_normalize_datetime_value($record['createdAt'] ?? '', $now) ?? $now,
			'updated_at' => dashboard_normalize_datetime_value($record['updatedAt'] ?? '', $now) ?? $now,
			'is_pinned' => array_key_exists('isPinned', $record) ? !empty($record['isPinned']) : true,
		];
	}

	dashboard_replace_rows($pdo, 'dashboard_announcements', $rows);
}

function dashboard_fetch_tasks_collection(PDO $pdo): array
{
	$statement = $pdo->query(
		'SELECT id, title, description, assigned_to_user_id, created_by, updated_by, created_at, updated_at, status, priority
		FROM dashboard_tasks
		ORDER BY sort_order ASC, updated_at DESC, id ASC'
	);

	$records = [];
	while ($row = $statement->fetch()) {
		$records[] = [
			'id' => (string) ($row['id'] ?? ''),
			'title' => dashboard_trim_string($row['title'] ?? ''),
			'description' => dashboard_trim_string($row['description'] ?? ''),
			'assignedToUserId' => (string) ($row['assigned_to_user_id'] ?? ''),
			'createdBy' => dashboard_trim_string($row['created_by'] ?? ''),
			'updatedBy' => dashboard_trim_string($row['updated_by'] ?? ''),
			'createdAt' => dashboard_format_datetime_output($row['created_at'] ?? ''),
			'updatedAt' => dashboard_format_datetime_output($row['updated_at'] ?? ''),
			'status' => dashboard_trim_string($row['status'] ?? 'todo') ?: 'todo',
			'priority' => dashboard_trim_string($row['priority'] ?? 'medium') ?: 'medium',
		];
	}

	return $records;
}

function dashboard_replace_tasks_collection(PDO $pdo, $records): void
{
	$list = is_array($records) ? array_values(array_filter($records, 'is_array')) : [];
	$now = dashboard_now_iso();
	$rows = [];

	foreach ($list as $index => $record) {
		$title = dashboard_trim_string($record['title'] ?? '');
		$description = dashboard_trim_string($record['description'] ?? '');
		$assignedToUserId = dashboard_trim_string($record['assignedToUserId'] ?? '');
		if ($title === '' || $description === '' || $assignedToUserId === '') {
			continue;
		}

		$status = dashboard_trim_string($record['status'] ?? 'todo');
		if (!in_array($status, ['todo', 'in_progress', 'done'], true)) {
			$status = 'todo';
		}

		$priority = dashboard_trim_string($record['priority'] ?? 'medium');
		if (!in_array($priority, ['low', 'medium', 'high'], true)) {
			$priority = 'medium';
		}

		$seed = $assignedToUserId . ':' . $title . ':' . $index;
		$rows[] = [
			'id' => dashboard_trim_string($record['id'] ?? '') ?: dashboard_make_fallback_id('task', $seed),
			'sort_order' => $index,
			'title' => $title,
			'description' => $description,
			'assigned_to_user_id' => $assignedToUserId,
			'created_by' => dashboard_trim_string($record['createdBy'] ?? ''),
			'updated_by' => dashboard_trim_string($record['updatedBy'] ?? ''),
			'created_at' => dashboard_normalize_datetime_value($record['createdAt'] ?? '', $now) ?? $now,
			'updated_at' => dashboard_normalize_datetime_value($record['updatedAt'] ?? '', $now) ?? $now,
			'status' => $status,
			'priority' => $priority,
		];
	}

	dashboard_replace_rows($pdo, 'dashboard_tasks', $rows);
}

function dashboard_fetch_tester_feedback_collection(PDO $pdo): array
{
	$statement = $pdo->query(
		'SELECT id, author_name, author_id, author_avatar_id, author_avatar_image, area, category, severity, message, created_at, updated_at
		FROM dashboard_tester_feedback
		ORDER BY sort_order ASC, updated_at DESC, id ASC'
	);

	$records = [];
	while ($row = $statement->fetch()) {
		$records[] = [
			'id' => (string) ($row['id'] ?? ''),
			'authorName' => dashboard_trim_string($row['author_name'] ?? ''),
			'authorId' => (string) ($row['author_id'] ?? ''),
			'authorAvatarId' => dashboard_trim_string($row['author_avatar_id'] ?? 'blue') ?: 'blue',
			'authorAvatarImage' => dashboard_trim_string($row['author_avatar_image'] ?? ''),
			'area' => dashboard_trim_string($row['area'] ?? ''),
			'category' => dashboard_trim_string($row['category'] ?? 'bug') ?: 'bug',
			'severity' => dashboard_trim_string($row['severity'] ?? 'medium') ?: 'medium',
			'message' => dashboard_trim_string($row['message'] ?? ''),
			'createdAt' => dashboard_format_datetime_output($row['created_at'] ?? ''),
			'updatedAt' => dashboard_format_datetime_output($row['updated_at'] ?? ''),
		];
	}

	return $records;
}

function dashboard_replace_tester_feedback_collection(PDO $pdo, $records): void
{
	$list = is_array($records) ? array_values(array_filter($records, 'is_array')) : [];
	$now = dashboard_now_iso();
	$rows = [];

	foreach ($list as $index => $record) {
		$authorName = dashboard_trim_string($record['authorName'] ?? '');
		$message = dashboard_trim_string($record['message'] ?? '');
		if ($authorName === '' || $message === '') {
			continue;
		}

		$category = dashboard_trim_string($record['category'] ?? 'bug');
		if (!in_array($category, ['bug', 'ux', 'idea', 'note'], true)) {
			$category = 'bug';
		}

		$severity = dashboard_trim_string($record['severity'] ?? 'medium');
		if (!in_array($severity, ['critical', 'high', 'medium', 'low'], true)) {
			$severity = 'medium';
		}

		$authorId = dashboard_trim_string($record['authorId'] ?? '');
		$seed = $authorName . ':' . $message . ':' . $index;
		$rows[] = [
			'id' => dashboard_trim_string($record['id'] ?? '') ?: dashboard_make_fallback_id('tester-feedback', $seed),
			'sort_order' => $index,
			'author_name' => $authorName,
			'author_id' => $authorId !== '' ? $authorId : null,
			'author_avatar_id' => dashboard_trim_string($record['authorAvatarId'] ?? 'blue') ?: 'blue',
			'author_avatar_image' => dashboard_trim_string($record['authorAvatarImage'] ?? ''),
			'area' => dashboard_trim_string($record['area'] ?? ''),
			'category' => $category,
			'severity' => $severity,
			'message' => $message,
			'created_at' => dashboard_normalize_datetime_value($record['createdAt'] ?? '', $now) ?? $now,
			'updated_at' => dashboard_normalize_datetime_value($record['updatedAt'] ?? '', $now) ?? $now,
		];
	}

	dashboard_replace_rows($pdo, 'dashboard_tester_feedback', $rows);
}

function dashboard_fetch_monitor_collection(PDO $pdo): array
{
	$statement = $pdo->query(
		'SELECT external_id, name, ru, sn, device_date, last_extended_on, created_by_actor, updated_by_actor, created_at, updated_at
		FROM dashboard_monitor_devices
		ORDER BY sort_order ASC, updated_at DESC, id ASC'
	);

	$records = [];
	while ($row = $statement->fetch()) {
		$record = [
			'name' => dashboard_trim_string($row['name'] ?? ''),
			'ru' => dashboard_trim_string($row['ru'] ?? ''),
			'sn' => dashboard_trim_string($row['sn'] ?? ''),
			'date' => dashboard_format_date_output($row['device_date'] ?? ''),
			'lastExtendedOn' => dashboard_format_date_output($row['last_extended_on'] ?? ''),
			'createdBy' => dashboard_normalize_actor_snapshot(
				dashboard_decode_json_or_fallback($row['created_by_actor'] ?? null, null)
			),
			'updatedBy' => dashboard_normalize_actor_snapshot(
				dashboard_decode_json_or_fallback($row['updated_by_actor'] ?? null, null)
			),
			'createdAt' => dashboard_format_datetime_output($row['created_at'] ?? ''),
			'updatedAt' => dashboard_format_datetime_output($row['updated_at'] ?? ''),
		];

		$externalId = dashboard_trim_string($row['external_id'] ?? '');
		if ($externalId !== '') {
			$record['id'] = $externalId;
		}

		$records[] = $record;
	}

	return $records;
}

function dashboard_replace_monitor_collection(PDO $pdo, $records): void
{
	$list = is_array($records) ? array_values(array_filter($records, 'is_array')) : [];
	$now = dashboard_now_iso();
	$rows = [];

	foreach ($list as $index => $record) {
		$name = dashboard_trim_string($record['name'] ?? '');
		$ru = dashboard_trim_string($record['ru'] ?? '');
		$sn = dashboard_trim_string($record['sn'] ?? '');
		if ($name === '' || $ru === '' || $sn === '') {
			continue;
		}

		$rows[] = [
			'sort_order' => $index,
			'external_id' => dashboard_trim_string($record['id'] ?? ''),
			'name' => $name,
			'ru' => $ru,
			'sn' => $sn,
			'device_date' => dashboard_normalize_date_value($record['date'] ?? ''),
			'last_extended_on' => dashboard_normalize_date_value($record['lastExtendedOn'] ?? ''),
			'created_by_actor' => ($actor = dashboard_normalize_actor_snapshot($record['createdBy'] ?? null)) ? dashboard_encode_json_value($actor) : null,
			'updated_by_actor' => ($actor = dashboard_normalize_actor_snapshot($record['updatedBy'] ?? null)) ? dashboard_encode_json_value($actor) : null,
			'created_at' => dashboard_normalize_datetime_value($record['createdAt'] ?? '', $now) ?? $now,
			'updated_at' => dashboard_normalize_datetime_value($record['updatedAt'] ?? '', $now) ?? $now,
		];
	}

	dashboard_replace_rows($pdo, 'dashboard_monitor_devices', $rows, ['created_by_actor', 'updated_by_actor']);
}

function dashboard_fetch_hires_collection(PDO $pdo): array
{
	$statement = $pdo->query(
		'SELECT external_id, name, ru, sn, hire_date, accessories, created_by_actor, updated_by_actor, created_at, updated_at
		FROM dashboard_hires
		ORDER BY sort_order ASC, updated_at DESC, id ASC'
	);

	$records = [];
	while ($row = $statement->fetch()) {
		$record = [
			'name' => dashboard_trim_string($row['name'] ?? ''),
			'ru' => dashboard_trim_string($row['ru'] ?? ''),
			'sn' => dashboard_trim_string($row['sn'] ?? ''),
			'date' => dashboard_format_date_output($row['hire_date'] ?? ''),
			'accessories' => dashboard_normalize_string_array(
				dashboard_decode_json_or_fallback($row['accessories'] ?? '[]', [])
			),
			'createdBy' => dashboard_normalize_actor_snapshot(
				dashboard_decode_json_or_fallback($row['created_by_actor'] ?? null, null)
			),
			'updatedBy' => dashboard_normalize_actor_snapshot(
				dashboard_decode_json_or_fallback($row['updated_by_actor'] ?? null, null)
			),
			'createdAt' => dashboard_format_datetime_output($row['created_at'] ?? ''),
			'updatedAt' => dashboard_format_datetime_output($row['updated_at'] ?? ''),
		];

		$externalId = dashboard_trim_string($row['external_id'] ?? '');
		if ($externalId !== '') {
			$record['id'] = $externalId;
		}

		$records[] = $record;
	}

	return $records;
}

function dashboard_replace_hires_collection(PDO $pdo, $records): void
{
	$list = is_array($records) ? array_values(array_filter($records, 'is_array')) : [];
	$now = dashboard_now_iso();
	$rows = [];

	foreach ($list as $index => $record) {
		$name = dashboard_trim_string($record['name'] ?? '');
		$ru = dashboard_trim_string($record['ru'] ?? '');
		$sn = dashboard_trim_string($record['sn'] ?? '');
		if ($name === '' || $ru === '' || $sn === '') {
			continue;
		}

		$rows[] = [
			'sort_order' => $index,
			'external_id' => dashboard_trim_string($record['id'] ?? ''),
			'name' => $name,
			'ru' => $ru,
			'sn' => $sn,
			'hire_date' => dashboard_normalize_date_value($record['date'] ?? ''),
			'accessories' => dashboard_encode_json_value(dashboard_normalize_string_array($record['accessories'] ?? [])),
			'created_by_actor' => ($actor = dashboard_normalize_actor_snapshot($record['createdBy'] ?? null)) ? dashboard_encode_json_value($actor) : null,
			'updated_by_actor' => ($actor = dashboard_normalize_actor_snapshot($record['updatedBy'] ?? null)) ? dashboard_encode_json_value($actor) : null,
			'created_at' => dashboard_normalize_datetime_value($record['createdAt'] ?? '', $now) ?? $now,
			'updated_at' => dashboard_normalize_datetime_value($record['updatedAt'] ?? '', $now) ?? $now,
		];
	}

	dashboard_replace_rows($pdo, 'dashboard_hires', $rows, ['accessories', 'created_by_actor', 'updated_by_actor']);
}

function dashboard_fetch_exchanges_collection(PDO $pdo): array
{
	$statement = $pdo->query(
		'SELECT external_id, name, planned_date, old_sn, new_sn, accessories, notes, status, created_by_actor, updated_by_actor, created_at, updated_at
		FROM dashboard_exchanges
		ORDER BY sort_order ASC, updated_at DESC, id ASC'
	);

	$records = [];
	while ($row = $statement->fetch()) {
		$record = [
			'name' => dashboard_trim_string($row['name'] ?? ''),
			'plannedDate' => dashboard_format_date_output($row['planned_date'] ?? ''),
			'oldSn' => dashboard_trim_string($row['old_sn'] ?? ''),
			'newSn' => dashboard_trim_string($row['new_sn'] ?? ''),
			'accessories' => dashboard_normalize_string_array(
				dashboard_decode_json_or_fallback($row['accessories'] ?? '[]', [])
			),
			'notes' => dashboard_trim_string($row['notes'] ?? ''),
			'status' => dashboard_trim_string($row['status'] ?? 'pending') ?: 'pending',
			'createdBy' => dashboard_normalize_actor_snapshot(
				dashboard_decode_json_or_fallback($row['created_by_actor'] ?? null, null)
			),
			'updatedBy' => dashboard_normalize_actor_snapshot(
				dashboard_decode_json_or_fallback($row['updated_by_actor'] ?? null, null)
			),
			'createdAt' => dashboard_format_datetime_output($row['created_at'] ?? ''),
			'updatedAt' => dashboard_format_datetime_output($row['updated_at'] ?? ''),
		];

		$externalId = dashboard_trim_string($row['external_id'] ?? '');
		if ($externalId !== '') {
			$record['id'] = $externalId;
		}

		$records[] = $record;
	}

	return $records;
}

function dashboard_replace_exchanges_collection(PDO $pdo, $records): void
{
	$list = is_array($records) ? array_values(array_filter($records, 'is_array')) : [];
	$now = dashboard_now_iso();
	$rows = [];

	foreach ($list as $index => $record) {
		$name = dashboard_trim_string($record['name'] ?? '');
		$plannedDate = dashboard_normalize_date_value($record['plannedDate'] ?? '');
		if ($name === '' || $plannedDate === null) {
			continue;
		}

		$status = dashboard_trim_string($record['status'] ?? 'pending');
		if (!in_array($status, ['pending', 'done'], true)) {
			$status = 'pending';
		}

		$rows[] = [
			'sort_order' => $index,
			'external_id' => dashboard_trim_string($record['id'] ?? ''),
			'name' => $name,
			'planned_date' => $plannedDate,
			'old_sn' => dashboard_trim_string($record['oldSn'] ?? ''),
			'new_sn' => dashboard_trim_string($record['newSn'] ?? ''),
			'accessories' => dashboard_encode_json_value(dashboard_normalize_string_array($record['accessories'] ?? [])),
			'notes' => dashboard_trim_string($record['notes'] ?? ''),
			'status' => $status,
			'created_by_actor' => ($actor = dashboard_normalize_actor_snapshot($record['createdBy'] ?? null)) ? dashboard_encode_json_value($actor) : null,
			'updated_by_actor' => ($actor = dashboard_normalize_actor_snapshot($record['updatedBy'] ?? null)) ? dashboard_encode_json_value($actor) : null,
			'created_at' => dashboard_normalize_datetime_value($record['createdAt'] ?? '', $now) ?? $now,
			'updated_at' => dashboard_normalize_datetime_value($record['updatedAt'] ?? '', $now) ?? $now,
		];
	}

	dashboard_replace_rows($pdo, 'dashboard_exchanges', $rows, ['accessories', 'created_by_actor', 'updated_by_actor']);
}
