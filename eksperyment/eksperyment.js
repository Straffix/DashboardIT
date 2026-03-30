const EXPERIMENT_STORAGE_KEY = 'dashboard_experiment_builder_v3'
const EXPERIMENT_TUTORIAL_STORAGE_KEY = 'dashboard_experiment_tutorial_seen_v1'
const EXPERIMENT_SESSION_STORAGE_KEY = 'dashboard_user_session'
const EXPERIMENT_REMOTE_SESSION_PATH = '../api/auth/session.php'
const EXPERIMENT_READONLY_STATUS = 'Tryb podgladu dla goscia. Zaloguj sie na dashboardzie, aby edytowac.'

const EXPERIMENT_BLOCK_LIBRARY = [
	{ type: 'hero', label: 'Start zmiany', description: 'Nagłówek z planem i priorytetami na zmianę.', icon: 'fa-headset' },
	{ type: 'ticket', label: 'Zgłoszenie', description: 'Karta pojedynczego ticketu z priorytetem i statusem.', icon: 'fa-ticket' },
	{ type: 'tasks', label: 'Lista zadań', description: 'Checklista do odhaczania bezpośrednio na podglądzie.', icon: 'fa-list-check' },
	{ type: 'note', label: 'Notatnik', description: 'Robocza notatka helpdeskowa z kontekstem i właścicielem.', icon: 'fa-book-open' },
	{ type: 'links', label: 'Szybkie linki', description: 'Najczęściej używane systemy, instrukcje i panele.', icon: 'fa-link' },
	{ type: 'handoff', label: 'Przekazanie', description: 'Podsumowanie dla kolejnej zmiany lub innego operatora.', icon: 'fa-arrow-right-arrow-left' },
]

const experimentElements = {}
const experimentDragState = { source: null, type: null, blockId: null }
const experimentTutorialState = { isOpen: false, currentStepIndex: 0, activeTarget: null }
const experimentAuthState = { isAuthenticated: false }
const experimentTutorialSteps = [
	{
		target: '[data-tutorial-target="topbar-actions"]',
		title: 'Najważniejsze akcje',
		description: 'Tutaj możesz uruchomić instrukcję ponownie, zapisać układ, wyeksportować go do HTML albo zresetować pulpit.',
		position: 'bottom',
	},
	{
		target: '[data-tutorial-target="palette"]',
		title: 'Biblioteka modułów',
		description: 'Z tej sekcji przeciągasz gotowe moduły na swój pulpit. Każdy blok możesz dodać metodą drag and drop.',
		position: 'right',
	},
	{
		target: '[data-tutorial-target="canvas-panel"]',
		title: 'Obszar roboczy',
		description: 'Tutaj budujesz swój układ. Upuszczaj moduły między liniami przerywanymi i ustawiaj je w dowolnej kolejności.',
		position: 'left',
	},
	{
		target: '[data-tutorial-target="inspector"]',
		title: 'Edytor treści',
		description: 'Po kliknięciu modułu na pulpicie w tym miejscu zmienisz jego treść, opisy i pozostałe ustawienia.',
		position: 'left',
	},
]

let experimentState = null
let experimentStatusTimer = 0

const experimentEscapeHtml = value =>
	String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')

