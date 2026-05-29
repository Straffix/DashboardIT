<?php
declare(strict_types=1);

return [
	// Copy this file to api/config/database.php only when you intentionally want to enable a PostgreSQL connection.
	// Leave the fields below empty in the repository.
	'driver' => 'pgsql',
	'host' => '',
	'port' => 5432,
	'database' => '',
	'username' => '',
	'password' => '',
	// Use "prefer" or "require" only after configuring a real PostgreSQL server.
	'sslmode' => 'prefer',
	// Optional one-time cleanup for old app data after deployment.
	'one_time_reset' => [
		'enabled' => false,
		'version' => '',
	],
];
