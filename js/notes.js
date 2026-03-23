document.addEventListener('DOMContentLoaded', () => {
	const NOTES_STORAGE_KEY = AppUtils.config.STORAGE_KEYS.NOTES
	const ANNOUNCEMENTS_STORAGE_KEY = AppUtils.config.STORAGE_KEYS.ANNOUNCEMENTS
	const TASKS_STORAGE_KEY = AppUtils.config.STORAGE_KEYS.TASKS
	const USERS_STORAGE_KEY = AppUtils.config.STORAGE_KEYS.USERS
	const SESSION_STORAGE_KEY = AppUtils.config.STORAGE_KEYS.SESSION

	const TASK_STATUS_META = {
		todo: { label: 'Do zrobienia', order: 0, className: 'is-status-todo' },
		in_progress: { label: 'W toku', order: 1, className: 'is-status-in-progress' },
		done: { label: 'Zrobione', order: 2, className: 'is-status-done' },
	}

	const TASK_PRIORITY_META = {
		low: { label: 'Niski', order: 2, className: 'is-priority-low' },
		medium: { label: 'Sredni', order: 1, className: 'is-priority-medium' },
		high: { label: 'Wysoki', order: 0, className: 'is-priority-high' },
	}

	const daySummary = document.getElementById('notes-day-summary')
	const feedback = document.getElementById('notes-feedback')
	const authCallout = document.getElementById('notes-auth-callout')
	const authTitle = document.getElementById('notes-auth-title')
	const authText = document.getElementById('notes-auth-text')
	const authBtn = document.getElementById('notes-auth-btn')

	const announcementToggleBtn = document.getElementById('notes-announcement-toggle')
	const noteToggleBtn = document.getElementById('notes-note-toggle')
	const taskToggleBtn = document.getElementById('notes-task-toggle')

	const announcementForm = document.getElementById('notes-announcement-form')
	const announcementTitleInput = document.getElementById('notes-announcement-title')
	const announcementContentInput = document.getElementById('notes-announcement-content')
	const announcementSubmitBtn = document.getElementById('notes-announcement-submit')
	const announcementCancelBtn = document.getElementById('notes-announcement-cancel')

	const noteForm = document.getElementById('notes-note-form')
	const noteContentInput = document.getElementById('notes-note-content')
	const noteSubmitBtn = document.getElementById('notes-note-submit')
	const noteCancelBtn = document.getElementById('notes-note-cancel')

	const taskAdminCallout = document.getElementById('notes-task-admin-callout')
	const taskAdminTitle = document.getElementById('notes-task-admin-title')
	const taskAdminText = document.getElementById('notes-task-admin-text')
	const taskForm = document.getElementById('notes-task-form')
	const taskTitleInput = document.getElementById('notes-task-title')
	const taskDescriptionInput = document.getElementById('notes-task-description')
	const taskAssigneeSelect = document.getElementById('notes-task-assignee')
	const taskPrioritySelect = document.getElementById('notes-task-priority')
	const taskStatusSelect = document.getElementById('notes-task-status')
	const taskSubmitBtn = document.getElementById('notes-task-submit')
	const taskCancelBtn = document.getElementById('notes-task-cancel')

	const announcementsList = document.getElementById('notes-announcements-list')
	const notesList = document.getElementById('notes-notes-list')
	const tasksList = document.getElementById('notes-tasks-list')

	const userStatusBox = document.getElementById('notes-user-status')
	const announcementsStat = document.getElementById('notes-stat-announcements')
	const notesStat = document.getElementById('notes-stat-notes')
	const mineStat = document.getElementById('notes-stat-mine')
	const mineMetaStat = document.getElementById('notes-stat-mine-meta')
	const tasksStat = document.getElementById('notes-stat-tasks')
	const assignedStat = document.getElementById('notes-stat-assigned')
	const assignedMetaStat = document.getElementById('notes-stat-assigned-meta')
	const updatedStat = document.getElementById('notes-stat-updated')

	if (
		!daySummary ||
		!feedback ||
		!authCallout ||
		!authTitle ||
		!authText ||
		!authBtn ||
		!announcementToggleBtn ||
		!noteToggleBtn ||
		!taskToggleBtn ||
		!announcementForm ||
		!announcementTitleInput ||
		!announcementContentInput ||
		!announcementSubmitBtn ||
		!announcementCancelBtn ||
		!noteForm ||
		!noteContentInput ||
		!noteSubmitBtn ||
		!noteCancelBtn ||
		!taskAdminCallout ||
		!taskAdminTitle ||
		!taskAdminText ||
		!taskForm ||
		!taskTitleInput ||
		!taskDescriptionInput ||
		!taskAssigneeSelect ||
		!taskPrioritySelect ||
		!taskStatusSelect ||
		!taskSubmitBtn ||
		!taskCancelBtn ||
		!announcementsList ||
		!notesList ||
		!tasksList ||
		!userStatusBox ||
		!announcementsStat ||
		!notesStat ||
		!mineStat ||
		!mineMetaStat ||
		!tasksStat ||
		!assignedStat ||
		!assignedMetaStat ||
		!updatedStat
	) {
		return
	}

	const state = {
		feedbackTimeoutId: null,
		announcementComposerOpen: false,
		noteComposerOpen: false,
		taskComposerOpen: false,
		editingAnnouncementId: '',
		editingNoteId: '',
		editingTaskId: '',
	}

	function readJsonStorage(key, fallback = []) {
		try {
			const rawValue = localStorage.getItem(key)
			if (!rawValue) return fallback

			const parsedValue = JSON.parse(rawValue)
			return Array.isArray(parsedValue) ? parsedValue : fallback
		} catch (error) {
			return fallback
		}
	}

	function createEntryId(prefix) {
		return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
	}

	function getTimestamp(value) {
		const parsedTime = Date.parse(value)
		return Number.isFinite(parsedTime) ? parsedTime : 0
	}

	function sortByUpdatedDesc(leftEntry, rightEntry) {
		return getTimestamp(rightEntry.updatedAt) - getTimestamp(leftEntry.updatedAt)
	}

	function getTaskStatusMeta(status) {
		return TASK_STATUS_META[status] || TASK_STATUS_META.todo
	}

	function getTaskPriorityMeta(priority) {
		return TASK_PRIORITY_META[priority] || TASK_PRIORITY_META.medium
	}

	function normalizeNoteRecord(record) {
		return {
			id: String(record.id || ''),
			content: String(record.content || '').trim(),
			authorId: String(record.authorId || ''),
			createdAt: record.createdAt || new Date().toISOString(),
			updatedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
			isPinned: false,
		}
	}

	function normalizeAnnouncementRecord(record) {
		return {
			id: String(record.id || ''),
			title: String(record.title || '').trim(),
			content: String(record.content || '').trim(),
			authorId: String(record.authorId || ''),
			createdAt: record.createdAt || new Date().toISOString(),
			updatedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
			isPinned: record.isPinned !== false,
		}
	}

	function normalizeTaskRecord(record) {
		return {
			id: String(record.id || ''),
			title: String(record.title || '').trim(),
			description: String(record.description || '').trim(),
			assignedToUserId: String(record.assignedToUserId || ''),
			createdBy: String(record.createdBy || ''),
			updatedBy: String(record.updatedBy || record.createdBy || ''),
			createdAt: record.createdAt || new Date().toISOString(),
			updatedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
			status: TASK_STATUS_META[record.status] ? record.status : 'todo',
			priority: TASK_PRIORITY_META[record.priority] ? record.priority : 'medium',
		}
	}

	function canManageEntry(entry, actor) {
		if (!entry || !actor) return false
		return actor.role === 'admin' || String(entry.authorId) === String(actor.id)
	}

	function canManageTasks(actor) {
		return actor?.role === 'admin'
	}

	function canUpdateTaskStatus(task, actor) {
		if (!task || !actor) return false
		return actor.role === 'admin' || String(task.assignedToUserId) === String(actor.id)
	}

	function getCurrentUser() {
		return AppUtils.auth.getCurrentUser()
	}

	function loadUsers() {
		return readJsonStorage(USERS_STORAGE_KEY)
			.filter(user => user && user.id)
			.map(user => ({
				id: String(user.id),
				fullName: String(user.fullName || '').trim(),
				login: String(user.login || '').trim(),
				role: user.role === 'admin' ? 'admin' : 'user',
				avatarId: String(user.avatarId || 'blue'),
			}))
	}

	function getUserById(userId) {
		return loadUsers().find(user => user.id === String(userId || '')) || null
	}

	function getInitials(label) {
		const parts = String(label || '')
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)

		if (parts.length === 0) return 'IT'
		return parts.map(part => part[0]).join('').toUpperCase()
	}

	function escapeHtml(value) {
		return String(value || '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
	}

	function renderMultilineText(value) {
		return escapeHtml(value).replace(/\n/g, '<br>')
	}

	function formatDateTimeLabel(value) {
		const parsedDate = new Date(value)
		if (Number.isNaN(parsedDate.getTime())) return '--'

		return parsedDate.toLocaleString('pl-PL', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	function createUserAvatarMarkup(user, extraClass = '') {
		const label = user?.fullName || user?.displayName || user?.login || user?.loginLabel || 'IT'
		if (typeof AppUtils.createAvatarMarkup === 'function') {
			return AppUtils.createAvatarMarkup({
				fullName: label,
				avatarId: user?.avatarId || 'blue',
				extraClass,
			})
		}

		const classes = ['app-user-avatar', extraClass].filter(Boolean).join(' ')
		return `<span class="${classes}" style="--app-avatar-gradient: linear-gradient(135deg, #0f766e 0%, #22d3ee 100%)">${escapeHtml(getInitials(label))}</span>`
	}

	function getActorMeta(userId) {
		const matchedUser = getUserById(userId)
		const displayName = matchedUser?.fullName || 'Nieznany uzytkownik'
		const loginLabel = matchedUser?.login || String(userId || 'konto-lokalne')

		return {
			...matchedUser,
			displayName,
			loginLabel,
		}
	}

	const notesService = {
		loadNotes() {
			return readJsonStorage(NOTES_STORAGE_KEY).map(normalizeNoteRecord)
		},

		saveNotes(notes) {
			localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
		},

		loadAnnouncements() {
			return readJsonStorage(ANNOUNCEMENTS_STORAGE_KEY).map(normalizeAnnouncementRecord)
		},

		saveAnnouncements(announcements) {
			localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(announcements))
		},

		getNotes() {
			return this.loadNotes().filter(note => note.id && note.content && note.authorId).sort(sortByUpdatedDesc)
		},

		getAnnouncements() {
			return this.loadAnnouncements()
				.filter(announcement => announcement.id && announcement.title && announcement.content && announcement.authorId)
				.sort((leftAnnouncement, rightAnnouncement) => {
					if (leftAnnouncement.isPinned !== rightAnnouncement.isPinned) {
						return Number(rightAnnouncement.isPinned) - Number(leftAnnouncement.isPinned)
					}

					return sortByUpdatedDesc(leftAnnouncement, rightAnnouncement)
				})
		},

		getNoteById(noteId) {
			return this.getNotes().find(note => note.id === String(noteId || '')) || null
		},

		getAnnouncementById(announcementId) {
			return this.getAnnouncements().find(announcement => announcement.id === String(announcementId || '')) || null
		},

		// TODO: replace this localStorage implementation with fetch/API calls once backend auth and notes endpoints are ready.
		createNote({ content, authorId }) {
			const normalizedContent = String(content || '').trim()
			const normalizedAuthorId = String(authorId || '')
			if (!normalizedAuthorId) {
				throw new Error('Musisz byc zalogowany, aby dodac notatke.')
			}

			if (!normalizedContent) {
				throw new Error('Wpisz tresc notatki przed zapisaniem.')
			}

			const notes = this.loadNotes()
			const now = new Date().toISOString()
			const nextNote = {
				id: createEntryId('note'),
				content: normalizedContent,
				authorId: normalizedAuthorId,
				createdAt: now,
				updatedAt: now,
				isPinned: false,
			}

			notes.unshift(nextNote)
			this.saveNotes(notes)
			return nextNote
		},

		updateNote({ noteId, content, actor }) {
			const normalizedNoteId = String(noteId || '')
			const normalizedContent = String(content || '').trim()
			const notes = this.loadNotes()
			const noteIndex = notes.findIndex(note => note.id === normalizedNoteId)

			if (noteIndex === -1) {
				throw new Error('Nie znaleziono notatki do edycji.')
			}

			if (!normalizedContent) {
				throw new Error('Notatka nie moze byc pusta.')
			}

			if (!canManageEntry(notes[noteIndex], actor)) {
				throw new Error('Nie masz uprawnien do edycji tej notatki.')
			}

			notes[noteIndex] = {
				...notes[noteIndex],
				content: normalizedContent,
				updatedAt: new Date().toISOString(),
			}

			this.saveNotes(notes)
			return notes[noteIndex]
		},

		deleteNote({ noteId, actor }) {
			const normalizedNoteId = String(noteId || '')
			const notes = this.loadNotes()
			const noteToDelete = notes.find(note => note.id === normalizedNoteId)

			if (!noteToDelete) {
				throw new Error('Nie znaleziono notatki do usuniecia.')
			}

			if (!canManageEntry(noteToDelete, actor)) {
				throw new Error('Nie masz uprawnien do usuniecia tej notatki.')
			}

			this.saveNotes(notes.filter(note => note.id !== normalizedNoteId))
			return noteToDelete
		},

		createAnnouncement({ title, content, authorId }) {
			const normalizedTitle = String(title || '').trim()
			const normalizedContent = String(content || '').trim()
			const normalizedAuthorId = String(authorId || '')
			if (!normalizedAuthorId) {
				throw new Error('Musisz byc zalogowany, aby dodac wazny temat.')
			}

			if (!normalizedTitle) {
				throw new Error('Uzupelnij tytul waznego tematu.')
			}

			if (!normalizedContent) {
				throw new Error('Uzupelnij tresc waznego tematu.')
			}

			const announcements = this.loadAnnouncements()
			const now = new Date().toISOString()
			const nextAnnouncement = {
				id: createEntryId('announcement'),
				title: normalizedTitle,
				content: normalizedContent,
				authorId: normalizedAuthorId,
				createdAt: now,
				updatedAt: now,
				isPinned: true,
			}

			announcements.unshift(nextAnnouncement)
			this.saveAnnouncements(announcements)
			return nextAnnouncement
		},

		updateAnnouncement({ announcementId, title, content, actor }) {
			const normalizedAnnouncementId = String(announcementId || '')
			const normalizedTitle = String(title || '').trim()
			const normalizedContent = String(content || '').trim()
			const announcements = this.loadAnnouncements()
			const announcementIndex = announcements.findIndex(announcement => announcement.id === normalizedAnnouncementId)

			if (announcementIndex === -1) {
				throw new Error('Nie znaleziono waznego tematu do edycji.')
			}

			if (!normalizedTitle) {
				throw new Error('Uzupelnij tytul waznego tematu.')
			}

			if (!normalizedContent) {
				throw new Error('Uzupelnij tresc waznego tematu.')
			}

			if (!canManageEntry(announcements[announcementIndex], actor)) {
				throw new Error('Nie masz uprawnien do edycji tego wpisu.')
			}

			announcements[announcementIndex] = {
				...announcements[announcementIndex],
				title: normalizedTitle,
				content: normalizedContent,
				isPinned: true,
				updatedAt: new Date().toISOString(),
			}

			this.saveAnnouncements(announcements)
			return announcements[announcementIndex]
		},

		deleteAnnouncement({ announcementId, actor }) {
			const normalizedAnnouncementId = String(announcementId || '')
			const announcements = this.loadAnnouncements()
			const announcementToDelete = announcements.find(announcement => announcement.id === normalizedAnnouncementId)

			if (!announcementToDelete) {
				throw new Error('Nie znaleziono waznego tematu do usuniecia.')
			}

			if (!canManageEntry(announcementToDelete, actor)) {
				throw new Error('Nie masz uprawnien do usuniecia tego wpisu.')
			}

			this.saveAnnouncements(announcements.filter(announcement => announcement.id !== normalizedAnnouncementId))
			return announcementToDelete
		},
	}

	const tasksService = {
		loadTasks() {
			return readJsonStorage(TASKS_STORAGE_KEY).map(normalizeTaskRecord)
		},

		saveTasks(tasks) {
			localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
		},

		getTasks() {
			return this.loadTasks()
				.filter(task => task.id && task.title && task.description && task.assignedToUserId && task.createdBy)
				.sort((leftTask, rightTask) => {
					const statusDiff = getTaskStatusMeta(leftTask.status).order - getTaskStatusMeta(rightTask.status).order
					if (statusDiff !== 0) return statusDiff

					const priorityDiff = getTaskPriorityMeta(leftTask.priority).order - getTaskPriorityMeta(rightTask.priority).order
					if (priorityDiff !== 0) return priorityDiff

					return sortByUpdatedDesc(leftTask, rightTask)
				})
		},

		getTaskById(taskId) {
			return this.getTasks().find(task => task.id === String(taskId || '')) || null
		},

		// TODO: replace this localStorage implementation with fetch/API calls once backend auth and task endpoints are ready.
		createTask({ title, description, assignedToUserId, priority, status, actor }) {
			if (!canManageTasks(actor)) {
				throw new Error('Tylko administrator moze tworzyc i przypisywac zadania.')
			}

			const normalizedTitle = String(title || '').trim()
			const normalizedDescription = String(description || '').trim()
			const normalizedAssigneeId = String(assignedToUserId || '')
			const normalizedPriority = TASK_PRIORITY_META[priority] ? priority : 'medium'
			const normalizedStatus = TASK_STATUS_META[status] ? status : 'todo'

			if (!normalizedTitle) {
				throw new Error('Uzupelnij tytul zadania.')
			}

			if (!normalizedDescription) {
				throw new Error('Uzupelnij opis zadania.')
			}

			if (!normalizedAssigneeId || !getUserById(normalizedAssigneeId)) {
				throw new Error('Wybierz poprawnego uzytkownika do przypisania.')
			}

			const tasks = this.loadTasks()
			const now = new Date().toISOString()
			const nextTask = {
				id: createEntryId('task'),
				title: normalizedTitle,
				description: normalizedDescription,
				assignedToUserId: normalizedAssigneeId,
				createdBy: String(actor.id),
				updatedBy: String(actor.id),
				createdAt: now,
				updatedAt: now,
				status: normalizedStatus,
				priority: normalizedPriority,
			}

			tasks.unshift(nextTask)
			this.saveTasks(tasks)
			return nextTask
		},

		updateTask({ taskId, title, description, assignedToUserId, priority, status, actor }) {
			if (!canManageTasks(actor)) {
				throw new Error('Tylko administrator moze edytowac zadania.')
			}

			const normalizedTaskId = String(taskId || '')
			const tasks = this.loadTasks()
			const taskIndex = tasks.findIndex(task => task.id === normalizedTaskId)

			if (taskIndex === -1) {
				throw new Error('Nie znaleziono zadania do edycji.')
			}

			const normalizedTitle = String(title || '').trim()
			const normalizedDescription = String(description || '').trim()
			const normalizedAssigneeId = String(assignedToUserId || '')
			const normalizedPriority = TASK_PRIORITY_META[priority] ? priority : 'medium'
			const normalizedStatus = TASK_STATUS_META[status] ? status : 'todo'

			if (!normalizedTitle) {
				throw new Error('Uzupelnij tytul zadania.')
			}

			if (!normalizedDescription) {
				throw new Error('Uzupelnij opis zadania.')
			}

			if (!normalizedAssigneeId || !getUserById(normalizedAssigneeId)) {
				throw new Error('Wybierz poprawnego uzytkownika do przypisania.')
			}

			tasks[taskIndex] = {
				...tasks[taskIndex],
				title: normalizedTitle,
				description: normalizedDescription,
				assignedToUserId: normalizedAssigneeId,
				priority: normalizedPriority,
				status: normalizedStatus,
				updatedBy: String(actor.id),
				updatedAt: new Date().toISOString(),
			}

			this.saveTasks(tasks)
			return tasks[taskIndex]
		},

		updateTaskStatus({ taskId, status, actor }) {
			const normalizedTaskId = String(taskId || '')
			const normalizedStatus = TASK_STATUS_META[status] ? status : 'todo'
			const tasks = this.loadTasks()
			const taskIndex = tasks.findIndex(task => task.id === normalizedTaskId)

			if (taskIndex === -1) {
				throw new Error('Nie znaleziono zadania do aktualizacji statusu.')
			}

			if (!canUpdateTaskStatus(tasks[taskIndex], actor)) {
				throw new Error('Nie masz uprawnien do zmiany statusu tego zadania.')
			}

			tasks[taskIndex] = {
				...tasks[taskIndex],
				status: normalizedStatus,
				updatedBy: String(actor.id),
				updatedAt: new Date().toISOString(),
			}

			this.saveTasks(tasks)
			return tasks[taskIndex]
		},

		deleteTask({ taskId, actor }) {
			if (!canManageTasks(actor)) {
				throw new Error('Tylko administrator moze usuwac zadania.')
			}

			const normalizedTaskId = String(taskId || '')
			const tasks = this.loadTasks()
			const taskToDelete = tasks.find(task => task.id === normalizedTaskId)

			if (!taskToDelete) {
				throw new Error('Nie znaleziono zadania do usuniecia.')
			}

			this.saveTasks(tasks.filter(task => task.id !== normalizedTaskId))
			return taskToDelete
		},
	}

	window.AppServices = window.AppServices || {}
	window.AppServices.notesService = notesService
	window.AppServices.tasksService = tasksService

	function getBoardEntries() {
		return [...notesService.getAnnouncements(), ...notesService.getNotes(), ...tasksService.getTasks()]
	}

	function getLastBoardUpdateLabel() {
		const latestEntry = getBoardEntries().sort(sortByUpdatedDesc)[0]
		return latestEntry ? formatDateTimeLabel(latestEntry.updatedAt) : '--'
	}

	function showFeedbackMessage(message, type = 'info') {
		if (state.feedbackTimeoutId) {
			window.clearTimeout(state.feedbackTimeoutId)
			state.feedbackTimeoutId = null
		}

		feedback.textContent = message
		feedback.className = `notes-feedback is-${type}`

		state.feedbackTimeoutId = window.setTimeout(() => {
			feedback.className = 'notes-feedback is-hidden'
			feedback.textContent = ''
		}, 4200)
	}

	function renderAuthCallout(currentUser) {
		if (currentUser) {
			authCallout.classList.add('is-active-user')
			authTitle.textContent = `Pracujesz jako ${currentUser.fullName || `@${currentUser.login}`}`
			authText.textContent =
				currentUser.role === 'admin'
					? 'Mozesz zarzadzac notatkami, waznymi tematami i przypisywac zadania do czlonkow zespolu.'
					: 'Mozesz dodawac wpisy, edytowac swoje rekordy i zmieniac status zadan przypisanych do Ciebie.'
			authBtn.innerHTML = '<i class="fa-solid fa-user-gear"></i><span>Otworz profil</span>'
			return
		}

		authCallout.classList.remove('is-active-user')
		authTitle.textContent = 'Podglad tablicy jest dostepny dla wszystkich'
		authText.textContent =
			'Zaloguj sie, aby dodawac wpisy, a jako admin rowniez przypisywac zadania do innych osob.'
		authBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Zaloguj sie</span>'
	}

	function renderBoardSummary(announcements, notes, tasks, currentUser) {
		const totalEntries = announcements.length + notes.length + tasks.length
		const latestUpdate = getLastBoardUpdateLabel()

		if (totalEntries === 0) {
			daySummary.textContent = currentUser
				? 'Tablica jest jeszcze pusta. Dodaj pierwszy wazny temat, notatke albo zadanie dla zespolu.'
				: 'Tablica jest jeszcze pusta. Zaloguj sie, aby dodac pierwszy wpis lub zadanie dla zespolu.'
			return
		}

		daySummary.textContent = `Na tablicy jest ${announcements.length} waznych tematow, ${notes.length} notatek i ${tasks.length} zadan. Ostatnia zmiana: ${latestUpdate}.`
	}

	function renderUserStatus(currentUser) {
		if (!currentUser) {
			userStatusBox.innerHTML = `
				<strong>Gosc</strong>
				<p>Podglad tablicy bez mozliwosci dodawania, przypisywania i edycji rekordow.</p>
			`
			return
		}

		const description = currentUser.role === 'admin'
			? 'Administrator moze zarzadzac wszystkimi wpisami i przypisywac zadania innym uzytkownikom.'
			: 'Uzytkownik moze dodawac swoje wpisy i aktualizowac status zadan przypisanych do siebie.'

		userStatusBox.innerHTML = `
			<strong>${escapeHtml(currentUser.fullName || `@${currentUser.login}`)}</strong>
			<p>${description}</p>
		`
	}

	function renderSidebarStats(announcements, notes, tasks, currentUser) {
		const mineCount = currentUser
			? announcements.filter(entry => String(entry.authorId) === String(currentUser.id)).length +
				notes.filter(entry => String(entry.authorId) === String(currentUser.id)).length +
				tasks.filter(task => String(task.createdBy) === String(currentUser.id)).length
			: 0

		const assignedCount = currentUser
			? tasks.filter(task => String(task.assignedToUserId) === String(currentUser.id)).length
			: 0

		announcementsStat.textContent = String(announcements.length)
		notesStat.textContent = String(notes.length)
		mineStat.textContent = String(mineCount)
		mineMetaStat.textContent = currentUser ? 'wpisy i zadania utworzone przez Ciebie' : 'po zalogowaniu'
		tasksStat.textContent = String(tasks.length)
		assignedStat.textContent = String(assignedCount)
		assignedMetaStat.textContent = currentUser ? 'aktywnie przypisane do Twojego konta' : 'po zalogowaniu'
		updatedStat.textContent = getLastBoardUpdateLabel()
	}

	function renderTaskAdminCallout(currentUser) {
		taskAdminCallout.classList.remove('is-admin', 'is-member')

		if (!currentUser) {
			taskAdminTitle.textContent = 'Zaloguj sie jako admin, aby przypisywac zadania'
			taskAdminText.textContent =
				'Kazdy moze podejrzec liste zadan, ale ich tworzenie i przypisywanie do ludzi jest dostepne tylko dla administratora.'
			return
		}

		if (currentUser.role === 'admin') {
			taskAdminCallout.classList.add('is-admin')
			taskAdminTitle.textContent = 'Pracujesz jako administrator'
			taskAdminText.textContent =
				'Mozesz tworzyc zadania, przypisywac je do uzytkownikow, ustawiac priorytet oraz edytowac cala tablice zadan.'
			return
		}

		taskAdminCallout.classList.add('is-member')
		taskAdminTitle.textContent = 'Tylko admin przypisuje zadania innym osobom'
		taskAdminText.textContent =
			'Widzisz cala liste zadan. Jesli jakies zadanie jest przypisane do Ciebie, mozesz samodzielnie zaktualizowac jego status.'
	}

	function populateTaskAssigneeOptions(users, selectedUserId = '') {
		if (users.length === 0) {
			taskAssigneeSelect.innerHTML = '<option value="">Brak aktywnych uzytkownikow</option>'
			return
		}

		taskAssigneeSelect.innerHTML = users
			.map(user => {
				const roleLabel = user.role === 'admin' ? 'admin' : 'user'
				return `<option value="${escapeHtml(user.id)}">${escapeHtml(user.fullName || `@${user.login}`)} (${escapeHtml(roleLabel)})</option>`
			})
			.join('')

		const nextAssigneeId = selectedUserId && users.some(user => user.id === selectedUserId) ? selectedUserId : users[0].id
		taskAssigneeSelect.value = nextAssigneeId
	}

	function updateAnnouncementComposer(currentUser) {
		announcementForm.hidden = !currentUser || !state.announcementComposerOpen
		announcementSubmitBtn.textContent = state.editingAnnouncementId ? 'Zapisz wazny temat' : 'Opublikuj temat'
		announcementCancelBtn.hidden = !currentUser || !state.announcementComposerOpen

		if (!currentUser) {
			announcementToggleBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Zaloguj sie, aby dodac</span>'
			return
		}

		if (state.editingAnnouncementId) {
			announcementToggleBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i><span>Edytujesz wazny temat</span>'
			return
		}

		announcementToggleBtn.innerHTML = state.announcementComposerOpen
			? '<i class="fa-solid fa-chevron-up"></i><span>Schowaj formularz</span>'
			: '<i class="fa-solid fa-bullhorn"></i><span>Dodaj wazny temat</span>'
	}

	function updateNoteComposer(currentUser) {
		noteForm.hidden = !currentUser || !state.noteComposerOpen
		noteSubmitBtn.textContent = state.editingNoteId ? 'Zapisz notatke' : 'Dodaj notatke'
		noteCancelBtn.hidden = !currentUser || !state.noteComposerOpen

		if (!currentUser) {
			noteToggleBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Zaloguj sie, aby dodac</span>'
			return
		}

		if (state.editingNoteId) {
			noteToggleBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i><span>Edytujesz notatke</span>'
			return
		}

		noteToggleBtn.innerHTML = state.noteComposerOpen
			? '<i class="fa-solid fa-chevron-up"></i><span>Schowaj formularz</span>'
			: '<i class="fa-solid fa-file-lines"></i><span>Dodaj notatke</span>'
	}

	function updateTaskComposer(currentUser) {
		const users = loadUsers()
		taskForm.hidden = !canManageTasks(currentUser) || !state.taskComposerOpen
		taskSubmitBtn.textContent = state.editingTaskId ? 'Zapisz zadanie' : 'Dodaj zadanie'
		taskCancelBtn.hidden = !canManageTasks(currentUser) || !state.taskComposerOpen
		populateTaskAssigneeOptions(users, taskAssigneeSelect.value || '')

		if (!currentUser) {
			taskToggleBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Zaloguj sie, aby dodac</span>'
			return
		}

		if (!canManageTasks(currentUser)) {
			taskToggleBtn.innerHTML = '<i class="fa-solid fa-lock"></i><span>Zadania tylko dla admina</span>'
			return
		}

		if (state.editingTaskId) {
			taskToggleBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i><span>Edytujesz zadanie</span>'
			return
		}

		taskToggleBtn.innerHTML = state.taskComposerOpen
			? '<i class="fa-solid fa-chevron-up"></i><span>Schowaj formularz</span>'
			: '<i class="fa-solid fa-list-check"></i><span>Dodaj zadanie</span>'
	}

	function resetTaskForm(selectedAssigneeId = '') {
		taskForm.reset()
		taskPrioritySelect.value = 'medium'
		taskStatusSelect.value = 'todo'
		populateTaskAssigneeOptions(loadUsers(), selectedAssigneeId)
	}

	function closeAnnouncementComposer() {
		state.announcementComposerOpen = false
		state.editingAnnouncementId = ''
		announcementForm.reset()
		updateAnnouncementComposer(getCurrentUser())
	}

	function closeNoteComposer() {
		state.noteComposerOpen = false
		state.editingNoteId = ''
		noteForm.reset()
		updateNoteComposer(getCurrentUser())
	}

	function closeTaskComposer() {
		state.taskComposerOpen = false
		state.editingTaskId = ''
		resetTaskForm(getCurrentUser()?.id || '')
		updateTaskComposer(getCurrentUser())
	}

	function openAnnouncementComposer(entry = null) {
		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		closeNoteComposer()
		closeTaskComposer()

		state.announcementComposerOpen = true
		state.editingAnnouncementId = entry?.id || ''
		announcementTitleInput.value = entry?.title || ''
		announcementContentInput.value = entry?.content || ''
		updateAnnouncementComposer(currentUser)
		window.setTimeout(() => announcementTitleInput.focus(), 40)
	}

	function openNoteComposer(entry = null) {
		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		closeAnnouncementComposer()
		closeTaskComposer()

		state.noteComposerOpen = true
		state.editingNoteId = entry?.id || ''
		noteContentInput.value = entry?.content || ''
		updateNoteComposer(currentUser)
		window.setTimeout(() => noteContentInput.focus(), 40)
	}

	function openTaskComposer(task = null) {
		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		if (!canManageTasks(currentUser)) {
			showFeedbackMessage('Tylko administrator moze tworzyc i przypisywac zadania.', 'info')
			return
		}

		closeAnnouncementComposer()
		closeNoteComposer()

		state.taskComposerOpen = true
		state.editingTaskId = task?.id || ''
		taskTitleInput.value = task?.title || ''
		taskDescriptionInput.value = task?.description || ''
		taskPrioritySelect.value = task?.priority || 'medium'
		taskStatusSelect.value = task?.status || 'todo'
		populateTaskAssigneeOptions(loadUsers(), task?.assignedToUserId || currentUser.id)
		updateTaskComposer(currentUser)
		window.setTimeout(() => taskTitleInput.focus(), 40)
	}

	function createEmptyStateMarkup({ title, copy, accent = 'note' }) {
		const iconMap = {
			announcement: 'fa-bullhorn',
			note: 'fa-file-lines',
			task: 'fa-list-check',
		}

		return `
			<div class="notes-empty-state is-${accent}">
				<div class="notes-empty-icon">
					<i class="fa-solid ${iconMap[accent] || iconMap.note}"></i>
				</div>
				<strong>${escapeHtml(title)}</strong>
				<p>${escapeHtml(copy)}</p>
			</div>
		`
	}

	function createEntryActionsMarkup({ type, entryId, canManage }) {
		if (!canManage) return ''

		return `
			<div class="notes-entry-actions">
				<button type="button" class="notes-icon-btn" data-entry-type="${type}" data-entry-action="edit" data-entry-id="${entryId}" aria-label="Edytuj wpis">
					<i class="fa-solid fa-pen-to-square"></i>
				</button>
				<button type="button" class="notes-icon-btn is-danger" data-entry-type="${type}" data-entry-action="delete" data-entry-id="${entryId}" aria-label="Usun wpis">
					<i class="fa-solid fa-trash-can"></i>
				</button>
			</div>
		`
	}

	function createEntryFooterMarkup(entry) {
		const author = getActorMeta(entry.authorId)
		const isEdited = entry.updatedAt && entry.updatedAt !== entry.createdAt

		return `
			<div class="notes-entry-footer">
				<div class="notes-author-chip">
					<span class="notes-author-avatar">${escapeHtml(getInitials(author.displayName))}</span>
					<div class="notes-author-copy">
						<strong>${escapeHtml(author.displayName)}</strong>
						<span>@${escapeHtml(author.loginLabel)}</span>
					</div>
				</div>

				<div class="notes-entry-timestamps">
					<span>Dodano ${formatDateTimeLabel(entry.createdAt)}</span>
					<span>${isEdited ? `Edytowano ${formatDateTimeLabel(entry.updatedAt)}` : 'Bez edycji'}</span>
				</div>
			</div>
		`
	}

	function createTaskStatusOptionsMarkup(selectedStatus) {
		return Object.entries(TASK_STATUS_META)
			.map(([statusKey, meta]) => {
				const selectedAttr = statusKey === selectedStatus ? ' selected' : ''
				return `<option value="${statusKey}"${selectedAttr}>${escapeHtml(meta.label)}</option>`
			})
			.join('')
	}

	function createTaskActionsMarkup(task, currentUser) {
		const topActions = canManageTasks(currentUser)
			? `
				<div class="notes-entry-actions">
					<button type="button" class="notes-icon-btn" data-task-action="edit" data-task-id="${task.id}" aria-label="Edytuj zadanie">
						<i class="fa-solid fa-pen-to-square"></i>
					</button>
					<button type="button" class="notes-icon-btn is-danger" data-task-action="delete" data-task-id="${task.id}" aria-label="Usun zadanie">
						<i class="fa-solid fa-trash-can"></i>
					</button>
				</div>
			`
			: ''

		const statusControl = canUpdateTaskStatus(task, currentUser)
			? `
				<label class="notes-task-status-control" for="notes-task-status-inline-${task.id}">
					<span>Status</span>
					<select id="notes-task-status-inline-${task.id}" class="notes-task-status-select" data-task-action="status" data-task-id="${task.id}">
						${createTaskStatusOptionsMarkup(task.status)}
					</select>
				</label>
			`
			: `
				<div class="notes-task-status-readonly">
					<span>Status</span>
					<strong>${escapeHtml(getTaskStatusMeta(task.status).label)}</strong>
				</div>
			`

		return { topActions, statusControl }
	}

	function renderAnnouncements(currentUser, announcements) {
		if (announcements.length === 0) {
			announcementsList.innerHTML = createEmptyStateMarkup({
				title: 'Brak waznych tematow',
				copy: currentUser
					? 'Dodaj pierwszy przypiety komunikat dla zespolu i trzymaj najwazniejsze sprawy na gorze.'
					: 'Po zalogowaniu mozna dodac pierwszy przypiety komunikat dla zespolu.',
				accent: 'announcement',
			})
			return
		}

		announcementsList.innerHTML = announcements
			.map(entry => {
				const actionMarkup = createEntryActionsMarkup({
					type: 'announcement',
					entryId: entry.id,
					canManage: canManageEntry(entry, currentUser),
				})

				return `
					<article class="notes-entry-card is-announcement">
						<div class="notes-entry-top">
							<div class="notes-entry-tags">
								<span class="notes-entry-tag is-pinned">Wazny temat</span>
								<span class="notes-entry-tag">Przypiety</span>
							</div>
							${actionMarkup}
						</div>

						<h4 class="notes-entry-title">${escapeHtml(entry.title)}</h4>
						<div class="notes-entry-body">${renderMultilineText(entry.content)}</div>
						${createEntryFooterMarkup(entry)}
					</article>
				`
			})
			.join('')
	}

	function renderNotes(currentUser, notes) {
		if (notes.length === 0) {
			notesList.innerHTML = createEmptyStateMarkup({
				title: 'Brak wspolnych notatek',
				copy: currentUser
					? 'Dodaj pierwszy tekst, checklisty albo szybka instrukcje dla pozostalych osob.'
					: 'Po zalogowaniu mozna zapisac pierwsza wspolna notatke dla zespolu.',
			})
			return
		}

		notesList.innerHTML = notes
			.map(entry => {
				const actionMarkup = createEntryActionsMarkup({
					type: 'note',
					entryId: entry.id,
					canManage: canManageEntry(entry, currentUser),
				})

				return `
					<article class="notes-entry-card">
						<div class="notes-entry-top">
							<div class="notes-entry-tags">
								<span class="notes-entry-tag is-muted">Wspolna notatka</span>
							</div>
							${actionMarkup}
						</div>

						<div class="notes-entry-body">${renderMultilineText(entry.content)}</div>
						${createEntryFooterMarkup(entry)}
					</article>
				`
			})
			.join('')
	}

	function renderTasks(currentUser, tasks) {
		if (tasks.length === 0) {
			tasksList.innerHTML = createEmptyStateMarkup({
				title: 'Brak zadan zespolowych',
				copy: currentUser?.role === 'admin'
					? 'Dodaj pierwsze zadanie i przypisz je do jednej z osob w zespole.'
					: 'Lista zadan pojawi sie tutaj, gdy administrator przypisze pierwsze zadanie.',
				accent: 'task',
			})
			return
		}

		tasksList.innerHTML = tasks
			.map(task => {
				const assignee = getActorMeta(task.assignedToUserId)
				const creator = getActorMeta(task.createdBy)
				const updater = getActorMeta(task.updatedBy)
				const statusMeta = getTaskStatusMeta(task.status)
				const priorityMeta = getTaskPriorityMeta(task.priority)
				const taskActions = createTaskActionsMarkup(task, currentUser)

				return `
					<article class="notes-task-card ${statusMeta.className} ${priorityMeta.className}">
						<div class="notes-task-top">
							<div class="notes-entry-tags">
								<span class="notes-entry-tag ${statusMeta.className}">${escapeHtml(statusMeta.label)}</span>
								<span class="notes-entry-tag ${priorityMeta.className}">${escapeHtml(priorityMeta.label)} priorytet</span>
							</div>
							${taskActions.topActions}
						</div>

						<div class="notes-task-main">
							<div class="notes-task-copy">
								<h4 class="notes-entry-title">${escapeHtml(task.title)}</h4>
								<div class="notes-task-description">${renderMultilineText(task.description)}</div>
							</div>

							<div class="notes-task-assignee">
								${createUserAvatarMarkup(assignee, 'notes-task-avatar')}
								<div class="notes-task-assignee-copy">
									<span>Przypisane do</span>
									<strong>${escapeHtml(assignee.displayName)}</strong>
									<small>@${escapeHtml(assignee.loginLabel)}</small>
								</div>
							</div>
						</div>

						<div class="notes-task-meta-row">
							<div class="notes-task-meta-item">
								<span>Autor zadania</span>
								<strong>${escapeHtml(creator.displayName)}</strong>
							</div>
							<div class="notes-task-meta-item">
								<span>Ostatnia zmiana</span>
								<strong>${escapeHtml(updater.displayName)}</strong>
							</div>
						</div>

						<div class="notes-task-footer">
							<div class="notes-entry-timestamps">
								<span>Dodano ${formatDateTimeLabel(task.createdAt)}</span>
								<span>Aktualizacja ${formatDateTimeLabel(task.updatedAt)}</span>
							</div>
							${taskActions.statusControl}
						</div>
					</article>
				`
			})
			.join('')
	}

	function refreshView() {
		const currentUser = getCurrentUser()
		const announcements = notesService.getAnnouncements()
		const notes = notesService.getNotes()
		const tasks = tasksService.getTasks()

		renderAuthCallout(currentUser)
		renderTaskAdminCallout(currentUser)
		renderBoardSummary(announcements, notes, tasks, currentUser)
		renderUserStatus(currentUser)
		renderSidebarStats(announcements, notes, tasks, currentUser)
		updateAnnouncementComposer(currentUser)
		updateNoteComposer(currentUser)
		updateTaskComposer(currentUser)
		renderAnnouncements(currentUser, announcements)
		renderNotes(currentUser, notes)
		renderTasks(currentUser, tasks)
	}

	authBtn.addEventListener('click', () => {
		if (getCurrentUser()) {
			AppUtils.auth.openProfileModal()
			return
		}

		AppUtils.auth.openAuthModal('login')
	})

	announcementToggleBtn.addEventListener('click', () => {
		if (!getCurrentUser()) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		if (state.announcementComposerOpen && !state.editingAnnouncementId) {
			closeAnnouncementComposer()
			return
		}

		openAnnouncementComposer()
	})

	noteToggleBtn.addEventListener('click', () => {
		if (!getCurrentUser()) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		if (state.noteComposerOpen && !state.editingNoteId) {
			closeNoteComposer()
			return
		}

		openNoteComposer()
	})

	taskToggleBtn.addEventListener('click', () => {
		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		if (!canManageTasks(currentUser)) {
			showFeedbackMessage('Tylko administrator moze tworzyc i przypisywac zadania.', 'info')
			return
		}

		if (state.taskComposerOpen && !state.editingTaskId) {
			closeTaskComposer()
			return
		}

		openTaskComposer()
	})

	announcementCancelBtn.addEventListener('click', closeAnnouncementComposer)
	noteCancelBtn.addEventListener('click', closeNoteComposer)
	taskCancelBtn.addEventListener('click', closeTaskComposer)

	announcementForm.addEventListener('submit', event => {
		event.preventDefault()
		const currentUser = getCurrentUser()

		if (!currentUser) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		try {
			if (state.editingAnnouncementId) {
				notesService.updateAnnouncement({
					announcementId: state.editingAnnouncementId,
					title: announcementTitleInput.value,
					content: announcementContentInput.value,
					actor: currentUser,
				})
				showFeedbackMessage('Zapisano zmiany w waznym temacie.', 'success')
			} else {
				notesService.createAnnouncement({
					title: announcementTitleInput.value,
					content: announcementContentInput.value,
					authorId: currentUser.id,
				})
				showFeedbackMessage('Dodano nowy wazny temat dla zespolu.', 'success')
			}

			closeAnnouncementComposer()
			refreshView()
		} catch (error) {
			showFeedbackMessage(error.message || 'Nie udalo sie zapisac waznego tematu.', 'error')
		}
	})

	noteForm.addEventListener('submit', event => {
		event.preventDefault()
		const currentUser = getCurrentUser()

		if (!currentUser) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		try {
			if (state.editingNoteId) {
				notesService.updateNote({
					noteId: state.editingNoteId,
					content: noteContentInput.value,
					actor: currentUser,
				})
				showFeedbackMessage('Zapisano zmiany w notatce.', 'success')
			} else {
				notesService.createNote({
					content: noteContentInput.value,
					authorId: currentUser.id,
				})
				showFeedbackMessage('Dodano nowa notatke do wspolnej tablicy.', 'success')
			}

			closeNoteComposer()
			refreshView()
		} catch (error) {
			showFeedbackMessage(error.message || 'Nie udalo sie zapisac notatki.', 'error')
		}
	})

	taskForm.addEventListener('submit', event => {
		event.preventDefault()
		const currentUser = getCurrentUser()

		if (!currentUser) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		if (!canManageTasks(currentUser)) {
			showFeedbackMessage('Tylko administrator moze tworzyc i przypisywac zadania.', 'error')
			return
		}

		try {
			if (state.editingTaskId) {
				tasksService.updateTask({
					taskId: state.editingTaskId,
					title: taskTitleInput.value,
					description: taskDescriptionInput.value,
					assignedToUserId: taskAssigneeSelect.value,
					priority: taskPrioritySelect.value,
					status: taskStatusSelect.value,
					actor: currentUser,
				})
				showFeedbackMessage('Zapisano zmiany w zadaniu.', 'success')
			} else {
				tasksService.createTask({
					title: taskTitleInput.value,
					description: taskDescriptionInput.value,
					assignedToUserId: taskAssigneeSelect.value,
					priority: taskPrioritySelect.value,
					status: taskStatusSelect.value,
					actor: currentUser,
				})
				showFeedbackMessage('Dodano nowe zadanie do tablicy.', 'success')
			}

			closeTaskComposer()
			refreshView()
		} catch (error) {
			showFeedbackMessage(error.message || 'Nie udalo sie zapisac zadania.', 'error')
		}
	})

	async function handleEntryAction(event) {
		const actionBtn = event.target.closest('[data-entry-action]')
		if (!actionBtn) return

		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		const entryId = actionBtn.dataset.entryId || ''
		const entryType = actionBtn.dataset.entryType || ''
		const action = actionBtn.dataset.entryAction || ''
		const entry =
			entryType === 'announcement'
				? notesService.getAnnouncementById(entryId)
				: notesService.getNoteById(entryId)

		if (!entry) {
			showFeedbackMessage('Nie znaleziono wybranego wpisu.', 'error')
			return
		}

		if (!canManageEntry(entry, currentUser)) {
			showFeedbackMessage('Tylko autor wpisu lub admin moze wykonac te akcje.', 'error')
			return
		}

		if (action === 'edit') {
			if (entryType === 'announcement') {
				openAnnouncementComposer(entry)
			} else {
				openNoteComposer(entry)
			}
			return
		}

		if (action !== 'delete') return

		const shouldDelete = await AppUtils.confirmDialog({
			title: entryType === 'announcement' ? 'Usun wazny temat?' : 'Usun notatke?',
			message:
				entryType === 'announcement'
					? 'Ta operacja usunie przypiety komunikat z tablicy zespolu.'
					: 'Ta operacja usunie wpis z listy wspolnych notatek.',
			confirmLabel: 'Usun wpis',
			cancelLabel: 'Anuluj',
		})

		if (!shouldDelete) return

		try {
			if (entryType === 'announcement') {
				notesService.deleteAnnouncement({ announcementId: entryId, actor: currentUser })
				if (state.editingAnnouncementId === entryId) closeAnnouncementComposer()
				showFeedbackMessage('Usunieto wazny temat z tablicy.', 'success')
			} else {
				notesService.deleteNote({ noteId: entryId, actor: currentUser })
				if (state.editingNoteId === entryId) closeNoteComposer()
				showFeedbackMessage('Usunieto notatke ze wspolnej tablicy.', 'success')
			}

			refreshView()
		} catch (error) {
			showFeedbackMessage(error.message || 'Nie udalo sie usunac wpisu.', 'error')
		}
	}

	async function handleTaskClick(event) {
		const actionBtn = event.target.closest('[data-task-action]')
		if (!actionBtn || actionBtn.dataset.taskAction === 'status') return

		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		const taskId = actionBtn.dataset.taskId || ''
		const action = actionBtn.dataset.taskAction || ''
		const task = tasksService.getTaskById(taskId)

		if (!task) {
			showFeedbackMessage('Nie znaleziono zadania.', 'error')
			return
		}

		if (!canManageTasks(currentUser)) {
			showFeedbackMessage('Tylko administrator moze edytowac lub usuwac zadania.', 'error')
			return
		}

		if (action === 'edit') {
			openTaskComposer(task)
			return
		}

		if (action !== 'delete') return

		const shouldDelete = await AppUtils.confirmDialog({
			title: 'Usun zadanie?',
			message: 'Ta operacja usunie zadanie z tablicy zespolu.',
			confirmLabel: 'Usun zadanie',
			cancelLabel: 'Anuluj',
		})

		if (!shouldDelete) return

		try {
			tasksService.deleteTask({ taskId, actor: currentUser })
			if (state.editingTaskId === taskId) closeTaskComposer()
			showFeedbackMessage('Usunieto zadanie z tablicy.', 'success')
			refreshView()
		} catch (error) {
			showFeedbackMessage(error.message || 'Nie udalo sie usunac zadania.', 'error')
		}
	}

	function handleTaskStatusChange(event) {
		const statusSelect = event.target.closest('[data-task-action="status"]')
		if (!statusSelect) return

		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		const taskId = statusSelect.dataset.taskId || ''

		try {
			tasksService.updateTaskStatus({
				taskId,
				status: statusSelect.value,
				actor: currentUser,
			})
			showFeedbackMessage('Zaktualizowano status zadania.', 'success')
			refreshView()
		} catch (error) {
			showFeedbackMessage(error.message || 'Nie udalo sie zmienic statusu zadania.', 'error')
			refreshView()
		}
	}

	announcementsList.addEventListener('click', handleEntryAction)
	notesList.addEventListener('click', handleEntryAction)
	tasksList.addEventListener('click', handleTaskClick)
	tasksList.addEventListener('change', handleTaskStatusChange)

	document.addEventListener('app-auth-changed', refreshView)
	window.addEventListener('storage', event => {
		if ([NOTES_STORAGE_KEY, ANNOUNCEMENTS_STORAGE_KEY, TASKS_STORAGE_KEY, USERS_STORAGE_KEY, SESSION_STORAGE_KEY].includes(event.key)) {
			refreshView()
		}
	})

	resetTaskForm('')
	refreshView()
})
