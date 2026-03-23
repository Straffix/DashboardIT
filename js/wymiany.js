/* === Exchanges State And References: Start === */
let exchanges = []
let editIndex = null
let drawerInitialState = ''
let searchQuery = ''
const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.EXCHANGES

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
/* === Exchanges State And References: End === */

/* === Exchanges Storage: Start === */
function loadData() {
	const saved = localStorage.getItem(STORAGE_KEY)
	const parsedExchanges = saved ? JSON.parse(saved) : []
	let hasUpdates = false

	exchanges = parsedExchanges.map(exchange => {
		const normalizedDate = AppUtils.normalizeSpreadsheetDate(exchange.plannedDate)
		if (normalizedDate && normalizedDate !== exchange.plannedDate) {
			hasUpdates = true
		}

		return {
			...exchange,
			plannedDate: normalizedDate || exchange.plannedDate || '',
		}
	})

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
		localStorage.setItem(STORAGE_KEY, JSON.stringify(exchanges))
	}

	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(exchanges))
	renderTable()
}
/* === Exchanges Storage: End === */

/* === Exchanges View Helpers: Start === */
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

function setSearchOpen(isOpen) {
	if (!searchPanel) return

	searchPanel.hidden = !isOpen
	workspaceActions?.classList.toggle('is-search-open', isOpen)
	searchToggleBtn?.setAttribute('aria-expanded', String(isOpen))

	if (isOpen) {
		window.setTimeout(() => searchInput?.focus(), 40)
	}
}

function closeSearch({ clearValue = true } = {}) {
	if (clearValue) {
		searchQuery = ''

		if (searchInput) {
			searchInput.value = ''
		}

		renderTable()
	}

	setSearchOpen(false)
}

function toggleSearch() {
	const isOpen = Boolean(searchPanel) && !searchPanel.hidden

	if (isOpen) {
		closeSearch()
		return
	}

	setSearchOpen(true)
}

function getSelectedAccessories() {
	return Array.from(document.querySelectorAll('.accessory-item.active')).map(item => item.dataset.item)
}

function getFormState() {
	return {
		name: (document.getElementById('emp-name')?.value || '').trim().toUpperCase(),
		plannedDate: document.getElementById('exchange-date')?.value || '',
		oldSn: AppUtils.normalizeSN(document.getElementById('old-sn')?.value || ''),
		newSn: AppUtils.normalizeSN(document.getElementById('new-sn')?.value || ''),
		notes: (document.getElementById('notes')?.value || '').trim(),
		accessories: getSelectedAccessories(),
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
	workspaceHeightAnimationFallbackId = window.setTimeout(() => finishAnimation(), 460)

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
		submitBtn.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Zatwierdź i zaplanuj'
	}
	captureDrawerSnapshot()
}

function openDrawer() {
	if (!drawerShell) return

	drawerShell.classList.add('is-open')
	drawerShell.setAttribute('aria-hidden', 'false')
	document.body.classList.add('exchange-drawer-open')

	const firstField = document.getElementById('emp-name')
	window.setTimeout(() => firstField?.focus(), 80)
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
	resetFormState()
	openDrawer()
}

function startEditFlow(index) {
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
		submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Zapisz zmiany'
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
						<i class="fas fa-info-circle notes-icon"></i>
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
							? `<button class="icon-button exchange-action-btn exchange-action-btn-complete" type="button" data-action="complete" data-index="${originalIndex}" aria-label="Finalizuj wymianę" title="Finalizuj wymianę">
								<i class="fas fa-check"></i>
							</button>`
							: ''
					}
					<button class="icon-button exchange-action-btn" type="button" data-action="edit" data-index="${originalIndex}" aria-label="Edytuj wymianę" title="Edytuj wymianę">
						<i class="fas fa-pen"></i>
					</button>
					<button class="icon-button exchange-action-btn exchange-action-btn-danger" type="button" data-action="delete" data-index="${originalIndex}" aria-label="Usuń wymianę" title="Usuń wymianę">
						<i class="fas fa-trash"></i>
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

	const monitorKey = AppUtils.config.STORAGE_KEYS.MONITOR
	let monitorData = JSON.parse(localStorage.getItem(monitorKey)) || []

	if (exchange.oldSn) {
		const cleanOldSn = AppUtils.normalizeSN(exchange.oldSn)
		monitorData = monitorData.filter(device => AppUtils.normalizeSN(device.sn) !== cleanOldSn)
	}

	if (exchange.newSn) {
		const newDate = new Date()
		newDate.setDate(newDate.getDate() + 60)

		monitorData.push({
			name: exchange.name,
			ru: 'WYMIANA',
			sn: AppUtils.normalizeSN(exchange.newSn).toUpperCase(),
			date: AppUtils.formatDate(newDate),
		})
	}

	localStorage.setItem(monitorKey, JSON.stringify(monitorData))
	exchanges[index].status = 'done'
	saveData()
}

