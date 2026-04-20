<?php
declare(strict_types=1);

function dashboard_json_response(array $payload, int $status = 200): void
{
	http_response_code($status);
	header('Content-Type: application/json; charset=utf-8');
	header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

	echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
	exit;
}

function dashboard_get_json_body(): array
{
	$rawBody = file_get_contents('php://input');
	if ($rawBody === false || trim($rawBody) === '') {
		return [];
	}

	$decodedBody = json_decode($rawBody, true);
	return is_array($decodedBody) ? $decodedBody : [];
}
