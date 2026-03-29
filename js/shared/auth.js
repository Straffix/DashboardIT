/* === Shared Auth And Session: Start === */
const AUTH_CONFIG = {
	minPasswordLength: 4,
	maxAvatarUploadSizeBytes: 10 * 1024 * 1024,
	avatarOutputSize: 192,
	avatarOutputQuality: 0.9,
	permissionOptions: [
		{ id: 'it_support', label: 'Informatyk' },
		{ id: 'network', label: 'Sieciowiec' },
		{ id: 'printers', label: 'Drukarkowy' },
		{ id: 'rooms', label: 'Salkowy' },
	],
	avatarPresets: [
		{ id: 'violet', label: 'Neutralny', gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)' },
		{ id: 'blue', label: 'Niebieski', gradient: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)' },
		{ id: 'emerald', label: 'Zielony', gradient: 'linear-gradient(135deg, #10b981 0%, #22c55e 100%)' },
		{ id: 'amber', label: 'Pomaranczowy', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fb7185 100%)' },
		{ id: 'rose', label: 'Rozowy', gradient: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)' },
		{ id: 'slate', label: 'Grafit', gradient: 'linear-gradient(135deg, #334155 0%, #64748b 100%)' },
	],
}

const authState = {
	users: [],
	session: null,
	currentUser: null,
	hub: null,
	trigger: null,
	popover: null,
	popoverIdentity: null,
	popoverMeta: null,
	popoverActions: null,
	authModal: null,
	authTitle: null,
	authCopy: null,
	authForm: null,
	authSwitchBtn: null,
	authResetBtn: null,
	authFullNameInput: null,
	authLoginInput: null,
	authPasswordInput: null,
	authPasswordRepeatInput: null,
	authRoleHint: null,
	authAvatarPreview: null,
	authAvatarUploadInput: null,
	authAvatarBrowseBtn: null,
	authAvatarResetBtn: null,
	authSubmitBtn: null,
	profileModal: null,
	profileForm: null,
	profileNameInput: null,
	profileLoginInput: null,
	profileRoleBadge: null,
	profileCreatedAtValue: null,
	profileUpdatedAtValue: null,
	profileLastLoginValue: null,
	profileModuleValue: null,
	profileTeamSection: null,
	profileTeamList: null,
	profileAvatarPreview: null,
	profileAvatarUploadInput: null,
	profileAvatarBrowseBtn: null,
	profileAvatarResetBtn: null,
	profileLogoutBtn: null,
	mode: 'login',
	selectedRegisterAvatarId: AUTH_CONFIG.avatarPresets[0].id,
	selectedProfileAvatarId: AUTH_CONFIG.avatarPresets[0].id,
	customRegisterAvatarImage: '',
	customProfileAvatarImage: '',
}

const systemUiState = {
	toastStack: null,
	pageStatusStrip: null,
	pageStatusIdentity: null,
	pageStatusText: null,
	pageStatusTags: null,
	pageStatusActions: null,
}

const cloneValue = value => JSON.parse(JSON.stringify(value))
const appServices = (window.AppServices = window.AppServices || {})
const storageService = appServices.storageService
const usersService = appServices.usersService
const sessionService = appServices.sessionService
const preferencesService = appServices.preferencesService
const remoteApi = appServices.remoteApi

const isRemoteAuthMode = () => Boolean(storageService?.isRemoteEnabled?.())

const getAccountStorageLabel = () => (isRemoteAuthMode() ? 'na serwerze' : 'lokalnie w tej przegladarce')

const getStorageModeTagLabel = () => (isRemoteAuthMode() ? 'Serwer plikowy PHP' : 'Lokalna przegladarka')

const requestRemoteAuth = ({ path = '', method = 'GET', payload = null } = {}) => {
	const response = remoteApi?.requestAuth?.({
		method,
		path,
		body: payload,
	})

	if (!response?.ok) {
		throw new Error(response?.message || 'Nie udalo sie polaczyc z serwerem aplikacji.')
	}

	return response
}

const getEventTargetElement = eventTarget => (eventTarget instanceof Element ? eventTarget : eventTarget?.parentElement || null)

const getAvatarPreset = avatarId => AUTH_CONFIG.avatarPresets.find(preset => preset.id === avatarId) || AUTH_CONFIG.avatarPresets[0]

const normalizeAvatarImage = value => {
	const normalizedValue = String(value || '').trim()
	return /^data:image\//i.test(normalizedValue) ? normalizedValue : ''
}

const getInitials = fullName => {
	const words = String(fullName || '')
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)

	if (words.length === 0) return 'IT'
	return words.map(word => word[0]).join('').toUpperCase()
}

