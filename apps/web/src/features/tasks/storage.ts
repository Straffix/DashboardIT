import type { DashboardTaskDraft } from './types'
import {
	buildTaskRecord,
	dedupeTasks,
	normalizeTaskRecord,
	sortTasks,
	TASK_REMINDERS_LEGACY_STORAGE_KEY,
	TASK_REMINDERS_REACT_STORAGE_KEY,
	TASKS_LEGACY_STORAGE_KEY,
	TASKS_REACT_STORAGE_KEY,
} from './utils'

function ensureWindow() {
	return typeof window !== 'undefined'
}

function readRawArray(storageKey: string) {
	if (!ensureWindow()) return null

	const rawValue = window.localStorage.getItem(storageKey)
	if (!rawValue) return null

	try {
		const parsedValue = JSON.parse(rawValue) as unknown
		return Array.isArray(parsedValue) ? parsedValue : null
	} catch {
		return null
	}
}

function writeTasks(tasks: ReturnType<typeof readAllTasks>) {
	if (!ensureWindow()) return
	window.localStorage.setItem(TASKS_REACT_STORAGE_KEY, JSON.stringify(tasks))
}

function writeReminderIds(reminderIds: string[]) {
	if (!ensureWindow()) return
	window.localStorage.setItem(TASK_REMINDERS_REACT_STORAGE_KEY, JSON.stringify([...new Set(reminderIds.filter(Boolean))]))
}

function readAllTasks() {
	if (!ensureWindow()) return []

	const reactTasks = readRawArray(TASKS_REACT_STORAGE_KEY)
	if (reactTasks) {
		return sortTasks(dedupeTasks(reactTasks.map(record => normalizeTaskRecord(record)).filter((task): task is NonNullable<ReturnType<typeof normalizeTaskRecord>> => Boolean(task))))
	}

	const legacyTasks = readRawArray(TASKS_LEGACY_STORAGE_KEY)
	if (legacyTasks) {
		const normalizedTasks = sortTasks(dedupeTasks(legacyTasks.map(record => normalizeTaskRecord(record)).filter((task): task is NonNullable<ReturnType<typeof normalizeTaskRecord>> => Boolean(task))))
		writeTasks(normalizedTasks)
		return normalizedTasks
	}

	writeTasks([])
	return []
}

export async function readDashboardTasks() {
	return readAllTasks()
}

export async function createDashboardTask(draft: DashboardTaskDraft) {
	const tasks = readAllTasks()
	const nextTask = buildTaskRecord(draft)
	const nextTasks = sortTasks([nextTask, ...tasks])
	writeTasks(nextTasks)
	return nextTask
}

export async function deleteDashboardTask(taskId: string) {
	const tasks = readAllTasks()
	const nextTasks = tasks.filter(task => task.id !== taskId)
	writeTasks(nextTasks)
	return {
		id: taskId,
		success: true,
	}
}

export function readDashboardTaskReminderIds() {
	if (!ensureWindow()) return []

	const reactReminderIds = readRawArray(TASK_REMINDERS_REACT_STORAGE_KEY)
	if (reactReminderIds) {
		return [...new Set(reactReminderIds.map(value => String(value || '').trim()).filter(Boolean))]
	}

	const legacyReminderIds = readRawArray(TASK_REMINDERS_LEGACY_STORAGE_KEY)
	if (legacyReminderIds) {
		const normalizedReminderIds = [...new Set(legacyReminderIds.map(value => String(value || '').trim()).filter(Boolean))]
		writeReminderIds(normalizedReminderIds)
		return normalizedReminderIds
	}

	writeReminderIds([])
	return []
}

export function writeDashboardTaskReminderIds(reminderIds: string[]) {
	writeReminderIds(reminderIds)
}
