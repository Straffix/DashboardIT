(function initializeExchangesPage() {
/* === Exchanges State And References: Start === */
const pageScope = window.AppPageRuntime?.createScope?.('wymiana_sprzetu.html') || null
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
let exchanges = []
let editIndex = null
let drawerInitialState = ''
let searchQuery = ''
const exchangesService = window.AppServices?.exchangesService
const monitorService = window.AppServices?.monitorService

const exchangeForm = document.getElementById('exchange-form')
const tableBody = document.getElementById('table-body')
const accessoryPicker = document.getElementById('accessory-picker')
const submitBtn = document.getElementById('submit-btn')
const cancelEditBtn = document.getElementById('cancel-edit-btn')
const exportExcelBtn = document.getElementById('export-excel-btn')
const importExcelInput = document.getElementById('importExcelFile')
const importExcelTrigger = document.getElementById('import-excel-trigger')
const openDrawerBtn = document.getElementById('open-exchange-drawer')
const closeDrawerBtn = document.getElementById('close-exchange-drawer')
const workspaceActions = document.querySelector('.workspace-actions')
const drawerShell = document.getElementById('exchange-drawer-shell')
const drawerBackdrop = document.getElementById('exchange-drawer-backdrop')
const drawerTitle = document.getElementById('exchange-drawer-title')
const drawerCopy = document.getElementById('exchange-drawer-copy')
const monthSummary = document.getElementById('exchange-month-summary')
const exchangeWorkspace = document.querySelector('.exchange-workspace')
const searchToggleBtn = document.getElementById('exchange-search-toggle')
const searchPanel = document.getElementById('exchange-search-panel')
const searchInput = document.getElementById('exchange-search-input')
const isAuthenticated = () => Boolean(AppUtils.auth?.isAuthenticated?.())

function requireAuthenticatedAction(message = 'Musisz byc zalogowany, aby modyfikowac plan wymian.') {
	if (isAuthenticated()) return true

	AppUtils.notify({
		type: 'warning',
		title: 'Tylko podglad',
		message,
	})
	AppUtils.auth.openAuthModal?.('login')
	return false
}

function syncProtectedUi() {
	const guestMode = !isAuthenticated()

	if (openDrawerBtn) {
		openDrawerBtn.innerHTML = guestMode
			? '<i class="app-icon right-to-bracket-solid-full"></i><span>Zaloguj się, aby planować</span>'
			: '<i class="app-icon plus-solid-full"></i><span>Zaplanuj wymianę</span>'
	}

	if (importExcelTrigger) {
		importExcelTrigger.innerHTML = guestMode
			? '<i class="app-icon lock-solid-full"></i><span>Import po zalogowaniu</span>'
			: '<i class="app-icon file-import-solid-full"></i><span>Import Excel</span>'
	}

	exchangeForm
		?.querySelectorAll('input, textarea, select, button[type="submit"]')
		.forEach(control => {
			control.disabled = guestMode
		})

	if (guestMode && drawerShell?.classList.contains('is-open')) {
		void closeDrawer({ force: true })
	}
}

let workspaceHeightAnimationFallbackId = null

const monthPicker = AppUtils.createMonthPicker({
	onChange: () => renderTable({ animateContainer: true }),
	getCounts: year => {
		const counts = Array.from({ length: 12 }, () => 0)

		exchanges.forEach(exchange => {
			const exchangeDate = AppUtils.parseDate(exchange.plannedDate)
			if (!exchangeDate || exchangeDate.getFullYear() !== year) return

			counts[exchangeDate.getMonth()] += 1
		})

		return counts
	},
})

const searchController = AppUtils.createSearchController({
	panel: searchPanel,
	workspaceActions,
	toggleButton: searchToggleBtn,
	input: searchInput,
	onClear: () => {
		searchQuery = ''
		renderTable()
	},
})
/* === Exchanges State And References: End === */

/* === Exchanges Storage: Start === */
function loadData() {
	const parsedExchanges = exchangesService?.getAll?.() || []
	let hasUpdates = false

	const normalizedExchanges = parsedExchanges.map(exchange => {
		const normalizedDate = AppUtils.normalizeSpreadsheetDate(exchange.plannedDate)
		const rawAccessories = Array.isArray(exchange.accessories)
			? exchange.accessories.filter(Boolean)
			: typeof exchange.accessories === 'string'
				? exchange.accessories.split(',').map(item => item.trim()).filter(Boolean)
				: []
		const normalizedAccessories = AppUtils.normalizeAccessories(rawAccessories)
		const normalizedAudit = AppUtils.normalizeAuditFields(exchange)
		if (normalizedDate && normalizedDate !== exchange.plannedDate) {
			hasUpdates = true
		}

		if (JSON.stringify(normalizedAccessories) !== JSON.stringify(rawAccessories)) {
			hasUpdates = true
		}

		if (
			normalizedAudit.updatedBy !== (exchange.updatedBy || exchange.createdBy || null) ||
			normalizedAudit.createdAt !== (exchange.createdAt || '') ||
			normalizedAudit.updatedAt !== (exchange.updatedAt || exchange.createdAt || '')
		) {
			hasUpdates = true
		}

		return {
			...exchange,
			plannedDate: normalizedDate || exchange.plannedDate || '',
			accessories: normalizedAccessories,
			...normalizedAudit,
		}
	})

	const { records: deduplicatedExchanges, removedCount } = dedupeExchanges(normalizedExchanges)
	if (removedCount > 0) {
		hasUpdates = true
	}

	exchanges = deduplicatedExchanges

	const currentViewDate = monthPicker.getCurrentDate()
	const hasCurrentMonthData = exchanges.some(exchange => AppUtils.isSameMonth(exchange.plannedDate, currentViewDate))
	if (!hasCurrentMonthData) {
		const latestExchangeDate = exchanges
			.map(exchange => AppUtils.parseDate(exchange.plannedDate))
			.filter(Boolean)
			.sort((left, right) => right - left)[0]

		if (latestExchangeDate) {
			monthPicker.setCurrentDate(latestExchangeDate, { render: false })
		}
	}

	if (hasUpdates) {
		exchangesService?.saveAll?.(exchanges)
	}

	renderTable()
}

function saveData() {
	exchangesService?.saveAll?.(exchanges)
	renderTable()
}
/* === Exchanges Storage: End === */

/* === Exchanges View Helpers: Start === */
function getExchangeDuplicateKey(exchange) {
	const name = String(exchange?.name || '').trim().toUpperCase()
	const plannedDate = String(exchange?.plannedDate || '').trim()
	const oldSn = AppUtils.normalizeSN(exchange?.oldSn || '')
	const newSn = AppUtils.normalizeSN(exchange?.newSn || '')
	if (!name || !plannedDate) return ''
	return `${name}::${plannedDate}::${oldSn}::${newSn}`
}

function dedupeExchanges(records) {
	const seenKeys = new Set()
	const deduplicatedRecords = []
	let removedCount = 0

	records.forEach(record => {
		const key = getExchangeDuplicateKey(record)
		if (key && seenKeys.has(key)) {
			removedCount += 1
			return
		}

		if (key) {
			seenKeys.add(key)
		}

		deduplicatedRecords.push(record)
	})

	return { records: deduplicatedRecords, removedCount }
}

function getCurrentMonthContext() {
	const currentViewDate = monthPicker.getCurrentDate()
	const month = String(currentViewDate.getMonth() + 1).padStart(2, '0')

	return {
		currentViewDate,
		monthKey: `${currentViewDate.getFullYear()}-${month}`,
		monthLabel: `${AppUtils.config.MONTH_NAMES[currentViewDate.getMonth()].toUpperCase()} ${currentViewDate.getFullYear()}`,
	}
}

function getCurrentMonthExchanges() {
	const { currentViewDate } = getCurrentMonthContext()
	return exchanges.filter(exchange => AppUtils.isSameMonth(exchange.plannedDate, currentViewDate))
}

function getVisibleExchanges() {
	const source = searchQuery.trim() ? exchanges : getCurrentMonthExchanges()
	return source.filter(exchange =>
		AppUtils.matchesSearchQuery(
			[(exchange.name || '').toUpperCase(), exchange.plannedDate || '', exchange.oldSn || '', exchange.newSn || ''],
			searchQuery
		)
	)
}

function getFormState() {
	return {
		name: (document.getElementById('emp-name')?.value || '').trim().toUpperCase(),
		plannedDate: document.getElementById('exchange-date')?.value || '',
		oldSn: AppUtils.normalizeSN(document.getElementById('old-sn')?.value || ''),
		newSn: AppUtils.normalizeSN(document.getElementById('new-sn')?.value || ''),
		notes: (document.getElementById('notes')?.value || '').trim(),
		accessories: AppUtils.getSelectedAccessories(),
	}
}

function captureDrawerSnapshot() {
	drawerInitialState = JSON.stringify(getFormState())
}

function hasDrawerFormChanges() {
	return Boolean(exchangeForm) && JSON.stringify(getFormState()) !== drawerInitialState
}

function updateMonthSummary({ visibleCount, monthCount, totalCount, monthLabel }) {
	if (!monthSummary) return

	if (totalCount === 0) {
		monthSummary.textContent = `${monthLabel} · baza jest pusta, możesz zaplanować pierwszą wymianę.`
		return
	}

	if (searchQuery.trim()) {
		monthSummary.textContent = `Wyniki wyszukiwania: ${visibleCount} z ${totalCount} wpisów na stronie wymiany sprzętu.`
		return
	}

	if (monthCount === 0) {
		monthSummary.textContent = `${monthLabel} · brak wpisów w tym miesiącu.`
		return
	}

	if (monthCount === totalCount) {
		monthSummary.textContent = `${monthLabel} · widoczne wymiany: ${monthCount}.`
		return
	}

	monthSummary.textContent = `${monthLabel} · widoczne wymiany: ${monthCount} z ${totalCount} w całej bazie.`
}
function prefersReducedMotion() {
	return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function setMonthTransitionState(isActive) {
	document.body.classList.toggle('exchange-month-transitioning', isActive)
	exchangeWorkspace?.classList.toggle('is-month-transitioning', isActive)
}

function resetWorkspaceHeightAnimation() {
	if (!exchangeWorkspace) return

	exchangeWorkspace.style.height = ''
	exchangeWorkspace.style.overflow = ''
	exchangeWorkspace.style.transition = ''
	exchangeWorkspace.style.willChange = ''
	setMonthTransitionState(false)
}

function renderTableContent() {
	renderTable({ skipAnimationReset: true })
}

function animateWorkspaceHeight(renderContent) {
	if (!exchangeWorkspace || prefersReducedMotion()) {
		renderContent()
		return
	}

	window.clearTimeout(workspaceHeightAnimationFallbackId)
	resetWorkspaceHeightAnimation()

	const startHeight = exchangeWorkspace.getBoundingClientRect().height

	setMonthTransitionState(true)
	exchangeWorkspace.style.height = `${startHeight}px`
	exchangeWorkspace.style.overflow = 'hidden'
	exchangeWorkspace.style.transition = 'none'
	exchangeWorkspace.style.willChange = 'height'

	renderContent()

	exchangeWorkspace.style.height = 'auto'
	const endHeight = exchangeWorkspace.getBoundingClientRect().height
	exchangeWorkspace.style.height = `${startHeight}px`
	void exchangeWorkspace.offsetHeight

	if (Math.abs(endHeight - startHeight) < 2) {
		resetWorkspaceHeightAnimation()
		return
	}

	const finishAnimation = event => {
		if (event && event.propertyName !== 'height') return

		exchangeWorkspace.removeEventListener('transitionend', finishAnimation)
		window.clearTimeout(workspaceHeightAnimationFallbackId)
		resetWorkspaceHeightAnimation()
	}

	exchangeWorkspace.addEventListener('transitionend', finishAnimation)
	workspaceHeightAnimationFallbackId = scheduleTimeout(() => finishAnimation(), 460)

	requestAnimationFrame(() => {
		exchangeWorkspace.style.transition = 'height 360ms cubic-bezier(0.22, 1, 0.36, 1)'
		exchangeWorkspace.style.height = `${endHeight}px`
	})
}
/* === Exchanges View Helpers: End === */

/* === Exchanges Drawer: Start === */
function resetFormState() {
	editIndex = null

	if (exchangeForm) {
		exchangeForm.reset()
	}

	document.querySelectorAll('.accessory-item').forEach(item => {
		item.classList.remove('active', 'is-tapped')
	})

	if (drawerTitle) {
		drawerTitle.textContent = 'Zaplanuj nową wymianę'
	}

	if (drawerCopy) {
		drawerCopy.textContent = 'Uzupełnij dane pracownika, sprzętu i zapisz plan na wybrany miesiąc.'
	}

	if (submitBtn) {
		submitBtn.classList.remove('btn-submit-primary')
		submitBtn.classList.add('btn-submit-warning')
		submitBtn.innerHTML = '<i class="app-icon calendar-check-solid-full"></i> Zatwierdź i zaplanuj'
	}
	captureDrawerSnapshot()
}

function openDrawer() {
	if (!drawerShell) return

	drawerShell.classList.add('is-open')
	drawerShell.setAttribute('aria-hidden', 'false')
	document.body.classList.add('exchange-drawer-open')

	const firstField = document.getElementById('emp-name')
	scheduleTimeout(() => firstField?.focus(), 80)
}

async function closeDrawer({ force = false } = {}) {
	if (!drawerShell) return false

	if (!force && hasDrawerFormChanges()) {
		const shouldClose = await AppUtils.confirmDialog({
			title: 'Niezapisane zmiany',
			message: 'Zamknąć panel? Niezapisane zmiany zostaną utracone.',
		})
		if (!shouldClose) return false
	}

	drawerShell.classList.remove('is-open')
	drawerShell.setAttribute('aria-hidden', 'true')
	document.body.classList.remove('exchange-drawer-open')
	resetFormState()
	return true
}

function startCreateFlow() {
	if (!requireAuthenticatedAction()) return
	resetFormState()
	openDrawer()
}

function startEditFlow(index) {
	if (!requireAuthenticatedAction()) return
	const exchange = exchanges[index]
	if (!exchange) return

	resetFormState()
	editIndex = index

	document.getElementById('emp-name').value = exchange.name || ''
	document.getElementById('exchange-date').value = AppUtils.normalizeSpreadsheetDate(exchange.plannedDate) || ''
	document.getElementById('old-sn').value = exchange.oldSn || ''
	document.getElementById('new-sn').value = exchange.newSn || ''
	document.getElementById('notes').value = exchange.notes || ''

	document.querySelectorAll('.accessory-item').forEach(item => {
		const itemName = item.dataset.item
		item.classList.toggle('active', exchange.accessories && exchange.accessories.includes(itemName))
	})

	if (drawerTitle) {
		drawerTitle.textContent = 'Edytuj wymianę'
	}

	if (drawerCopy) {
		drawerCopy.textContent = 'Zmień dane planu, zapisz poprawki i zostań w bieżącym widoku tabeli.'
	}

	if (submitBtn) {
		submitBtn.classList.remove('btn-submit-warning')
		submitBtn.classList.add('btn-submit-primary')
		submitBtn.innerHTML = '<i class="app-icon floppy-disk-solid-full"></i> Zapisz zmiany'
	}

	monthPicker.setCurrentDate(AppUtils.parseDate(exchange.plannedDate) || new Date(), { render: false })
	renderTable()
	captureDrawerSnapshot()
	openDrawer()
}
/* === Exchanges Drawer: End === */

/* === Exchanges Table Rendering: Start === */
function renderTable({ animateContainer = false, skipAnimationReset = false } = {}) {
	if (!tableBody) return
	const guestMode = !isAuthenticated()

	if (animateContainer) {
		animateWorkspaceHeight(renderTableContent)
		return
	}

	if (!skipAnimationReset) {
		window.clearTimeout(workspaceHeightAnimationFallbackId)
		resetWorkspaceHeightAnimation()
	}

	tableBody.innerHTML = ''
	monthPicker.refreshView()

	const { monthLabel } = getCurrentMonthContext()
	const monthExchanges = getCurrentMonthExchanges()
	const filteredExchanges = getVisibleExchanges()
	updateMonthSummary({
		visibleCount: filteredExchanges.length,
		monthCount: monthExchanges.length,
		totalCount: exchanges.length,
		monthLabel,
	})

	if (filteredExchanges.length === 0) {
		if (searchQuery.trim()) {
			tableBody.innerHTML =
				'<tr><td colspan="7" class="empty-state-cell">Brak wyników wyszukiwania na stronie wymiany sprzętu.<br><small>Sprawdź pracownika, datę lub numery SN widoczne w tej tabeli.</small></td></tr>'
			return
		}

		if (monthExchanges.length === 0) {
			const hiddenCount = exchanges.length
			tableBody.innerHTML = `<tr><td colspan="7" class="empty-state-cell">Brak planowanych wymian w tym miesiącu.${
				hiddenCount > 0 ? `<br><small>W bazie jest jeszcze ${hiddenCount} rekordów, ale eksport Excel działa dla wybranego miesiąca: ${monthLabel}.</small>` : ''
			}</td></tr>`
			return
		}
	}

	filteredExchanges.forEach(exchange => {
		const originalIndex = exchanges.findIndex(original => original === exchange)
		const isDone = exchange.status === 'done'
		const row = document.createElement('tr')

		if (isDone) {
			row.classList.add('is-done')
		}

		const infoHtml =
			exchange.notes && exchange.notes.trim() !== ''
				? `<div class="notes-tooltip-container">
						<i class="app-icon circle-info-solid-full notes-icon"></i>
						<span class="notes-tooltip-text">${exchange.notes}</span>
					</div>`
				: '<span class="exchange-info-placeholder">-</span>'

		const accessoriesHtml = AppUtils.renderAccessoryIcons(exchange.accessories, {
			size: '1rem',
			maxVisible: 9,
			columns: 3,
			wrapperClass: 'inline-accessories accessories-table',
		})

		row.innerHTML = `
			<td class="col-info-narrow">
				<div class="td-info-center">${infoHtml}</div>
			</td>
			<td class="col-worker">
				<div class="exchange-worker-wrap">
					<span class="worker-name">${exchange.name}</span>
					${isDone ? '<span class="exchange-state-badge">Zakończona</span>' : ''}
				</div>
				${AppUtils.buildAuditMarkup(exchange)}
			</td>
			<td class="col-date">
				<span class="date-text">${exchange.plannedDate}</span>
			</td>
			<td class="col-laptop">
				<span class="sn-badge out">${exchange.oldSn ? `RU: ${exchange.oldSn}` : 'Brak zwrotu'}</span>
			</td>
			<td class="col-laptop">
				<span class="sn-badge in">${exchange.newSn ? `RU: ${exchange.newSn}` : 'Brak wydania'}</span>
			</td>
			<td class="col-acc">${accessoriesHtml}</td>
			<td class="col-actions">
				<div class="action-wrapper">
					${
						!isDone
							? `<button class="icon-button exchange-action-btn exchange-action-btn-complete" type="button" data-action="complete" data-index="${originalIndex}" aria-label="Finalizuj wymianę" title="${guestMode ? 'Zaloguj się, aby finalizować wymiany' : 'Finalizuj wymianę'}" ${guestMode ? 'disabled' : ''}>
								<i class="app-icon check-solid-full"></i>
							</button>`
							: ''
					}
					<button class="icon-button exchange-action-btn" type="button" data-action="edit" data-index="${originalIndex}" aria-label="Edytuj wymianę" title="${guestMode ? 'Zaloguj się, aby edytować wymiany' : 'Edytuj wymianę'}" ${guestMode ? 'disabled' : ''}>
						<i class="app-icon pen-solid-full"></i>
					</button>
					<button class="icon-button exchange-action-btn exchange-action-btn-danger" type="button" data-action="delete" data-index="${originalIndex}" aria-label="Usuń wymianę" title="${guestMode ? 'Zaloguj się, aby usuwać wymiany' : 'Usuń wymianę'}" ${guestMode ? 'disabled' : ''}>
						<i class="app-icon trash-solid-full"></i>
					</button>
				</div>
			</td>
		`

		tableBody.appendChild(row)
	})
}
/* === Exchanges Table Rendering: End === */

/* === Exchanges Actions: Start === */
async function completeExchange(index) {
	if (!requireAuthenticatedAction()) return
	const exchange = exchanges[index]
	if (!exchange || exchange.status === 'done') return
	if (
		!(
			await AppUtils.confirmDialog({
				title: 'Finalizacja wymiany',
				message: `Sfinalizować wymianę dla: ${exchange.name}?`,
			})
		)
	)
		return

	let monitorData = monitorService?.getAll?.() || []
	const actor = AppUtils.auth.getAuditActorSnapshot()
	const now = new Date().toISOString()

	if (exchange.oldSn) {
		const cleanOldSn = AppUtils.normalizeSN(exchange.oldSn)
		monitorData = monitorData.filter(device => AppUtils.normalizeSN(device.sn) !== cleanOldSn)
	}

	if (exchange.newSn) {
		const cleanNewSn = AppUtils.normalizeSN(exchange.newSn)
		monitorData = monitorData.filter(device => AppUtils.normalizeSN(device.sn) !== cleanNewSn)
		const newDate = new Date()
		newDate.setDate(newDate.getDate() + 60)

		monitorData.push({
			name: exchange.name,
			ru: 'WYMIANA',
			sn: cleanNewSn.toUpperCase(),
			date: AppUtils.formatDate(newDate),
			createdBy: actor,
			updatedBy: actor,
			createdAt: now,
			updatedAt: now,
		})
	}

	monitorService?.saveAll?.(monitorData)
	exchanges[index].status = 'done'
	exchanges[index].updatedBy = actor
	exchanges[index].updatedAt = now
	saveData()
}

async function removeItem(index) {
	if (!requireAuthenticatedAction()) return
	if (
		!(
			await AppUtils.confirmDialog({
				title: 'Usuwanie wpisu',
				message: 'Usunąć ten wpis?',
			})
		)
	)
		return

	if (editIndex === index) {
		await closeDrawer({ force: true })
	} else if (editIndex !== null && editIndex > index) {
		editIndex -= 1
	}

	exchanges.splice(index, 1)
	saveData()
}
/* === Exchanges Actions: End === */

/* === Exchanges Excel Backup: Start === */
function exportExcel() {
	const { monthKey, monthLabel } = getCurrentMonthContext()
	const exchangesToExport = getCurrentMonthExchanges()

	if (exchangesToExport.length === 0) {
		AppUtils.notify({
			type: 'warning',
			title: 'Brak danych do eksportu',
			message: `Nic nie wylądowało w eksporcie za ${monthLabel}. Ten miesiąc jest czysty, więc plik nie został pobrany.`,
		})
		return
	}

	const data = exchangesToExport.map(exchange => ({
		Pracownik: exchange.name,
		Data: exchange.plannedDate,
		'Stary SN': exchange.oldSn,
		'Nowy SN': exchange.newSn,
		Akcesoria: (exchange.accessories || []).join(', '),
		Status: exchange.status === 'done' ? 'Zakończono' : 'Planowana',
	}))

	const worksheet = XLSX.utils.json_to_sheet(data)
	const workbook = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Wymiany')
	XLSX.writeFile(workbook, `wymiany_${monthKey}.xlsx`)
}

function importExcel(event) {
	if (!requireAuthenticatedAction('Musisz byc zalogowany, aby importowac plan wymian.')) {
		if (event?.target) event.target.value = ''
		return
	}

	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = async loadEvent => {
		try {
			const data = new Uint8Array(loadEvent.target.result)
			const workbook = XLSX.read(data, { type: 'array' })
			const worksheet = workbook.Sheets[workbook.SheetNames[0]]
			const jsonData = XLSX.utils.sheet_to_json(worksheet)

			const actor = AppUtils.auth.getAuditActorSnapshot()
			const importedAt = new Date().toISOString()
			let skippedCount = 0
			const imported = jsonData
				.map(row => ({
					name: (row.Pracownik || row.Użytkownik || '').toString().toUpperCase(),
					plannedDate:
						AppUtils.normalizeSpreadsheetDate(row.Data || row['Data planowanej wymiany']) || AppUtils.formatDate(new Date()),
					oldSn: AppUtils.normalizeSN(row['Stary SN'] || row['SN do zwrotu'] || ''),
					newSn: AppUtils.normalizeSN(row['Nowy SN'] || row['SN do wydania'] || ''),
					accessories: AppUtils.normalizeAccessories(row.Akcesoria ? row.Akcesoria.split(',') : []),
					notes: row.Uwagi || '',
					status: row.Status === 'Zakończono' ? 'done' : 'pending',
					createdBy: actor,
					updatedBy: actor,
					createdAt: importedAt,
					updatedAt: importedAt,
				}))
				.filter(exchange => {
					const isValid = Boolean(exchange.name && exchange.plannedDate)
					if (!isValid) {
						skippedCount += 1
					}
					return isValid
				})
			const existingKeys = new Set(exchanges.map(getExchangeDuplicateKey).filter(Boolean))
			const importedKeys = new Set()
			const importedUnique = imported.filter(exchange => {
				const key = getExchangeDuplicateKey(exchange)
				if (!key) return true
				if (existingKeys.has(key) || importedKeys.has(key)) {
					skippedCount += 1
					return false
				}

				importedKeys.add(key)
				return true
			})

			if (importedUnique.length === 0) {
				AppUtils.notify({
					type: 'warning',
					title: 'Brak nowych wymian',
					message:
						skippedCount > 0
							? 'Wszystkie rekordy z importu już istnieją, powtarzają się w pliku albo są niepełne.'
							: 'Plik nie zawiera poprawnych, nowych rekordów do dodania.',
				})
				event.target.value = ''
				return
			}

			if (
				importedUnique.length > 0 &&
				(await AppUtils.confirmDialog({
					title: 'Import wymian',
					message:
						skippedCount > 0
							? `Zaimportować ${importedUnique.length} rekordów? Pominę ${skippedCount} duplikatów lub niepełnych wierszy.`
							: `Zaimportować ${importedUnique.length} rekordów?`,
				}))
			) {
				exchanges = [...exchanges, ...importedUnique]
				saveData()
				AppUtils.notify({
					type: 'success',
					title: 'Import zakończony',
					message: 'Nowe rekordy wymian zostały dodane do lokalnej bazy danych.',
				})
			}
		} catch (error) {
			AppUtils.notify({
				type: 'error',
				title: 'Błąd importu',
				message: 'Nie udało się odczytać pliku Excel dla wymian.',
			})
		}

		event.target.value = ''
	}

	reader.readAsArrayBuffer(file)
}
/* === Exchanges Excel Backup: End === */

/* === Exchanges Init: Start === */
runWhenReady(() => {
	monthPicker.init()
	resetFormState()

	document.querySelectorAll('[data-month-delta]').forEach(button => {
		listen(button, 'click', () => {
			monthPicker.changeMonth(Number(button.dataset.monthDelta))
		})
	})

	if (accessoryPicker) {
		listen(accessoryPicker, 'click', event => {
			const item = event.target.closest('.accessory-item')
			if (!item) return
			if (!requireAuthenticatedAction()) return

			item.classList.toggle('active')
			item.classList.add('is-tapped')
			scheduleTimeout(() => {
				item.classList.remove('is-tapped')
			}, 100)
		})
	}

	if (tableBody) {
		listen(tableBody, 'click', event => {
			const actionButton = event.target.closest('[data-action]')
			if (!actionButton) return
			if (!requireAuthenticatedAction()) return

			const index = Number(actionButton.dataset.index)
			const action = actionButton.dataset.action

			if (action === 'complete') void completeExchange(index)
			if (action === 'edit') startEditFlow(index)
			if (action === 'delete') void removeItem(index)
		})
	}

	if (openDrawerBtn) {
		listen(openDrawerBtn, 'click', startCreateFlow)
	}

	if (closeDrawerBtn) {
		listen(closeDrawerBtn, 'click', () => void closeDrawer())
	}

	if (cancelEditBtn) {
		listen(cancelEditBtn, 'click', () => void closeDrawer())
	}

	if (drawerBackdrop) {
		listen(drawerBackdrop, 'click', () => void closeDrawer())
	}

	listen(window, 'keydown', event => {
		if (event.key === 'Escape' && searchController.isOpen()) {
			searchController.close()
			return
		}

		if (event.key === 'Escape' && drawerShell?.classList.contains('is-open')) {
			void closeDrawer()
		}
	})

	if (exchangeForm) {
		listen(exchangeForm, 'submit', async event => {
			event.preventDefault()
			if (!requireAuthenticatedAction()) return

			const actor = AppUtils.auth.getAuditActorSnapshot()
			const now = new Date().toISOString()
			const exchangeData = {
				name: document.getElementById('emp-name').value.toUpperCase(),
				plannedDate: document.getElementById('exchange-date').value,
				oldSn: AppUtils.normalizeSN(document.getElementById('old-sn').value),
				newSn: AppUtils.normalizeSN(document.getElementById('new-sn').value),
				notes: document.getElementById('notes').value.trim(),
				accessories: AppUtils.getSelectedAccessories(),
				status: editIndex !== null ? exchanges[editIndex].status : 'pending',
				createdBy: editIndex !== null ? exchanges[editIndex].createdBy || null : actor,
				updatedBy: actor,
				createdAt: editIndex !== null ? exchanges[editIndex].createdAt || '' : now,
				updatedAt: now,
			}
			const duplicateKey = getExchangeDuplicateKey(exchangeData)
			const duplicateIndex = exchanges.findIndex(
				(exchange, index) => index !== editIndex && getExchangeDuplicateKey(exchange) === duplicateKey
			)

			if (duplicateKey && duplicateIndex !== -1) {
				AppUtils.notify({
					type: 'warning',
					title: 'Duplikat wymiany',
					message: 'Taka wymiana już istnieje. Zmień dane albo edytuj istniejący wpis.',
				})
				return
			}

			if (editIndex !== null) {
				exchanges[editIndex] = {
					...exchanges[editIndex],
					...exchangeData,
				}
			} else {
				exchanges.push(exchangeData)
			}

			monthPicker.setCurrentDate(AppUtils.parseDate(exchangeData.plannedDate) || new Date(), { render: false })
			saveData()
			await closeDrawer({ force: true })
		})
	}

	if (exportExcelBtn) listen(exportExcelBtn, 'click', exportExcel)
	if (importExcelTrigger && importExcelInput) {
		listen(importExcelTrigger, 'click', () => {
			if (!requireAuthenticatedAction('Musisz byc zalogowany, aby importowac plan wymian.')) return
			importExcelInput.click()
		})
		listen(importExcelInput, 'change', importExcel)
	}

	if (searchInput) {
		listen(searchInput, 'input', event => {
			searchQuery = event.target.value || ''
			renderTable()
		})
	}

	if (searchToggleBtn) {
		listen(searchToggleBtn, 'click', searchController.toggle)
	}

	listen(document, 'app-auth-changed', () => {
		syncProtectedUi()
		renderTable()
	})

	loadData()
	syncProtectedUi()
})
/* === Exchanges Init: End === */
})()
