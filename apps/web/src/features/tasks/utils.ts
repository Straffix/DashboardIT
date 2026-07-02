import type { DashboardTaskDraft, DashboardTaskPriority, DashboardTaskRecord } from './types'

export const TASKS_REACT_STORAGE_KEY = 'dashboardit.react.tasks.entries'
export const TASKS_LEGACY_STORAGE_KEY = 'dashboard-tasks'
export const TASK_REMINDERS_REACT_STORAGE_KEY = 'dashboardit.react.tasks.reminders'
export const TASK_REMINDERS_LEGACY_STORAGE_KEY = 'dashboard-task-reminders'
export const TASKS_REFRESH_INTERVAL_MS = 15_000
export const TASK_REMINDER_LEAD_MINUTES = 5
export const TASK_REMINDER_GRACE_MINUTES = 10

export const TASK_PRIORITY_META: Record<DashboardTaskPriority, { label: string; tone: 'warning' | 'neutral' | 'active' }> = {
	high: { label: 'Wysoki', tone: 'warning' },
	medium: { label: 'Sredni', tone: 'neutral' },
	low: { label: 'Niski', tone: 'active' },
}

function padNumber(value: number) {
	return String(value).padStart(2, '0')
}

export function getTodayTaskDateKey() {
	return formatTaskDateKey(new Date())
}

export function formatTaskDateKey(date: Date) {
	return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
}

export function getTaskDateTime(task: Pick<DashboardTaskRecord, 'date' | 'time'>) {
	return new Date(`${task.date}T${task.time || '00:00'}`)
}

export function compareTasks(leftTask: Pick<DashboardTaskRecord, 'date' | 'id' | 'time'>, rightTask: Pick<DashboardTaskRecord, 'date' | 'id' | 'time'>) {
	const taskDiff = getTaskDateTime(leftTask as DashboardTaskRecord).getTime() - getTaskDateTime(rightTask as DashboardTaskRecord).getTime()
	if (taskDiff !== 0) return taskDiff

	return String(leftTask.id || '').localeCompare(String(rightTask.id || ''), 'pl')
}

export function normalizeTaskDraft(draft: DashboardTaskDraft): DashboardTaskDraft {
	const normalizedTitle = String(draft.title || '').trim()
	const normalizedDate = String(draft.date || '').trim()
	const normalizedTime = String(draft.time || '').trim()
	const normalizedPriority = draft.priority === 'low' || draft.priority === 'medium' || draft.priority === 'high' ? draft.priority : 'medium'

	if (!normalizedTitle) {
		throw new Error('Uzupelnij tytul zadania.')
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
		throw new Error('Wybierz poprawna date zadania.')
	}

	if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
		throw new Error('Wybierz poprawna godzine zadania.')
	}

	return {
		title: normalizedTitle,
		date: normalizedDate,
		time: normalizedTime,
		priority: normalizedPriority,
		description: String(draft.description || '').trim(),
	}
}

export function normalizeTaskRecord(record: unknown): DashboardTaskRecord | null {
	const source = record && typeof record === 'object' ? (record as Partial<DashboardTaskRecord>) : {}
	const normalizedDraft = normalizeTaskRecordShape({
		title: source.title,
		date: source.date,
		time: source.time,
		priority: source.priority,
		description: source.description,
	})

	if (!normalizedDraft) return null

	return {
		id: String(source.id || `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
		title: normalizedDraft.title,
		date: normalizedDraft.date,
		time: normalizedDraft.time,
		priority: normalizedDraft.priority,
		description: normalizedDraft.description,
		createdAt: String(source.createdAt || new Date().toISOString()),
		updatedAt: String(source.updatedAt || source.createdAt || new Date().toISOString()),
	}
}

function normalizeTaskRecordShape(record: Partial<DashboardTaskDraft> | null | undefined) {
	const title = String(record?.title || '').trim()
	const date = String(record?.date || '').trim()
	const time = String(record?.time || '').trim()

	if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
		return null
	}

	return {
		title,
		date,
		time,
		priority: record?.priority === 'low' || record?.priority === 'high' || record?.priority === 'medium' ? record.priority : 'medium',
		description: String(record?.description || '').trim(),
	}
}

export function sortTasks(tasks: DashboardTaskRecord[]) {
	return [...tasks].sort(compareTasks)
}

export function dedupeTasks(tasks: DashboardTaskRecord[]) {
	return Array.from(
		new Map(tasks.filter(task => task.id).map(task => [task.id, task] as const)).values()
	)
}

export function buildTaskRecord(draft: DashboardTaskDraft) {
	const normalizedDraft = normalizeTaskDraft(draft)
	const now = new Date().toISOString()

	return {
		id: `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
		title: normalizedDraft.title,
		date: normalizedDraft.date,
		time: normalizedDraft.time,
		priority: normalizedDraft.priority,
		description: normalizedDraft.description,
		createdAt: now,
		updatedAt: now,
	} satisfies DashboardTaskRecord
}

export function buildTaskReminderId(task: Pick<DashboardTaskRecord, 'id' | 'date' | 'time'>) {
	return `${task.id}-${task.date}-${task.time}`
}

export function formatTaskDateLabel(dateKey: string) {
	const parsedDate = new Date(`${dateKey}T12:00:00`)
	if (Number.isNaN(parsedDate.getTime())) return 'Wybrany dzien'

	return parsedDate.toLocaleDateString('pl-PL', {
		weekday: 'long',
		day: '2-digit',
		month: 'long',
	})
}

export function formatTaskMonthLabel(date: Date) {
	return date.toLocaleDateString('pl-PL', {
		month: 'long',
		year: 'numeric',
	})
}

export function formatTaskPreviewTime(value: string) {
	const normalizedValue = String(value || '').trim()
	return /^\d{2}:\d{2}$/.test(normalizedValue) ? normalizedValue : '--:--'
}

export function buildTaskCalendarCells(cursor: Date, selectedDate: string) {
	const year = cursor.getFullYear()
	const month = cursor.getMonth()
	const firstDay = new Date(year, month, 1)
	const daysInMonth = new Date(year, month + 1, 0).getDate()
	const startOffset = (firstDay.getDay() + 6) % 7
	const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7
	const todayKey = getTodayTaskDateKey()

	return Array.from({ length: totalCells }, (_, index) => {
		const dayNumber = index - startOffset + 1
		const cellDate = new Date(year, month, dayNumber)
		const dateKey = formatTaskDateKey(cellDate)
		const isCurrentMonth = cellDate.getMonth() === month

		return {
			dateKey,
			dayNumber: cellDate.getDate(),
			isCurrentMonth,
			isSelected: selectedDate === dateKey,
			isToday: todayKey === dateKey,
		}
	})
}