const experimentCreateId = () =>
	window.crypto?.randomUUID?.() || `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const experimentReadLocalSession = () => {
	try {
		const rawSession = window.localStorage.getItem(EXPERIMENT_SESSION_STORAGE_KEY)
		if (!rawSession) return null

		const parsedSession = JSON.parse(rawSession)
		if (!parsedSession || typeof parsedSession !== 'object' || !parsedSession.userId) {
			return null
		}

		return parsedSession
	} catch (error) {
		return null
	}
}

const experimentReadRemoteSession = () => {
	if (window.location.protocol === 'file:') return null

	try {
		const xhr = new XMLHttpRequest()
		xhr.open('GET', new URL(EXPERIMENT_REMOTE_SESSION_PATH, window.location.href).toString(), false)
		xhr.setRequestHeader('Accept', 'application/json')
		xhr.send(null)

		if (xhr.status < 200 || xhr.status >= 300) return null

		const payload = JSON.parse(xhr.responseText || '{}')
		if (!payload?.ok || !payload?.session?.userId) return null
		return payload.session
	} catch (error) {
		return null
	}
}

const experimentHasAuthenticatedUser = () => Boolean(experimentReadRemoteSession()?.userId || experimentReadLocalSession()?.userId)

const experimentGetReadonlyFieldAttributes = () =>
	(experimentAuthState.isAuthenticated ? '' : 'disabled aria-disabled="true"')

const experimentCreateTaskItem = (text, done = false, id = experimentCreateId()) => ({
	id,
	text: String(text || '').trim(),
	done: Boolean(done),
})

const experimentCreateLinkItem = (label, url = '#', id = experimentCreateId()) => ({
	id,
	label: String(label || '').trim(),
	url: String(url || '#').trim() || '#',
})

const experimentNormalizeTaskItems = items =>
	Array.isArray(items)
		? items
				.map(item =>
					typeof item === 'string'
						? experimentCreateTaskItem(item, false)
						: experimentCreateTaskItem(item?.text || '', item?.done, item?.id || experimentCreateId())
				)
				.filter(item => item.text)
		: []

const experimentNormalizeLinkItems = items =>
	Array.isArray(items)
		? items
				.map(item =>
					typeof item === 'string'
						? experimentCreateLinkItem(item, '#')
						: experimentCreateLinkItem(item?.label || '', item?.url || '#', item?.id || experimentCreateId())
				)
				.filter(item => item.label)
		: []

const experimentParseTaskLines = value =>
	String(value || '')
		.split('\n')
		.map(line => line.trim())
		.filter(Boolean)
		.map(line => {
			const done = /^\[(x|X)\]\s*/.test(line)
			return experimentCreateTaskItem(line.replace(/^\[(x|X| )\]\s*/, ''), done)
		})
		.filter(item => item.text)

const experimentFormatTaskLines = items =>
	experimentNormalizeTaskItems(items)
		.map(item => `${item.done ? '[x]' : '[ ]'} ${item.text}`)
		.join('\n')

const experimentParseLinkLines = value =>
	String(value || '')
		.split('\n')
		.map(line => line.trim())
		.filter(Boolean)
		.map(line => {
			const [labelPart, urlPart] = line.split('|').map(part => part.trim())
			return experimentCreateLinkItem(labelPart || line, urlPart || '#')
		})
		.filter(item => item.label)

const experimentFormatLinkLines = items =>
	experimentNormalizeLinkItems(items)
		.map(item => `${item.label} | ${item.url}`)
		.join('\n')

const experimentCreateBlock = type => {
	const id = experimentCreateId()

	switch (type) {
		case 'hero':
			return { id, type, badge: 'Helpdesk', title: 'Plan pracy na zmiane', text: 'Zacznij od najwazniejszych ticketow, sprawdz priorytety i zostaw czytelne notatki dla zespolu.' }
		case 'ticket':
			return { id, type, queue: 'HD-2471', priority: 'high', status: 'W toku', user: 'Anna Nowak', summary: 'Brak dostepu do Outlooka po zmianie hasla.' }
		case 'tasks':
			return {
				id,
				type,
				title: 'Lista zadan na teraz',
				items: [
					experimentCreateTaskItem('Oddzwon do uzytkownika po resecie hasla', true),
					experimentCreateTaskItem('Zaktualizuj komentarz w zgloszeniu'),
					experimentCreateTaskItem('Przekaz eskalacje do adminow M365'),
				],
			}
		case 'note':
			return {
				id,
				type,
				title: 'Notatka robocza',
				context: 'Zmiana poranna',
				body: 'Uzytkownik potwierdzil, ze problem wystepuje tylko na laptopie sluzbowym. Telefon dziala poprawnie.',
				owner: 'Arek',
			}
		case 'links':
			return {
				id,
				type,
				title: 'Szybkie linki',
				items: [
					experimentCreateLinkItem('Jira Service Management', 'https://example.com/jira'),
					experimentCreateLinkItem('Instrukcja VPN', 'https://example.com/vpn'),
					experimentCreateLinkItem('Panel Intune', 'https://example.com/intune'),
				],
			}
		case 'handoff':
			return {
				id,
				type,
				title: 'Przekazanie zmiany',
				current: 'Reset hasla wykonany, test logowania w toku.',
				next: 'Jesli problem wroci, sprawdz token MFA i czyszczenie profilu Outlook.',
				followup: 'Priorytet rano: potwierdzic zamkniecie ticketu z uzytkownikiem.',
			}
		default:
			return { id, type: 'note', title: 'Notatka', context: 'Kontekst', body: 'Uzupelnij tresc bloku.', owner: 'Operator' }
	}
}

const experimentCreateDefaultState = () => {
	return {
		pageBadge: 'Workspace',
		pageTitle: 'Praktyczny pulpit helpdesku',
		pageSubtitle: 'Buduj roboczy widok z ticketami, taskami, notatkami i przekazaniem zmiany bez mieszania z glownym dashboardem.',
		items: [],
		selectedId: null,
	}
}

const experimentNormalizeItems = items =>
	Array.isArray(items)
		? items
				.filter(item => item && typeof item === 'object' && item.id && item.type)
				.map(item => {
					const normalizedItem = { ...experimentCreateBlock(item.type), ...item, id: String(item.id) }

					if (normalizedItem.type === 'tasks') {
						normalizedItem.items = experimentNormalizeTaskItems(normalizedItem.items)
					}

					if (normalizedItem.type === 'links') {
						normalizedItem.items = experimentNormalizeLinkItems(normalizedItem.items)
					}

					return normalizedItem
				})
		: []

const experimentLoadState = () => {
	try {
		const rawState = window.localStorage.getItem(EXPERIMENT_STORAGE_KEY)
		if (!rawState) return experimentCreateDefaultState()

		const parsedState = JSON.parse(rawState)
		const defaultState = experimentCreateDefaultState()
		const items = experimentNormalizeItems(parsedState?.items)
		const selectedId = items.some(item => item.id === parsedState?.selectedId) ? parsedState.selectedId : items[0]?.id || null

		return {
			pageBadge: String(parsedState?.pageBadge || defaultState.pageBadge),
			pageTitle: String(parsedState?.pageTitle || defaultState.pageTitle),
			pageSubtitle: String(parsedState?.pageSubtitle || defaultState.pageSubtitle),
			items: items.length > 0 ? items : defaultState.items,
			selectedId,
		}
	} catch (error) {
		return experimentCreateDefaultState()
	}
}

const experimentPersistState = ({ announce = false, message = 'Uklad zapisany lokalnie.' } = {}) => {
	if (!experimentState) return

	window.localStorage.setItem(EXPERIMENT_STORAGE_KEY, JSON.stringify(experimentState))

	if (announce) {
		experimentSetStatus(message)
	}
}

const experimentSetStatus = message => {
	if (!experimentElements.status) return

	experimentElements.status.textContent = message
	window.clearTimeout(experimentStatusTimer)
	experimentStatusTimer = window.setTimeout(() => {
		experimentElements.status.textContent = experimentAuthState.isAuthenticated
			? 'Autozapis lokalny jest aktywny'
			: EXPERIMENT_READONLY_STATUS
	}, 2800)
}

const experimentRequireAuthenticatedAction = (message = 'Zaloguj sie na dashboardzie, aby edytowac strone eksperymentalna.') => {
	if (experimentAuthState.isAuthenticated) return true

	experimentSetStatus(message)
	return false
}

const experimentApplyReadonlyUi = () => {
	const guestMode = !experimentAuthState.isAuthenticated
	document.body.classList.toggle('experiment-readonly', guestMode)

	if (experimentElements.saveButton) {
		experimentElements.saveButton.disabled = guestMode
		experimentElements.saveButton.title = guestMode ? 'Zaloguj sie na dashboardzie, aby zapisywac zmiany' : 'Zapisz uklad'
	}

	if (experimentElements.exportButton) {
		experimentElements.exportButton.disabled = guestMode
		experimentElements.exportButton.title = guestMode ? 'Zaloguj sie na dashboardzie, aby eksportowac widok' : 'Eksport HTML'
	}

	if (experimentElements.resetButton) {
		experimentElements.resetButton.disabled = guestMode
		experimentElements.resetButton.title = guestMode ? 'Zaloguj sie na dashboardzie, aby resetowac uklad' : 'Reset'
	}

	if (experimentElements.status) {
		window.clearTimeout(experimentStatusTimer)
		experimentElements.status.textContent = guestMode ? EXPERIMENT_READONLY_STATUS : 'Autozapis lokalny jest aktywny!'
	}
}

const experimentSyncAuthState = ({ refresh = false } = {}) => {
	experimentAuthState.isAuthenticated = experimentHasAuthenticatedUser()

	if (refresh) {
		experimentRenderPalette()
		experimentRenderCanvas()
		experimentRenderInspector()
	}

	experimentApplyReadonlyUi()
}

const experimentGetSelectedBlock = () =>
	experimentState?.items.find(item => item.id === experimentState.selectedId) || null

const experimentUpdateBlockCount = () => {
	if (!experimentElements.blockCount) return

	const count = experimentState?.items?.length || 0
	experimentElements.blockCount.textContent = `${count} ${count === 1 ? 'blok' : count < 5 ? 'bloki' : 'blokow'}`
}

const experimentClamp = (value, min, max) => Math.min(Math.max(value, min), max)

const experimentHasSeenTutorial = () => {
	try {
		return window.localStorage.getItem(EXPERIMENT_TUTORIAL_STORAGE_KEY) === '1'
	} catch (error) {
		return false
	}
}

const experimentMarkTutorialAsSeen = () => {
	try {
		window.localStorage.setItem(EXPERIMENT_TUTORIAL_STORAGE_KEY, '1')
	} catch (error) {
		return null
	}
}

const experimentClearTutorialTarget = () => {
	experimentTutorialState.activeTarget?.classList?.remove('is-tutorial-target')
	experimentTutorialState.activeTarget = null
}

const experimentGetTutorialTarget = selector => document.querySelector(selector)

const experimentPositionTutorialCard = (targetRect, position = 'bottom') => {
	const card = experimentElements.tutorialCard
	if (!card) return

	const cardRect = card.getBoundingClientRect()
	const viewportPadding = 16
	const offset = 22
	let top = viewportPadding
	let left = viewportPadding

	if (position === 'bottom') {
		top = targetRect.bottom + offset
		left = targetRect.left
	} else if (position === 'top') {
		top = targetRect.top - cardRect.height - offset
		left = targetRect.left
	} else if (position === 'left') {
		top = targetRect.top
		left = targetRect.left - cardRect.width - offset
	} else {
		top = targetRect.top
		left = targetRect.right + offset
	}

	card.dataset.position = position
	card.style.top = `${Math.round(experimentClamp(top, viewportPadding, window.innerHeight - cardRect.height - viewportPadding))}px`
	card.style.left = `${Math.round(experimentClamp(left, viewportPadding, window.innerWidth - cardRect.width - viewportPadding))}px`
}

const experimentRenderTutorialStep = ({ shouldScroll = true } = {}) => {
	const tutorial = experimentElements.tutorial
	const spotlight = experimentElements.tutorialSpotlight
	const card = experimentElements.tutorialCard
	const stepLabel = experimentElements.tutorialStepLabel
	const title = experimentElements.tutorialTitle
	const description = experimentElements.tutorialDescription
	const prevButton = experimentElements.tutorialPrevButton
	const nextButton = experimentElements.tutorialNextButton

	if (!tutorial || !spotlight || !card || !stepLabel || !title || !description || !prevButton || !nextButton) return

	const step = experimentTutorialSteps[experimentTutorialState.currentStepIndex]
	if (!step) return

	const target = experimentGetTutorialTarget(step.target)
	if (!target) return

	if (shouldScroll) {
		target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
	}
	experimentClearTutorialTarget()
	target.classList.add('is-tutorial-target')
	experimentTutorialState.activeTarget = target

	const rect = target.getBoundingClientRect()
	const padding = 10
	spotlight.style.top = `${Math.round(rect.top - padding)}px`
	spotlight.style.left = `${Math.round(rect.left - padding)}px`
	spotlight.style.width = `${Math.round(rect.width + padding * 2)}px`
	spotlight.style.height = `${Math.round(rect.height + padding * 2)}px`

	stepLabel.textContent = `Krok ${experimentTutorialState.currentStepIndex + 1} z ${experimentTutorialSteps.length}`
	title.textContent = step.title
	description.textContent = step.description
	prevButton.disabled = experimentTutorialState.currentStepIndex === 0
	prevButton.hidden = experimentTutorialState.currentStepIndex === 0
	nextButton.querySelector('span').textContent =
		experimentTutorialState.currentStepIndex === experimentTutorialSteps.length - 1 ? 'Zakończ' : 'Dalej'

	experimentPositionTutorialCard(rect, step.position)
}

const experimentOpenTutorial = (startIndex = 0) => {
	if (!experimentElements.tutorial) return

	experimentTutorialState.isOpen = true
	experimentTutorialState.currentStepIndex = experimentClamp(startIndex, 0, experimentTutorialSteps.length - 1)
	experimentElements.tutorial.hidden = false
	experimentElements.tutorial.setAttribute('aria-hidden', 'false')
	document.body.classList.add('tutorial-open')
	experimentRenderTutorialStep()
}

const experimentCloseTutorial = ({ showNotice = false } = {}) => {
	if (!experimentElements.tutorial) return

	experimentTutorialState.isOpen = false
	experimentMarkTutorialAsSeen()
	experimentElements.tutorial.hidden = true
	experimentElements.tutorial.setAttribute('aria-hidden', 'true')
	document.body.classList.remove('tutorial-open')
	experimentClearTutorialTarget()

	if (showNotice) {
		experimentOpenTestNotice()
	}
}

const experimentGoToTutorialStep = delta => {
	if (!experimentTutorialState.isOpen) return

	const nextIndex = experimentTutorialState.currentStepIndex + delta
	if (nextIndex < 0) return

	if (nextIndex >= experimentTutorialSteps.length) {
		experimentCloseTutorial({ showNotice: true })
		return
	}

	experimentTutorialState.currentStepIndex = nextIndex
	experimentRenderTutorialStep()
}

const experimentOpenTestNotice = () => {
	if (!experimentElements.testNotice) return

	experimentElements.testNotice.hidden = false
	experimentElements.testNotice.setAttribute('aria-hidden', 'false')
	document.body.classList.add('notice-open')
}

const experimentCloseTestNotice = () => {
	if (!experimentElements.testNotice) return

	experimentElements.testNotice.hidden = true
	experimentElements.testNotice.setAttribute('aria-hidden', 'true')
	document.body.classList.remove('notice-open')
}

const experimentRenderPalette = () => {
	if (!experimentElements.paletteList) return
	const guestMode = !experimentAuthState.isAuthenticated

	experimentElements.paletteList.innerHTML = EXPERIMENT_BLOCK_LIBRARY.map(
		block => `
			<button
				type="button"
				class="palette-card${guestMode ? ' is-disabled' : ''}"
				draggable="${guestMode ? 'false' : 'true'}"
				data-template-type="${block.type}"
				title="${guestMode ? 'Zaloguj sie na dashboardzie, aby dodawac bloki' : 'Przeciagnij blok do obszaru roboczego'}"
				${guestMode ? 'disabled' : ''}>
				<div class="palette-card-head">
					<span class="palette-card-icon" aria-hidden="true"><i class="fa-solid ${experimentEscapeHtml(block.icon)}"></i></span>
					<strong>${experimentEscapeHtml(block.label)}</strong>
				</div>
				<p>${experimentEscapeHtml(block.description)}</p>
			</button>
		`
	).join('')
}

const experimentRenderDropzone = index =>
	`<div class="builder-dropzone${experimentAuthState.isAuthenticated ? '' : ' is-readonly'}" data-dropzone-index="${index}"><span>${experimentAuthState.isAuthenticated ? 'Upusc blok tutaj' : 'Tylko podglad'}</span></div>`

const experimentRenderTicketPreview = block => `
	<div class="builder-preview-ticket">
		<div class="ticket-meta">
			<span class="ticket-pill ticket-pill-priority-${experimentEscapeHtml(block.priority)}">${experimentEscapeHtml(block.priority)}</span>
			<span class="ticket-pill ticket-pill-status">${experimentEscapeHtml(block.status)}</span>
		</div>
		<h3>${experimentEscapeHtml(block.queue)}</h3>
		<div class="ticket-grid">
			<div class="ticket-row"><strong>Uzytkownik</strong><span>${experimentEscapeHtml(block.user)}</span></div>
			<div class="ticket-row"><strong>Opis</strong><span>${experimentEscapeHtml(block.summary)}</span></div>
		</div>
	</div>