async function removeItem(index) {
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
		alert(`Nic nie wyladowalo w eksporcie za ${monthLabel}. Ten miesiac jest czysty, wiec plik nie zostal pobrany.`)
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
	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = async loadEvent => {
		try {
			const data = new Uint8Array(loadEvent.target.result)
			const workbook = XLSX.read(data, { type: 'array' })
			const worksheet = workbook.Sheets[workbook.SheetNames[0]]
			const jsonData = XLSX.utils.sheet_to_json(worksheet)

			const imported = jsonData.map(row => ({
				name: (row.Pracownik || row.Użytkownik || '').toString().toUpperCase(),
				plannedDate:
					AppUtils.normalizeSpreadsheetDate(row.Data || row['Data planowanej wymiany']) || AppUtils.formatDate(new Date()),
				oldSn: AppUtils.normalizeSN(row['Stary SN'] || row['SN do zwrotu'] || ''),
				newSn: AppUtils.normalizeSN(row['Nowy SN'] || row['SN do wydania'] || ''),
				accessories: row.Akcesoria ? row.Akcesoria.split(',').map(item => item.trim()).filter(Boolean) : [],
				notes: row.Uwagi || '',
				status: row.Status === 'Zakończono' ? 'done' : 'pending',
				createdAt: new Date(),
			}))

			if (
				imported.length > 0 &&
				(await AppUtils.confirmDialog({
					title: 'Import wymian',
					message: `Zaimportować ${imported.length} rekordów?`,
				}))
			) {
				exchanges = [...exchanges, ...imported]
				saveData()
				alert('Import zakończony!')
			}
		} catch (error) {
			alert('Błąd importu pliku Excel.')
		}

		event.target.value = ''
	}

	reader.readAsArrayBuffer(file)
}
/* === Exchanges Excel Backup: End === */

/* === Exchanges Init: Start === */
document.addEventListener('DOMContentLoaded', () => {
	monthPicker.init()
	resetFormState()

	document.querySelectorAll('[data-month-delta]').forEach(button => {
		button.addEventListener('click', () => {
			monthPicker.changeMonth(Number(button.dataset.monthDelta))
		})
	})

	if (accessoryPicker) {
		accessoryPicker.addEventListener('click', event => {
			const item = event.target.closest('.accessory-item')
			if (!item) return

			item.classList.toggle('active')
			item.classList.add('is-tapped')
			setTimeout(() => {
				item.classList.remove('is-tapped')
			}, 100)
		})
	}

	if (tableBody) {
		tableBody.addEventListener('click', event => {
			const actionButton = event.target.closest('[data-action]')
			if (!actionButton) return

			const index = Number(actionButton.dataset.index)
			const action = actionButton.dataset.action

			if (action === 'complete') void completeExchange(index)
			if (action === 'edit') startEditFlow(index)
			if (action === 'delete') void removeItem(index)
		})
	}

	if (openDrawerBtn) {
		openDrawerBtn.addEventListener('click', startCreateFlow)
	}

	if (closeDrawerBtn) {
		closeDrawerBtn.addEventListener('click', () => void closeDrawer())
	}

	if (cancelEditBtn) {
		cancelEditBtn.addEventListener('click', () => void closeDrawer())
	}

	if (drawerBackdrop) {
		drawerBackdrop.addEventListener('click', () => void closeDrawer())
	}

	window.addEventListener('keydown', event => {
		if (event.key === 'Escape' && searchPanel && !searchPanel.hidden) {
			closeSearch()
			return
		}

		if (event.key === 'Escape' && drawerShell?.classList.contains('is-open')) {
			void closeDrawer()
		}
	})

	if (exchangeForm) {
		exchangeForm.addEventListener('submit', async event => {
			event.preventDefault()

			const exchangeData = {
				name: document.getElementById('emp-name').value.toUpperCase(),
				plannedDate: document.getElementById('exchange-date').value,
				oldSn: AppUtils.normalizeSN(document.getElementById('old-sn').value),
				newSn: AppUtils.normalizeSN(document.getElementById('new-sn').value),
				notes: document.getElementById('notes').value.trim(),
				accessories: getSelectedAccessories(),
				status: editIndex !== null ? exchanges[editIndex].status : 'pending',
				createdAt: editIndex !== null ? exchanges[editIndex].createdAt : new Date(),
			}

			if (editIndex !== null) {
				exchanges[editIndex] = exchangeData
			} else {
				exchanges.push(exchangeData)
			}

			monthPicker.setCurrentDate(AppUtils.parseDate(exchangeData.plannedDate) || new Date(), { render: false })
			saveData()
			await closeDrawer({ force: true })
		})
	}

	if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportExcel)
	if (importExcelTrigger && importExcelInput) {
		importExcelTrigger.addEventListener('click', () => importExcelInput.click())
		importExcelInput.addEventListener('change', importExcel)
	}

	if (searchInput) {
		searchInput.addEventListener('input', event => {
			searchQuery = event.target.value || ''
			renderTable()
		})
	}

	if (searchToggleBtn) {
		searchToggleBtn.addEventListener('click', toggleSearch)
	}

	loadData()
})
/* === Exchanges Init: End === */
