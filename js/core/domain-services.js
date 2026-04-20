(function initializeAppDomainServices() {
	const appServices = (window.AppServices = window.AppServices || {})
	const storageService = appServices.storageService
	const usersService = appServices.usersService

	if (!storageService) {
		return
	}

	const STORAGE_KEYS = window.AppUtils?.config?.STORAGE_KEYS || {
		LUNCH: 'dashboard_lunch_reservations',
		NOTES: 'dashboard_notes_entries',
		ANNOUNCEMENTS: 'dashboard_notes_announcements',
		TASKS: 'dashboard_notes_tasks',
		TESTER_FEEDBACK: 'dashboard_testers_feedback',
	}

	const LUNCH_TIME_SLOTS = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00']
	const LUNCH_MAX_CAPACITY_PER_SLOT = 4

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

	const formatDateValue = value => {
		const formatDate = window.AppUtils?.formatDate
		if (typeof formatDate === 'function') {
			return formatDate(value)
		}

		const parsedDate = value instanceof Date ? new Date(value.getTime()) : new Date(String(value || ''))
		if (Number.isNaN(parsedDate.getTime())) return ''

		const year = parsedDate.getFullYear()
		const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
		const day = String(parsedDate.getDate()).padStart(2, '0')
		return `${year}-${month}-${day}`
	}

	const readArray = (key, fallback = []) => {
		const parsedValue = storageService.readJson(key, fallback)
		return Array.isArray(parsedValue) ? parsedValue : fallback
	}

	const createEntryId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

	const getTimestamp = value => {
		const parsedTime = Date.parse(value)
		return Number.isFinite(parsedTime) ? parsedTime : 0
	}

	const sortByUpdatedDesc = (leftEntry, rightEntry) => getTimestamp(rightEntry.updatedAt) - getTimestamp(leftEntry.updatedAt)

	const getTaskStatusMeta = status => TASK_STATUS_META[status] || TASK_STATUS_META.todo
	const getTaskPriorityMeta = priority => TASK_PRIORITY_META[priority] || TASK_PRIORITY_META.medium

	const canManageEntry = (entry, actor) => {
		if (!entry || !actor) return false
		return actor.role === 'admin' || String(entry.authorId) === String(actor.id)
	}

	const canManageTasks = actor => actor?.role === 'admin'

	const canUpdateTaskStatus = (task, actor) => {
		if (!task || !actor) return false
		return actor.role === 'admin' || String(task.assignedToUserId) === String(actor.id)
	}

	const getUserById = userId =>
		(usersService?.getAll?.() || []).find(user => String(user?.id || '') === String(userId || '')) || null

	const normalizeReservationRecord = record => {
		const normalizedSlot = LUNCH_TIME_SLOTS.includes(record.timeSlot) ? record.timeSlot : ''
		const normalizedDate = formatDateValue(record.date)

		return {
			id: String(record.id || ''),
			date: normalizedDate || '',
			timeSlot: normalizedSlot,
			userId: String(record.userId || ''),
			createdAt: record.createdAt || new Date().toISOString(),
			updatedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
			status: record.status === 'cancelled' ? 'cancelled' : 'active',
		}
	}

	const lunchService = {
		// TODO: replace this localStorage implementation with fetch/API calls once backend lunch endpoints are ready.
		loadReservations() {
			return readArray(STORAGE_KEYS.LUNCH).map(normalizeReservationRecord)
		},
		saveReservations(reservations) {
			storageService.writeJson(STORAGE_KEYS.LUNCH, reservations)
		},
		getReservationsForDate(date) {
			const normalizedDate = formatDateValue(date)
			return this.loadReservations()
				.filter(reservation => reservation.status === 'active' && reservation.date === normalizedDate)
				.sort((left, right) => {
					const leftSlotIndex = LUNCH_TIME_SLOTS.indexOf(left.timeSlot)
					const rightSlotIndex = LUNCH_TIME_SLOTS.indexOf(right.timeSlot)
					if (leftSlotIndex !== rightSlotIndex) return leftSlotIndex - rightSlotIndex

					const leftTime = Date.parse(left.createdAt) || 0
					const rightTime = Date.parse(right.createdAt) || 0
					return leftTime - rightTime
				})
		},
		getReservationsForSlot(date, timeSlot) {
			return this.getReservationsForDate(date).filter(reservation => reservation.timeSlot === timeSlot)
		},
		getUserReservationForDate(date, userId) {
			return this.getReservationsForDate(date).find(reservation => reservation.userId === String(userId || '')) || null
		},
		reserveSlot({ date, timeSlot, userId }) {
			const normalizedDate = formatDateValue(date)
			const normalizedUserId = String(userId || '')
			if (!normalizedUserId) {
				throw new Error('Musisz byc zalogowany, aby zapisac sie na obiad.')
			}

			if (!normalizedDate) {
				throw new Error('Wybierz poprawna date rezerwacji.')
			}

			if (!LUNCH_TIME_SLOTS.includes(timeSlot)) {
				throw new Error('Wybrany slot nie istnieje w harmonogramie.')
			}

			const reservations = this.loadReservations()
			const activeReservations = reservations.filter(
				reservation => reservation.status === 'active' && reservation.date === normalizedDate
			)

			const existingReservation = activeReservations.find(reservation => reservation.userId === normalizedUserId)
			if (existingReservation) {
				if (existingReservation.timeSlot === timeSlot) {
					throw new Error(`Masz juz aktywna rezerwacje na ${timeSlot}.`)
				}

				throw new Error(`Masz juz aktywna rezerwacje na ${existingReservation.timeSlot}. Najpierw ja anuluj.`)
			}

			const activeSlotReservations = activeReservations.filter(reservation => reservation.timeSlot === timeSlot)
			if (activeSlotReservations.length >= LUNCH_MAX_CAPACITY_PER_SLOT) {
				throw new Error(`Slot ${timeSlot} jest juz pelny.`)
			}

			const now = new Date().toISOString()
			const nextReservation = {
				id: createEntryId('lunch'),
				date: normalizedDate,
				timeSlot,
				userId: normalizedUserId,
				createdAt: now,
				updatedAt: now,
				status: 'active',
			}

			reservations.push(nextReservation)
			this.saveReservations(reservations)
			return nextReservation
		},
		cancelReservation({ reservationId, userId }) {
			const normalizedReservationId = String(reservationId || '')
			const normalizedUserId = String(userId || '')
			const reservations = this.loadReservations()
			const reservationIndex = reservations.findIndex(
				reservation =>
					reservation.id === normalizedReservationId &&
					reservation.userId === normalizedUserId &&
					reservation.status === 'active'
			)

			if (reservationIndex === -1) {
				throw new Error('Nie znaleziono aktywnej rezerwacji do anulowania.')
			}

			reservations[reservationIndex] = {
				...reservations[reservationIndex],
				status: 'cancelled',
				updatedAt: new Date().toISOString(),
			}

			this.saveReservations(reservations)
			return reservations[reservationIndex]
		},
	}

	const normalizeNoteRecord = record => ({
		id: String(record.id || ''),
		content: String(record.content || '').trim(),
		authorId: String(record.authorId || ''),
		createdAt: record.createdAt || new Date().toISOString(),
		updatedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
		isPinned: Boolean(record.isPinned),
		pinnedAt: record.pinnedAt || '',
		pinnedBy: String(record.pinnedBy || ''),
	})

	const normalizeAnnouncementRecord = record => ({
		id: String(record.id || ''),
		title: String(record.title || '').trim(),
		content: String(record.content || '').trim(),
		authorId: String(record.authorId || ''),
		createdAt: record.createdAt || new Date().toISOString(),
		updatedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
		isPinned: record.isPinned !== false,
	})

	const normalizeTaskRecord = record => ({
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
	})

	const TESTER_CATEGORY_META = {
		bug: { label: 'Bug', order: 0, className: 'is-category-bug' },
		ux: { label: 'UX', order: 1, className: 'is-category-ux' },
		idea: { label: 'Pomysl', order: 2, className: 'is-category-idea' },
		note: { label: 'Informacja', order: 3, className: 'is-category-note' },
	}

	const TESTER_SEVERITY_META = {
		critical: { label: 'Krytyczny', order: 0, className: 'is-severity-critical' },
		high: { label: 'Wysoki', order: 1, className: 'is-severity-high' },
		medium: { label: 'Sredni', order: 2, className: 'is-severity-medium' },
		low: { label: 'Niski', order: 3, className: 'is-severity-low' },
	}

	const normalizeTesterFeedbackRecord = record => ({
		id: String(record.id || ''),
		authorName: String(record.authorName || '').trim(),
		authorId: String(record.authorId || ''),
		authorAvatarId: String(record.authorAvatarId || 'blue'),
		authorAvatarImage: String(record.authorAvatarImage || '').trim(),
		area: String(record.area || '').trim(),
		category: TESTER_CATEGORY_META[record.category] ? record.category : 'bug',
		severity: TESTER_SEVERITY_META[record.severity] ? record.severity : 'medium',
		message: String(record.message || '').trim(),
		createdAt: record.createdAt || new Date().toISOString(),
		updatedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
	})

	const notesService = {
		// storageService writes shared notes to the remote backend when the server mode is active.
		loadNotes() {
			return readArray(STORAGE_KEYS.NOTES).map(normalizeNoteRecord)
		},
		saveNotes(notes) {
			storageService.writeJson(STORAGE_KEYS.NOTES, notes)
		},
		loadAnnouncements() {
			return readArray(STORAGE_KEYS.ANNOUNCEMENTS).map(normalizeAnnouncementRecord)
		},
		saveAnnouncements(announcements) {
			storageService.writeJson(STORAGE_KEYS.ANNOUNCEMENTS, announcements)
		},
		getNotes() {
			return this.loadNotes().filter(note => note.id && note.content && note.authorId).sort(sortByUpdatedDesc)
		},
		getChatMessages() {
			return this.loadNotes()
				.filter(note => note.id && note.content && note.authorId)
				.sort((leftNote, rightNote) => getTimestamp(leftNote.createdAt) - getTimestamp(rightNote.createdAt))
		},
		getPinnedChatMessages() {
			return this.getChatMessages()
				.filter(note => note.isPinned)
				.sort((leftNote, rightNote) => {
					const pinnedDiff = getTimestamp(rightNote.pinnedAt) - getTimestamp(leftNote.pinnedAt)
					if (pinnedDiff !== 0) return pinnedDiff
					return sortByUpdatedDesc(leftNote, rightNote)
				})
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
		createChatMessage({ content, actor }) {
			const normalizedActor = actor && typeof actor === 'object' ? actor : null
			const normalizedContent = String(content || '').trim()
			if (!normalizedActor?.id) {
				throw new Error('Musisz byc zalogowany, aby wyslac wiadomosc.')
			}

			if (!normalizedContent) {
				throw new Error('Wpisz tresc wiadomosci przed wyslaniem.')
			}

			const notes = this.loadNotes()
			const now = new Date().toISOString()
			const nextMessage = {
				id: createEntryId('chat-message'),
				content: normalizedContent,
				authorId: String(normalizedActor.id),
				createdAt: now,
				updatedAt: now,
				isPinned: false,
				pinnedAt: '',
				pinnedBy: '',
			}

			notes.push(nextMessage)
			this.saveNotes(notes)
			return nextMessage
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
		updateChatMessage({ messageId, content, actor }) {
			const normalizedMessageId = String(messageId || '')
			const normalizedContent = String(content || '').trim()
			const notes = this.loadNotes()
			const messageIndex = notes.findIndex(note => note.id === normalizedMessageId)

			if (messageIndex === -1) {
				throw new Error('Nie znaleziono wiadomosci do edycji.')
			}

			if (!actor || String(notes[messageIndex].authorId) !== String(actor.id || '')) {
				throw new Error('Mozesz edytowac tylko swoje wiadomosci.')
			}

			if (!normalizedContent) {
				throw new Error('Wiadomosc nie moze byc pusta.')
			}

			notes[messageIndex] = {
				...notes[messageIndex],
				content: normalizedContent,
				updatedAt: new Date().toISOString(),
			}

			this.saveNotes(notes)
			return notes[messageIndex]
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
		deleteChatMessage({ messageId, actor }) {
			const normalizedMessageId = String(messageId || '')
			const notes = this.loadNotes()
			const messageToDelete = notes.find(note => note.id === normalizedMessageId)

			if (!messageToDelete) {
				throw new Error('Nie znaleziono wiadomosci do usuniecia.')
			}

			if (!actor || String(messageToDelete.authorId) !== String(actor.id || '')) {
				throw new Error('Mozesz usuwac tylko swoje wiadomosci.')
			}

			this.saveNotes(notes.filter(note => note.id !== normalizedMessageId))
			return messageToDelete
		},
		setChatMessagePinned({ messageId, isPinned, actor }) {
			const normalizedMessageId = String(messageId || '')
			const notes = this.loadNotes()
			const messageIndex = notes.findIndex(note => note.id === normalizedMessageId)

			if (messageIndex === -1) {
				throw new Error('Nie znaleziono wiadomosci do przypiecia.')
			}

			if (!actor?.id) {
				throw new Error('Musisz byc zalogowany, aby przypinac wiadomosci.')
			}

			const shouldPin = Boolean(isPinned)
			notes[messageIndex] = {
				...notes[messageIndex],
				isPinned: shouldPin,
				pinnedAt: shouldPin ? new Date().toISOString() : '',
				pinnedBy: shouldPin ? String(actor.id) : '',
				updatedAt: new Date().toISOString(),
			}

			this.saveNotes(notes)
			return notes[messageIndex]
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
		// TODO: replace this localStorage implementation with fetch/API calls once backend task endpoints are ready.
		loadTasks() {
			return readArray(STORAGE_KEYS.TASKS).map(normalizeTaskRecord)
		},
		saveTasks(tasks) {
			storageService.writeJson(STORAGE_KEYS.TASKS, tasks)
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
		createTask({ title, description, assignedToUserId, priority, status, actor }) {
			if (!canManageTasks(actor)) {
				throw new Error('Tylko lider moze tworzyc i przypisywac zadania.')
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
				throw new Error('Tylko lider moze edytowac zadania.')
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
				throw new Error('Tylko lider moze usuwac zadania.')
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

	const testersService = {
		loadEntries() {
			return readArray(STORAGE_KEYS.TESTER_FEEDBACK).map(normalizeTesterFeedbackRecord)
		},
		saveEntries(entries) {
			storageService.writeJson(STORAGE_KEYS.TESTER_FEEDBACK, entries)
		},
		getEntries() {
			return this.loadEntries()
				.filter(entry => entry.id && entry.authorName && entry.message)
				.sort((leftEntry, rightEntry) => {
					const severityDiff =
						(TESTER_SEVERITY_META[leftEntry.severity] || TESTER_SEVERITY_META.medium).order -
						(TESTER_SEVERITY_META[rightEntry.severity] || TESTER_SEVERITY_META.medium).order
					if (severityDiff !== 0) return severityDiff

					return sortByUpdatedDesc(leftEntry, rightEntry)
				})
		},
		createEntry({ authorName, area, category, severity, message, actor }) {
			const normalizedActor = actor && typeof actor === 'object' ? actor : null
			if (!normalizedActor) {
				throw new Error('Musisz byc zalogowany, aby dodac uwage testerow.')
			}

			const normalizedAuthorName = normalizedActor
				? String(normalizedActor.fullName || normalizedActor.login || authorName || '').trim()
				: String(authorName || '').trim()
			const normalizedArea = String(area || '').trim()
			const normalizedMessage = String(message || '').trim()
			const normalizedCategory = TESTER_CATEGORY_META[category] ? category : 'bug'
			const normalizedSeverity = TESTER_SEVERITY_META[severity] ? severity : 'medium'

			if (!normalizedAuthorName) {
				throw new Error('Podaj imie lub nazwe osoby zglaszajacej uwage.')
			}

			if (!normalizedMessage) {
				throw new Error('Uzupelnij tresc uwagi przed zapisaniem.')
			}

			const entries = this.loadEntries()
			const now = new Date().toISOString()
			const nextEntry = {
				id: createEntryId('tester-feedback'),
				authorName: normalizedAuthorName,
				authorId: String(normalizedActor?.id || ''),
				authorAvatarId: String(normalizedActor?.avatarId || 'blue'),
				authorAvatarImage: String(normalizedActor?.avatarImage || '').trim(),
				area: normalizedArea,
				category: normalizedCategory,
				severity: normalizedSeverity,
				message: normalizedMessage,
				createdAt: now,
				updatedAt: now,
			}

			entries.unshift(nextEntry)
			this.saveEntries(entries)
			return nextEntry
		},
	}

	appServices.lunchDomainConfig = {
		TIME_SLOTS: LUNCH_TIME_SLOTS,
		MAX_CAPACITY_PER_SLOT: LUNCH_MAX_CAPACITY_PER_SLOT,
	}
	appServices.notesDomainConfig = {
		TASK_STATUS_META,
		TASK_PRIORITY_META,
	}
	appServices.testersDomainConfig = {
		CATEGORY_META: TESTER_CATEGORY_META,
		SEVERITY_META: TESTER_SEVERITY_META,
	}
	appServices.lunchService = lunchService
	appServices.notesService = notesService
	appServices.tasksService = tasksService
	appServices.testersService = testersService
})()