`

const experimentRenderTasksPreview = block => `
	<div class="builder-preview-tasks">
		<h3>${experimentEscapeHtml(block.title)}</h3>
		<div class="task-preview-list">
			${experimentNormalizeTaskItems(block.items)
				.map(
					item => `
						<button
							type="button"
							class="task-toggle${item.done ? ' is-done' : ''}"
							data-toggle-task="${block.id}"
							data-task-id="${item.id}"
							title="${experimentAuthState.isAuthenticated ? 'Zmien status zadania' : 'Zaloguj sie na dashboardzie, aby zmieniac zadania'}"
							${experimentAuthState.isAuthenticated ? '' : 'disabled'}>
							<span class="task-toggle-check"><i class="fa-solid ${item.done ? 'fa-check' : 'fa-minus'}"></i></span>
							<span>${experimentEscapeHtml(item.text)}</span>
						</button>
					`
				)
				.join('')}
		</div>
	</div>
`

const experimentRenderNotePreview = block => `
	<div class="builder-preview-note">
		<h3>${experimentEscapeHtml(block.title)}</h3>
		<div class="note-meta">
			<span>${experimentEscapeHtml(block.context)}</span>
			<span>${experimentEscapeHtml(block.owner)}</span>
		</div>
		<p class="builder-preview-muted">${experimentEscapeHtml(block.body)}</p>
	</div>
