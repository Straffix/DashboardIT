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

	if (!$testAdminChecked && !$ensuringTestAdmin) {
		$ensuringTestAdmin = true;
		dashboard_ensure_test_admin_account();
		$ensuringTestAdmin = false;
		$testAdminChecked = true;
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
