-- DashboardIT relational PostgreSQL schema.
-- The PHP backend also creates these tables automatically on first successful connection.

CREATE TABLE IF NOT EXISTS dashboard_users (
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
);

CREATE TABLE IF NOT EXISTS dashboard_user_permissions (
	user_id varchar(191) NOT NULL REFERENCES dashboard_users(id) ON DELETE CASCADE,
	permission_id varchar(50) NOT NULL,
	PRIMARY KEY (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS dashboard_users_login_idx ON dashboard_users (login);

CREATE TABLE IF NOT EXISTS dashboard_bookmarks (
	id varchar(191) PRIMARY KEY,
	sort_order integer NOT NULL DEFAULT 0,
	user_id varchar(191) NOT NULL REFERENCES dashboard_users(id) ON DELETE CASCADE,
	label varchar(200) NOT NULL,
	url text NOT NULL,
	description text NOT NULL DEFAULT '',
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS dashboard_bookmarks_user_idx ON dashboard_bookmarks (user_id, sort_order);

CREATE TABLE IF NOT EXISTS dashboard_active_users (
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
);

CREATE INDEX IF NOT EXISTS dashboard_active_users_seen_idx ON dashboard_active_users (last_seen_at);

CREATE TABLE IF NOT EXISTS dashboard_lunch_reservations (
	id varchar(191) PRIMARY KEY,
	sort_order integer NOT NULL DEFAULT 0,
	reservation_date date NOT NULL,
	time_slot varchar(10) NOT NULL,
	user_id varchar(191) NOT NULL REFERENCES dashboard_users(id) ON DELETE CASCADE,
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	status varchar(20) NOT NULL DEFAULT 'active',
	CONSTRAINT dashboard_lunch_status_check CHECK (status IN ('active', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS dashboard_lunch_schedule_idx ON dashboard_lunch_reservations (reservation_date, time_slot, status);

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_lunch_active_user_per_day_idx
	ON dashboard_lunch_reservations (reservation_date, user_id)
	WHERE status = 'active';

CREATE TABLE IF NOT EXISTS dashboard_notes (
	id varchar(191) PRIMARY KEY,
	sort_order integer NOT NULL DEFAULT 0,
	content text NOT NULL,
	author_id varchar(191) REFERENCES dashboard_users(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	is_pinned boolean NOT NULL DEFAULT false,
	pinned_at timestamptz NULL,
	pinned_by varchar(191) NULL
);

CREATE INDEX IF NOT EXISTS dashboard_notes_sort_idx ON dashboard_notes (sort_order, created_at);

CREATE TABLE IF NOT EXISTS dashboard_notes_active_viewers (
	tab_id varchar(191) PRIMARY KEY,
	sort_order integer NOT NULL DEFAULT 0,
	user_id varchar(191) NOT NULL REFERENCES dashboard_users(id) ON DELETE CASCADE,
	login varchar(120) NOT NULL DEFAULT '',
	full_name varchar(200) NOT NULL DEFAULT '',
	avatar_id varchar(50) NOT NULL DEFAULT '',
	avatar_image text NOT NULL DEFAULT '',
	last_seen_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS dashboard_notes_active_viewers_seen_idx ON dashboard_notes_active_viewers (last_seen_at);

CREATE TABLE IF NOT EXISTS dashboard_announcements (
	id varchar(191) PRIMARY KEY,
	sort_order integer NOT NULL DEFAULT 0,
	title varchar(200) NOT NULL,
	content text NOT NULL,
	author_id varchar(191) REFERENCES dashboard_users(id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	is_pinned boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS dashboard_announcements_sort_idx ON dashboard_announcements (sort_order, updated_at);

CREATE TABLE IF NOT EXISTS dashboard_tasks (
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
);

CREATE INDEX IF NOT EXISTS dashboard_tasks_sort_idx ON dashboard_tasks (sort_order, updated_at);

CREATE TABLE IF NOT EXISTS dashboard_monitor_devices (
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
);

CREATE INDEX IF NOT EXISTS dashboard_monitor_devices_sort_idx ON dashboard_monitor_devices (sort_order, updated_at);
CREATE INDEX IF NOT EXISTS dashboard_monitor_devices_lookup_idx ON dashboard_monitor_devices (ru, sn);

CREATE TABLE IF NOT EXISTS dashboard_hires (
	id bigserial PRIMARY KEY,
	sort_order integer NOT NULL DEFAULT 0,
	external_id varchar(191) NULL,
	name varchar(200) NOT NULL,
	ru varchar(200) NOT NULL,
	sn varchar(120) NOT NULL,
	hire_date date NULL,
	accessories jsonb NOT NULL DEFAULT '[]'::jsonb,
	details jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_by_actor jsonb NULL,
	updated_by_actor jsonb NULL,
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS dashboard_hires_sort_idx ON dashboard_hires (sort_order, updated_at);
CREATE INDEX IF NOT EXISTS dashboard_hires_lookup_idx ON dashboard_hires (sn, hire_date);

CREATE TABLE IF NOT EXISTS dashboard_exchanges (
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
);

CREATE INDEX IF NOT EXISTS dashboard_exchanges_sort_idx ON dashboard_exchanges (sort_order, updated_at);
CREATE INDEX IF NOT EXISTS dashboard_exchanges_lookup_idx ON dashboard_exchanges (planned_date, old_sn, new_sn);
