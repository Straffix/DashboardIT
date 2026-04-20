document.addEventListener('DOMContentLoaded', () => {
	const notesService = window.AppServices?.notesService
	const usersService = window.AppServices?.usersService
	const escapeHtml = AppUtils.escapeHtml
	const getInitials = AppUtils.getInitials
	const formatDateTimeLabel = AppUtils.formatDateTimeLabel

	const chatSummary = document.getElementById('notes-chat-summary')
	const feedback = document.getElementById('notes-feedback')
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

	if (
		!notesService ||
		!chatSummary ||
		!feedback ||
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
		typeof escapeHtml !== 'function' ||
		typeof getInitials !== 'function' ||
		typeof formatDateTimeLabel !== 'function'
	) {
		console.error('Notes chat module is missing required services or elements.')
		return
	}

	const state = {
		editingMessageId: '',
		feedbackTimeoutId: null,
		refreshTimerId: 0,
	}

	const getCurrentUser = () => AppUtils.auth.getCurrentUser()
	const getUsers = () => (usersService?.getAll?.() || []).filter(user => user?.id)

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
		const displayName = matchedUser?.fullName || matchedUser?.login || 'Nieznany użytkownik'

		return {
			id: String(authorId || ''),
			fullName: displayName,
			login: matchedUser?.login || 'konto',
			avatarId: matchedUser?.avatarId || 'blue',
			avatarImage: matchedUser?.avatarImage || '',
		}
	}

	const renderMultilineText = value => escapeHtml(value).replace(/\n/g, '<br>')

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

	const showFeedbackMessage = (message, type = 'info') => {
		if (state.feedbackTimeoutId) {
			window.clearTimeout(state.feedbackTimeoutId)
		}

		feedback.textContent = message
		feedback.className = `notes-feedback is-${type}`

		state.feedbackTimeoutId = window.setTimeout(() => {
			feedback.className = 'notes-feedback is-hidden'
			feedback.textContent = ''
		}, 3800)
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
			authCallout.classList.add('is-active-user')
			authTitle.textContent = `Pracujesz jako ${currentUser.fullName || `@${currentUser.login}`}`
			authText.textContent = 'Możesz pisać na czacie, przypinać wiadomości oraz edytować i usuwać swoje wpisy.'
			authBtn.innerHTML = '<i class="fa-solid fa-user-gear"></i><span>Profil</span>'
			userStatusBox.innerHTML = `
				<strong>${escapeHtml(currentUser.fullName || `@${currentUser.login}`)}</strong>
				<p>Wiadomości zapisują się na serwerze i są dostępne po zalogowaniu 24/7.</p>
			`
			chatInput.disabled = false
			chatSubmit.disabled = false
			chatForm.classList.remove('is-disabled')
			return
		}

		authCallout.classList.remove('is-active-user')
		authTitle.textContent = 'Zaloguj się, aby korzystać z czatu'
		authText.textContent = 'Czat jest dostępny dla zalogowanych użytkowników. Po zalogowaniu zobaczysz historię wiadomości z serwera.'
		authBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i><span>Zaloguj się</span>'
		userStatusBox.innerHTML = `
			<strong>Gość</strong>
			<p>Zaloguj się, aby zobaczyć chat, pisać wiadomości i przypinać ważne wpisy.</p>
		`
		chatInput.disabled = true
		chatSubmit.disabled = true
		chatForm.classList.add('is-disabled')
	}

	const renderSummary = (messages, pinnedMessages, currentUser) => {
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

	const createMessageActionsMarkup = (message, currentUser) => {
		if (!currentUser) return ''

		const canEdit = canManageMessage(message, currentUser)
		const pinLabel = message.isPinned ? 'Odepnij' : 'Przypnij'
		const pinIcon = message.isPinned ? 'fa-xmark' : 'fa-thumbtack'

		return `
			<div class="notes-message-actions">
				<button type="button" class="notes-icon-btn" data-message-action="pin" data-message-id="${escapeHtml(message.id)}" aria-label="${pinLabel} wiadomość">
					<i class="fa-solid ${pinIcon}"></i>
					<span>${pinLabel}</span>
				</button>
				${
					canEdit
						? `
							<button type="button" class="notes-icon-btn" data-message-action="edit" data-message-id="${escapeHtml(message.id)}" aria-label="Edytuj wiadomość">
								<i class="fa-solid fa-pen-to-square"></i>
								<span>Edytuj</span>
							</button>
							<button type="button" class="notes-icon-btn is-danger" data-message-action="delete" data-message-id="${escapeHtml(message.id)}" aria-label="Usuń wiadomość">
								<i class="fa-solid fa-trash-can"></i>
								<span>Usuń</span>
							</button>
						`
						: ''
				}
			</div>
		`
	}

	const createEmptyStateMarkup = ({ title, copy, icon = 'fa-comments' }) => `
		<div class="notes-empty-state">
			<div class="notes-empty-icon">
				<i class="fa-solid ${icon}"></i>
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
				icon: 'fa-lock',
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
						<div class="notes-message-avatar">
							${createAvatarMarkup(author, 'notes-avatar')}
						</div>
						<div class="notes-message-bubble">
							<header class="notes-message-meta">
								<strong>${escapeHtml(author.fullName)}</strong>
								<span>@${escapeHtml(author.login)}</span>
								<time datetime="${escapeHtml(message.createdAt)}">${escapeHtml(formatDateTimeLabel(message.createdAt))}</time>
								${isEdited ? '<span>edytowano</span>' : ''}
								${message.isPinned ? '<span class="notes-pin-chip"><i class="fa-solid fa-thumbtack"></i> przypięte</span>' : ''}
							</header>
							<div class="notes-message-content">${renderMultilineText(message.content)}</div>
							${createMessageActionsMarkup(message, currentUser)}
						</div>
					</article>
				`
			})
			.join('')
	}

	const renderPinnedMessages = (pinnedMessages, currentUser) => {
		pinnedCount.textContent = String(currentUser ? pinnedMessages.length : 0)

		if (!currentUser) {
			pinnedList.innerHTML = createEmptyStateMarkup({
				title: 'Przypięte po zalogowaniu',
				copy: 'Ten panel pokazuje najważniejsze wiadomości wybrane przez zespół.',
				icon: 'fa-thumbtack',
			})
			return
		}

		if (pinnedMessages.length === 0) {
			pinnedList.innerHTML = createEmptyStateMarkup({
				title: 'Nic nie jest przypięte',
				copy: 'Kliknij „Przypnij” przy wiadomości, aby dodać ją do tego panelu.',
				icon: 'fa-thumbtack',
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
			? '<i class="fa-solid fa-check"></i><span>Zapisz</span>'
			: '<i class="fa-solid fa-paper-plane"></i><span>Wyślij</span>'
		chatInput.focus()
	}

	const refreshView = ({ forceScrollBottom = false } = {}) => {
		const currentUser = getCurrentUser()
		const shouldStickToBottom = forceScrollBottom || isChatNearBottom()
		const messages = currentUser ? getMessages() : []
		const pinnedMessages = currentUser ? getPinnedMessages() : []

		renderAuthState(currentUser)
		renderSummary(messages, pinnedMessages, currentUser)
		renderMessages(messages, currentUser)
		renderPinnedMessages(pinnedMessages, currentUser)

		if (!currentUser && state.editingMessageId) {
			setEditMode(null)
		}

		if (shouldStickToBottom) {
			window.setTimeout(scrollChatToBottom, 0)
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
			showFeedbackMessage('Nie znaleziono wiadomości.', 'error')
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
				showFeedbackMessage(message.isPinned ? 'Wiadomość odpięta.' : 'Wiadomość przypięta po prawej stronie.', 'success')
				refreshView()
			} catch (error) {
				showFeedbackMessage(error.message || 'Nie udało się zmienić przypięcia.', 'error')
			}
			return
		}

		if (!canManageMessage(message, currentUser)) {
			showFeedbackMessage('Możesz edytować i usuwać tylko swoje wiadomości.', 'error')
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
			showFeedbackMessage('Wiadomość usunięta.', 'success')
			refreshView()
		} catch (error) {
			showFeedbackMessage(error.message || 'Nie udało się usunąć wiadomości.', 'error')
		}
	}

	authBtn.addEventListener('click', () => {
		if (getCurrentUser()) {
			AppUtils.auth.openProfileModal()
			return
		}

		AppUtils.auth.openAuthModal('login')
	})

	chatForm.addEventListener('submit', event => {
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
				showFeedbackMessage('Wiadomość zaktualizowana.', 'success')
			} else {
				notesService.createChatMessage({
					content: chatInput.value,
					actor: currentUser,
				})
				showFeedbackMessage('Wiadomość wysłana.', 'success')
			}

			setEditMode(null)
			refreshView({ forceScrollBottom: true })
		} catch (error) {
			showFeedbackMessage(error.message || 'Nie udało się zapisać wiadomości.', 'error')
		}
	})

	cancelEditBtn.addEventListener('click', () => {
		setEditMode(null)
	})

	chatInput.addEventListener('keydown', event => {
		if (event.key !== 'Enter' || event.shiftKey) return
		event.preventDefault()
		chatForm.requestSubmit()
	})

	chatList.addEventListener('click', handleMessageAction)
	pinnedList.addEventListener('click', handleMessageAction)

	document.addEventListener('app-auth-changed', () => {
		setEditMode(null)
		refreshView({ forceScrollBottom: true })
	})

	window.addEventListener('storage', event => {
		if (event.key === AppUtils.config.STORAGE_KEYS.NOTES || event.key === AppUtils.config.STORAGE_KEYS.SESSION) {
			refreshView()
		}
	})

	state.refreshTimerId = window.setInterval(() => {
		if (document.hidden) return
		refreshView()
	}, 15000)

	window.addEventListener('beforeunload', () => {
		window.clearInterval(state.refreshTimerId)
	})

	refreshView({ forceScrollBottom: true })
})
