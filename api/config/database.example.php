<?php
declare(strict_types=1);

return [
	// Recommended PostgreSQL database name: lowercase letters, numbers and underscores only.
	'driver' => 'pgsql',
	'host' => '10.0.0.21',
	'port' => 2054,
	'database' => 'dashboard',
	'username' => 'dashboard',
	'password' => 'CHANGE_ME',
	// Use "require" when the hosting panel confirms SSL for the database connection.
	'sslmode' => 'prefer',
	// Optional one-time cleanup for old app data after deployment.
	'one_time_reset' => [
		'enabled' => false,
		'version' => '2026-04-24-clean-start',
	],
];
