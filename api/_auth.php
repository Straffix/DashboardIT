<?php
declare(strict_types=1);

require_once __DIR__ . '/_store.php';
require_once __DIR__ . '/_response.php';

const DASHBOARD_PERMISSION_IDS = ['it_support', 'network', 'printers', 'rooms'];

function dashboard_start_session(): void
{
	if (session_status() === PHP_SESSION_ACTIVE) {
		return;
	}

	session_name('dashboardit_session');
	session_start([
		'cookie_httponly' => true,
		'cookie_samesite' => 'Lax',
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
	return preg_match('/^data:image\//i', $avatarImage) === 1 ? trim($avatarImage) : '';
}

function dashboard_load_users(): array
{
	$users = dashboard_read_json_file(dashboard_users_path(), []);
	if (!is_array($users)) {
		return [];
	}

	return array_values(array_filter($users, static fn ($user): bool => is_array($user)));
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
		'createdAt' => (string) ($user['createdAt'] ?? gmdate('c')),
		'updatedAt' => (string) ($user['updatedAt'] ?? gmdate('c')),
		'isDemo' => !empty($user['isDemo']),
	];
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
	$session = [
		'userId' => $userId,
		'loginAt' => gmdate('c'),
	];
	$_SESSION['dashboard_session'] = $session;
	return $session;
}

function dashboard_clear_session(): void
{
	dashboard_start_session();
	unset($_SESSION['dashboard_session']);
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