const formatProfileDateTime = value => {
	if (!value) return 'Brak danych'

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return 'Brak danych'

	return date.toLocaleString('pl-PL', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

const normalizeUserRole = role => (role === 'admin' ? 'admin' : 'user')

const getRoleLabel = role => (normalizeUserRole(role) === 'admin' ? 'Lider' : 'Pracownik')

const getAllPermissionIds = () => AUTH_CONFIG.permissionOptions.map(option => option.id)

const getPermissionLabel = permissionId =>
	AUTH_CONFIG.permissionOptions.find(option => option.id === permissionId)?.label || 'Nieznane uprawnienie'

const normalizeUserPermissions = permissions => {
	if (!Array.isArray(permissions)) return []

	const allowedPermissions = new Set(getAllPermissionIds())
	return [...new Set(permissions.map(permission => String(permission || '').trim()).filter(permission => allowedPermissions.has(permission)))]
}

const getEffectiveUserPermissions = user => {
	if (!user) return []
	if (normalizeUserRole(user.role) === 'admin') return getAllPermissionIds()
	return normalizeUserPermissions(user.permissions)
}

const normalizeUserLogin = value =>
	String(value || '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '')
		.replace(/[^a-z0-9._-]/g, '')

const encodeLocalPassword = password => {
	try {
		return btoa(unescape(encodeURIComponent(String(password || ''))))
	} catch (error) {
		return String(password || '')
	}
}

const mapStoredUser = user => ({
	id: user.id,
	fullName: String(user.fullName || '').trim(),
	login: normalizeUserLogin(user.login),
	passwordHash: String(user.passwordHash || ''),
	role: normalizeUserRole(user.role),
	permissions: normalizeUserRole(user.role) === 'admin' ? getAllPermissionIds() : normalizeUserPermissions(user.permissions),
	avatarId: getAvatarPreset(user.avatarId).id,
	avatarImage: normalizeAvatarImage(user.avatarImage),
	createdAt: user.createdAt || new Date().toISOString(),
	updatedAt: user.updatedAt || user.createdAt || new Date().toISOString(),
})

const sanitizeUser = user => {
	if (!user) return null

	return {
		id: user.id,
		fullName: user.fullName,
		login: user.login,
		role: user.role,
		permissions: getEffectiveUserPermissions(user),
		avatarId: user.avatarId,
		avatarImage: normalizeAvatarImage(user.avatarImage),
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	}
}

const loadUsers = () => {
	return (usersService?.getAll?.() || []).map(mapStoredUser)
}

const saveUsers = users => {
	authState.users = users.map(mapStoredUser)
	usersService?.saveAll?.(authState.users)
}

const loadSession = () => {
	return sessionService?.getCurrent?.() || null
}

const saveSession = session => {
	authState.session = session ? cloneValue(session) : null

	if (!session) {
		sessionService?.clear?.()
		return
	}

	sessionService?.save?.(authState.session)
}

const findUserByLogin = login => authState.users.find(user => user.login === normalizeUserLogin(login))

const renderAuthUi = () => {
	if (!authState.trigger || !authState.popoverIdentity || !authState.popoverMeta || !authState.popoverActions) return

	const currentUser = authState.currentUser
	const identityLabel = currentUser ? currentUser.fullName : 'Gość'
	const metaLabel = currentUser
		? `${getRoleLabel(currentUser.role)} · @${currentUser.login}`
		: 'Nie zalogowano'

	authState.trigger.innerHTML = `
		${createAvatarMarkup({
			fullName: currentUser?.fullName || 'Gość systemu',
			avatarId: currentUser?.avatarId || AUTH_CONFIG.avatarPresets[0].id,
			avatarImage: currentUser?.avatarImage || '',
			extraClass: 'app-user-avatar-lg',
		})}
		<span class="app-user-trigger-copy">
			<strong>${identityLabel}</strong>
			<small>${metaLabel}</small>
		</span>
		<span class="app-user-trigger-chevron" aria-hidden="true">
			<i class="fa-solid fa-chevron-down"></i>
		</span>
	`

	authState.popoverIdentity.innerHTML = `
		${createAvatarMarkup({
			fullName: currentUser?.fullName || 'Gość systemu',
			avatarId: currentUser?.avatarId || AUTH_CONFIG.avatarPresets[0].id,
			avatarImage: currentUser?.avatarImage || '',
		})}
		<div class="app-user-popover-copy">
			<strong>${identityLabel}</strong>
			<span>${metaLabel}</span>
		</div>
	`

	const popoverMetaText = currentUser
		? ''
		: authState.users.length === 0
			? isRemoteAuthMode()
				? 'Zaloz pierwsze konto na serwerze. Otrzyma ono role lidera.'
				: 'Załóż pierwsze konto. Otrzyma ono rolę lidera.'
			: isRemoteAuthMode()
				? 'Zaloguj sie lub zaloz nowe konto wspoldzielone na serwerze.'
				: 'Zaloguj się lub załóż nowe konto lokalne.'
	authState.popoverMeta.textContent = popoverMetaText
	authState.popoverMeta.hidden = !popoverMetaText

	authState.popoverActions.innerHTML = currentUser
		? `
			<button type="button" class="app-user-action-btn" data-user-action="profile">
				<i class="fa-solid fa-user-gear"></i>
				<span>Profil</span>
			</button>
			<button type="button" class="app-user-action-btn" data-user-action="logout">
				<i class="fa-solid fa-arrow-right-from-bracket"></i>
				<span>Wyloguj</span>
			</button>
		`
		: `
			<button type="button" class="app-user-action-btn" data-user-action="login">
				<i class="fa-solid fa-right-to-bracket"></i>
				<span>Zaloguj się</span>
			</button>
			<button type="button" class="app-user-action-btn" data-user-action="register">
				<i class="fa-solid fa-user-plus"></i>
				<span>Załóż konto</span>
			</button>
		`

	renderPageStatusStrip()
}

const setCurrentUser = user => {
	authState.currentUser = user ? sanitizeUser(user) : null
	document.body.classList.toggle('app-user-logged-in', Boolean(authState.currentUser))
	renderAuthUi()

	document.dispatchEvent(
		new CustomEvent('app-auth-changed', {
			detail: {
				user: sanitizeUser(authState.currentUser),
			},
		})
	)
}

const syncCurrentUserFromSession = () => {
	authState.users = loadUsers()
	authState.session = loadSession()

	if (!authState.session) {
		setCurrentUser(null)
		return null
	}

	const matchedUser = authState.users.find(user => user.id === authState.session.userId)
	if (!matchedUser) {
		saveSession(null)
		setCurrentUser(null)
		return null
	}

	setCurrentUser(matchedUser)
	return authState.currentUser
}

const registerUser = ({ fullName, login, password, avatarId, avatarImage }) => {
	const normalizedName = String(fullName || '').trim()
	const normalizedLogin = normalizeUserLogin(login)
	const normalizedPassword = String(password || '')

	if (!normalizedName) {
		throw new Error('Wpisz imię i nazwisko.')
	}

	if (!normalizedLogin) {
		throw new Error('Wpisz poprawny login.')
	}

	if (normalizedPassword.length < AUTH_CONFIG.minPasswordLength) {
		throw new Error(`Hasło musi mieć co najmniej ${AUTH_CONFIG.minPasswordLength} znaki.`)
	}

	if (isRemoteAuthMode()) {
		requestRemoteAuth({
			path: 'register.php',
			method: 'POST',
			payload: {
				fullName: normalizedName,
				login: normalizedLogin,
				password: normalizedPassword,
				avatarId: getAvatarPreset(avatarId).id,
				avatarImage: normalizeAvatarImage(avatarImage),
			},
		})

		syncCurrentUserFromSession()
		return sanitizeUser(authState.currentUser)
	}

	if (findUserByLogin(normalizedLogin)) {
		throw new Error('Taki login już istnieje.')
	}

	const now = new Date().toISOString()
	const nextUser = {
		id: `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
		fullName: normalizedName,
		login: normalizedLogin,
		passwordHash: encodeLocalPassword(normalizedPassword),
		role: authState.users.length === 0 ? 'admin' : 'user',
		permissions: authState.users.length === 0 ? getAllPermissionIds() : [],
		avatarId: getAvatarPreset(avatarId).id,
		avatarImage: normalizeAvatarImage(avatarImage),
		createdAt: now,
		updatedAt: now,
	}

	saveUsers([...authState.users, nextUser])
	saveSession({ userId: nextUser.id, loginAt: now })
	setCurrentUser(nextUser)
	return sanitizeUser(nextUser)
}

const loginUser = ({ login, password }) => {
	if (isRemoteAuthMode()) {
		requestRemoteAuth({
			path: 'login.php',
			method: 'POST',
			payload: {
				login: normalizeUserLogin(login),
				password: String(password || ''),
			},
		})

		syncCurrentUserFromSession()
		return sanitizeUser(authState.currentUser)
	}

	const matchedUser = findUserByLogin(login)
	if (!matchedUser || matchedUser.passwordHash !== encodeLocalPassword(password)) {
		throw new Error('Nieprawidłowy login lub hasło.')
	}

	const now = new Date().toISOString()
	saveSession({ userId: matchedUser.id, loginAt: now })
	setCurrentUser(matchedUser)
	return sanitizeUser(matchedUser)
}

const resetUserPassword = ({ login, password }) => {
	if (isRemoteAuthMode()) {
		throw new Error('Reset hasla jest w trybie serwerowym wylaczony. Skontaktuj sie z administratorem.')
	}

	const matchedUser = findUserByLogin(login)
	const normalizedPassword = String(password || '')

	if (!matchedUser) {
		throw new Error('Nie znaleziono konta o podanym loginie.')
	}

	if (normalizedPassword.length < AUTH_CONFIG.minPasswordLength) {
		throw new Error(`Hasło musi mieć co najmniej ${AUTH_CONFIG.minPasswordLength} znaki.`)
	}

	const now = new Date().toISOString()
	let updatedUser = null

	const updatedUsers = authState.users.map(user => {
		if (user.id !== matchedUser.id) return user

		updatedUser = {
			...user,
			passwordHash: encodeLocalPassword(normalizedPassword),
			updatedAt: now,
		}

		return updatedUser
	})

	saveUsers(updatedUsers)
	saveSession({ userId: matchedUser.id, loginAt: now })
	setCurrentUser(updatedUser)
	return sanitizeUser(updatedUser)
}

const logoutUser = ({ silent = false } = {}) => {
	if (isRemoteAuthMode()) {
		sessionService?.clear?.()
		syncCurrentUserFromSession()
	} else {
		saveSession(null)
		setCurrentUser(null)
	}

	if (!silent) {
		notify({
			type: 'info',
			title: 'Wylogowano',
			message: isRemoteAuthMode()
				? 'Sesja serwerowa zostala zamknieta dla tego urzadzenia.'
				: 'Sesja lokalna została zamknięta dla tej przeglądarki.',
		})
	}
}

const updateCurrentUserProfile = ({ fullName, login, avatarId, avatarImage }) => {
	if (!authState.currentUser) {
		throw new Error('Brak zalogowanego użytkownika.')
	}

	const normalizedName = String(fullName || '').trim()
	const normalizedLogin = normalizeUserLogin(login)

	if (!normalizedName) {
		throw new Error('Imię i nazwisko nie może być puste.')
	}

	if (!normalizedLogin) {
		throw new Error('Login nie może być pusty.')
	}

	if (isRemoteAuthMode()) {
		requestRemoteAuth({
			path: 'profile.php',
			method: 'POST',
			payload: {
				fullName: normalizedName,
				login: normalizedLogin,
				avatarId: getAvatarPreset(avatarId).id,
				avatarImage: normalizeAvatarImage(avatarImage),
			},
		})

		syncCurrentUserFromSession()
		return sanitizeUser(authState.currentUser)
	}

	const duplicatedUser = authState.users.find(
		user => user.id !== authState.currentUser.id && user.login === normalizedLogin
	)

	if (duplicatedUser) {
		throw new Error('Ten login jest już zajęty.')
	}

	const now = new Date().toISOString()
	const updatedUsers = authState.users.map(user =>
		user.id === authState.currentUser.id
			? {
					...user,
					fullName: normalizedName,
					login: normalizedLogin,
					permissions: getEffectiveUserPermissions(user),
					avatarId: getAvatarPreset(avatarId).id,
					avatarImage: normalizeAvatarImage(avatarImage),
					updatedAt: now,
				}
			: user
	)

	saveUsers(updatedUsers)
	const nextCurrentUser = updatedUsers.find(user => user.id === authState.currentUser.id)
	setCurrentUser(nextCurrentUser)
	return sanitizeUser(nextCurrentUser)
}

const updateUserAccess = ({ userId, role, permissions } = {}) => {
	if (!authState.currentUser || authState.currentUser.role !== 'admin') {
		throw new Error('Tylko lider może nadawać uprawnienia.')
	}

	const normalizedUserId = String(userId || '').trim()
	if (!normalizedUserId) {
		throw new Error('Brak wskazanego użytkownika.')
	}

	if (normalizedUserId === String(authState.currentUser.id || '')) {
		throw new Error('W tej wersji nie zmienisz tutaj własnych uprawnień lidera.')
	}

	if (isRemoteAuthMode()) {
		const response = requestRemoteAuth({
			path: 'access.php',
			method: 'POST',
			payload: {
				userId: normalizedUserId,
				role: normalizeUserRole(role),
				permissions: normalizeUserPermissions(permissions),
			},
		})

		authState.users = loadUsers()
		return sanitizeUser(response.user || authState.users.find(user => String(user.id || '') === normalizedUserId) || null)
	}

	const normalizedRole = normalizeUserRole(role)
	const nextPermissions = normalizedRole === 'admin' ? getAllPermissionIds() : normalizeUserPermissions(permissions)
	const now = new Date().toISOString()
	let matchedUser = null

	const updatedUsers = authState.users.map(user => {
		if (String(user.id || '') !== normalizedUserId) return user

		matchedUser = {
			...user,
			role: normalizedRole,
			permissions: nextPermissions,
			updatedAt: now,
		}

		return matchedUser
	})

	if (!matchedUser) {
		throw new Error('Nie znaleziono wskazanego użytkownika.')
	}

	saveUsers(updatedUsers)
	return sanitizeUser(matchedUser)
}

const createAvatarMarkup = ({ fullName, avatarId, avatarImage, extraClass = '' } = {}) => {
	const preset = getAvatarPreset(avatarId)
	const classes = ['app-user-avatar', extraClass].filter(Boolean).join(' ')
	const normalizedAvatarImage = normalizeAvatarImage(avatarImage)
	if (normalizedAvatarImage) {
		const avatarStyle = [
			`--app-avatar-gradient: ${preset.gradient}`,
			`background-image: url('${escapeHtml(normalizedAvatarImage)}')`,
			'background-size: cover',
			'background-position: center',
			'background-repeat: no-repeat',
		].join('; ')

		return `<span class="${classes} is-image" style="${avatarStyle}" role="img" aria-label="${escapeHtml(fullName || 'Avatar użytkownika')}"></span>`
	}

	return `<span class="${classes}" style="--app-avatar-gradient: ${preset.gradient}">${getInitials(fullName)}</span>`
}

const getToastTitle = type => {
	if (type === 'success') return 'Gotowe'
	if (type === 'warning') return 'Uwaga'
	if (type === 'error') return 'Blad'
	return 'Informacja'
}

const ensureToastStack = () => {
	if (systemUiState.toastStack || !document.body) return systemUiState.toastStack

	const stack = document.createElement('div')
	stack.className = 'app-toast-stack'
	stack.setAttribute('aria-live', 'polite')
	stack.setAttribute('aria-atomic', 'false')
	document.body.appendChild(stack)
	systemUiState.toastStack = stack
	return stack
}

const dismissToast = toast => {
	if (!toast || toast.dataset.leaving === 'true') return

	toast.dataset.leaving = 'true'
	toast.classList.add('is-leaving')
	window.setTimeout(() => {
		toast.remove()
	}, 180)
}

const notify = ({ message = '', title = '', type = 'info', duration = 4200 } = {}) => {
	const normalizedMessage = String(message || '').trim()
	if (!normalizedMessage) return null

	const stack = ensureToastStack()
	if (!stack) return null

	const iconMap = {
		success: 'fa-circle-check',
		warning: 'fa-triangle-exclamation',
		error: 'fa-circle-xmark',
		info: 'fa-circle-info',
	}

	const toast = document.createElement('article')
	toast.className = `app-toast is-${type}`
	toast.innerHTML = `
		<div class="app-toast-icon" aria-hidden="true">
			<i class="fa-solid ${iconMap[type] || iconMap.info}"></i>
		</div>
		<div class="app-toast-copy">
			<strong>${title || getToastTitle(type)}</strong>
			<span>${normalizedMessage}</span>
		</div>
		<button type="button" class="app-toast-close" aria-label="Zamknij komunikat">
			<i class="fa-solid fa-xmark"></i>
		</button>
	`

	const closeButton = toast.querySelector('.app-toast-close')
	closeButton?.addEventListener('click', () => dismissToast(toast))
	stack.appendChild(toast)

	if (duration > 0) {
		window.setTimeout(() => {
			dismissToast(toast)
		}, duration)
	}

	return toast
}

const getCurrentModuleLabel = () => {
	const pageHeading = document.querySelector('.logo-section h1')?.textContent?.trim()
	if (pageHeading) return pageHeading

	const title = document.title || ''
	return title.split('-')[0].trim() || 'DashboardIT'
}

const renderPageStatusStrip = () => {
	if (
		!systemUiState.pageStatusStrip ||
		!systemUiState.pageStatusIdentity ||
		!systemUiState.pageStatusText ||
		!systemUiState.pageStatusTags ||
		!systemUiState.pageStatusActions
	) {
		return
	}

	const currentUser = authState.currentUser
	const moduleLabel = getCurrentModuleLabel()
	const identityLabel = currentUser ? currentUser.fullName : 'Gość systemu'
	const metaLabel = currentUser
		? `${getRoleLabel(currentUser.role)} · @${currentUser.login}`
		: isRemoteAuthMode()
			? 'Tryb podgladu bez aktywnej sesji serwerowej'
			: 'Tryb podgladu bez lokalnej sesji'

	systemUiState.pageStatusIdentity.innerHTML = `
		${createAvatarMarkup({
			fullName: currentUser?.fullName || 'Gość systemu',
			avatarId: currentUser?.avatarId || AUTH_CONFIG.avatarPresets[0].id,
			avatarImage: currentUser?.avatarImage || '',
			extraClass: 'app-page-status-avatar',
		})}
		<div class="app-page-status-copy">
			<strong>${identityLabel}</strong>
			<span>${metaLabel}</span>
		</div>
	`

	systemUiState.pageStatusText.textContent = currentUser
		? isRemoteAuthMode()
			? `Pracujesz w module ${moduleLabel}. Konto i dane sa wspoldzielone na serwerze i gotowe do pracy zespolowej.`
			: `Pracujesz w module ${moduleLabel}. Konto lokalne jest aktywne w tej przeglądarce i gotowe do dalszej pracy.`
		: isRemoteAuthMode()
			? `Przegladasz modul ${moduleLabel} jako gosc. Zaloguj sie, aby pracowac na wspolnych danych serwerowych.`
			: `Przeglądasz moduł ${moduleLabel} jako gość. Zaloguj się, aby korzystać z funkcji zapisujących dane i historii zmian.`

	systemUiState.pageStatusTags.innerHTML = `
		<span class="app-page-status-tag ${currentUser?.role === 'admin' ? 'is-admin' : 'is-neutral'}">
			${currentUser ? getRoleLabel(currentUser.role) : 'Gość'}
		</span>
		<span class="app-page-status-tag is-demo">${getStorageModeTagLabel()}</span>
		<span class="app-page-status-tag is-neutral">${isRemoteAuthMode() ? 'Wspolne dane zespolowe' : 'Frontend ready for API'}</span>
	`

	systemUiState.pageStatusActions.innerHTML = currentUser
		? `
			<button type="button" class="app-page-status-btn" data-user-action="profile">
				<i class="fa-solid fa-user-gear"></i>
				<span>Profil</span>
			</button>
			<button type="button" class="app-page-status-btn is-secondary" data-user-action="logout">
				<i class="fa-solid fa-arrow-right-from-bracket"></i>
				<span>Wyloguj</span>
			</button>
		`
		: `
			<button type="button" class="app-page-status-btn" data-user-action="login">
				<i class="fa-solid fa-right-to-bracket"></i>
				<span>Zaloguj się</span>
			</button>
			<button type="button" class="app-page-status-btn is-secondary" data-user-action="register">
				<i class="fa-solid fa-user-plus"></i>
				<span>Załóż konto</span>
			</button>
		`
}

const handleUserAction = action => {
	closeUserPopover()

	if (action === 'login') openAuthModal('login')
	if (action === 'register') openAuthModal('register')
	if (action === 'profile') openProfileModal()
	if (action === 'logout') logoutUser()
}

const ensurePageStatusStrip = () => {
	document.querySelectorAll('.app-page-status-strip').forEach(strip => strip.remove())
	systemUiState.pageStatusStrip = null
	systemUiState.pageStatusIdentity = null
	systemUiState.pageStatusText = null
	systemUiState.pageStatusTags = null
	systemUiState.pageStatusActions = null
	return null
}

const closeUserPopover = () => {
	if (!authState.hub || !authState.popover) return

	authState.hub.classList.remove('is-open')
	authState.trigger?.setAttribute('aria-expanded', 'false')
	authState.popover.hidden = true
	document.body.classList.remove('app-user-popover-open')
}

const openUserPopover = () => {
	if (!authState.hub || !authState.popover) return

	renderAuthUi()
	authState.hub.classList.add('is-open')
	authState.trigger?.setAttribute('aria-expanded', 'true')
	authState.popover.hidden = false
	document.body.classList.add('app-user-popover-open')
}

const toggleUserPopover = () => {
	if (authState.popover?.hidden) {
		openUserPopover()
		return
	}

	closeUserPopover()
}

const closeModal = modal => {
	if (!modal) return
	modal.hidden = true
	modal.setAttribute('aria-hidden', 'true')
	document.body.classList.remove('app-auth-open')
}

const openModal = modal => {
	if (!modal) return
	modal.hidden = false
	modal.setAttribute('aria-hidden', 'false')
	document.body.classList.add('app-auth-open')
}

const renderAvatarUploadPreview = (container, { fullName, avatarId, avatarImage, helperText } = {}) => {
	if (!container) return

	const hasCustomAvatar = Boolean(normalizeAvatarImage(avatarImage))
	container.innerHTML = `
		${createAvatarMarkup({
			fullName: fullName || 'Użytkownik',
			avatarId,
			avatarImage,
			extraClass: 'app-user-avatar-xl',
		})}
		<div class="app-avatar-upload-copy">
			<strong>${hasCustomAvatar ? 'Własne zdjęcie aktywne' : 'Domyślny neutralny avatar'}</strong>
			<span>${
				helperText ||
				(hasCustomAvatar
					? `Zdjecie zostanie zapisane ${getAccountStorageLabel()} dla tego konta.`
					: 'Jesli nie wgrasz zdjecia, system pokaze neutralny avatar z sylwetka.')
			}</span>
		</div>
	`
}

const renderRegisterAvatarEditor = () => {
	renderAvatarUploadPreview(authState.authAvatarPreview, {
		fullName: authState.authFullNameInput?.value || authState.authLoginInput?.value || 'Nowy użytkownik',
		avatarId: authState.selectedRegisterAvatarId,
		avatarImage: authState.customRegisterAvatarImage,
		helperText: authState.customRegisterAvatarImage
			? `To zdjecie bedzie zapisane ${getAccountStorageLabel()} i przypisane do nowego konta.`
			: 'Możesz od razu wgrać swoje zdjęcie profilowe albo zostawić neutralny avatar z sylwetką.',
	})

	if (authState.authAvatarResetBtn) {
		authState.authAvatarResetBtn.hidden = !authState.customRegisterAvatarImage
	}
}

const renderProfileAvatarEditor = () => {
	renderAvatarUploadPreview(authState.profileAvatarPreview, {
		fullName: authState.profileNameInput?.value || authState.profileLoginInput?.value || authState.currentUser?.fullName || 'Użytkownik',
		avatarId: authState.selectedProfileAvatarId,
		avatarImage: authState.customProfileAvatarImage,
		helperText: authState.customProfileAvatarImage
			? `To zdjecie jest aktywne dla Twojego konta ${getAccountStorageLabel()}.`
			: 'Możesz wgrać nowe zdjęcie albo zostawić neutralny avatar z sylwetką.',
	})

	if (authState.profileAvatarResetBtn) {
		authState.profileAvatarResetBtn.hidden = !authState.customProfileAvatarImage
	}
}

const getManageableUsers = () => {
	const currentUserId = String(authState.currentUser?.id || '')

	return [...authState.users]
		.filter(user => user?.id && String(user.id) !== currentUserId)
		.sort((leftUser, rightUser) => {
			if (leftUser.role !== rightUser.role) {
				return leftUser.role === 'admin' ? -1 : 1
			}

			return String(leftUser.fullName || leftUser.login || '').localeCompare(String(rightUser.fullName || rightUser.login || ''), 'pl')
		})
}

const syncTeamMemberCardState = card => {
	if (!card) return

	const roleSelect = card.querySelector('[data-team-role]')
	const summary = card.querySelector('[data-team-summary]')
	const permissionInputs = [...card.querySelectorAll('[data-team-permission]')]
	const isLeader = roleSelect?.value === 'admin'

	permissionInputs.forEach(input => {
		if (isLeader) {
			input.checked = true
			input.disabled = true
			return
		}

		input.disabled = false
	})

	if (!summary) return

	if (isLeader) {
		summary.textContent = 'Pełny dostęp do wszystkich specjalizacji i zarządzania kontami.'
		return
	}

	const selectedPermissions = permissionInputs.filter(input => input.checked).map(input => input.value)
	summary.textContent = selectedPermissions.length > 0 ? `Specjalizacje: ${selectedPermissions.map(getPermissionLabel).join(', ')}` : 'Brak nadanych specjalizacji.'
}

const renderTeamManagement = () => {
	if (!authState.profileTeamSection || !authState.profileTeamList) return

	const isLeader = authState.currentUser?.role === 'admin'
	authState.profileTeamSection.classList.toggle('is-hidden', !isLeader)

	if (!isLeader) {
		authState.profileTeamList.innerHTML = ''
		return
	}

	const manageableUsers = getManageableUsers()
	if (manageableUsers.length === 0) {
		authState.profileTeamList.innerHTML = `
			<div class="app-team-empty">
				<strong>Brak innych kont do konfiguracji</strong>
				<p>${
					isRemoteAuthMode()
						? 'Gdy kolejne osoby zaloza konto na serwerze, pojawia sie tutaj i bedziesz mogl nadac im role oraz specjalizacje.'
						: 'Gdy kolejne osoby zaloza konto lokalne, pojawia sie tutaj i bedziesz mogl nadac im role oraz specjalizacje.'
				}</p>
			</div>
		`
		return
	}

	authState.profileTeamList.innerHTML = manageableUsers
		.map(user => {
			const isLeaderRole = user.role === 'admin'
			const permissions = getEffectiveUserPermissions(user)

			return `
				<article class="app-team-member-card" data-user-id="${escapeHtml(user.id)}">
					<div class="app-team-member-head">
						<div class="app-team-member-identity">
							${createAvatarMarkup({
								fullName: user.fullName || user.login || 'Użytkownik',
								avatarId: user.avatarId,
								avatarImage: user.avatarImage,
							})}
							<div class="app-team-member-copy">
								<strong>${escapeHtml(user.fullName || `@${user.login}`)}</strong>
								<span>${getRoleLabel(user.role)} · @${escapeHtml(user.login || '')}</span>
							</div>
						</div>
						<label class="app-team-member-control">
							<span>Poziom dostępu</span>
							<select data-team-role>
								<option value="user" ${user.role === 'user' ? 'selected' : ''}>Pracownik</option>
								<option value="admin" ${isLeaderRole ? 'selected' : ''}>Lider</option>
							</select>
						</label>
					</div>
					<div class="app-team-member-permissions">
						<span>Specjalizacje</span>
						<div class="app-team-permission-grid">
							${AUTH_CONFIG.permissionOptions
								.map(
									option => `
										<label class="app-team-permission-chip">
											<input
												type="checkbox"
												value="${option.id}"
												data-team-permission
												${isLeaderRole || permissions.includes(option.id) ? 'checked' : ''}
												${isLeaderRole ? 'disabled' : ''}>
											<span>${option.label}</span>
										</label>
									`
								)
								.join('')}
						</div>
					</div>
					<div class="app-team-member-footer">
						<p class="app-team-member-summary" data-team-summary>${
							isLeaderRole
								? 'Pełny dostęp do wszystkich specjalizacji i zarządzania kontami.'
								: permissions.length > 0
									? `Specjalizacje: ${permissions.map(getPermissionLabel).join(', ')}`
									: 'Brak nadanych specjalizacji.'
						}</p>
						<button type="button" class="app-avatar-upload-btn is-primary app-team-member-save" data-team-save>
							<i class="fa-solid fa-shield-halved"></i>
							<span>Zapisz uprawnienia</span>
						</button>
					</div>
				</article>
			`
		})
		.join('')

	authState.profileTeamList.querySelectorAll('.app-team-member-card').forEach(syncTeamMemberCardState)
}

const resetRegisterAvatarEditor = () => {
	authState.selectedRegisterAvatarId = AUTH_CONFIG.avatarPresets[0].id
	authState.customRegisterAvatarImage = ''
	if (authState.authAvatarUploadInput) {
		authState.authAvatarUploadInput.value = ''
	}
	renderRegisterAvatarEditor()
}

const clearCustomAvatar = scope => {
	if (scope === 'profile') {
		authState.customProfileAvatarImage = ''
		if (authState.profileAvatarUploadInput) {
			authState.profileAvatarUploadInput.value = ''
		}
		renderProfileAvatarEditor()
		return
	}

	authState.customRegisterAvatarImage = ''
	if (authState.authAvatarUploadInput) {
		authState.authAvatarUploadInput.value = ''
	}
	renderRegisterAvatarEditor()
}

const buildAvatarImageFromFile = file =>
	new Promise((resolve, reject) => {
		if (!file) {
			reject(new Error('Nie wybrano pliku avatara.'))
			return
		}

		if (!String(file.type || '').startsWith('image/')) {
			reject(new Error('Avatar musi byc plikiem graficznym.'))
			return
		}

		if (Number(file.size || 0) > AUTH_CONFIG.maxAvatarUploadSizeBytes) {
			reject(new Error('Wybrany plik jest za duzy. Uzyj obrazu do 10 MB.'))
			return
		}

		const reader = new FileReader()
		reader.onerror = () => reject(new Error('Nie udało się odczytać pliku avatara.'))
		reader.onload = () => {
			const image = new Image()
			image.onerror = () => reject(new Error('Nie udało się przetworzyć obrazu avatara.'))
			image.onload = () => {
				const cropSize = Math.max(1, Math.min(image.width, image.height))
				const cropOffsetX = Math.max(0, Math.floor((image.width - cropSize) / 2))
				const cropOffsetY = Math.max(0, Math.floor((image.height - cropSize) / 2))
				const canvas = document.createElement('canvas')
				const targetSize = AUTH_CONFIG.avatarOutputSize

				canvas.width = targetSize
				canvas.height = targetSize

				const context = canvas.getContext('2d')
				if (!context) {
					reject(new Error('Przeglądarka nie pozwala przygotować avatara.'))
					return
				}

				context.drawImage(
					image,
					cropOffsetX,
					cropOffsetY,
					cropSize,
					cropSize,
					0,
					0,
					targetSize,
					targetSize
				)

				try {
					resolve(canvas.toDataURL('image/jpeg', AUTH_CONFIG.avatarOutputQuality))
				} catch (error) {
					reject(new Error('Nie udało się zapisać przygotowanego avatara.'))
				}
			}

			image.src = String(reader.result || '')
		}

		reader.readAsDataURL(file)
	})

const handleAvatarFileSelection = async (scope, file) => {
	const avatarImage = await buildAvatarImageFromFile(file)
	if (scope === 'profile') {
		authState.customProfileAvatarImage = avatarImage
		renderProfileAvatarEditor()
		return
	}

	authState.customRegisterAvatarImage = avatarImage
	renderRegisterAvatarEditor()
}

const updateAuthMode = mode => {
	const allowPasswordReset = !isRemoteAuthMode()
	authState.mode = mode === 'register' ? 'register' : allowPasswordReset && mode === 'reset' ? 'reset' : 'login'
	if (!authState.authModal || !authState.authForm) return

	const isRegister = authState.mode === 'register'
	const isReset = authState.mode === 'reset'
	authState.authModal.dataset.mode = authState.mode

	if (authState.authTitle) {
		authState.authTitle.textContent = isRegister
			? isRemoteAuthMode()
				? 'Zaloz konto zespolowe'
				: 'Załóż konto lokalne'
			: isReset
				? 'Reset lokalnego hasła'
				: 'Zaloguj się do systemu'
	}

	if (authState.authCopy) {
		authState.authCopy.textContent = isRegister
			? isRemoteAuthMode()
				? 'Konto zostanie zapisane na serwerze i bedzie widoczne dla wszystkich uzytkownikow tej aplikacji. Pierwsze konto otrzyma role lidera.'
				: 'Konto zostanie zapisane lokalnie w tej przeglądarce. Pierwsze konto otrzyma rolę lidera.'
			: isReset
				? 'Podaj login i ustaw nowe hasło dla lokalnego konta w tej przeglądarce.'
				: isRemoteAuthMode()
					? 'Konta i dane sa wspoldzielone na serwerze. Zalogowanie odblokowuje prace na wspolnej bazie rekordow.'
					: 'Konta są lokalne dla tej przeglądarki. Później warstwa danych może zostać podłączona do backendu.'
	}

	if (authState.authSwitchBtn) {
		authState.authSwitchBtn.textContent = isRegister || isReset ? 'Wróć do logowania' : 'Nie masz konta? Zarejestruj się'
	}

	if (authState.authResetBtn) {
		authState.authResetBtn.hidden = isRemoteAuthMode() || isRegister || isReset || authState.users.length === 0
	}

	if (authState.authSubmitBtn) {
		authState.authSubmitBtn.textContent = isRegister ? 'Utwórz konto' : isReset ? 'Ustaw nowe hasło' : 'Zaloguj się'
	}

	authState.authFullNameInput?.closest('.app-auth-field')?.classList.toggle('is-hidden', !isRegister)
	if (authState.authPasswordInput) {
		authState.authPasswordInput.placeholder = isReset ? 'Wpisz nowe hasło' : 'Minimum 4 znaki'
		authState.authPasswordInput.autocomplete = isRegister || isReset ? 'new-password' : 'current-password'
	}
	authState.authPasswordRepeatInput?.closest('.app-auth-field')?.classList.toggle('is-hidden', !(isRegister || isReset))
	if (authState.authPasswordRepeatInput) {
		authState.authPasswordRepeatInput.placeholder = isReset ? 'Powtórz nowe hasło' : 'Powtórz hasło'
	}
	authState.authRoleHint?.classList.toggle('is-hidden', !isRegister)
	authState.authAvatarPreview?.closest('.app-auth-field')?.classList.toggle('is-hidden', !isRegister)
}

const openAuthModal = mode => {
	updateAuthMode(mode)
	openModal(authState.authModal)

	window.setTimeout(() => {
		if (authState.mode === 'register') {
			authState.authFullNameInput?.focus()
			return
		}

		authState.authLoginInput?.focus()
	}, 40)
}

const populateProfileForm = () => {
	if (!authState.currentUser || !authState.profileForm) return

	authState.selectedProfileAvatarId = authState.currentUser.avatarId
	authState.customProfileAvatarImage = normalizeAvatarImage(authState.currentUser.avatarImage)
	if (authState.profileNameInput) authState.profileNameInput.value = authState.currentUser.fullName || ''
	if (authState.profileLoginInput) authState.profileLoginInput.value = authState.currentUser.login || ''
	if (authState.profileRoleBadge) {
		authState.profileRoleBadge.textContent = getRoleLabel(authState.currentUser.role)
		authState.profileRoleBadge.classList.toggle('is-admin', authState.currentUser.role === 'admin')
	}
	if (authState.profileCreatedAtValue) {
		authState.profileCreatedAtValue.textContent = formatProfileDateTime(authState.currentUser.createdAt)
	}
	if (authState.profileUpdatedAtValue) {
		authState.profileUpdatedAtValue.textContent = formatProfileDateTime(authState.currentUser.updatedAt)
	}
	if (authState.profileLastLoginValue) {
		authState.profileLastLoginValue.textContent = formatProfileDateTime(authState.session?.loginAt)
	}
	if (authState.profileModuleValue) {
		authState.profileModuleValue.textContent = getCurrentModuleLabel()
	}

	renderTeamManagement()
	renderProfileAvatarEditor()
}

const openProfileModal = () => {
	if (!authState.currentUser) {
		openAuthModal('login')
		return
	}

	populateProfileForm()
	openModal(authState.profileModal)
	window.setTimeout(() => authState.profileNameInput?.focus(), 40)
}

const ensureAuthUi = () => {
	if (authState.hub || !document.body) return authState

	const hub = document.createElement('div')
	hub.className = 'app-user-hub'
	hub.innerHTML = `
		<button type="button" class="app-user-trigger" aria-label="Otwórz panel użytkownika" aria-expanded="false"></button>
		<div class="app-user-popover" hidden>
			<div class="app-user-popover-identity"></div>
			<p class="app-user-popover-meta"></p>
			<div class="app-user-popover-actions"></div>
		</div>
	`

	const authModal = document.createElement('div')
	authModal.className = 'app-auth-modal-shell'
	authModal.hidden = true
	authModal.setAttribute('aria-hidden', 'true')
	authModal.innerHTML = `
		<div class="app-auth-modal-backdrop" data-auth-close></div>
		<section class="app-auth-card" role="dialog" aria-modal="true" aria-labelledby="app-auth-title">
			<button type="button" class="app-auth-close" data-auth-close aria-label="Zamknij panel logowania">
				<i class="fa-solid fa-xmark"></i>
			</button>
			<p class="app-auth-kicker">Panel użytkownika</p>
			<h2 id="app-auth-title">Zaloguj się do systemu</h2>
			<p class="app-auth-copy" id="app-auth-copy">Konta są lokalne dla tej przeglądarki. Później warstwa danych może zostać podłączona do backendu.</p>
			<form class="app-auth-form" novalidate>
				<label class="app-auth-field is-hidden">
					<span>Imię i nazwisko</span>
					<input type="text" id="app-auth-full-name" placeholder="Np. Jan Kowalski" autocomplete="name">
				</label>
				<label class="app-auth-field">
					<span>Login</span>
					<input type="text" id="app-auth-login" placeholder="Np. jkowalski" autocomplete="username" required>
				</label>
				<label class="app-auth-field">
					<span>Hasło</span>
					<input type="password" id="app-auth-password" placeholder="Minimum 4 znaki" autocomplete="current-password" required>
				</label>
				<label class="app-auth-field is-hidden">
					<span>Powtórz hasło</span>
					<input type="password" id="app-auth-password-repeat" placeholder="Powtórz hasło" autocomplete="new-password">
				</label>
				<div class="app-auth-field is-hidden">
					<span>Zdjęcie profilowe</span>
					<div class="app-avatar-upload">
						<div class="app-avatar-upload-preview" id="app-auth-avatar-preview"></div>
						<div class="app-avatar-upload-actions">
							<input type="file" id="app-auth-avatar-upload" accept="image/*" hidden>
							<div class="app-avatar-upload-btn-row">
								<button type="button" class="app-avatar-upload-btn is-primary" id="app-auth-avatar-browse-btn">
									<i class="fa-solid fa-image"></i>
									<span>Przeglądaj</span>
								</button>
								<button type="button" class="app-avatar-upload-btn is-secondary" id="app-auth-avatar-reset-btn" hidden>
									<i class="fa-solid fa-trash-can"></i>
									<span>Usuń zdjęcie</span>
								</button>
							</div>
							<small>PNG, JPG lub WebP do 10 MB. Zdjecie zostanie przyciete do kwadratu i przypisane do tego konta.</small>
						</div>
					</div>
				</div>
				<p class="app-auth-role-hint is-hidden" id="app-auth-role-hint">Pierwsze założone konto otrzyma rolę lidera.</p>
				<div class="app-auth-actions">
					<button type="submit" class="app-auth-submit">Zaloguj się</button>
					<button type="button" class="app-auth-switch">Nie masz konta? Zarejestruj się</button>
					<button type="button" class="app-auth-switch" id="app-auth-reset-btn">Nie pamiętasz hasła?</button>
				</div>
			</form>
		</section>
	`

	const profileModal = document.createElement('div')
	profileModal.className = 'app-auth-modal-shell'
	profileModal.hidden = true
	profileModal.setAttribute('aria-hidden', 'true')
	profileModal.innerHTML = `
		<div class="app-auth-modal-backdrop" data-profile-close></div>
		<section class="app-auth-card app-profile-card" role="dialog" aria-modal="true" aria-labelledby="app-profile-title">
			<button type="button" class="app-auth-close" data-profile-close aria-label="Zamknij profil">
				<i class="fa-solid fa-xmark"></i>
			</button>
			<p class="app-auth-kicker">Twój profil</p>
			<h2 id="app-profile-title">Dane użytkownika</h2>
			<p class="app-auth-copy">Tutaj możesz zmienić nazwę, login i zdjęcie profilowe. Dodatkowo widać najważniejsze informacje o koncie.</p>
			<form class="app-auth-form app-profile-form" novalidate>
				<div class="app-profile-role-row">
					<span>Rola</span>
					<strong class="app-role-badge" id="app-profile-role-badge">Użytkownik</strong>
				</div>
				<div class="app-profile-meta-grid">
					<div class="app-profile-meta-item">
						<span>Aktywny moduł</span>
						<strong id="app-profile-module">-</strong>
					</div>
					<div class="app-profile-meta-item">
						<span>Konto od</span>
						<strong id="app-profile-created-at">-</strong>
					</div>
					<div class="app-profile-meta-item">
						<span>Ostatnia zmiana</span>
						<strong id="app-profile-updated-at">-</strong>
					</div>
					<div class="app-profile-meta-item">
						<span>Ostatnie logowanie</span>
						<strong id="app-profile-last-login">-</strong>
					</div>
				</div>
				<section class="app-profile-team-section is-hidden" id="app-profile-team-section">
					<div class="app-profile-team-head">
						<div>
							<p class="app-auth-kicker">Zespół i uprawnienia</p>
							<h3>Konfiguracja dostępów</h3>
							<p class="app-auth-copy">Lider może nadawać role oraz specjalizacje pozostałym zarejestrowanym osobom.</p>
						</div>
					</div>
					<div class="app-profile-team-list" id="app-profile-team-list"></div>
				</section>
				<label class="app-auth-field">
					<span>Imię i nazwisko</span>
					<input type="text" id="app-profile-name" placeholder="Np. Jan Kowalski" autocomplete="name" required>
				</label>
				<label class="app-auth-field">
					<span>Login</span>
					<input type="text" id="app-profile-login" placeholder="Np. jkowalski" autocomplete="username" required>
				</label>
				<div class="app-auth-field">
					<span>Zdjęcie profilowe</span>
					<div class="app-avatar-upload">
						<div class="app-avatar-upload-preview" id="app-profile-avatar-preview"></div>
						<div class="app-avatar-upload-actions">
							<input type="file" id="app-profile-avatar-upload" accept="image/*" hidden>
							<div class="app-avatar-upload-btn-row">
								<button type="button" class="app-avatar-upload-btn is-primary" id="app-profile-avatar-browse-btn">
									<i class="fa-solid fa-image"></i>
									<span>Przeglądaj</span>
								</button>
								<button type="button" class="app-avatar-upload-btn is-secondary" id="app-profile-avatar-reset-btn" hidden>
									<i class="fa-solid fa-trash-can"></i>
									<span>Usuń zdjęcie</span>
								</button>
							</div>
							<small>PNG, JPG lub WebP do 10 MB. Zdjecie zostanie przyciete do kwadratu i przypisane do tego konta.</small>
						</div>
					</div>
				</div>
				<div class="app-auth-actions">
					<button type="submit" class="app-auth-submit">Zapisz zmiany</button>
					<button type="button" class="app-auth-switch app-auth-switch-danger" id="app-profile-logout-btn">Wyloguj</button>
				</div>
			</form>
		</section>
	`

	const dashboardTopbar = document.body.classList.contains('dashboard-page')
		? document.querySelector('.dashboard-topbar')
		: null

	if (dashboardTopbar) {
		dashboardTopbar.appendChild(hub)
	} else {
		document.body.appendChild(hub)
	}
	document.body.appendChild(authModal)
	document.body.appendChild(profileModal)

	authState.hub = hub
	authState.trigger = hub.querySelector('.app-user-trigger')
	authState.popover = hub.querySelector('.app-user-popover')
	authState.popoverIdentity = hub.querySelector('.app-user-popover-identity')
	authState.popoverMeta = hub.querySelector('.app-user-popover-meta')
	authState.popoverActions = hub.querySelector('.app-user-popover-actions')
	authState.authModal = authModal
	authState.authTitle = authModal.querySelector('#app-auth-title')
	authState.authCopy = authModal.querySelector('#app-auth-copy')
	authState.authForm = authModal.querySelector('.app-auth-form')
	authState.authSwitchBtn = authModal.querySelector('.app-auth-actions .app-auth-switch')
	authState.authResetBtn = authModal.querySelector('#app-auth-reset-btn')
	authState.authFullNameInput = authModal.querySelector('#app-auth-full-name')
	authState.authLoginInput = authModal.querySelector('#app-auth-login')
	authState.authPasswordInput = authModal.querySelector('#app-auth-password')
	authState.authPasswordRepeatInput = authModal.querySelector('#app-auth-password-repeat')
	authState.authRoleHint = authModal.querySelector('#app-auth-role-hint')
	authState.authAvatarPreview = authModal.querySelector('#app-auth-avatar-preview')
	authState.authAvatarUploadInput = authModal.querySelector('#app-auth-avatar-upload')
	authState.authAvatarBrowseBtn = authModal.querySelector('#app-auth-avatar-browse-btn')
	authState.authAvatarResetBtn = authModal.querySelector('#app-auth-avatar-reset-btn')
	authState.authSubmitBtn = authModal.querySelector('.app-auth-submit')
	authState.profileModal = profileModal
	authState.profileForm = profileModal.querySelector('.app-profile-form')
	authState.profileNameInput = profileModal.querySelector('#app-profile-name')
	authState.profileLoginInput = profileModal.querySelector('#app-profile-login')
	authState.profileRoleBadge = profileModal.querySelector('#app-profile-role-badge')
	authState.profileCreatedAtValue = profileModal.querySelector('#app-profile-created-at')
	authState.profileUpdatedAtValue = profileModal.querySelector('#app-profile-updated-at')
	authState.profileLastLoginValue = profileModal.querySelector('#app-profile-last-login')
	authState.profileModuleValue = profileModal.querySelector('#app-profile-module')
	authState.profileTeamSection = profileModal.querySelector('#app-profile-team-section')
	authState.profileTeamList = profileModal.querySelector('#app-profile-team-list')
	authState.profileAvatarPreview = profileModal.querySelector('#app-profile-avatar-preview')
	authState.profileAvatarUploadInput = profileModal.querySelector('#app-profile-avatar-upload')
	authState.profileAvatarBrowseBtn = profileModal.querySelector('#app-profile-avatar-browse-btn')
	authState.profileAvatarResetBtn = profileModal.querySelector('#app-profile-avatar-reset-btn')
	authState.profileLogoutBtn = profileModal.querySelector('#app-profile-logout-btn')

	renderRegisterAvatarEditor()
	renderAuthUi()
	updateAuthMode('login')

	authState.trigger?.addEventListener('click', event => {
		event.stopPropagation()
		toggleUserPopover()
	})

	hub.addEventListener('click', event => {
		const actionButton = getEventTargetElement(event.target)?.closest('[data-user-action]')
		if (!actionButton) return

		handleUserAction(actionButton.dataset.userAction)
	})

	document.addEventListener('click', event => {
		if (!hub.contains(event.target)) {
			closeUserPopover()
		}
	})

	authModal.addEventListener('click', event => {
		if (getEventTargetElement(event.target)?.closest('[data-auth-close]')) {
			closeModal(authModal)
		}
	})

	profileModal.addEventListener('click', event => {
		if (getEventTargetElement(event.target)?.closest('[data-profile-close]')) {
			closeModal(profileModal)
		}
	})

	authState.authSwitchBtn?.addEventListener('click', () => {
		updateAuthMode(authState.mode === 'login' ? 'register' : 'login')
	})

	authState.authResetBtn?.addEventListener('click', () => {
		updateAuthMode('reset')
		window.setTimeout(() => authState.authLoginInput?.focus(), 40)
	})

	authState.profileTeamList?.addEventListener('change', event => {
		const teamControl = getEventTargetElement(event.target)?.closest('[data-team-role], [data-team-permission]')
		if (!teamControl) return

		syncTeamMemberCardState(teamControl.closest('.app-team-member-card'))
	})

	authState.profileTeamList?.addEventListener('click', event => {
		const saveButton = getEventTargetElement(event.target)?.closest('[data-team-save]')
		if (!saveButton) return

		const memberCard = saveButton.closest('.app-team-member-card')
		const roleSelect = memberCard?.querySelector('[data-team-role]')
		const selectedPermissions = [...(memberCard?.querySelectorAll('[data-team-permission]:checked') || [])].map(input => input.value)

		try {
			updateUserAccess({
				userId: memberCard?.dataset.userId || '',
				role: roleSelect?.value || 'user',
				permissions: selectedPermissions,
			})
			renderTeamManagement()
			notify({
				type: 'success',
				title: 'Uprawnienia zapisane',
				message: 'Rola i specjalizacje tego konta zostały zaktualizowane.',
			})
		} catch (error) {
			notify({
				type: 'error',
				title: 'Zmiana nieudana',
				message: error.message || 'Nie udało się zapisać uprawnień użytkownika.',
			})
		}
	})

	authState.authAvatarBrowseBtn?.addEventListener('click', () => authState.authAvatarUploadInput?.click())
	authState.profileAvatarBrowseBtn?.addEventListener('click', () => authState.profileAvatarUploadInput?.click())

	authState.authAvatarResetBtn?.addEventListener('click', () => clearCustomAvatar('register'))
	authState.profileAvatarResetBtn?.addEventListener('click', () => clearCustomAvatar('profile'))

	authState.authAvatarUploadInput?.addEventListener('change', async event => {
		const file = event.target.files?.[0]
		if (!file) return

		try {
			await handleAvatarFileSelection('register', file)
		} catch (error) {
			notify({
				type: 'error',
				title: 'Avatar nie został wgrany',
				message: error.message || 'Nie udało się przygotować avatara.',
			})
		}
	})

	authState.profileAvatarUploadInput?.addEventListener('change', async event => {
		const file = event.target.files?.[0]
		if (!file) return

		try {
			await handleAvatarFileSelection('profile', file)
		} catch (error) {
			notify({
				type: 'error',
				title: 'Avatar nie został wgrany',
				message: error.message || 'Nie udało się przygotować avatara.',
			})
		}
	})

	authState.authFullNameInput?.addEventListener('input', renderRegisterAvatarEditor)
	authState.authLoginInput?.addEventListener('input', renderRegisterAvatarEditor)
	authState.profileNameInput?.addEventListener('input', renderProfileAvatarEditor)
	authState.profileLoginInput?.addEventListener('input', renderProfileAvatarEditor)

	authState.authForm?.addEventListener('submit', event => {
		event.preventDefault()

		try {
			if (authState.mode === 'register' || authState.mode === 'reset') {
				const password = authState.authPasswordInput?.value || ''
				const repeatedPassword = authState.authPasswordRepeatInput?.value || ''
				if (password !== repeatedPassword) {
					throw new Error('Hasła muszą być identyczne.')
				}

				if (authState.mode === 'register') {
					registerUser({
						fullName: authState.authFullNameInput?.value || '',
						login: authState.authLoginInput?.value || '',
						password,
						avatarId: authState.selectedRegisterAvatarId,
						avatarImage: authState.customRegisterAvatarImage,
					})
					notify({
						type: 'success',
						title: 'Konto utworzone',
						message: isRemoteAuthMode()
							? 'Nowe konto zostalo zalozone na serwerze i od razu aktywowane.'
							: 'Nowe konto lokalne zostało założone i od razu aktywowane w tej przeglądarce.',
					})
				} else {
					resetUserPassword({
						login: authState.authLoginInput?.value || '',
						password,
					})
					notify({
						type: 'success',
						title: 'Hasło zresetowane',
						message: 'Nowe hasło zostało zapisane lokalnie, a konto jest już zalogowane.',
					})
				}
			} else {
				loginUser({
					login: authState.authLoginInput?.value || '',
					password: authState.authPasswordInput?.value || '',
				})
				notify({
					type: 'success',
					title: 'Zalogowano',
					message: isRemoteAuthMode()
						? 'Sesja uzytkownika jest aktywna, a dane sa wspoldzielone we wszystkich modulach.'
						: 'Sesja użytkownika jest aktywna i gotowa do pracy we wszystkich modułach.',
				})
			}

			authState.authForm.reset()
			resetRegisterAvatarEditor()
			closeModal(authModal)
		} catch (error) {
			notify({
				type: 'error',
				title:
					authState.mode === 'register'
						? 'Nie udało się założyć konta'
						: authState.mode === 'reset'
							? 'Reset hasła nieudany'
							: 'Nie udało się zalogować',
				message: error.message || 'Nie udało się zapisać zmian.',
			})
		}
	})

	authState.profileForm?.addEventListener('submit', event => {
		event.preventDefault()

		try {
			updateCurrentUserProfile({
				fullName: authState.profileNameInput?.value || '',
				login: authState.profileLoginInput?.value || '',
				avatarId: authState.selectedProfileAvatarId,
				avatarImage: authState.customProfileAvatarImage,
			})

			closeModal(profileModal)
			notify({
				type: 'success',
				title: 'Profil zaktualizowany',
				message: 'Zmiany profilu zostały zapisane i są widoczne we wszystkich modułach.',
			})
		} catch (error) {
			notify({
				type: 'error',
				title: 'Aktualizacja nieudana',
				message: error.message || 'Nie udało się zaktualizować profilu.',
			})
		}
	})

	authState.profileLogoutBtn?.addEventListener('click', () => {
		logoutUser()
		closeModal(profileModal)
	})

	window.addEventListener('keydown', event => {
		if (event.key === 'Escape') {
			closeUserPopover()

			if (!authState.authModal?.hidden) closeModal(authState.authModal)
			if (!authState.profileModal?.hidden) closeModal(authState.profileModal)
		}
	})

	return authState
}

const getCurrentUser = () => sanitizeUser(authState.currentUser)

const isAuthenticated = () => Boolean(authState.currentUser)

const isCurrentUserAdmin = () => authState.currentUser?.role === 'admin'

const isCurrentUserLeader = () => isCurrentUserAdmin()

const hasPermission = permissionId => getEffectiveUserPermissions(authState.currentUser).includes(permissionId)

const getAuditActorSnapshot = (user = authState.currentUser) => {
	const safeUser = sanitizeUser(user)
	if (!safeUser) return null

	return {
		id: safeUser.id,
		fullName: safeUser.fullName,
		login: safeUser.login,
		role: safeUser.role,
		avatarId: safeUser.avatarId,
	}
}

const getAuditActorLabel = actor => {
	if (!actor) return 'Brak danych historycznych'
	if (actor.fullName) return actor.fullName
	if (actor.login) return `@${actor.login}`
	return 'Brak danych historycznych'
}

appServices.authService = {
	register: registerUser,
	login: loginUser,
	resetPassword: resetUserPassword,
	logout: logoutUser,
	updateProfile: updateCurrentUserProfile,
	updateUserAccess,
	getCurrentUser,
	isAuthenticated,
	isCurrentUserAdmin,
	isCurrentUserLeader,
	hasPermission,
	getRoleLabel,
	getPermissionLabel,
	getPermissionOptions: () => [...AUTH_CONFIG.permissionOptions],
	syncCurrentUserFromSession,
}
/* === Shared Auth And Session: End === */
