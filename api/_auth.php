<?php
declare(strict_types=1);

require_once __DIR__ . '/_store.php';
require_once __DIR__ . '/_response.php';

const DASHBOARD_PERMISSION_IDS = ['it_support', 'network', 'printers', 'rooms'];
const DASHBOARD_MIN_PASSWORD_LENGTH = 8;
const DASHBOARD_PROFILE_IMAGE_MAX_LENGTH = 2500000;
const DASHBOARD_TEST_ADMIN_LOGIN = 'admin';
const DASHBOARD_TEST_ADMIN_PASSWORD = 'admin321';
const DASHBOARD_LOGIN_MAX_ATTEMPTS = 10;
const DASHBOARD_LOGIN_WINDOW_SECONDS = 300;

function dashboard_start_session(): void
{
	if (session_status() === PHP_SESSION_ACTIVE) {
		return;
	}

	session_name('dashboardit_session');
	session_start([
		'cookie_httponly' => true,
		'cookie_samesite' => 'Lax',
		'cookie_secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
		'use_strict_mode' => true,
	]);
}

function dashboard_normalize_login(string $login): string
{
	$normalizedLogin = strtolower(trim($login));
	$normalizedLogin = preg_replace('/\s+/', '', $normalizedLogin) ?? '';
	return preg_replace('/[^a-z0-9._-]/', '', $normalizedLogin) ?? '';
}

function dashboard_normalize_role(string $role): string
{
	return $role === 'admin' ? 'admin' : 'user';
}

function dashboard_get_all_permission_ids(): array
{
	return DASHBOARD_PERMISSION_IDS;
}

function dashboard_normalize_permissions($permissions): array
{
	if (!is_array($permissions)) {
		return [];
	}

	$allowedPermissions = array_flip(dashboard_get_all_permission_ids());
	$normalizedPermissions = [];

	foreach ($permissions as $permission) {
		$normalizedPermission = trim((string) $permission);
		if ($normalizedPermission !== '' && isset($allowedPermissions[$normalizedPermission])) {
			$normalizedPermissions[$normalizedPermission] = true;
		}
	}

	return array_keys($normalizedPermissions);
}

function dashboard_normalize_avatar_image(string $avatarImage): string
{
	$normalizedImage = trim($avatarImage);
	if ($normalizedImage === '' || strlen($normalizedImage) > DASHBOARD_PROFILE_IMAGE_MAX_LENGTH) {
		return '';
	}

	return preg_match('/^data:image\/(?:png|jpe?g|webp|gif);base64,/i', $normalizedImage) === 1 ? $normalizedImage : '';
}

function dashboard_normalize_profile_cover_image(string $coverImage): string
{
	return dashboard_normalize_avatar_image($coverImage);
}

function dashboard_normalize_profile_accent_color(string $accentColor): string
{
	$normalizedColor = strtolower(trim($accentColor));
	return preg_match('/^#[0-9a-f]{6}$/', $normalizedColor) === 1 ? $normalizedColor : '#0f766e';
}

function dashboard_normalize_profile_title(string $profileTitle): string
{
	return mb_substr(trim($profileTitle), 0, 80);
}

function dashboard_normalize_profile_bio(string $profileBio): string
{
	return mb_substr(trim($profileBio), 0, 240);
}

function dashboard_normalize_users_array($users): array
{
	return is_array($users) ? array_values(array_filter($users, static fn ($user): bool => is_array($user))) : [];
}

function dashboard_is_demo_account_record(array $user): bool
{
	$id = trim((string) ($user['id'] ?? ''));
	$login = dashboard_normalize_login((string) ($user['login'] ?? ''));

	return !empty($user['isDemo'])
		|| $id === 'demo-admin'
		|| preg_match('/^demo-user-\d+$/', $id) === 1
		|| $login === 'demoarek';
}

function dashboard_users_config_path(): string
{
	return dirname(__DIR__) . '/config/users.json';
}

function dashboard_load_user_config_entries(): array
{
	$configPath = dashboard_users_config_path();
	if (!is_file($configPath)) {
		return [];
	}

	$content = file_get_contents($configPath);
	if ($content === false || trim($content) === '') {
		return [];
	}

	$decoded = json_decode($content, true);
	if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
		return [];
	}

	$entries = is_array($decoded['users'] ?? null) ? $decoded['users'] : $decoded;
	return array_values(array_filter($entries, static function ($entry): bool {
		return is_array($entry)
			&& (
				trim((string) ($entry['id'] ?? '')) !== ''
				|| dashboard_normalize_login((string) ($entry['login'] ?? '')) !== ''
			);
	}));
}

