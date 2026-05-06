/* === Dashboard Init: Start === */
document.addEventListener('DOMContentLoaded', () => {
	const dashboardContainer = document.querySelector('.dashboard-container')
	if (!dashboardContainer) return

	const DASHBOARD_MENU_ORDER_STORAGE_KEY = AppUtils.config.PREFERENCE_KEYS.DASHBOARD_MENU_ORDER
	const SESSION_STORAGE_KEY = AppUtils.config.STORAGE_KEYS.SESSION

	dashboardContainer.classList.add('is-ready')

	const services = {
		storageService: window.AppServices?.storageService,
		preferencesService: window.AppServices?.preferencesService,
		usersService: window.AppServices?.usersService,
	}

	const elements = {
		clockHour: document.getElementById('clock-hour'),
		clockMinute: document.getElementById('clock-minute'),
		clockSecond: document.getElementById('clock-second'),
		clockDigital: document.getElementById('clock-digital'),
		clockDate: document.getElementById('clock-date'),
		clockWidgetTrigger: document.getElementById('clock-widget-trigger'),
		dashboardScrollCue: document.getElementById('dashboard-scroll-cue'),
		dashboardMenuStage: document.querySelector('.dashboard-menu-stage'),
		dashboardMenu: document.getElementById('dashboard-menu'),
		dashboardMenuEditBtn: document.getElementById('dashboard-menu-edit-btn'),
		dashboardMenuEditActions: document.getElementById('dashboard-menu-edit-actions'),
		dashboardMenuSaveBtn: document.getElementById('dashboard-menu-save-btn'),
		dashboardMenuCancelBtn: document.getElementById('dashboard-menu-cancel-btn'),
		taskPreviewList: document.getElementById('task-preview-list'),
		weatherTemp: document.getElementById('weather-temp'),
		weatherLocation: document.getElementById('weather-location'),
		weatherDescription: document.getElementById('weather-description'),
		weatherWind: document.getElementById('weather-wind'),
		weatherIcon: document.getElementById('weather-icon'),
		weatherWorkdayPanel: document.getElementById('weather-workday-panel'),
		weatherWorkdayLabel: document.getElementById('weather-workday-label'),
		weatherWorkdayRange: document.getElementById('weather-workday-range'),
		weatherWorkdayTrack: document.getElementById('weather-workday-track'),
		weatherSearchForecast: document.getElementById('weather-search-forecast'),
		weatherSearchForm: document.getElementById('weather-search-form'),
		weatherLocationInput: document.getElementById('weather-location-input'),
		weatherCurrentLocationBtn: document.getElementById('weather-current-location-btn'),
		weatherWidget: document.querySelector('.weather-widget'),
		registeredUsersCount: document.getElementById('dashboard-registered-users-count'),
		activeUsersList: document.getElementById('dashboard-active-users-list'),
		taskModal: document.getElementById('task-modal'),
		taskForm: document.getElementById('task-form'),
		taskTitleInput: document.getElementById('task-title'),
		taskDateInput: document.getElementById('task-date'),
		taskTimeInput: document.getElementById('task-time'),
		taskHourInput: document.getElementById('task-hour'),
		taskMinuteInput: document.getElementById('task-minute'),
		taskPriorityInput: document.getElementById('task-priority'),
		taskDescriptionInput: document.getElementById('task-description'),
		taskCalendarMonth: document.getElementById('task-calendar-month'),
		taskCalendarGrid: document.getElementById('task-calendar-grid'),
		taskCalendarWeekdays: document.getElementById('task-calendar-weekdays'),
		taskAgendaTitle: document.getElementById('task-agenda-title'),
		taskAgendaCount: document.getElementById('task-agenda-count'),
		taskAgendaList: document.getElementById('task-agenda-list'),
		taskCalendarPrev: document.getElementById('task-calendar-prev'),
		taskCalendarNext: document.getElementById('task-calendar-next'),
		taskToastStack: document.getElementById('task-toast-stack'),
		taskAutoclearToggle: document.getElementById('task-autoclear-toggle'),
	}

	const activeUsersController = (() => {
		const { registeredUsersCount, activeUsersList } = elements
		const { storageService, usersService } = services
		const activeUsersStorageKey = AppUtils.config.STORAGE_KEYS.DASHBOARD_ACTIVE_USERS || 'dashboard_active_users'
		const usersStorageKey = AppUtils.config.STORAGE_KEYS.USERS
		const sessionStorageKey = AppUtils.config.STORAGE_KEYS.SESSION
		const activeUserTtlMs = 45000
		const visibleUsersLimit = 3
		let activeUsers = []
		let rotationIndex = 0
		let refreshTimerId = 0
		let rotationTimerId = 0
		let profileShell = null

		if (!registeredUsersCount || !activeUsersList || !storageService || !usersService) {
			return null
		}

		const escapeHtml = value => AppUtils.escapeHtml(String(value ?? ''))
		const getUsers = () => (usersService.getAll?.() || []).filter(user => user?.id)
		const getActiveUserRecords = () => {
			const now = Date.now()
			const records = storageService.readJson?.(activeUsersStorageKey, []) || []
			return Array.isArray(records)
				? records.filter(record => record?.userId && record?.tabId && now - (Date.parse(record.lastSeenAt) || 0) <= activeUserTtlMs)
				: []
		}
		const getUserDisplayName = user => String(user?.fullName || '').trim() || 'Użytkownik'
		const normalizeProfileImage = value => {
			const normalizedValue = String(value || '').trim()
			return /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(normalizedValue) ? normalizedValue : ''
		}
		const normalizeProfileAccentColor = value => {
			const normalizedValue = String(value || '').trim().toLowerCase()
			return /^#[0-9a-f]{6}$/.test(normalizedValue) ? normalizedValue : '#0f766e'
		}
		const mergeRecordWithUser = (record, user) => ({
			id: String(record.userId || user?.id || ''),
			fullName: String(user?.fullName || record.fullName || '').trim(),
			login: String(user?.login || record.login || '').trim(),
			role: user?.role || record.role || 'user',
			avatarId: user?.avatarId || record.avatarId || 'blue',
			avatarImage: user?.avatarImage || record.avatarImage || '',
			profileAccentColor: user?.profileAccentColor || record.profileAccentColor || '',
			profileCoverImage: user?.profileCoverImage || record.profileCoverImage || '',
			lastSeenAt: record.lastSeenAt || '',
		})
		const getActiveUsers = registeredUsers => {
			const usersById = new Map(registeredUsers.map(user => [String(user.id), user]))
			const recordsByUserId = new Map()

			getActiveUserRecords().forEach(record => {
				const userId = String(record.userId || '')
				const existingRecord = recordsByUserId.get(userId)
				if (!existingRecord || (Date.parse(record.lastSeenAt) || 0) > (Date.parse(existingRecord.lastSeenAt) || 0)) {
					recordsByUserId.set(userId, record)
				}
			})

			return [...recordsByUserId.values()]
				.map(record => mergeRecordWithUser(record, usersById.get(String(record.userId || ''))))
				.filter(user => user.id)
				.sort((leftUser, rightUser) => getUserDisplayName(leftUser).localeCompare(getUserDisplayName(rightUser), 'pl'))
		}
		const getVisibleUsers = () => {
			if (activeUsers.length <= visibleUsersLimit) return activeUsers

			return Array.from(
				{ length: visibleUsersLimit },
				(_, index) => activeUsers[(rotationIndex + index) % activeUsers.length]
			)
		}
		const renderActiveUsersList = () => {
			if (activeUsers.length === 0) {
				activeUsersList.textContent = 'brak'
				return
			}

			activeUsersList.innerHTML = getVisibleUsers()
				.map((user, index) => {
					const separator = index > 0 ? '<span class="dashboard-active-users-comma">, </span>' : ''
					const label = getUserDisplayName(user)

					return `${separator}<button type="button" class="dashboard-active-user-link" data-active-user-id="${escapeHtml(user.id)}" title="Pokaż profil: ${escapeHtml(label)}">${escapeHtml(label)}</button>`
				})
				.join('')

			if (activeUsers.length > visibleUsersLimit) {
				activeUsersList.insertAdjacentHTML('beforeend', '<span class="dashboard-active-users-more">...</span>')
			}
		}
		const refreshSummary = () => {
			const users = getUsers()
			activeUsers = getActiveUsers(users)
			if (rotationIndex >= activeUsers.length) {
				rotationIndex = 0
			}

			registeredUsersCount.textContent = String(users.length)
			renderActiveUsersList()
		}
		const rotateVisibleUsers = () => {
			if (activeUsers.length <= visibleUsersLimit) return

			rotationIndex = (rotationIndex + visibleUsersLimit) % activeUsers.length
			renderActiveUsersList()
		}
		const closeUserProfilePreview = () => {
			if (!profileShell) return

			profileShell.hidden = true
			profileShell.setAttribute('aria-hidden', 'true')
		}
		const ensureUserProfilePreview = () => {
			if (profileShell) return profileShell

			profileShell = document.createElement('div')
			profileShell.className = 'dashboard-user-profile-shell'
			profileShell.hidden = true
			profileShell.setAttribute('aria-hidden', 'true')
			profileShell.innerHTML = `
				<div class="dashboard-user-profile-backdrop" data-dashboard-user-profile-close></div>
				<section class="dashboard-user-profile-card" role="dialog" aria-modal="true" aria-labelledby="dashboard-user-profile-title"></section>
			`
			document.body.appendChild(profileShell)

			profileShell.addEventListener('click', event => {
				if (!event.target.closest('[data-dashboard-user-profile-close]')) return

				closeUserProfilePreview()
			})

			return profileShell
		}
		const openUserProfilePreview = user => {
			if (!user) return

			const shell = ensureUserProfilePreview()
			const card = shell.querySelector('.dashboard-user-profile-card')
			const roleLabel = AppUtils.auth?.getRoleLabel?.(user.role) || (user.role === 'admin' ? 'Lider' : 'Pracownik')
			const subtitle = String(user?.profileTitle || '').trim() || roleLabel
			const name = getUserDisplayName(user)
			const coverImage = normalizeProfileImage(user.profileCoverImage)
			const accentColor = normalizeProfileAccentColor(user.profileAccentColor)
			const avatarMarkup = AppUtils.createAvatarMarkup({
				fullName: name,
				avatarId: user.avatarId || 'blue',
				avatarImage: user.avatarImage || '',
				extraClass: 'dashboard-user-profile-avatar',
			})

			shell.style.setProperty('--dashboard-user-profile-accent', accentColor)
			shell.style.setProperty('--dashboard-user-profile-cover-image', coverImage ? `url("${coverImage}")` : 'none')
			shell.classList.toggle('has-profile-cover-image', Boolean(coverImage))
			card.classList.toggle('has-profile-cover-image', Boolean(coverImage))
			card.innerHTML = `
				<div class="dashboard-user-profile-cover" aria-hidden="true"></div>
				<button type="button" class="dashboard-user-profile-close" data-dashboard-user-profile-close aria-label="Zamknij profil">
					<i class="app-icon xmark-solid-full"></i>
				</button>
				<div class="dashboard-user-profile-body">
					<div class="dashboard-user-profile-head">
						${avatarMarkup}
						<div>
							<p class="dashboard-kicker">Profil użytkownika</p>
							<h2 id="dashboard-user-profile-title">${escapeHtml(name)}</h2>
							<p>${escapeHtml(subtitle)}</p>
						</div>
					</div>
					<div class="dashboard-user-profile-grid">
						<span>Rola</span>
						<strong>${escapeHtml(roleLabel)}</strong>
						<span>Status</span>
						<strong>Aktywny teraz</strong>
					</div>
				</div>
			`

			shell.hidden = false
			shell.setAttribute('aria-hidden', 'false')
			card.querySelector('.dashboard-user-profile-close')?.focus()
		}
		const handleStorageChange = key => {
			if (key === activeUsersStorageKey || key === usersStorageKey || key === sessionStorageKey) {
				refreshSummary()
			}
		}
		const init = () => {
			refreshSummary()
			refreshTimerId = window.setInterval(refreshSummary, 10000)
			rotationTimerId = window.setInterval(rotateVisibleUsers, 3000)

			activeUsersList.addEventListener('click', event => {
				const userButton = event.target.closest('[data-active-user-id]')
				if (!userButton) return

				const userId = String(userButton.dataset.activeUserId || '')
				const clickedUser =
					activeUsers.find(user => String(user.id) === userId) ||
					getUsers().find(user => String(user.id) === userId)
				openUserProfilePreview(clickedUser)
			})

			document.addEventListener('app-auth-changed', refreshSummary)
			document.addEventListener('keydown', event => {
				if (event.key === 'Escape') {
					closeUserProfilePreview()
				}
			})
			window.addEventListener('beforeunload', () => {
				window.clearInterval(refreshTimerId)
				window.clearInterval(rotationTimerId)
			})
		}

		return {
			handleStorageChange,
			init,
		}
	})()

	const menuEditorController = (() => {
		const {
			dashboardMenu,
			dashboardMenuStage,
			dashboardMenuEditBtn,
			dashboardMenuEditActions,
			dashboardMenuSaveBtn,
			dashboardMenuCancelBtn,
		} = elements
		const { storageService, preferencesService } = services

		if (!dashboardMenu || !dashboardMenuStage || !dashboardMenuEditBtn || !dashboardMenuEditActions || !dashboardMenuSaveBtn || !dashboardMenuCancelBtn) {
			return null
		}

		let isEditing = false
		let draftOrder = []
		let activeDrag = null
		const requireAuthenticatedAction = () => {
			if (window.AppUtils?.auth?.isAuthenticated?.()) return true

			window.AppUtils?.notify?.({
				type: 'warning',
				title: 'Tylko podglad',
				message: 'Musisz byc zalogowany, aby zmieniac uklad dashboardu.',
			})
			window.AppUtils?.auth?.openAuthModal?.('login')
			return false
		}

		const getMenuItems = () => Array.from(dashboardMenu.querySelectorAll('.menu-item[data-menu-item-id]'))
		const getAnimatedMenuItems = () =>
			Array.from(dashboardMenu.children).filter(item => item.matches('.menu-item[data-menu-item-id], .menu-item-drop-slot'))

		const getCurrentOrder = () =>
			getMenuItems()
				.map(item => item.dataset.menuItemId || '')
				.filter(Boolean)

		const applyMenuOrder = menuOrder => {
			const itemsById = new Map(getMenuItems().map(item => [item.dataset.menuItemId || '', item]))
			const orderedItems = []

			menuOrder.forEach(itemId => {
				const item = itemsById.get(itemId)
				if (!item) return

				orderedItems.push(item)
				itemsById.delete(itemId)
			})

			;[...orderedItems, ...itemsById.values()].forEach(item => {
				dashboardMenu.appendChild(item)
			})
		}

		const readSavedOrder = () => {
			const savedOrder = preferencesService?.getDashboardMenuOrder?.() || storageService?.readJson?.(DASHBOARD_MENU_ORDER_STORAGE_KEY, []) || []

			return Array.isArray(savedOrder) ? [...new Set(savedOrder.filter(Boolean))] : []
		}

		const writeSavedOrder = menuOrder => {
			const uniqueMenuOrder = [...new Set((Array.isArray(menuOrder) ? menuOrder : []).filter(Boolean))]
			preferencesService?.saveDashboardMenuOrder?.(uniqueMenuOrder) || storageService?.writeJson?.(DASHBOARD_MENU_ORDER_STORAGE_KEY, uniqueMenuOrder)
		}

		const syncMenuOrderFromPreferences = () => {
			applyMenuOrder(readSavedOrder())
		}

		const animateMenuReflow = mutate => {
			const animatedItems = getAnimatedMenuItems()
			const firstRects = new Map(animatedItems.map(item => [item, item.getBoundingClientRect()]))

			mutate()

			getAnimatedMenuItems().forEach(item => {
				const firstRect = firstRects.get(item)
				if (!firstRect) return

				const lastRect = item.getBoundingClientRect()
				const deltaX = firstRect.left - lastRect.left
				const deltaY = firstRect.top - lastRect.top

				if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return

				item.animate(
					[
						{ transform: `translate(${deltaX}px, ${deltaY}px)` },
						{ transform: 'translate(0, 0)' },
					],
					{
						duration: 220,
						easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
					}
				)
			})
		}

		const createDropPlaceholder = sourceItem => {
			const sourceRect = sourceItem.getBoundingClientRect()
			const placeholder = document.createElement('div')
			placeholder.className = 'menu-item menu-item-drop-slot'
			placeholder.setAttribute('aria-hidden', 'true')
			placeholder.innerHTML = '<article class="dashboard-card dashboard-card-drop-slot"></article>'
			placeholder.style.height = `${Math.round(sourceRect.height)}px`
			placeholder.style.minHeight = `${Math.round(sourceRect.height)}px`
			placeholder.style.minWidth = `${Math.round(sourceRect.width)}px`
			return placeholder
		}

		const cleanupFloatingItemStyles = item => {
			item.style.position = ''
			item.style.left = ''
			item.style.top = ''
			item.style.width = ''
			item.style.height = ''
			item.style.zIndex = ''
			item.style.pointerEvents = ''
			item.style.margin = ''
			item.style.display = ''
		}

		const updateFloatingItemPosition = (item, event, dragOffset) => {
			item.style.left = `${Math.round(event.clientX - dragOffset.x)}px`
			item.style.top = `${Math.round(event.clientY - dragOffset.y)}px`
		}

		const getRectOverlapArea = (leftRect, rightRect) => {
			const overlapWidth = Math.max(0, Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left))
			const overlapHeight = Math.max(0, Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top))
			return overlapWidth * overlapHeight
		}

		const updateEditUi = () => {
			dashboardMenuStage.classList.toggle('is-editing', isEditing)
			dashboardMenuEditBtn.hidden = isEditing
			dashboardMenuEditActions.hidden = !isEditing
			dashboardMenuEditBtn.setAttribute('aria-pressed', String(isEditing))

			getMenuItems().forEach(item => {
				item.draggable = false
				item.classList.toggle('is-reorderable', isEditing)
				item.setAttribute('aria-grabbed', 'false')
			})
		}

		const finishActiveDrag = () => {
			if (!activeDrag) return

			const { item, placeholder, pointerMoveHandler, pointerUpHandler, pointerCancelHandler } = activeDrag

			document.removeEventListener('pointermove', pointerMoveHandler)
			document.removeEventListener('pointerup', pointerUpHandler)
			document.removeEventListener('pointercancel', pointerCancelHandler)

			animateMenuReflow(() => {
				dashboardMenu.insertBefore(item, placeholder)
				placeholder.remove()
			})

			item.classList.remove('is-dragging', 'is-floating-drag')
			item.setAttribute('aria-grabbed', 'false')
			cleanupFloatingItemStyles(item)
			activeDrag = null
		}

		const movePlaceholderToTarget = (placeholder, targetItem, shouldInsertBefore) => {
			if (!placeholder || !targetItem || targetItem === placeholder) return

			const nextSibling = shouldInsertBefore ? targetItem : targetItem.nextElementSibling

			if (nextSibling === placeholder) return

			animateMenuReflow(() => {
				dashboardMenu.insertBefore(placeholder, nextSibling)
			})
		}

		const placePlaceholderFromPoint = (event, placeholder) => {
			if (!placeholder) return

			const menuBounds = dashboardMenu.getBoundingClientRect()
			const isInsideMenu =
				event.clientX >= menuBounds.left &&
				event.clientX <= menuBounds.right &&
				event.clientY >= menuBounds.top &&
				event.clientY <= menuBounds.bottom

			if (!isInsideMenu) return

			const candidateItems = getMenuItems().filter(item => item !== activeDrag?.item)
			if (candidateItems.length === 0) return

			const floatingRect = activeDrag?.item?.getBoundingClientRect?.()
			if (!floatingRect) return

			const floatingCenterX = floatingRect.left + floatingRect.width / 2
			const floatingCenterY = floatingRect.top + floatingRect.height / 2
			let bestOverlapMatch = null
			let bestDistanceMatch = null

			candidateItems.forEach(item => {
				const rect = item.getBoundingClientRect()
				const centerX = rect.left + rect.width / 2
				const centerY = rect.top + rect.height / 2
				const deltaX = floatingCenterX - centerX
				const deltaY = floatingCenterY - centerY
				const distance = deltaX * deltaX + deltaY * deltaY
				const overlapArea = getRectOverlapArea(floatingRect, rect)
				const overlapRatio = overlapArea / Math.max(Math.min(floatingRect.width * floatingRect.height, rect.width * rect.height), 1)

				if (overlapRatio > 0 && (!bestOverlapMatch || overlapRatio > bestOverlapMatch.overlapRatio)) {
					bestOverlapMatch = {
						item,
						rect,
						overlapRatio,
					}
				}

				if (!bestDistanceMatch || distance < bestDistanceMatch.distance) {
					bestDistanceMatch = {
						item,
						rect,
						distance,
					}
				}
			})

			const bestMatch = bestOverlapMatch?.overlapRatio >= 0.14 ? bestOverlapMatch : bestDistanceMatch
			if (!bestMatch) return

			const targetRect = bestMatch.rect
			const horizontalDistance = Math.abs(floatingCenterX - (targetRect.left + targetRect.width / 2))
			const verticalDistance = Math.abs(floatingCenterY - (targetRect.top + targetRect.height / 2))
			const isHorizontalDecision = horizontalDistance > verticalDistance
			const axisStart = isHorizontalDecision ? targetRect.left : targetRect.top
			const axisSize = isHorizontalDecision ? targetRect.width : targetRect.height
			const axisPointer = isHorizontalDecision ? floatingCenterX : floatingCenterY
			const axisRatio = axisSize > 0 ? (axisPointer - axisStart) / axisSize : 0.5
			const deadZoneStart = 0.36
			const deadZoneEnd = 0.64

			if (axisRatio > deadZoneStart && axisRatio < deadZoneEnd) return

			const shouldInsertBefore = axisRatio <= 0.5

			const placementKey = `${bestMatch.item.dataset.menuItemId || ''}:${shouldInsertBefore ? 'before' : 'after'}`
			if (activeDrag?.lastPlacementKey === placementKey) return
			if (performance.now() - (activeDrag?.lastReflowAt || 0) < 95) return

			activeDrag.lastPlacementKey = placementKey
			activeDrag.lastReflowAt = performance.now()
			movePlaceholderToTarget(placeholder, bestMatch.item, shouldInsertBefore)
		}

		const startPointerDrag = (menuItem, event) => {
			if (activeDrag) return
			if (!isEditing) return
			if (event.pointerType === 'mouse' && event.button !== 0) return

			event.preventDefault()

			const itemRect = menuItem.getBoundingClientRect()
			const placeholder = createDropPlaceholder(menuItem)

			animateMenuReflow(() => {
				menuItem.replaceWith(placeholder)
			})

			document.body.appendChild(menuItem)
			menuItem.classList.add('is-dragging', 'is-floating-drag')
			menuItem.setAttribute('aria-grabbed', 'true')
			menuItem.style.position = 'fixed'
			menuItem.style.left = `${Math.round(itemRect.left)}px`
			menuItem.style.top = `${Math.round(itemRect.top)}px`
			menuItem.style.width = `${Math.round(itemRect.width)}px`
			menuItem.style.height = `${Math.round(itemRect.height)}px`
			menuItem.style.zIndex = '1300'
			menuItem.style.pointerEvents = 'none'
			menuItem.style.margin = '0'
			menuItem.style.display = 'block'

			const dragOffset = {
				x: event.clientX - itemRect.left,
				y: event.clientY - itemRect.top,
			}

			updateFloatingItemPosition(menuItem, event, dragOffset)

			const pointerMoveHandler = moveEvent => {
				if (moveEvent.pointerId !== event.pointerId) return

				updateFloatingItemPosition(menuItem, moveEvent, dragOffset)
				placePlaceholderFromPoint(moveEvent, placeholder)
				moveEvent.preventDefault()
			}

			const pointerUpHandler = upEvent => {
				if (upEvent.pointerId !== event.pointerId) return

				upEvent.preventDefault()
				finishActiveDrag()
			}

			const pointerCancelHandler = cancelEvent => {
				if (cancelEvent.pointerId !== event.pointerId) return
				finishActiveDrag()
			}

			activeDrag = {
				item: menuItem,
				placeholder,
				pointerMoveHandler,
				pointerUpHandler,
				pointerCancelHandler,
				lastPlacementKey: '',
				lastReflowAt: 0,
			}

			document.addEventListener('pointermove', pointerMoveHandler)
			document.addEventListener('pointerup', pointerUpHandler)
			document.addEventListener('pointercancel', pointerCancelHandler)
		}

		const enterEditMode = () => {
			if (isEditing) return
			if (!requireAuthenticatedAction()) return

			draftOrder = getCurrentOrder()
			isEditing = true
			updateEditUi()
		}

		const exitEditMode = () => {
			finishActiveDrag()
			isEditing = false
			updateEditUi()
		}

		const cancelEditMode = () => {
			finishActiveDrag()
			applyMenuOrder(draftOrder)
			isEditing = false
			updateEditUi()
		}

		const saveEditMode = () => {
			finishActiveDrag()
			writeSavedOrder(getCurrentOrder())
			isEditing = false
			updateEditUi()
		}

		const handleStorageChange = changedKey => {
			if (isEditing) return

			const activeStorageKey = preferencesService?.getDashboardMenuOrderStorageKey?.() || DASHBOARD_MENU_ORDER_STORAGE_KEY
			const shouldSync =
				changedKey === activeStorageKey || changedKey === DASHBOARD_MENU_ORDER_STORAGE_KEY || changedKey === SESSION_STORAGE_KEY

			if (!shouldSync) return
			syncMenuOrderFromPreferences()
		}

		const init = () => {
			syncMenuOrderFromPreferences()
			updateEditUi()

			dashboardMenuEditBtn.addEventListener('click', enterEditMode)
			dashboardMenuCancelBtn.addEventListener('click', cancelEditMode)
			dashboardMenuSaveBtn.addEventListener('click', saveEditMode)

			dashboardMenu.addEventListener('click', event => {
				if (!isEditing) return
				if (!event.target.closest('.menu-item[data-menu-item-id]')) return

				event.preventDefault()
			})

			dashboardMenu.addEventListener('pointerdown', event => {
				if (!isEditing) return

				const menuItem = event.target.closest('.menu-item[data-menu-item-id]')
				if (!menuItem) return

				startPointerDrag(menuItem, event)
			})

			document.addEventListener('keydown', event => {
				if (event.key !== 'Escape' || !isEditing) return
				cancelEditMode()
			})

			document.addEventListener('app-auth-changed', () => {
				if (!window.AppUtils?.auth?.isAuthenticated?.() && isEditing) {
					cancelEditMode()
				}

				if (!isEditing) {
					syncMenuOrderFromPreferences()
				}
			})
		}

		return {
			handleStorageChange,
			init,
		}
	})()

	const plannerController = window.DashboardModules?.createTaskPlannerController?.({
		elements,
		services,
	})
	const clockController = window.DashboardModules?.createClockController?.({
		elements,
		onDayChange: () => plannerController?.refreshPreview?.(),
	})
	const weatherController = window.DashboardModules?.createWeatherController?.({
		elements,
		services,
	})

	plannerController?.init?.()
	clockController?.start?.()
	weatherController?.init?.()
	menuEditorController?.init?.()
	activeUsersController?.init?.()
	window.DashboardModules?.initDashboardTopbar?.({
		dashboardScrollCue: elements.dashboardScrollCue,
		dashboardMenu: elements.dashboardMenu,
	})

	window.addEventListener('storage', event => {
		menuEditorController?.handleStorageChange?.(event.key)
		plannerController?.handleStorageChange?.(event.key)
		activeUsersController?.handleStorageChange?.(event.key)
	})
})
/* === Dashboard Init: End === */
