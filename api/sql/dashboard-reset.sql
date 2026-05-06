-- One-time cleanup for DashboardIT app data.
-- Leaves the reset history table untouched so the one-time reset endpoint
-- can remember that the cleanup has already been applied.

TRUNCATE TABLE
	dashboard_user_permissions,
	dashboard_bookmarks,
	dashboard_active_users,
	dashboard_lunch_reservations,
	dashboard_notes,
	dashboard_notes_active_viewers,
	dashboard_announcements,
	dashboard_tasks,
	dashboard_tester_feedback,
	dashboard_monitor_devices,
	dashboard_hires,
	dashboard_exchanges,
	dashboard_users
RESTART IDENTITY CASCADE;
