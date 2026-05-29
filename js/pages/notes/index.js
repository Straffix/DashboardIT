(function initializeNotesPage() {
	const pageScope = window.AppPageRuntime?.createScope?.('notatnik.html') || null
	const runWhenReady = callback => {
		if (typeof pageScope?.runWhenReady === 'function') {
			pageScope.runWhenReady(callback)
			return
		}

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback, { once: true })
			return
		}

		callback()
	}
	const listen = (target, type, listener, options = undefined) => {
		if (!target?.addEventListener) return
		const nextOptions = pageScope?.signal ? { ...(options || {}), signal: pageScope.signal } : options
		target.addEventListener(type, listener, nextOptions)
	}
	const scheduleTimeout = typeof pageScope?.setTimeout === 'function' ? pageScope.setTimeout.bind(pageScope) : window.setTimeout.bind(window)
	const scheduleInterval = typeof pageScope?.setInterval === 'function' ? pageScope.setInterval.bind(pageScope) : window.setInterval.bind(window)

	runWhenReady(() => {
	const notesService = window.AppServices?.notesService
	const usersService = window.AppServices?.usersService
	const storageService = window.AppServices?.storageService
	const escapeHtml = AppUtils.escapeHtml
	const getInitials = AppUtils.getInitials
	const formatDateTimeLabel = AppUtils.formatDateTimeLabel
	const activeViewersStorageKey = AppUtils.config.STORAGE_KEYS.NOTES_ACTIVE_VIEWERS || 'dashboard_notes_active_viewers'
	const presenceTabIdKey = 'dashboard_notes_presence_tab_id'
	const presenceTtlMs = 45000

	const chatSummary = document.getElementById('notes-chat-summary')
	const authCallout = document.getElementById('notes-auth-callout')
	const authTitle = document.getElementById('notes-auth-title')
	const authText = document.getElementById('notes-auth-text')
	const authBtn = document.getElementById('notes-auth-btn')
	const chatWindow = document.getElementById('notes-chat-window')
	const chatList = document.getElementById('notes-chat-list')
	const chatForm = document.getElementById('notes-chat-form')
	const chatInput = document.getElementById('notes-chat-input')
	const chatSubmit = document.getElementById('notes-chat-submit')
	const cancelEditBtn = document.getElementById('notes-chat-cancel-edit')
	const editIndicator = document.getElementById('notes-chat-edit-indicator')
	const pinnedList = document.getElementById('notes-pinned-list')
	const pinnedCount = document.getElementById('notes-pinned-count')
	const userStatusBox = document.getElementById('notes-user-status')
	const activeViewersBox = document.getElementById('notes-active-viewers')

	if (
		!notesService ||
		!authCallout ||
		!authTitle ||
		!authText ||
		!authBtn ||
		!chatWindow ||
		!chatList ||
		!chatForm ||
		!chatInput ||
		!chatSubmit ||
		!cancelEditBtn ||
		!editIndicator ||
		!pinnedList ||
		!pinnedCount ||
		!userStatusBox ||
		!activeViewersBox ||
		typeof escapeHtml !== 'function' ||
		typeof getInitials !== 'function' ||
		typeof formatDateTimeLabel !== 'function'
	) {
		console.error('Notes chat module is missing required services or elements.')
		return
	}

	const state = {
		editingMessageId: '',
		refreshTimerId: 0,
		presenceTimerId: 0,
	}

	const getCurrentUser = () => AppUtils.auth.getCurrentUser()
	const getUsers = () => (usersService?.getAll?.() || []).filter(user => user?.id)
	const getPresenceTabId = () => {
		try {
			const existingId = sessionStorage.getItem(presenceTabIdKey)
			if (existingId) return existingId
			const nextId =
				typeof window.crypto?.randomUUID === 'function'
					? window.crypto.randomUUID()
					: `notes-tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
			sessionStorage.setItem(presenceTabIdKey, nextId)
			return nextId
		} catch (error) {
			return `notes-tab-${Date.now()}`
		}
	}
	const presenceTabId = getPresenceTabId()

	const getMessages = () => {
		if (typeof notesService.getChatMessages === 'function') {
			return notesService.getChatMessages()
		}

		return (notesService.loadNotes?.() || [])
			.filter(note => note.id && note.content && note.authorId)
			.sort((leftNote, rightNote) => (Date.parse(leftNote.createdAt) || 0) - (Date.parse(rightNote.createdAt) || 0))
	}

	const getPinnedMessages = () => {
		if (typeof notesService.getPinnedChatMessages === 'function') {
			return notesService.getPinnedChatMessages()
		}

		return getMessages()
			.filter(message => message.isPinned)
			.sort((leftMessage, rightMessage) => (Date.parse(rightMessage.pinnedAt) || 0) - (Date.parse(leftMessage.pinnedAt) || 0))
	}

	const findMessageById = messageId => getMessages().find(message => message.id === String(messageId || '')) || null

	const getAuthorMeta = authorId => {
		const matchedUser = getUsers().find(user => String(user.id) === String(authorId || ''))
		const displayName = String(matchedUser?.fullName || '').trim() || 'Użytkownik zespołu'

		return {
			id: String(authorId || ''),
			fullName: displayName,
			login: matchedUser?.login || 'konto',
			avatarId: matchedUser?.avatarId || 'blue',
			avatarImage: matchedUser?.avatarImage || '',
		}
	}

	const renderMultilineText = value => escapeHtml(value).replaceAll('\n', '<br>')

	const getActiveViewerRecords = () => {
		const records = storageService?.readJson?.(activeViewersStorageKey, []) || []
		return Array.isArray(records) ? records.filter(record => record && typeof record === 'object') : []
	}

	const saveActiveViewerRecords = records => {
		storageService?.writeJson?.(activeViewersStorageKey, Array.isArray(records) ? records : [])
	}

	const getFreshActiveViewerRecords = () => {
		const now = Date.now()
		return getActiveViewerRecords()
			.filter(record => record.userId && record.tabId && now - (Date.parse(record.lastSeenAt) || 0) <= presenceTtlMs)
			.sort((leftRecord, rightRecord) =>
				String(leftRecord.fullName || '').localeCompare(String(rightRecord.fullName || ''), 'pl')
			)
	}

	const syncCurrentViewerPresence = currentUser => {
		const records = getFreshActiveViewerRecords().filter(record => record.tabId !== presenceTabId)
		if (currentUser && !document.hidden) {
			records.push({
				tabId: presenceTabId,
				userId: String(currentUser.id || ''),
				login: currentUser.login || '',
				fullName: currentUser.fullName || '',
				avatarId: currentUser.avatarId || '',
				avatarImage: currentUser.avatarImage || '',
				lastSeenAt: new Date().toISOString(),
			})
		}
		saveActiveViewerRecords(records)
		return records
	}

	const clearCurrentViewerPresence = () => {
		const records = getActiveViewerRecords().filter(record => record.tabId !== presenceTabId)
		saveActiveViewerRecords(records)
	}

	pageScope?.onCleanup?.(() => {
		clearCurrentViewerPresence()
	})

	const renderActiveViewers = (currentUser, { syncPresence = true } = {}) => {
		if (!currentUser) {
			clearCurrentViewerPresence()
			activeViewersBox.hidden = true
			activeViewersBox.innerHTML = ''
			return
		}

		const recordsByUserId = new Map()
		const activeRecordsSource = syncPresence ? syncCurrentViewerPresence(currentUser) : getFreshActiveViewerRecords()
		activeRecordsSource.forEach(record => {
			if (!recordsByUserId.has(record.userId)) {
				recordsByUserId.set(record.userId, record)
			}
		})

		const activeRecords = [...recordsByUserId.values()]
		activeViewersBox.hidden = activeRecords.length === 0
		activeViewersBox.innerHTML = activeRecords.length
			? `
				<span class="notes-active-viewers-label">Aktywni teraz</span>
				<div class="notes-active-viewers-list">
					${activeRecords
						.map(record => {
							const nick = String(record.fullName || '').trim() || 'aktywny użytkownik'
							return `
								<span class="notes-active-viewer-chip">
									<span class="notes-active-dot" aria-hidden="true"></span>
									<span>${escapeHtml(nick)}</span>
								</span>
							`
						})
						.join('')}
				</div>
			`
			: ''
	}

	const createAvatarMarkup = (user, extraClass = '') => {
		if (typeof AppUtils.createAvatarMarkup === 'function') {
			return AppUtils.createAvatarMarkup({
				fullName: user.fullName,
				avatarId: user.avatarId,
				avatarImage: user.avatarImage,
				extraClass,
			})
		}

		return `<span class="notes-avatar ${extraClass}">${escapeHtml(getInitials(user.fullName))}</span>`
	}

	const canManageMessage = (message, currentUser) =>
		Boolean(message && currentUser && String(message.authorId) === String(currentUser.id))

	const notifyNotes = ({ message = '', type = 'info', title = '', silentSuccess = true } = {}) => {
		if (!message || typeof AppUtils.notify !== 'function') return
		if (silentSuccess && type === 'success') return
		AppUtils.notify({ message, type, title })
	}

	const isChatNearBottom = () => chatWindow.scrollTop + chatWindow.clientHeight >= chatWindow.scrollHeight - 120
	const scrollChatToBottom = () => {
		chatWindow.scrollTop = chatWindow.scrollHeight
	}

	const getLatestUpdateLabel = messages => {
		const latestMessage = [...messages].sort(
			(leftMessage, rightMessage) => (Date.parse(rightMessage.updatedAt) || 0) - (Date.parse(leftMessage.updatedAt) || 0)
		)[0]
		return latestMessage ? formatDateTimeLabel(latestMessage.updatedAt) : '--'
	}

	const renderAuthState = currentUser => {
		if (currentUser) {
			authCallout.hidden = true
			authCallout.classList.remove('is-active-user')
			authTitle.textContent = ''
			authText.textContent = ''
			authBtn.innerHTML = ''
			userStatusBox.innerHTML = ''
			chatInput.disabled = false
			chatSubmit.disabled = false
			chatForm.classList.remove('is-disabled')
			return
		}

		authCallout.hidden = false
		authCallout.classList.remove('is-active-user')
		authTitle.textContent = 'Zaloguj się, aby korzystać z czatu'
		authText.textContent = 'Czat jest dostępny dla zalogowanych użytkowników. Po zalogowaniu zobaczysz historię wiadomości z serwera.'
		authBtn.innerHTML = '<i class="app-icon right-to-bracket-solid-full"></i><span>Zaloguj się</span>'
		userStatusBox.innerHTML = `
			<strong>Gość</strong>
			<p>Zaloguj się, aby zobaczyć chat, pisać wiadomości i przypinać ważne wpisy.</p>
		`
		chatInput.disabled = true
		chatSubmit.disabled = true
		chatForm.classList.add('is-disabled')
	}

	const renderSummary = (messages, pinnedMessages, currentUser) => {
		if (!chatSummary) return

		if (!currentUser) {
			chatSummary.textContent = 'Zaloguj się, aby zobaczyć historię wiadomości i dopisać nową informację.'
			return
		}

		if (messages.length === 0) {
			chatSummary.textContent = 'Nie ma jeszcze wiadomości. Wyślij pierwszą informację dla zespołu.'
			return
		}

		chatSummary.textContent = `${messages.length} wiadomości, ${pinnedMessages.length} przypiętych. Ostatnia zmiana: ${getLatestUpdateLabel(messages)}.`
	}

	const createMessageActionsMarkup = (message, currentUser, { variant = 'default' } = {}) => {
		if (!currentUser) return ''

		const canEdit = canManageMessage(message, currentUser)
		const pinLabel = message.isPinned ? 'Odepnij' : 'Przypnij'
		const pinIcon = message.isPinned ? 'xmark-solid-full' : 'thumbtack-solid-full'
		const isCompact = variant === 'compact'
		const actionsClassName = ['notes-message-actions', isCompact ? 'is-compact' : ''].filter(Boolean).join(' ')
		const renderActionButton = ({ action, icon, label, isDanger = false }) => `
			<button
				type="button"
				class="notes-icon-btn${isDanger ? ' is-danger' : ''}"
				data-message-action="${action}"
				data-message-id="${escapeHtml(message.id)}"
				aria-label="${label}"
				title="${label}"
			>
				${renderIcon(icon)}
				${isCompact ? '' : `<span>${label}</span>`}
			</button>
		`

		return `
			<div class="${actionsClassName}">
				${renderActionButton({
					action: 'pin',
					icon: pinIcon,
					label: `${pinLabel} wiadomość`,
				})}
				${
					canEdit
						? `
							${renderActionButton({
								action: 'edit',
								icon: 'pen-to-square-solid-full',
								label: 'Edytuj wiadomość',
							})}
							${renderActionButton({
								action: 'delete',
								icon: 'trash-can-solid-full',
								label: 'Usuń wiadomość',
								isDanger: true,
							})}
						`
						: ''
				}
			</div>
		`
	}

	const createEmptyStateMarkup = ({ title, copy, icon = 'comment-solid-full' }) => `
		<div class="notes-empty-state">
			<div class="notes-empty-icon">
				${renderIcon(icon)}
			</div>
			<strong>${escapeHtml(title)}</strong>
			<p>${escapeHtml(copy)}</p>
		</div>
	`

	const renderMessages = (messages, currentUser) => {
		if (!currentUser) {
			chatList.innerHTML = createEmptyStateMarkup({
				title: 'Chat czeka na logowanie',
				copy: 'Po zalogowaniu zobaczysz wiadomości zapisane na serwerze.',
				icon: 'lock-solid-full',
			})
			return
		}

		if (messages.length === 0) {
			chatList.innerHTML = createEmptyStateMarkup({
				title: 'Brak wiadomości',
				copy: 'Napisz pierwszą wiadomość, a pojawi się tutaj po lewej stronie.',
			})
			return
		}

		chatList.innerHTML = messages
			.map(message => {
				const author = getAuthorMeta(message.authorId)
				const isMine = canManageMessage(message, currentUser)
				const isEdited = message.updatedAt && message.updatedAt !== message.createdAt

				return `
					<article class="notes-chat-message ${isMine ? 'is-mine' : ''} ${message.isPinned ? 'is-pinned' : ''}" data-message-id="${escapeHtml(message.id)}">
						<div class="notes-message-bubble">
							<header class="notes-message-meta">
								<strong>${escapeHtml(author.fullName)}</strong>
								<time datetime="${escapeHtml(message.createdAt)}">${escapeHtml(formatDateTimeLabel(message.createdAt))}</time>
								${isEdited ? '<span>edytowano</span>' : ''}
								${message.isPinned ? '<span class="notes-pin-chip"><i class="app-icon thumbtack-solid-full"></i> przypięte</span>' : ''}
							</header>
							<div class="notes-message-content">${renderMultilineText(message.content)}</div>
						</div>
						${createMessageActionsMarkup(message, currentUser, { variant: 'compact' })}
					</article>
				`
			})
			.join('')
	}

	const renderPinnedMessages = (pinnedMessages, currentUser) => {
		pinnedCount.textContent = String(pinnedMessages.length)

		if (pinnedMessages.length === 0) {
			pinnedList.innerHTML = createEmptyStateMarkup({
				title: 'Brak przypiętych wiadomości',
				copy: currentUser
					? 'Kliknij „Przypnij” przy wiadomości, aby dodać ją do tego panelu.'
					: 'Po przypięciu ważne wiadomości będą widoczne tutaj dla całego zespołu.',
				icon: 'thumbtack-solid-full',
			})
			return
		}

		pinnedList.innerHTML = pinnedMessages
			.map(message => {
				const author = getAuthorMeta(message.authorId)
				return `
					<article class="notes-pinned-card" data-message-id="${escapeHtml(message.id)}">
						<div class="notes-pinned-card-head">
							${createAvatarMarkup(author, 'notes-avatar-sm')}
							<div>
								<strong>${escapeHtml(author.fullName)}</strong>
								<span>${escapeHtml(formatDateTimeLabel(message.pinnedAt || message.updatedAt))}</span>
							</div>
						</div>
						<p>${renderMultilineText(message.content)}</p>
						${createMessageActionsMarkup(message, currentUser)}
					</article>
				`
			})
			.join('')
	}

	const setEditMode = message => {
		state.editingMessageId = message?.id || ''
		chatInput.value = message?.content || ''
		cancelEditBtn.hidden = !state.editingMessageId
		editIndicator.hidden = !state.editingMessageId
		chatSubmit.innerHTML = state.editingMessageId
			? '<i class="app-icon check-solid-full"></i><span>Zapisz</span>'
			: '<i class="app-icon paper-plane-solid-full"></i><span>Wyślij</span>'
		chatInput.focus()
	}

	const refreshView = ({ forceScrollBottom = false } = {}) => {
		const currentUser = getCurrentUser()
		const shouldStickToBottom = forceScrollBottom || isChatNearBottom()
		const allMessages = getMessages()
		const messages = currentUser ? allMessages : []
		const pinnedMessages = getPinnedMessages()

		renderAuthState(currentUser)
		renderSummary(messages, pinnedMessages, currentUser)
		renderMessages(messages, currentUser)
		renderPinnedMessages(pinnedMessages, currentUser)
		renderActiveViewers(currentUser)

		if (!currentUser && state.editingMessageId) {
			setEditMode(null)
		}

		if (shouldStickToBottom) {
			scheduleTimeout(scrollChatToBottom, 0)
		}
	}

	const handleMessageAction = async event => {
		const actionButton = event.target.closest('[data-message-action]')
		if (!actionButton) return

		const currentUser = getCurrentUser()
		if (!currentUser) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		const messageId = actionButton.dataset.messageId || ''
		const action = actionButton.dataset.messageAction || ''
		const message = findMessageById(messageId)

		if (!message) {
			notifyNotes({ message: 'Nie znaleziono wiadomości.', type: 'error', title: 'Brak wiadomości' })
			refreshView()
			return
		}

		if (action === 'pin') {
			try {
				notesService.setChatMessagePinned({
					messageId,
					isPinned: !message.isPinned,
					actor: currentUser,
				})
				refreshView()
			} catch (error) {
				notifyNotes({
					message: error.message || 'Nie udało się zmienić przypięcia.',
					type: 'error',
					title: 'Błąd przypięcia',
				})
			}
			return
		}

		if (!canManageMessage(message, currentUser)) {
			notifyNotes({
				message: 'Możesz edytować i usuwać tylko swoje wiadomości.',
				type: 'warning',
				title: 'Brak uprawnień',
			})
			return
		}

		if (action === 'edit') {
			setEditMode(message)
			return
		}

		if (action !== 'delete') return

		const shouldDelete = await AppUtils.confirmDialog({
			title: 'Usunąć wiadomość?',
			message: 'Ta wiadomość zniknie z czatu i z przypiętych wiadomości.',
			confirmLabel: 'Usuń',
			cancelLabel: 'Anuluj',
		})

		if (!shouldDelete) return

		try {
			notesService.deleteChatMessage({ messageId, actor: currentUser })
			if (state.editingMessageId === messageId) {
				setEditMode(null)
			}
			refreshView()
		} catch (error) {
			notifyNotes({
				message: error.message || 'Nie udało się usunąć wiadomości.',
				type: 'error',
				title: 'Błąd usuwania',
			})
		}
	}

	listen(authBtn, 'click', () => {
		AppUtils.auth.openAuthModal('login')
	})

	listen(chatForm, 'submit', event => {
		event.preventDefault()
		const currentUser = getCurrentUser()

		if (!currentUser) {
			AppUtils.auth.openAuthModal('login')
			return
		}

		try {
			if (state.editingMessageId) {
				notesService.updateChatMessage({
					messageId: state.editingMessageId,
					content: chatInput.value,
					actor: currentUser,
				})
			} else {
				notesService.createChatMessage({
					content: chatInput.value,
					actor: currentUser,
				})
			}

			setEditMode(null)
			refreshView({ forceScrollBottom: true })
		} catch (error) {
			notifyNotes({
				message: error.message || 'Nie udało się zapisać wiadomości.',
				type: 'error',
				title: 'Błąd wiadomości',
			})
		}
	})

	listen(cancelEditBtn, 'click', () => {
		setEditMode(null)
	})

	listen(chatInput, 'keydown', event => {
		if (event.key !== 'Enter' || event.shiftKey) return
		event.preventDefault()
		chatForm.requestSubmit()
	})

	listen(chatList, 'click', handleMessageAction)
	listen(pinnedList, 'click', handleMessageAction)

	listen(document, 'app-auth-changed', () => {
		setEditMode(null)
		refreshView({ forceScrollBottom: true })
	})

	listen(window, 'storage', event => {
		if (event.key === activeViewersStorageKey) {
			renderActiveViewers(getCurrentUser(), { syncPresence: false })
			return
		}

		if (event.key === AppUtils.config.STORAGE_KEYS.NOTES || event.key === AppUtils.config.STORAGE_KEYS.SESSION) {
			refreshView()
		}
	})

	listen(document, 'visibilitychange', () => {
		if (document.hidden) {
			clearCurrentViewerPresence()
			return
		}

		refreshView()
	})

	state.refreshTimerId = scheduleInterval(() => {
		if (document.hidden) return
		refreshView()
	}, 15000)

	state.presenceTimerId = scheduleInterval(() => {
		if (document.hidden) return
		renderActiveViewers(getCurrentUser())
	}, 10000)

	listen(window, 'beforeunload', () => {
		clearCurrentViewerPresence()
	})

	refreshView({ forceScrollBottom: true })
})
})()
