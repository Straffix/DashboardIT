<?php
declare(strict_types=1);

const DASHBOARD_REMOTE_STORAGE_FILES = [
	'dashboard_user_bookmarks' => 'bookmarks.json',
	'dashboard_lunch_reservations' => 'lunch.json',
	'dashboard_notes_entries' => 'notes.json',
	'dashboard_notes_announcements' => 'announcements.json',
	'dashboard_notes_tasks' => 'tasks.json',
	'dashboard_testers_feedback' => 'testers-feedback.json',
	'monitor_laptopow_dane' => 'monitor.json',
	'nowe_zatrudnienia_dane' => 'hires.json',
	'wymiana_sprzetu_dane' => 'exchanges.json',
];

function dashboard_storage_root(): string
{
	return dirname(__DIR__) . '/storage/data';
}

function dashboard_ensure_storage_root(): void
{
	$storageRoot = dashboard_storage_root();
	if (!is_dir($storageRoot)) {
		mkdir($storageRoot, 0775, true);
	}
}

function dashboard_storage_path(string $fileName): string
{
	dashboard_ensure_storage_root();
	return dashboard_storage_root() . '/' . ltrim($fileName, '/');
}

function dashboard_storage_file_for_key(string $key): string
{
	if (!array_key_exists($key, DASHBOARD_REMOTE_STORAGE_FILES)) {
		throw new InvalidArgumentException('Nieznany klucz danych.');
	}

	return dashboard_storage_path(DASHBOARD_REMOTE_STORAGE_FILES[$key]);
}

function dashboard_users_path(): string
{
	return dashboard_storage_path('users.json');
}

function dashboard_demo_marker_path(): string
{
	return dashboard_storage_path('demo-marker.json');
}

function dashboard_decode_json_or_fallback(string $jsonContent, mixed $fallback): mixed
{
	$trimmedContent = trim($jsonContent);
	if ($trimmedContent === '') {
		return $fallback;
	}

	$decodedValue = json_decode($trimmedContent, true);
	if (json_last_error() !== JSON_ERROR_NONE) {
		return $fallback;
	}

	return $decodedValue;
}

function dashboard_read_json_file(string $path, mixed $fallback): mixed
{
	if (!is_file($path)) {
		return $fallback;
	}

	$handle = fopen($path, 'rb');
	if ($handle === false) {
		return $fallback;
	}

	try {
		if (!flock($handle, LOCK_SH)) {
			return $fallback;
		}

		$fileSize = filesize($path);
		$fileContent = $fileSize > 0 ? (string) fread($handle, $fileSize) : '';
		flock($handle, LOCK_UN);
	} finally {
		fclose($handle);
	}

	return dashboard_decode_json_or_fallback($fileContent, $fallback);
}

function dashboard_write_json_file(string $path, mixed $data): void
{
	dashboard_ensure_storage_root();
	$encodedValue = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
	if ($encodedValue === false) {
		throw new RuntimeException('Nie udalo sie zakodowac danych do JSON.');
	}

	$handle = fopen($path, 'c+');
	if ($handle === false) {
		throw new RuntimeException('Nie udalo sie otworzyc pliku danych do zapisu.');
	}

	try {
		if (!flock($handle, LOCK_EX)) {
			throw new RuntimeException('Nie udalo sie zablokowac pliku danych do zapisu.');
		}

		ftruncate($handle, 0);
		rewind($handle);
		fwrite($handle, $encodedValue);
		fflush($handle);
		flock($handle, LOCK_UN);
	} finally {
		fclose($handle);
	}
}

function dashboard_update_json_file(string $path, mixed $fallback, callable $updater): mixed
{
	dashboard_ensure_storage_root();
	$handle = fopen($path, 'c+');
	if ($handle === false) {
		throw new RuntimeException('Nie udalo sie otworzyc pliku danych.');
	}

	try {
		if (!flock($handle, LOCK_EX)) {
			throw new RuntimeException('Nie udalo sie zablokowac pliku danych.');
		}

		$fileSize = filesize($path);
		$fileContent = $fileSize > 0 ? (string) fread($handle, $fileSize) : '';
		$currentValue = dashboard_decode_json_or_fallback($fileContent, $fallback);
		$nextValue = $updater($currentValue);

		$encodedValue = json_encode($nextValue, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
		if ($encodedValue === false) {
			throw new RuntimeException('Nie udalo sie zapisac danych po aktualizacji.');
		}

		ftruncate($handle, 0);
		rewind($handle);
		fwrite($handle, $encodedValue);
		fflush($handle);
		flock($handle, LOCK_UN);

		return $nextValue;
	} finally {
		fclose($handle);
	}
}
