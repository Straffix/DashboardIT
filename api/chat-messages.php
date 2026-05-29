<?php
declare(strict_types=1);

require_once __DIR__ . '/_response.php';
require_once __DIR__ . '/_store.php';
require_once __DIR__ . '/_auth.php';

try {
	$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
	$pdo = dashboard_database();

	if ($method === 'POST') {
		$currentUser = dashboard_require_authenticated_user();
		$payload = dashboard_get_json_body();
		$content = (string) ($payload['content'] ?? '');

		$pdo->beginTransaction();
		try {
			$chatMessage = dashboard_create_chat_message($pdo, $content, (string) ($currentUser['id'] ?? ''));
			$pdo->commit();
		} catch (Throwable $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			throw $error;
		}

		dashboard_json_response([
			'ok' => true,
			'chatMessage' => $chatMessage,
		]);
	}

	if ($method === 'PATCH') {
		$currentUser = dashboard_require_authenticated_user();
		$payload = dashboard_get_json_body();
		$messageId = trim((string) ($payload['messageId'] ?? ''));
		if ($messageId === '') {
			dashboard_json_response([
				'ok' => false,
				'message' => 'Brakuje identyfikatora wiadomosci.',
			], 400);
		}

		$pdo->beginTransaction();
		try {
			if (array_key_exists('isPinned', $payload)) {
				$chatMessage = dashboard_set_chat_message_pinned($pdo, $messageId, !empty($payload['isPinned']), $currentUser);
			} else {
				$chatMessage = dashboard_update_chat_message($pdo, $messageId, (string) ($payload['content'] ?? ''), $currentUser);
			}
			$pdo->commit();
		} catch (Throwable $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			throw $error;
		}

		dashboard_json_response([
			'ok' => true,
			'chatMessage' => $chatMessage,
		]);
	}

	if ($method === 'DELETE') {
		$currentUser = dashboard_require_authenticated_user();
		$messageId = trim((string) ($_GET['messageId'] ?? ''));
		if ($messageId === '') {
			dashboard_json_response([
				'ok' => false,
				'message' => 'Brakuje identyfikatora wiadomosci.',
			], 400);
		}

		$pdo->beginTransaction();
		try {
			$chatMessage = dashboard_delete_chat_message($pdo, $messageId, $currentUser);
			$pdo->commit();
		} catch (Throwable $error) {
			if ($pdo->inTransaction()) {
				$pdo->rollBack();
			}
			throw $error;
		}

		dashboard_json_response([
			'ok' => true,
			'chatMessage' => $chatMessage,
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
		'message' => 'Wystapil blad podczas obslugi wiadomosci czatu.',
	], 500);
}