`

const experimentRenderLinksPreview = block => `
	<div class="builder-preview-links">
		<h3>${experimentEscapeHtml(block.title)}</h3>
		<div class="quick-link-list">
			${experimentNormalizeLinkItems(block.items)
				.map(
					item => `
						<a class="quick-link-item" href="${experimentEscapeHtml(item.url)}" target="_blank" rel="noreferrer noopener">
							<strong>${experimentEscapeHtml(item.label)}</strong>
							<small>${experimentEscapeHtml(item.url)}</small>
						</a>
					`
				)
				.join('')}
		</div>
	</div>
`

const experimentRenderHandoffPreview = block => `
	<div class="builder-preview-handoff">
		<h3>${experimentEscapeHtml(block.title)}</h3>
		<div class="handoff-grid">
			<div class="handoff-card"><strong>Stan teraz</strong><p>${experimentEscapeHtml(block.current)}</p></div>
			<div class="handoff-card"><strong>Nastepny krok</strong><p>${experimentEscapeHtml(block.next)}</p></div>
			<div class="handoff-card"><strong>Follow-up</strong><p>${experimentEscapeHtml(block.followup)}</p></div>
		</div>
	</div>
`

const experimentRenderBlockPreview = block => {
	switch (block.type) {
		case 'hero':
			return `<div class="builder-preview-hero"><p class="canvas-page-eyebrow">${experimentEscapeHtml(block.badge)}</p><h3>${experimentEscapeHtml(block.title)}</h3><p class="builder-preview-muted">${experimentEscapeHtml(block.text)}</p></div>`
		case 'ticket':
			return experimentRenderTicketPreview(block)
		case 'tasks':
			return experimentRenderTasksPreview(block)
		case 'note':
			return experimentRenderNotePreview(block)
		case 'links':
			return experimentRenderLinksPreview(block)
		case 'handoff':
			return experimentRenderHandoffPreview(block)
		default:
			return `<p class="builder-preview-muted">Nieobslugiwany blok.</p>`
	}
}

const experimentRenderBlockCard = block => {
	const libraryEntry = EXPERIMENT_BLOCK_LIBRARY.find(entry => entry.type === block.type)
	const isSelected = block.id === experimentState.selectedId
	const guestMode = !experimentAuthState.isAuthenticated

	return `
		<article class="builder-block${isSelected ? ' is-selected' : ''}${guestMode ? ' is-readonly' : ''}" draggable="${guestMode ? 'false' : 'true'}" data-block-id="${block.id}">
			<div class="builder-block-bar">
				<div class="builder-block-bar-left">
					<span class="builder-drag-handle" aria-hidden="true"><i class="fa-solid fa-grip-vertical"></i></span>
					<p class="builder-type-label">${experimentEscapeHtml(libraryEntry?.label || block.type)}</p>
				</div>
				<div class="builder-block-bar-right">
					<button type="button" class="builder-delete-btn" data-delete-block="${block.id}" aria-label="Usuń blok" title="${guestMode ? 'Zaloguj sie na dashboardzie, aby usuwac bloki' : 'Usun blok'}" ${guestMode ? 'disabled' : ''}><i class="fa-solid fa-trash"></i></button>
				</div>
			</div>
			<div class="builder-block-body">${experimentRenderBlockPreview(block)}</div>
		</article>
	`
}

const experimentRenderCanvas = () => {
	if (!experimentElements.canvas || !experimentState) return
	const guestMode = !experimentAuthState.isAuthenticated

	const emptyStateMarkup =
		experimentState.items.length === 0
			? `<div class="empty-canvas"><div><p class="empty-canvas-badge">Start</p><strong>Tu pojawi sie Twoj pulpit</strong><p class="builder-preview-muted">${guestMode ? 'Po zalogowaniu mozna dodawac i ukladac bloki. Teraz widzisz tylko podglad.' : 'Przeciagnij pierwszy blok z biblioteki po lewej stronie.'}</p></div></div>`
			: ''

	const blocksMarkup =
		experimentState.items.map((block, index) => `${experimentRenderDropzone(index)}${experimentRenderBlockCard(block)}`).join('') +
		experimentRenderDropzone(experimentState.items.length)

	experimentElements.canvas.innerHTML = `
		<div class="canvas-runtime">
			<header class="canvas-page-header">
				<p class="canvas-page-eyebrow">${experimentEscapeHtml(experimentState.pageBadge)}</p>
				<h2>${experimentEscapeHtml(experimentState.pageTitle)}</h2>
				<p>${experimentEscapeHtml(experimentState.pageSubtitle)}</p>
			</header>
			${emptyStateMarkup}
			<div class="canvas-block-list">${blocksMarkup}</div>
		</div>
	`

	experimentUpdateBlockCount()
}

const experimentRenderPageInspector = () => `
	<div class="inspector-card">
		<div class="inspector-card-head"><h3>Ustawienia strony</h3></div>
		<div class="inspector-grid">
			<label class="inspector-field"><span>Mala etykieta</span><input type="text" data-scope="page" data-field="pageBadge" value="${experimentEscapeHtml(experimentState.pageBadge)}" ${experimentGetReadonlyFieldAttributes()}></label>
			<label class="inspector-field"><span>Tytul strony</span><input type="text" data-scope="page" data-field="pageTitle" value="${experimentEscapeHtml(experimentState.pageTitle)}" ${experimentGetReadonlyFieldAttributes()}></label>
			<label class="inspector-field"><span>Opis strony</span><textarea data-scope="page" data-field="pageSubtitle" ${experimentGetReadonlyFieldAttributes()}>${experimentEscapeHtml(experimentState.pageSubtitle)}</textarea></label>
		</div>
	</div>
