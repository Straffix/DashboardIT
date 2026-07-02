import { useEffect, useMemo, useRef, useState } from 'react'

import type { DashboardTaskRecord, DashboardTaskReminderToast } from './types'
import { readDashboardTaskReminderIds, writeDashboardTaskReminderIds } from './storage'
import {
	buildTaskReminderId,
	getTaskDateTime,
	TASK_PRIORITY_META,
	TASK_REMINDER_GRACE_MINUTES,
	TASK_REMINDER_LEAD_MINUTES,
} from './utils'

function supportsNotifications() {
	return typeof window !== 'undefined' && typeof window.Notification !== 'undefined' && (window.isSecureContext || window.location.hostname === 'localhost')
}

export function useTaskReminders(tasks: DashboardTaskRecord[], onTaskSelected: (task: DashboardTaskRecord) => void) {
	const [toasts, setToasts] = useState<DashboardTaskReminderToast[]>([])
	const remindedIdsRef = useRef<Set<string>>(new Set(readDashboardTaskReminderIds()))
	const timeoutIdsRef = useRef<number[]>([])

	const knownReminderIds = useMemo(() => new Set(tasks.map(task => buildTaskReminderId(task))), [tasks])

	useEffect(() => {
		let hasChanges = false

		remindedIdsRef.current.forEach(reminderId => {
			if (knownReminderIds.has(reminderId)) return
			remindedIdsRef.current.delete(reminderId)
			hasChanges = true
		})

		if (hasChanges) {
			writeDashboardTaskReminderIds([...remindedIdsRef.current])
		}
	}, [knownReminderIds])

	useEffect(() => {
		const dismissToast = (toastId: string) => {
			setToasts(currentToasts => currentToasts.filter(toast => toast.id !== toastId))
		}

		const showToast = (task: DashboardTaskRecord, reminderState: 'upcoming' | 'overdue') => {
			const reminderId = buildTaskReminderId(task)
			const title = reminderState === 'overdue' ? `Przypomnienie: ${task.title}` : `Za 5 minut: ${task.title}`
			const description = reminderState === 'overdue' ? `Zaplanowane na ${task.time}` : `${task.time} | ${TASK_PRIORITY_META[task.priority].label}`

			setToasts(currentToasts => {
				if (currentToasts.some(toast => toast.id === reminderId)) return currentToasts

				return [
					...currentToasts,
					{
						id: reminderId,
						title,
						description,
						priority: task.priority,
					},
				]
			})

			timeoutIdsRef.current.push(
				window.setTimeout(() => {
					dismissToast(reminderId)
				}, 9000)
			)
		}

		const showSystemNotification = async (task: DashboardTaskRecord, reminderState: 'upcoming' | 'overdue') => {
			if (!supportsNotifications()) return
			if (window.Notification.permission !== 'granted') return
			if (document.visibilityState === 'visible' && document.hasFocus()) return

			const title = reminderState === 'overdue' ? `Przypomnienie: ${task.title}` : `Za 5 minut: ${task.title}`
			const body = reminderState === 'overdue' ? `Zaplanowane na ${task.time}. ${task.description || 'Zaplanowane zadanie.'}` : `${task.time}. ${task.description || 'Zaplanowane zadanie.'}`
			const notification = new window.Notification(title, {
				body,
				tag: buildTaskReminderId(task),
				requireInteraction: true,
			})

			notification.onclick = () => {
				window.focus()
				onTaskSelected(task)
				notification.close()
			}

			window.setTimeout(() => {
				notification.close()
			}, 16_000)
		}

		const checkTaskReminders = () => {
			const now = new Date()

			tasks.forEach(task => {
				const reminderId = buildTaskReminderId(task)
				if (remindedIdsRef.current.has(reminderId)) return

				const minutesUntilTask = (getTaskDateTime(task).getTime() - now.getTime()) / 60_000
				if (minutesUntilTask > TASK_REMINDER_LEAD_MINUTES || minutesUntilTask < -TASK_REMINDER_GRACE_MINUTES) return

				remindedIdsRef.current.add(reminderId)
				writeDashboardTaskReminderIds([...remindedIdsRef.current])

				const reminderState = minutesUntilTask <= 0 ? 'overdue' : 'upcoming'
				showToast(task, reminderState)
				void showSystemNotification(task, reminderState)
			})
		}

		checkTaskReminders()

		const intervalId = window.setInterval(checkTaskReminders, 30_000)
		const handleFocus = () => {
			checkTaskReminders()
		}
		const handleVisibilityChange = () => {
			if (document.visibilityState !== 'visible') return
			checkTaskReminders()
		}

		window.addEventListener('focus', handleFocus)
		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			window.clearInterval(intervalId)
			window.removeEventListener('focus', handleFocus)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			timeoutIdsRef.current.forEach(timeoutId => {
				window.clearTimeout(timeoutId)
			})
			timeoutIdsRef.current = []
		}
	}, [onTaskSelected, tasks])

	const requestPermission = async () => {
		if (!supportsNotifications()) return 'unsupported'
		if (window.Notification.permission !== 'default') return window.Notification.permission

		try {
			return await window.Notification.requestPermission()
		} catch {
			return window.Notification.permission || 'default'
		}
	}

	const dismissToast = (toastId: string) => {
		setToasts(currentToasts => currentToasts.filter(toast => toast.id !== toastId))
	}

	return {
		dismissToast,
		requestPermission,
		toasts,
	}
}
