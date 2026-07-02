export type DashboardTaskPriority = 'high' | 'medium' | 'low'

export type DashboardTaskRecord = {
	id: string
	title: string
	date: string
	time: string
	priority: DashboardTaskPriority
	description: string
	createdAt: string
	updatedAt: string
}

export type DashboardTaskDraft = {
	title: string
	date: string
	time: string
	priority: DashboardTaskPriority
	description: string
}

export type DashboardTaskReminderToast = {
	id: string
	title: string
	description: string
	priority: DashboardTaskPriority
}