`

const experimentRenderBlockInspector = block => {
	const fields = []

	if (block.type === 'hero') {
		fields.push(
			`<label class="inspector-field"><span>Etykieta</span><input type="text" data-scope="block" data-field="badge" value="${experimentEscapeHtml(block.badge)}" ${experimentGetReadonlyFieldAttributes()}></label>`,
			`<label class="inspector-field"><span>Tytul</span><input type="text" data-scope="block" data-field="title" value="${experimentEscapeHtml(block.title)}" ${experimentGetReadonlyFieldAttributes()}></label>`,
			`<label class="inspector-field"><span>Opis</span><textarea data-scope="block" data-field="text" ${experimentGetReadonlyFieldAttributes()}>${experimentEscapeHtml(block.text)}</textarea></label>`
		)
	}

	if (block.type === 'ticket') {
		fields.push(
			`<label class="inspector-field"><span>Numer / kolejka</span><input type="text" data-scope="block" data-field="queue" value="${experimentEscapeHtml(block.queue)}" ${experimentGetReadonlyFieldAttributes()}></label>`,
			`<label class="inspector-field"><span>Priorytet</span><select data-scope="block" data-field="priority" ${experimentGetReadonlyFieldAttributes()}><option value="low" ${block.priority === 'low' ? 'selected' : ''}>low</option><option value="medium" ${block.priority === 'medium' ? 'selected' : ''}>medium</option><option value="high" ${block.priority === 'high' ? 'selected' : ''}>high</option></select></label>`,
			`<label class="inspector-field"><span>Status</span><select data-scope="block" data-field="status" ${experimentGetReadonlyFieldAttributes()}><option value="Nowe" ${block.status === 'Nowe' ? 'selected' : ''}>Nowe</option><option value="W toku" ${block.status === 'W toku' ? 'selected' : ''}>W toku</option><option value="Czeka na usera" ${block.status === 'Czeka na usera' ? 'selected' : ''}>Czeka na usera</option><option value="Eskalacja" ${block.status === 'Eskalacja' ? 'selected' : ''}>Eskalacja</option><option value="Zamkniete" ${block.status === 'Zamkniete' ? 'selected' : ''}>Zamkniete</option></select></label>`,
			`<label class="inspector-field"><span>Uzytkownik</span><input type="text" data-scope="block" data-field="user" value="${experimentEscapeHtml(block.user)}" ${experimentGetReadonlyFieldAttributes()}></label>`,
			`<label class="inspector-field"><span>Opis problemu</span><textarea data-scope="block" data-field="summary" ${experimentGetReadonlyFieldAttributes()}>${experimentEscapeHtml(block.summary)}</textarea></label>`
		)
	}

	if (block.type === 'tasks') {
		fields.push(
			`<label class="inspector-field"><span>Tytul</span><input type="text" data-scope="block" data-field="title" value="${experimentEscapeHtml(block.title)}" ${experimentGetReadonlyFieldAttributes()}></label>`,
			`<label class="inspector-field"><span>Zadania</span><textarea data-scope="block" data-field="items" ${experimentGetReadonlyFieldAttributes()}>${experimentEscapeHtml(experimentFormatTaskLines(block.items))}</textarea></label>`,
			`<p class="inspector-help">Format: <code>[ ] do zrobienia</code> lub <code>[x] zakonczone</code>. Mozesz tez odhaczac elementy bezposrednio na podgladzie.</p>`
		)
	}

	if (block.type === 'note') {
		fields.push(
			`<label class="inspector-field"><span>Tytul</span><input type="text" data-scope="block" data-field="title" value="${experimentEscapeHtml(block.title)}" ${experimentGetReadonlyFieldAttributes()}></label>`,
			`<label class="inspector-field"><span>Kontekst</span><input type="text" data-scope="block" data-field="context" value="${experimentEscapeHtml(block.context)}" ${experimentGetReadonlyFieldAttributes()}></label>`,
			`<label class="inspector-field"><span>Tresc notatki</span><textarea data-scope="block" data-field="body" ${experimentGetReadonlyFieldAttributes()}>${experimentEscapeHtml(block.body)}</textarea></label>`,
			`<label class="inspector-field"><span>Wlasciciel</span><input type="text" data-scope="block" data-field="owner" value="${experimentEscapeHtml(block.owner)}" ${experimentGetReadonlyFieldAttributes()}></label>`
		)
	}

	if (block.type === 'links') {
		fields.push(
			`<label class="inspector-field"><span>Tytul</span><input type="text" data-scope="block" data-field="title" value="${experimentEscapeHtml(block.title)}" ${experimentGetReadonlyFieldAttributes()}></label>`,
			`<label class="inspector-field"><span>Linki</span><textarea data-scope="block" data-field="items" ${experimentGetReadonlyFieldAttributes()}>${experimentEscapeHtml(experimentFormatLinkLines(block.items))}</textarea></label>`,
			`<p class="inspector-help">Kazda linia: <code>Nazwa | https://adres</code></p>`
		)
	}

	if (block.type === 'handoff') {
		fields.push(
			`<label class="inspector-field"><span>Tytul</span><input type="text" data-scope="block" data-field="title" value="${experimentEscapeHtml(block.title)}" ${experimentGetReadonlyFieldAttributes()}></label>`,
			`<label class="inspector-field"><span>Stan teraz</span><textarea data-scope="block" data-field="current" ${experimentGetReadonlyFieldAttributes()}>${experimentEscapeHtml(block.current)}</textarea></label>`,
			`<label class="inspector-field"><span>Nastepny krok</span><textarea data-scope="block" data-field="next" ${experimentGetReadonlyFieldAttributes()}>${experimentEscapeHtml(block.next)}</textarea></label>`,
			`<label class="inspector-field"><span>Follow-up</span><textarea data-scope="block" data-field="followup" ${experimentGetReadonlyFieldAttributes()}>${experimentEscapeHtml(block.followup)}</textarea></label>`
		)
	}

	return `
		<div class="inspector-card">
			<div class="inspector-card-head">
				<h3>Edytujesz blok: ${experimentEscapeHtml(block.type)}</h3>
				<div class="inspector-inline-actions"><button type="button" class="inspector-inline-btn is-danger" data-remove-selected="true" ${experimentAuthState.isAuthenticated ? '' : 'disabled'}>Usun blok</button></div>
			</div>
			<div class="inspector-grid">${fields.join('')}</div>
		</div>
	`
}

