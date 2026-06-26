<?php
declare(strict_types=1);

require_once __DIR__ . '/../_auth.php';

try {
	$currentUser = dashboard_require_authenticated_user();
	$payload = dashboard_get_json_body();
	$fullName = trim((string) ($payload['fullName'] ?? ''));
	$login = dashboard_normalize_login((string) ($payload['login'] ?? ''));
	$avatarId = trim((string) ($payload['avatarId'] ?? 'violet')) ?: 'violet';
	$avatarImage = dashboard_normalize_avatar_image((string) ($payload['avatarImage'] ?? ''));
	$profileTitle = dashboard_normalize_profile_title((string) ($payload['profileTitle'] ?? ''));
	$profileBio = dashboard_normalize_profile_bio((string) ($payload['profileBio'] ?? ''));
	$profileAccentColor = dashboard_normalize_profile_accent_color((string) ($payload['profileAccentColor'] ?? '#0f766e'));
	$bookmarkDefaultColor = array_key_exists('bookmarkDefaultColor', $payload)
		? dashboard_normalize_bookmark_default_color((string) ($payload['bookmarkDefaultColor'] ?? DASHBOARD_DEFAULT_BOOKMARK_COLOR))
		: dashboard_normalize_bookmark_default_color((string) ($currentUser['bookmarkDefaultColor'] ?? DASHBOARD_DEFAULT_BOOKMARK_COLOR));
	$profileCoverImage = dashboard_normalize_profile_cover_image((string) ($payload['profileCoverImage'] ?? ''));

	if ($fullName === '') {
		dashboard_json_response(['ok' => false, 'message' => 'Imie i nazwisko nie moze byc puste.'], 422);
	}

	if ($login === '') {
		dashboard_json_response(['ok' => false, 'message' => 'Login nie moze byc pusty.'], 422);
	}

	$updatedUser = null;
	$updatedUsers = dashboard_update_json_file(dashboard_users_path(), [], function ($users) use (&$updatedUser, $currentUser, $fullName, $login, $avatarId, $avatarImage, $profileTitle, $profileBio, $profileAccentColor, $bookmarkDefaultColor, $profileCoverImage) {
		$users = dashboard_normalize_users_array($users);

		foreach ($users as $user) {
			if ((string) ($user['id'] ?? '') !== (string) ($currentUser['id'] ?? '') && dashboard_normalize_login((string) ($user['login'] ?? '')) === $login) {
				throw new RuntimeException('Ten login jest juz zajety.');
			}
		}

		foreach ($users as $index => $user) {
			if ((string) ($user['id'] ?? '') !== (string) ($currentUser['id'] ?? '')) {
				continue;
			}

			$updatedUser = [
				...$user,
				'fullName' => $fullName,
				'login' => $login,
				'avatarId' => $avatarId,
				'avatarImage' => $avatarImage,
				'profileTitle' => $profileTitle,
				'profileBio' => $profileBio,
				'profileAccentColor' => $profileAccentColor,
				'bookmarkDefaultColor' => $bookmarkDefaultColor,
				'profileCoverImage' => $profileCoverImage,
				'updatedAt' => gmdate('c'),
			];
			$users[$index] = $updatedUser;
			break;
		}

		return $users;
	});

	if (!$updatedUser) {
		throw new RuntimeException('Nie znaleziono konta do aktualizacji.');
	}

	dashboard_export_users_config_snapshot($updatedUsers);

	dashboard_json_response([
		'ok' => true,
		'user' => dashboard_sanitize_user($updatedUser),
	]);
} catch (RuntimeException $error) {
	dashboard_json_response([
		'ok' => false,
		'message' => $error->getMessage(),
	], 409);
} catch (Throwable $error) {
	dashboard_json_response([
		'ok' => false,
		'message' => 'Nie udalo sie zapisac profilu na serwerze.',
	], 500);
}