function dashboard_apply_user_config_overlay(array $user, array $config): array
{
	$nextUser = $user;
	$role = array_key_exists('role', $config)
		? dashboard_normalize_role((string) ($config['role'] ?? 'user'))
		: dashboard_normalize_role((string) ($user['role'] ?? 'user'));

	$nextUser['role'] = $role;
	$nextUser['permissions'] = $role === 'admin'
		? dashboard_get_all_permission_ids()
		: (array_key_exists('permissions', $config)
			? dashboard_normalize_permissions($config['permissions'])
			: dashboard_normalize_permissions($user['permissions'] ?? []));

	if (array_key_exists('fullName', $config)) {
		$fullName = trim((string) ($config['fullName'] ?? ''));
		if ($fullName !== '') {
			$nextUser['fullName'] = $fullName;
		}
	}
	if (array_key_exists('login', $config)) {
		$login = dashboard_normalize_login((string) ($config['login'] ?? ''));
		if ($login !== '') {
			$nextUser['login'] = $login;
		}
	}
	if (array_key_exists('avatarId', $config)) {
		$nextUser['avatarId'] = trim((string) ($config['avatarId'] ?? 'violet')) ?: 'violet';
	}
	if (array_key_exists('avatarImage', $config)) {
		$nextUser['avatarImage'] = dashboard_normalize_avatar_image((string) ($config['avatarImage'] ?? ''));
	}
	if (array_key_exists('profileTitle', $config)) {
		$nextUser['profileTitle'] = dashboard_normalize_profile_title((string) ($config['profileTitle'] ?? ''));
	}
	if (array_key_exists('profileBio', $config)) {
		$nextUser['profileBio'] = dashboard_normalize_profile_bio((string) ($config['profileBio'] ?? ''));
	}
	if (array_key_exists('profileAccentColor', $config)) {
		$nextUser['profileAccentColor'] = dashboard_normalize_profile_accent_color((string) ($config['profileAccentColor'] ?? '#0f766e'));
	}
	if (array_key_exists('profileCoverImage', $config)) {
		$nextUser['profileCoverImage'] = dashboard_normalize_profile_cover_image((string) ($config['profileCoverImage'] ?? ''));
	}

	if ($nextUser != $user) {
		$nextUser['updatedAt'] = gmdate('c');
	}

	return $nextUser;
}

function dashboard_sync_user_config_accounts(): void
{
	$configEntries = dashboard_load_user_config_entries();
	if (!$configEntries) {
		return;
	}

	$configById = [];
	$configByLogin = [];
	foreach ($configEntries as $entry) {
		$id = trim((string) ($entry['id'] ?? ''));
		$login = dashboard_normalize_login((string) ($entry['login'] ?? ''));
		if ($id !== '') {
			$configById[$id] = $entry;
		}
		if ($login !== '') {
			$configByLogin[$login] = $entry;
		}
	}

	$users = dashboard_normalize_users_array(dashboard_read_json_file(dashboard_users_path(), []));
	$claimedLoginOwners = [];
	foreach ($users as $user) {
		$login = dashboard_normalize_login((string) ($user['login'] ?? ''));
		if ($login === '') {
			continue;
		}
		$claimedLoginOwners[$login] = trim((string) ($user['id'] ?? '')) ?: $login;
	}

	$nextUsers = [];
	foreach ($users as $user) {
		$id = trim((string) ($user['id'] ?? ''));
		$login = dashboard_normalize_login((string) ($user['login'] ?? ''));
		$config = ($id !== '' && isset($configById[$id]))
			? $configById[$id]
			: ($configByLogin[$login] ?? null);

		if (!$config) {
			$nextUsers[] = $user;
			continue;
		}

		if (array_key_exists('login', $config)) {
			$nextLogin = dashboard_normalize_login((string) ($config['login'] ?? ''));
			$ownerKey = $id !== '' ? $id : $login;
			$claimedOwner = $claimedLoginOwners[$nextLogin] ?? null;

			if ($nextLogin === '' || ($claimedOwner !== null && $claimedOwner !== $ownerKey)) {
				unset($config['login']);
			} else {
				if ($login !== '' && ($claimedLoginOwners[$login] ?? null) === $ownerKey) {
					unset($claimedLoginOwners[$login]);
				}
				$claimedLoginOwners[$nextLogin] = $ownerKey;
			}
		}

		$nextUsers[] = dashboard_apply_user_config_overlay($user, $config);
	}

	if ($nextUsers !== $users) {
		dashboard_write_json_file(dashboard_users_path(), $nextUsers);
	}
}