const experimentRenderInspector = () => {
	if (!experimentElements.inspector || !experimentState) return

	const selectedBlock = experimentGetSelectedBlock()
	experimentElements.inspector.innerHTML = `
		${experimentRenderPageInspector()}
		${selectedBlock ? experimentRenderBlockInspector(selectedBlock) : '<div class="inspector-empty"><h3>Wybierz blok</h3><p>Kliknij element w obszarze roboczym, aby zmienic jego tresc i ustawienia.</p></div>'}
	`
}

const experimentMoveDraggedBlock = dropIndex => {
	if (!experimentRequireAuthenticatedAction('Zaloguj sie na dashboardzie, aby ukladac bloki.')) return

	if (experimentDragState.source === 'palette' && experimentDragState.type) {
		const newBlock = experimentCreateBlock(experimentDragState.type)
		const nextItems = [...experimentState.items]
		nextItems.splice(dropIndex, 0, newBlock)
		experimentState.items = nextItems
		experimentState.selectedId = newBlock.id
		experimentPersistState({ announce: true, message: 'Dodano nowy modul.' })
		experimentRenderCanvas()
		experimentRenderInspector()
		return
	}

	if (experimentDragState.source === 'canvas' && experimentDragState.blockId) {
		const currentIndex = experimentState.items.findIndex(item => item.id === experimentDragState.blockId)
		if (currentIndex === -1) return

		const nextItems = [...experimentState.items]
		const [movedBlock] = nextItems.splice(currentIndex, 1)
		const nextIndex = currentIndex < dropIndex ? dropIndex - 1 : dropIndex
		nextItems.splice(nextIndex, 0, movedBlock)
		experimentState.items = nextItems
		experimentState.selectedId = movedBlock.id
		experimentPersistState({ announce: true, message: 'Zmieniono kolejnosc modulow.' })
		experimentRenderCanvas()
		experimentRenderInspector()
	}
}

const experimentClearDropzoneHighlights = () => {
	document.querySelectorAll('.builder-dropzone.is-over').forEach(dropzone => {
		dropzone.classList.remove('is-over')
	})
}

const experimentRemoveBlock = blockId => {
	if (!experimentRequireAuthenticatedAction('Zaloguj sie na dashboardzie, aby usuwac bloki.')) return

	const nextItems = experimentState.items.filter(item => item.id !== blockId)
	experimentState.items = nextItems
	experimentState.selectedId = nextItems[0]?.id || null
	experimentPersistState({ announce: true, message: 'Modul zostal usuniety.' })
	experimentRenderCanvas()
	experimentRenderInspector()
}

const experimentSetSelectedBlock = blockId => {
	experimentState.selectedId = experimentState.items.some(item => item.id === blockId) ? blockId : null
	if (experimentAuthState.isAuthenticated) {
		experimentPersistState()
	}
	experimentRenderCanvas()
	experimentRenderInspector()
}

const experimentToggleTaskItem = (blockId, taskId) => {
	if (!experimentRequireAuthenticatedAction('Zaloguj sie na dashboardzie, aby zmieniac status zadan.')) return

	const block = experimentState.items.find(item => item.id === blockId && item.type === 'tasks')
	if (!block) return

	block.items = experimentNormalizeTaskItems(block.items).map(item =>
		item.id === taskId ? { ...item, done: !item.done } : item
	)

	experimentState.selectedId = block.id
	experimentPersistState({ announce: true, message: 'Zaktualizowano status zadania.' })
	experimentRenderCanvas()
	experimentRenderInspector()
}

const experimentHandlePaletteDragStart = event => {
	if (!experimentRequireAuthenticatedAction('Zaloguj sie na dashboardzie, aby dodawac bloki.')) {
		event.preventDefault()
		return
	}

	const card = event.target.closest('[data-template-type]')
	if (!card) return

	experimentDragState.source = 'palette'
	experimentDragState.type = card.dataset.templateType || null
	experimentDragState.blockId = null
	event.dataTransfer.effectAllowed = 'copy'
}

const experimentHandleCanvasDragStart = event => {
	if (!experimentRequireAuthenticatedAction('Zaloguj sie na dashboardzie, aby zmieniac kolejnosc blokow.')) {
		event.preventDefault()
		return
	}

	const block = event.target.closest('[data-block-id]')
	if (!block) return

	experimentDragState.source = 'canvas'
	experimentDragState.blockId = block.dataset.blockId || null
	experimentDragState.type = null
	event.dataTransfer.effectAllowed = 'move'
}

const experimentHandleCanvasDragOver = event => {
	const dropzone = event.target.closest('[data-dropzone-index]')
	if (!dropzone) return

	event.preventDefault()
	experimentClearDropzoneHighlights()
	dropzone.classList.add('is-over')
	event.dataTransfer.dropEffect = experimentDragState.source === 'palette' ? 'copy' : 'move'
}

const experimentHandleCanvasDrop = event => {
	const dropzone = event.target.closest('[data-dropzone-index]')
	if (!dropzone) return

	event.preventDefault()
	experimentClearDropzoneHighlights()
	const dropIndex = Number(dropzone.dataset.dropzoneIndex)
	if (Number.isFinite(dropIndex)) experimentMoveDraggedBlock(dropIndex)
}

const experimentHandleCanvasClick = event => {
	const deleteButton = event.target.closest('[data-delete-block]')
	if (deleteButton) {
		experimentRemoveBlock(deleteButton.dataset.deleteBlock)
		return
	}

	const taskButton = event.target.closest('[data-toggle-task][data-task-id]')
	if (taskButton) {
		experimentToggleTaskItem(taskButton.dataset.toggleTask, taskButton.dataset.taskId)
		return
	}

	const block = event.target.closest('[data-block-id]')
	if (block) experimentSetSelectedBlock(block.dataset.blockId)
}

const experimentHandleInspectorInput = event => {
	if (!experimentRequireAuthenticatedAction('Zaloguj sie na dashboardzie, aby edytowac tresc strony eksperymentalnej.')) {
		event.preventDefault?.()
		return
	}

	const field = event.target?.dataset?.field
	const scope = event.target?.dataset?.scope
	if (!field || !scope) return

	if (scope === 'page') {
		experimentState[field] = event.target.value
		experimentPersistState()
		experimentRenderCanvas()
		return
	}

	const selectedBlock = experimentGetSelectedBlock()
	if (!selectedBlock) return

	if (selectedBlock.type === 'tasks' && field === 'items') {
		selectedBlock.items = experimentParseTaskLines(event.target.value)
	} else if (selectedBlock.type === 'links' && field === 'items') {
		selectedBlock.items = experimentParseLinkLines(event.target.value)
	} else {
		selectedBlock[field] = event.target.value
	}

	experimentPersistState()
	experimentRenderCanvas()
}

const experimentHandleInspectorClick = event => {
	if (!experimentRequireAuthenticatedAction('Zaloguj sie na dashboardzie, aby usuwac bloki.')) return
	if (!event.target.closest('[data-remove-selected]')) return

	const selectedBlock = experimentGetSelectedBlock()
	if (selectedBlock) experimentRemoveBlock(selectedBlock.id)
}

const experimentBuildExportBlock = block => {
	switch (block.type) {
		case 'hero':
			return `<section class="export-card export-card-hero"><p class="export-eyebrow">${experimentEscapeHtml(block.badge)}</p><h2>${experimentEscapeHtml(block.title)}</h2><p>${experimentEscapeHtml(block.text)}</p></section>`
		case 'ticket':
			return `<section class="export-card export-card-ticket"><div class="export-ticket-meta"><span class="export-pill export-pill-${experimentEscapeHtml(block.priority)}">${experimentEscapeHtml(block.priority)}</span><span class="export-pill">${experimentEscapeHtml(block.status)}</span></div><h2>${experimentEscapeHtml(block.queue)}</h2><p><strong>Uzytkownik:</strong> ${experimentEscapeHtml(block.user)}</p><p>${experimentEscapeHtml(block.summary)}</p></section>`
		case 'tasks':
			return `<section class="export-card"><h2>${experimentEscapeHtml(block.title)}</h2><ul class="export-task-list">${experimentNormalizeTaskItems(block.items).map(item => `<li class="${item.done ? 'is-done' : ''}">${experimentEscapeHtml(item.text)}</li>`).join('')}</ul></section>`
		case 'note':
			return `<section class="export-card export-card-note"><div class="export-note-meta"><span>${experimentEscapeHtml(block.context)}</span><span>${experimentEscapeHtml(block.owner)}</span></div><h2>${experimentEscapeHtml(block.title)}</h2><p>${experimentEscapeHtml(block.body)}</p></section>`
		case 'links':
			return `<section class="export-card"><h2>${experimentEscapeHtml(block.title)}</h2><div class="export-link-list">${experimentNormalizeLinkItems(block.items).map(item => `<a class="export-link-item" href="${experimentEscapeHtml(item.url)}">${experimentEscapeHtml(item.label)}</a>`).join('')}</div></section>`
		case 'handoff':
			return `<section class="export-card"><h2>${experimentEscapeHtml(block.title)}</h2><div class="export-handoff-grid"><div class="export-handoff-card"><strong>Stan teraz</strong><p>${experimentEscapeHtml(block.current)}</p></div><div class="export-handoff-card"><strong>Nastepny krok</strong><p>${experimentEscapeHtml(block.next)}</p></div><div class="export-handoff-card"><strong>Follow-up</strong><p>${experimentEscapeHtml(block.followup)}</p></div></div></section>`
		default:
			return ''
	}
}

const experimentBuildExportHtml = () => `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${experimentEscapeHtml(experimentState.pageTitle)}</title>
  <style>
    :root { --bg: #f8f1e5; --panel: #fffaf2; --text: #2f2419; --muted: #7c6650; --accent: #d97706; --line: rgba(148, 101, 42, 0.16); }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px 18px; font-family: Arial, sans-serif; color: var(--text); background: linear-gradient(135deg, var(--bg) 0%, #edd9bb 100%); }
    .export-shell { width: min(980px, 100%); margin: 0 auto; display: grid; gap: 18px; }
    .export-header, .export-card { padding: 24px; border: 1px solid var(--line); border-radius: 24px; background: var(--panel); box-shadow: 0 18px 40px rgba(83, 54, 24, 0.08); }
    .export-eyebrow { margin: 0 0 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); }
    h1, h2 { margin: 0; line-height: 1.1; }
    p { line-height: 1.7; }
    .export-header p, .export-card p { color: var(--muted); }
    .export-card-hero { background: linear-gradient(135deg, #fff8eb 0%, #ffe8c6 100%); }
    .export-ticket-meta, .export-note-meta, .export-link-list { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
    .export-pill { display: inline-flex; padding: 6px 10px; border-radius: 999px; background: #fff4df; color: #9a5800; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .export-pill-high { background: #fee2e2; color: #b91c1c; }
    .export-pill-medium { background: #fef3c7; color: #b45309; }
    .export-pill-low { background: #dcfce7; color: #166534; }
    .export-task-list { display: grid; gap: 10px; margin: 16px 0 0; padding: 0; list-style: none; }
    .export-task-list li { padding: 12px 14px; border-radius: 16px; background: #fff4df; }
    .export-task-list li.is-done { background: #ecfdf5; text-decoration: line-through; }
    .export-link-list { margin-top: 16px; }
    .export-link-item { display: inline-flex; padding: 10px 14px; border-radius: 999px; border: 1px solid var(--line); text-decoration: none; color: var(--text); background: #ffffff; }
    .export-handoff-grid { display: grid; gap: 12px; margin-top: 16px; }
    .export-handoff-card { padding: 16px; border-radius: 18px; background: #fff4df; }
  </style>
</head>
<body>
  <main class="export-shell">
    <header class="export-header">
      <p class="export-eyebrow">${experimentEscapeHtml(experimentState.pageBadge)}</p>
      <h1>${experimentEscapeHtml(experimentState.pageTitle)}</h1>
      <p>${experimentEscapeHtml(experimentState.pageSubtitle)}</p>
    </header>
    ${experimentState.items.map(experimentBuildExportBlock).join('')}
  </main>
</body>
</html>
`

const experimentExportHtml = () => {
	const htmlContent = experimentBuildExportHtml()
	const htmlBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
	const downloadUrl = window.URL.createObjectURL(htmlBlob)
	const link = document.createElement('a')

	link.href = downloadUrl
	link.download = `eksperyment-export-${new Date().toISOString().slice(0, 10)}.html`
	document.body.appendChild(link)
	link.click()
	link.remove()
	window.URL.revokeObjectURL(downloadUrl)
	experimentSetStatus('Plik HTML zostal wyeksportowany.')
}