function dashboard_user_config_export_record(array $user): array
{
	$sanitizedUser = dashboard_sanitize_user($user);
	return [
		'id' => $sanitizedUser['id'],
		'login' => $sanitizedUser['login'],
		'fullName' => $sanitizedUser['fullName'],
		'role' => $sanitizedUser['role'],
		'permissions' => $sanitizedUser['role'] === 'admin'
			? dashboard_get_all_permission_ids()
			: dashboard_normalize_permissions($sanitizedUser['permissions'] ?? []),
		'avatarId' => $sanitizedUser['avatarId'],
		'avatarImage' => $sanitizedUser['avatarImage'],
		'profileTitle' => $sanitizedUser['profileTitle'],
		'profileBio' => $sanitizedUser['profileBio'],
		'profileAccentColor' => $sanitizedUser['profileAccentColor'],
		'profileCoverImage' => $sanitizedUser['profileCoverImage'],
		'isTestAccount' => !empty($sanitizedUser['isTestAccount']),
	];
}

function dashboard_build_users_config_payload(array $users): array
{
	$editableUsers = array_values(array_map(
		'dashboard_user_config_export_record',
		array_values(array_filter($users, static fn ($user): bool => is_array($user) && !dashboard_is_demo_account_record($user)))
	));

	return [
		'_purpose' => 'Editable user account metadata exported from DashboardIT. Passwords and passwordHash are intentionally not stored here.',
		'_howToUse' => 'Edit entries in users. The id identifies the account, so login can be changed while preserving the stored password hash.',
		'_important' => 'Create accounts and change passwords from the app UI. Do not add password, passwordHash or temporary passwords to this file.',
		'_allowedRoles' => ['admin', 'user'],
		'_allowedPermissions' => dashboard_get_all_permission_ids(),
		'_updatedAt' => gmdate('c'),
		'users' => $editableUsers,
	];
}