const experimentResetWorkspace = () => {
	if (!window.confirm('Przywrocic domyslny uklad eksperymentalnej strony?')) return

	experimentState = experimentCreateDefaultState()
	experimentPersistState({ announce: true, message: 'Przywrocono domyslny uklad.' })
	experimentRenderCanvas()
	experimentRenderInspector()
}

const experimentInit = () => {
	experimentElements.paletteList = document.getElementById('experiment-palette-list')
	experimentElements.canvas = document.getElementById('experiment-canvas')
	experimentElements.inspector = document.getElementById('experiment-inspector')
	experimentElements.status = document.getElementById('experiment-status')
	experimentElements.blockCount = document.getElementById('experiment-block-count')
	experimentElements.tutorialButton = document.getElementById('experiment-tutorial-btn')
	experimentElements.saveButton = document.getElementById('experiment-save-btn')
	experimentElements.exportButton = document.getElementById('experiment-export-btn')
	experimentElements.resetButton = document.getElementById('experiment-reset-btn')
	experimentElements.tutorial = document.getElementById('experiment-tutorial')
	experimentElements.tutorialSpotlight = document.getElementById('experiment-tutorial-spotlight')
	experimentElements.tutorialCard = document.getElementById('experiment-tutorial-card')
	experimentElements.tutorialStepLabel = document.getElementById('experiment-tutorial-step-label')
	experimentElements.tutorialTitle = document.getElementById('experiment-tutorial-title')
	experimentElements.tutorialDescription = document.getElementById('experiment-tutorial-description')
	experimentElements.tutorialSkipButton = document.getElementById('experiment-tutorial-skip-btn')
	experimentElements.tutorialPrevButton = document.getElementById('experiment-tutorial-prev-btn')
	experimentElements.tutorialNextButton = document.getElementById('experiment-tutorial-next-btn')
	experimentElements.testNotice = document.getElementById('experiment-test-notice')
	experimentElements.testNoticeCloseButton = document.getElementById('experiment-test-notice-close-btn')

	experimentState = experimentLoadState()
	experimentAuthState.isAuthenticated = experimentHasAuthenticatedUser()
	if (!experimentState.selectedId && experimentState.items[0]) experimentState.selectedId = experimentState.items[0].id

	experimentRenderPalette()
	experimentRenderCanvas()
	experimentRenderInspector()
	experimentApplyReadonlyUi()

	experimentElements.paletteList?.addEventListener('dragstart', experimentHandlePaletteDragStart)
	experimentElements.canvas?.addEventListener('dragstart', experimentHandleCanvasDragStart)
	experimentElements.canvas?.addEventListener('dragover', experimentHandleCanvasDragOver)
	experimentElements.canvas?.addEventListener('drop', experimentHandleCanvasDrop)
	experimentElements.canvas?.addEventListener('click', experimentHandleCanvasClick)
	experimentElements.canvas?.addEventListener('dragleave', event => {
		event.target.closest('[data-dropzone-index]')?.classList.remove('is-over')
	})
	experimentElements.canvas?.addEventListener('dragend', () => {
		experimentClearDropzoneHighlights()
		experimentDragState.source = null
		experimentDragState.type = null
		experimentDragState.blockId = null
	})

	experimentElements.inspector?.addEventListener('input', experimentHandleInspectorInput)
	experimentElements.inspector?.addEventListener('change', experimentHandleInspectorInput)
	experimentElements.inspector?.addEventListener('click', experimentHandleInspectorClick)
	experimentElements.tutorialButton?.addEventListener('click', () => experimentOpenTutorial())
	experimentElements.saveButton?.addEventListener('click', () => {
		if (!experimentRequireAuthenticatedAction('Zaloguj sie na dashboardzie, aby zapisywac zmiany.')) return
		experimentPersistState({ announce: true })
	})
	experimentElements.exportButton?.addEventListener('click', () => {
		if (!experimentRequireAuthenticatedAction('Zaloguj sie na dashboardzie, aby eksportowac widok.')) return
		experimentExportHtml()
	})
	experimentElements.resetButton?.addEventListener('click', () => {
		if (!experimentRequireAuthenticatedAction('Zaloguj sie na dashboardzie, aby resetowac uklad.')) return
		experimentResetWorkspace()
	})
	experimentElements.tutorialSkipButton?.addEventListener('click', () => experimentCloseTutorial({ showNotice: true }))
	experimentElements.tutorialPrevButton?.addEventListener('click', () => experimentGoToTutorialStep(-1))
	experimentElements.tutorialNextButton?.addEventListener('click', () => experimentGoToTutorialStep(1))
	experimentElements.tutorial?.querySelector('.experiment-tutorial-backdrop')?.addEventListener('click', () =>
		experimentCloseTutorial({ showNotice: true })
	)
	experimentElements.testNoticeCloseButton?.addEventListener('click', experimentCloseTestNotice)
	experimentElements.testNotice?.querySelector('.experiment-notice-backdrop')?.addEventListener('click', experimentCloseTestNotice)

	window.addEventListener('resize', () => {
		if (experimentTutorialState.isOpen) {
			experimentRenderTutorialStep({ shouldScroll: false })
		}
	})
	window.addEventListener(
		'scroll',
		() => {
			if (experimentTutorialState.isOpen) {
				experimentRenderTutorialStep({ shouldScroll: false })
			}
		},
		true
	)
	window.addEventListener('focus', () => experimentSyncAuthState({ refresh: true }))
	window.addEventListener('storage', event => {
		if (event.key === EXPERIMENT_SESSION_STORAGE_KEY) {
			experimentSyncAuthState({ refresh: true })
		}
	})
	window.addEventListener('keydown', event => {
		if (experimentTutorialState.isOpen) {
			if (event.key === 'Escape') {
				event.preventDefault()
				experimentCloseTutorial({ showNotice: true })
				return
			}

			if (event.key === 'ArrowRight' || event.key === 'Enter') {
				event.preventDefault()
				experimentGoToTutorialStep(1)
				return
			}

			if (event.key === 'ArrowLeft') {
				event.preventDefault()
				experimentGoToTutorialStep(-1)
			}
		}

		if (document.body.classList.contains('notice-open') && event.key === 'Escape') {
			event.preventDefault()
			experimentCloseTestNotice()
		}
	})

	if (!experimentHasSeenTutorial()) {
		window.setTimeout(() => {
			experimentOpenTutorial()
		}, 280)
	}
}

document.addEventListener('DOMContentLoaded', experimentInit)