function dashboard_public_users_config_has_same_users(array $currentPayload, array $nextPayload): bool
{
	return json_encode($currentPayload['users'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ===
		json_encode($nextPayload['users'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function dashboard_export_users_config_snapshot(array $users): void
{
	$configPath = dashboard_users_config_path();
	$configDir = dirname($configPath);
	if (!is_dir($configDir) && !mkdir($configDir, 0775, true) && !is_dir($configDir)) {
		return;
	}

	$nextPayload = dashboard_build_users_config_payload($users);
	$currentPayload = [];
	if (is_file($configPath)) {
		$currentContent = file_get_contents($configPath);
		$decodedPayload = $currentContent === false ? null : json_decode($currentContent, true);
		$currentPayload = is_array($decodedPayload) ? $decodedPayload : [];
	}

	if ($currentPayload && dashboard_public_users_config_has_same_users($currentPayload, $nextPayload)) {
		return;
	}

	$encodedPayload = json_encode($nextPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
	if ($encodedPayload === false) {
		return;
	}

	file_put_contents($configPath, $encodedPayload . PHP_EOL, LOCK_EX);
}

function dashboard_build_test_admin_user(?array $existingUser = null): array
{
	$now = gmdate('c');
	return [
		'id' => (string) ($existingUser['id'] ?? 'user-test-admin'),
		'fullName' => trim((string) ($existingUser['fullName'] ?? 'Administrator Testowy')) ?: 'Administrator Testowy',
		'login' => DASHBOARD_TEST_ADMIN_LOGIN,
		'passwordHash' => password_hash(DASHBOARD_TEST_ADMIN_PASSWORD, PASSWORD_DEFAULT),
		'role' => 'admin',
		'permissions' => dashboard_get_all_permission_ids(),
		'avatarId' => trim((string) ($existingUser['avatarId'] ?? 'slate')) ?: 'slate',
		'avatarImage' => dashboard_normalize_avatar_image((string) ($existingUser['avatarImage'] ?? '')),
		'profileTitle' => dashboard_normalize_profile_title((string) ($existingUser['profileTitle'] ?? 'Administrator systemu')),
		'profileBio' => dashboard_normalize_profile_bio((string) ($existingUser['profileBio'] ?? 'Konto testowe do konfiguracji rol i klas uzytkownikow.')),
		'profileAccentColor' => dashboard_normalize_profile_accent_color((string) ($existingUser['profileAccentColor'] ?? '#0f766e')),
		'profileCoverImage' => dashboard_normalize_profile_cover_image((string) ($existingUser['profileCoverImage'] ?? '')),
		'createdAt' => (string) ($existingUser['createdAt'] ?? $now),
		'updatedAt' => $now,
		'isDemo' => !empty($existingUser['isDemo']),
		'isTestAccount' => true,
	];
}

function dashboard_test_admin_enabled(): bool
{
	$value = strtolower(trim((string) getenv('DASHBOARD_ENABLE_TEST_ADMIN')));
	return !in_array($value, ['0', 'false', 'off', 'no'], true);
}

function dashboard_test_admin_requires_update(?array $adminUser): bool
{
	if (!$adminUser) {
		return true;
	}

	$currentHash = (string) ($adminUser['passwordHash'] ?? '');
	return !password_verify(DASHBOARD_TEST_ADMIN_PASSWORD, $currentHash) ||
		dashboard_normalize_role((string) ($adminUser['role'] ?? 'user')) !== 'admin' ||
		count(array_diff(dashboard_get_all_permission_ids(), dashboard_normalize_permissions($adminUser['permissions'] ?? []))) > 0 ||
		empty($adminUser['isTestAccount']);
}

function dashboard_ensure_test_admin_account(): void
{
	if (!dashboard_test_admin_enabled()) {
		return;
	}

	$currentUsers = dashboard_normalize_users_array(dashboard_read_json_file(dashboard_users_path(), []));
	$currentAdminIndex = dashboard_find_user_index_by_login($currentUsers, DASHBOARD_TEST_ADMIN_LOGIN);
	if ($currentAdminIndex !== -1 && !dashboard_test_admin_requires_update($currentUsers[$currentAdminIndex])) {
		return;
	}

	dashboard_update_json_file(dashboard_users_path(), [], function ($users) {
		$users = dashboard_normalize_users_array($users);
		$adminIndex = dashboard_find_user_index_by_login($users, DASHBOARD_TEST_ADMIN_LOGIN);

		if ($adminIndex === -1) {
			$users[] = dashboard_build_test_admin_user(null);
			return $users;
		}

		$currentAdmin = $users[$adminIndex];
		if (dashboard_test_admin_requires_update($currentAdmin)) {
			$users[$adminIndex] = dashboard_build_test_admin_user($currentAdmin);
		}

		return $users;
	});
}

function dashboard_load_users(): array
{
	static $ensuringTestAdmin = false;
	static $testAdminChecked = false;
	static $userConfigSynced = false;

	if (!$testAdminChecked && !$ensuringTestAdmin) {
		$ensuringTestAdmin = true;
		dashboard_ensure_test_admin_account();
		$ensuringTestAdmin = false;
		$testAdminChecked = true;
	}

	if (!$userConfigSynced) {
		dashboard_sync_user_config_accounts();
		$userConfigSynced = true;
	}

	return dashboard_normalize_users_array(dashboard_read_json_file(dashboard_users_path(), []));
}

function dashboard_sanitize_user(array $user): array
{
	$role = dashboard_normalize_role((string) ($user['role'] ?? 'user'));
	$permissions = $role === 'admin'
		? dashboard_get_all_permission_ids()
		: dashboard_normalize_permissions($user['permissions'] ?? []);

	return [
		'id' => (string) ($user['id'] ?? ''),
		'fullName' => trim((string) ($user['fullName'] ?? '')),
		'login' => dashboard_normalize_login((string) ($user['login'] ?? '')),
		'role' => $role,
		'permissions' => $permissions,
		'avatarId' => trim((string) ($user['avatarId'] ?? 'violet')) ?: 'violet',
		'avatarImage' => dashboard_normalize_avatar_image((string) ($user['avatarImage'] ?? '')),
		'profileTitle' => dashboard_normalize_profile_title((string) ($user['profileTitle'] ?? '')),
		'profileBio' => dashboard_normalize_profile_bio((string) ($user['profileBio'] ?? '')),
		'profileAccentColor' => dashboard_normalize_profile_accent_color((string) ($user['profileAccentColor'] ?? '#0f766e')),
		'profileCoverImage' => dashboard_normalize_profile_cover_image((string) ($user['profileCoverImage'] ?? '')),
		'createdAt' => (string) ($user['createdAt'] ?? gmdate('c')),
		'updatedAt' => (string) ($user['updatedAt'] ?? gmdate('c')),
		'isDemo' => !empty($user['isDemo']),
		'isTestAccount' => !empty($user['isTestAccount']),
	];
}

function dashboard_find_user_index_by_login(array $users, string $login): int
{
	$normalizedLogin = dashboard_normalize_login($login);
	foreach ($users as $index => $user) {
		if (dashboard_normalize_login((string) ($user['login'] ?? '')) === $normalizedLogin) {
			return $index;
		}
	}

	return -1;
}

function dashboard_find_user_by_login(array $users, string $login): ?array
{
	$normalizedLogin = dashboard_normalize_login($login);
	foreach ($users as $user) {
		if (dashboard_normalize_login((string) ($user['login'] ?? '')) === $normalizedLogin) {
			return $user;
		}
	}

	return null;
}

function dashboard_find_user_index_by_id(array $users, string $userId): int
{
	foreach ($users as $index => $user) {
		if ((string) ($user['id'] ?? '') === $userId) {
			return $index;
		}
	}

	return -1;
}

function dashboard_get_session_payload(): ?array
{
	dashboard_start_session();
	$session = $_SESSION['dashboard_session'] ?? null;
	if (!is_array($session) || empty($session['userId'])) {
		return null;
	}

	return [
		'userId' => (string) $session['userId'],
		'loginAt' => (string) ($session['loginAt'] ?? gmdate('c')),
	];
}

function dashboard_set_session(string $userId): array
{
	dashboard_start_session();
	session_regenerate_id(true);
	$session = [
		'userId' => $userId,
		'loginAt' => gmdate('c'),
	];
	$_SESSION['dashboard_session'] = $session;
	return $session;
}

function dashboard_get_login_attempt_payload(): array
{
	dashboard_start_session();
	$attempts = $_SESSION['dashboard_login_attempts'] ?? null;
	if (!is_array($attempts)) {
		return ['count' => 0, 'firstAt' => time()];
	}

	$count = (int) ($attempts['count'] ?? 0);
	$firstAt = (int) ($attempts['firstAt'] ?? time());
	if (time() - $firstAt > DASHBOARD_LOGIN_WINDOW_SECONDS) {
		return ['count' => 0, 'firstAt' => time()];
	}

	return ['count' => max(0, $count), 'firstAt' => $firstAt];
}

function dashboard_assert_login_not_rate_limited(): void
{
	$attempts = dashboard_get_login_attempt_payload();
	if ((int) $attempts['count'] < DASHBOARD_LOGIN_MAX_ATTEMPTS) {
		$_SESSION['dashboard_login_attempts'] = $attempts;
		return;
	}

	dashboard_json_response([
		'ok' => false,
		'message' => 'Za duzo nieudanych prob logowania. Sprobuj ponownie za kilka minut.',
	], 429);
}

function dashboard_record_failed_login(): void
{
	$attempts = dashboard_get_login_attempt_payload();
	$attempts['count'] = (int) $attempts['count'] + 1;
	$_SESSION['dashboard_login_attempts'] = $attempts;
}

function dashboard_clear_login_attempts(): void
{
	dashboard_start_session();
	unset($_SESSION['dashboard_login_attempts']);
}

function dashboard_clear_session(): void
{
	dashboard_start_session();
	unset($_SESSION['dashboard_session']);
	if (session_status() === PHP_SESSION_ACTIVE) {
		session_regenerate_id(true);
	}
}

function dashboard_get_current_user(): ?array
{
	$session = dashboard_get_session_payload();
	if (!$session) {
		return null;
	}

	$users = dashboard_load_users();
	$userIndex = dashboard_find_user_index_by_id($users, (string) $session['userId']);
	if ($userIndex === -1) {
		dashboard_clear_session();
		return null;
	}

	return $users[$userIndex];
}

function dashboard_require_authenticated_user(): array
{
	$currentUser = dashboard_get_current_user();
	if (!$currentUser) {
		dashboard_json_response([
			'ok' => false,
			'message' => 'Musisz byc zalogowany, aby wykonac te akcje.',
		], 401);
	}

	return $currentUser;
}

function dashboard_require_admin_user(): array
{
	$currentUser = dashboard_require_authenticated_user();
	if (dashboard_normalize_role((string) ($currentUser['role'] ?? 'user')) !== 'admin') {
		dashboard_json_response([
			'ok' => false,
			'message' => 'Ta akcja wymaga uprawnien lidera.',
		], 403);
	}

	return $currentUser;
}
