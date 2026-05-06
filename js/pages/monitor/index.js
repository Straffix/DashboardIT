(function initializeMonitorPage() {
/* === Monitor State And References: Start === */
let devices = []
let editingDeviceIndex = null
let drawerInitialState = ''
let searchQuery = ''
const monitorService = window.AppServices?.monitorService

const deviceForm = document.getElementById('device-form')
const tableBody = document.getElementById('table-body')
const nameInput = document.getElementById('name')
const newRadio = document.getElementById('new-device')
const oldRadio = document.getElementById('old-device')
const dateGroup = document.getElementById('date-group')
const dateInput = document.getElementById('date')
const ruInput = document.getElementById('ru')
const snInput = document.getElementById('sn')
const exportExcelBtn = document.getElementById('export-excel-btn')
const importExcelInput = document.getElementById('importExcelFile')
const importExcelTrigger = document.getElementById('import-excel-trigger')
const openDrawerBtn = document.getElementById('open-monitor-drawer')
const closeDrawerBtn = document.getElementById('close-monitor-drawer')
const cancelDrawerBtn = document.getElementById('cancel-monitor-drawer')
const workspaceActions = document.querySelector('.workspace-actions')
const drawerShell = document.getElementById('monitor-drawer-shell')
const drawerBackdrop = document.getElementById('monitor-drawer-backdrop')
const summary = document.getElementById('monitor-summary')
const drawerTitle = document.getElementById('monitor-drawer-title')
const drawerCopy = document.getElementById('monitor-drawer-copy')
const drawerSubmitBtn = deviceForm?.querySelector('button[type="submit"]')
const searchToggleBtn = document.getElementById('monitor-search-toggle')
const searchPanel = document.getElementById('monitor-search-panel')
const searchInput = document.getElementById('monitor-search-input')
const isAuthenticated = () => Boolean(AppUtils.auth?.isAuthenticated?.())

function requireAuthenticatedAction(message = 'Musisz byc zalogowany, aby modyfikowac urzadzenia w domenie.') {
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
			? '<i class="app-icon right-to-bracket-solid-full"></i><span>Zaloguj się, aby dodawać</span>'
			: '<i class="app-icon plus-solid-full"></i><span>Dodaj urządzenie</span>'
	}

	if (importExcelTrigger) {
		importExcelTrigger.innerHTML = guestMode
			? '<i class="app-icon lock-solid-full"></i><span>Import po zalogowaniu</span>'
			: '<i class="app-icon file-import-solid-full"></i><span>Import Excel</span>'
	}

	deviceForm
		?.querySelectorAll('input, textarea, select, button[type="submit"]')
		.forEach(control => {
			control.disabled = guestMode
		})

	if (guestMode && drawerShell?.classList.contains('is-open')) {
		void closeDrawer({ force: true })
	}
}

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
/* === Monitor State And References: End === */

/* === Monitor Storage: Start === */
function loadData() {
	const parsedDevices = monitorService?.getAll?.() || []
	let hasUpdates = false

	const normalizedDevices = parsedDevices.map(device => {
		const normalizedDate = AppUtils.normalizeSpreadsheetDate(device.date)
		const normalizedLastExtendedOn = AppUtils.formatDate(device.lastExtendedOn)
		const nextDate = normalizedDate || device.date || ''
		const nextLastExtendedOn = normalizedLastExtendedOn || ''
		const normalizedAudit = AppUtils.normalizeAuditFields(device)

		if (
			nextDate !== (device.date || '') ||
			nextLastExtendedOn !== (device.lastExtendedOn || '') ||
			normalizedAudit.updatedBy !== (device.updatedBy || device.createdBy || null) ||
			normalizedAudit.createdAt !== (device.createdAt || '') ||
			normalizedAudit.updatedAt !== (device.updatedAt || device.createdAt || '')
		) {
			hasUpdates = true
		}

		return {
			...device,
			date: nextDate,
			lastExtendedOn: nextLastExtendedOn,
			...normalizedAudit,
		}
	})

	const { records: deduplicatedDevices, removedCount } = dedupeDevices(normalizedDevices)
	if (removedCount > 0) {
		hasUpdates = true
	}

	devices = deduplicatedDevices

	if (hasUpdates) {
		monitorService?.saveAll?.(devices)
	}

	renderTable()
}

function saveData() {
	monitorService?.saveAll?.(devices)
	renderTable()
}
/* === Monitor Storage: End === */

/* === Monitor Helpers: Start === */
function getDeviceDuplicateKey(device) {
	const ru = String(device?.ru || '').trim()
	const sn = AppUtils.normalizeSN(device?.sn || '')
	if (!ru || !sn) return ''
	return `${ru}::${sn}`
}

function dedupeDevices(records) {
	const seenKeys = new Set()
	const deduplicatedRecords = []
	let removedCount = 0

	records.forEach(record => {
		const key = getDeviceDuplicateKey(record)
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

function getTodayDate() {
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return today
}

function getTodayDateString() {
	return AppUtils.formatDate(getTodayDate())
}

function getDefaultDomainDate() {
	const defaultDate = getTodayDate()
	defaultDate.setDate(defaultDate.getDate() + 60)
	return AppUtils.formatDate(defaultDate)
}

function getFormState() {
	return {
		name: (nameInput?.value || '').trim().toUpperCase(),
		ru: (ruInput?.value || '').trim(),
		sn: AppUtils.normalizeSN(snInput?.value || ''),
		deviceType: oldRadio?.checked ? 'old' : 'new',
		date: dateInput?.value || '',
	}
}

function captureDrawerSnapshot() {
	drawerInitialState = JSON.stringify(getFormState())
}

function setDrawerMode(mode = 'create') {
	const isEditMode = mode === 'edit'

	if (drawerTitle) {
		drawerTitle.textContent = isEditMode ? 'Edytuj urządzenie' : 'Dodaj urządzenie'
	}

	if (drawerCopy) {
		drawerCopy.textContent = isEditMode
			? 'Zaktualizuj dane istniejącego wpisu w monitoringu domeny.'
			: 'Dodaj nowy laptop do monitoringu domeny i od razu ustaw jego status.'
	}

	if (drawerSubmitBtn) {
		drawerSubmitBtn.textContent = isEditMode ? 'Zapisz zmiany' : 'Dodaj urządzenie'
	}
}

async function canStartDrawerFlow() {
	return !drawerShell?.classList.contains('is-open') || (await closeDrawer())
}
/* === Monitor Helpers: End === */

/* === Monitor Confirm: Start === */
function closeMonitorConfirm(result = false) {
	return result
}

function openMonitorConfirm({
	title = 'Wykonać akcję?',
	message = 'Czy na pewno chcesz kontynuować?',
	confirmLabel = 'TAK',
	cancelLabel = 'NIE',
} = {}) {
	return AppUtils.confirmDialog({ title, message, confirmLabel, cancelLabel })
}
/* === Monitor Confirm: End === */

/* === Monitor Drawer: Start === */
function hasDrawerFormChanges() {
	return Boolean(deviceForm) && JSON.stringify(getFormState()) !== drawerInitialState
}

function resetFormState() {
	if (deviceForm) {
		deviceForm.reset()
	}

	editingDeviceIndex = null

	if (newRadio) {
		newRadio.checked = true
	}

	setDrawerMode('create')
	toggleDateInput()
	captureDrawerSnapshot()
}

function openDrawer() {
	if (!drawerShell) return

	drawerShell.classList.add('is-open')
	drawerShell.setAttribute('aria-hidden', 'false')
	document.body.classList.add('monitor-drawer-open')

	window.setTimeout(() => nameInput?.focus(), 80)
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
	document.body.classList.remove('monitor-drawer-open')
	resetFormState()
	return true
}

async function startCreateFlow() {
	if (!requireAuthenticatedAction()) return
	if (!(await canStartDrawerFlow())) return

	resetFormState()
	openDrawer()
}

async function startEditFlow(index) {
	if (!requireAuthenticatedAction()) return
	const device = devices[index]
	if (!device || !(await canStartDrawerFlow())) return

	resetFormState()
	editingDeviceIndex = index
	setDrawerMode('edit')

	if (nameInput) {
		nameInput.value = (device.name || '').toUpperCase()
	}

	if (ruInput) {
		ruInput.value = device.ru || ''
	}

	if (snInput) {
		snInput.value = (device.sn || '').toUpperCase()
	}

	if (oldRadio) {
		oldRadio.checked = true
	}

	toggleDateInput()

	if (dateInput) {
		dateInput.value = AppUtils.formatDate(device.date) || ''
	}

	captureDrawerSnapshot()
	openDrawer()
}
/* === Monitor Drawer: End === */

/* === Monitor Excel Backup: Start === */
function exportExcel() {
	if (devices.length === 0) {
		AppUtils.notify({
			type: 'warning',
			title: 'Brak danych do eksportu',
			message: 'Dodaj urządzenie albo zaimportuj plik, a backup ruszy od razu.',
		})
		return
	}

	const dataToExport = devices.map(device => ({
		'Nazwa użytkownika': device.name,
		'Dział / RU': device.ru,
		'Numer Seryjny': device.sn,
		'Data ważności domeny': device.date,
	}))
	const worksheet = XLSX.utils.json_to_sheet(dataToExport)
	const workbook = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Urządzenia')
	XLSX.writeFile(workbook, `monitor_laptopow_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function importExcel(event) {
	if (!requireAuthenticatedAction('Musisz byc zalogowany, aby importowac dane urzadzen.')) {
		if (event?.target) event.target.value = ''
		return
	}

	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = async loadEvent => {
		const data = new Uint8Array(loadEvent.target.result)
		const workbook = XLSX.read(data, { type: 'array' })
		const worksheet = workbook.Sheets[workbook.SheetNames[0]]
		const jsonData = XLSX.utils.sheet_to_json(worksheet)

		const actor = AppUtils.auth.getAuditActorSnapshot()
		const importedAt = new Date().toISOString()
		let skippedCount = 0
		const imported = jsonData
			.map(row => ({
				name: (row['Nazwa użytkownika'] || '').toString().toUpperCase(),
				ru: row['Dział / RU'] || '',
				sn: AppUtils.normalizeSN(row['Numer Seryjny']),
				createdBy: actor,
				updatedBy: actor,
				createdAt: importedAt,
				updatedAt: importedAt,
				date: AppUtils.normalizeSpreadsheetDate(row['Data ważności domeny']) || '',
			}))
			.filter(device => {
				const isValid = Boolean(device.name && device.ru && device.sn)
				if (!isValid) {
					skippedCount += 1
				}
				return isValid
			})
		const existingKeys = new Set(devices.map(getDeviceDuplicateKey).filter(Boolean))
		const importedKeys = new Set()
		const importedUnique = imported.filter(device => {
			const key = getDeviceDuplicateKey(device)
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
				title: 'Brak nowych urządzeń',
				message:
					skippedCount > 0
						? 'Wszystkie rekordy z importu już istnieją, powtarzają się w pliku albo są niepełne.'
						: 'Plik nie zawiera poprawnych, nowych rekordów do dodania.',
			})
			event.target.value = ''
			return
		}

		const shouldImport = await AppUtils.confirmDialog({
			title: 'Import urządzeń',
			message:
				skippedCount > 0
					? `Zaimportować ${importedUnique.length} urządzeń z Excela? Pominę ${skippedCount} duplikatów lub niepełnych wierszy.`
					: `Zaimportować ${importedUnique.length} urządzeń z Excela?`,
		})

		if (shouldImport) {
			devices = [...devices, ...importedUnique]
			saveData()
		}

		event.target.value = ''
	}

	reader.readAsArrayBuffer(file)
}
/* === Monitor Excel Backup: End === */

/* === Monitor Device Actions: Start === */
function findDuplicate(ru, sn, excludedIndex = -1) {
	const normalizedSn = AppUtils.normalizeSN(sn)
	return devices.findIndex((device, index) => index !== excludedIndex && device.ru === ru && AppUtils.normalizeSN(device.sn) === normalizedSn)
}

function getVisibleDevices() {
	return devices.filter(device =>
		AppUtils.matchesSearchQuery([(device.name || '').toUpperCase(), device.ru || '', device.sn || '', device.date || ''], searchQuery)
	)
}

async function extendDomain(index, { skipSameDayConfirmation = false } = {}) {
	if (!requireAuthenticatedAction()) return
	const device = devices[index]
	if (!device) return

	const today = getTodayDate()
	const todayString = getTodayDateString()

	if (!skipSameDayConfirmation && device.lastExtendedOn === todayString) {
		const shouldExtendAgain = await AppUtils.confirmDialog({
			title: 'Ponowne przedłużenie',
			message: 'Czy na pewno chcesz PONOWNIE przedłużyć okres urządzenia w domenie?',
			confirmLabel: 'TAK',
			cancelLabel: 'NIE',
		})
		if (!shouldExtendAgain) return
	}

	const currentExpiry = AppUtils.parseDate(device.date)
	const baseDate = !currentExpiry || currentExpiry < today ? today : new Date(currentExpiry)
	baseDate.setDate(baseDate.getDate() + 60)

	devices[index].date = AppUtils.formatDate(baseDate)
	devices[index].lastExtendedOn = todayString
	devices[index].updatedBy = AppUtils.auth.getAuditActorSnapshot()
	devices[index].updatedAt = new Date().toISOString()
	saveData()
}

async function removeItem(index) {
	if (!requireAuthenticatedAction()) return
	if (
		!(
			await AppUtils.confirmDialog({
				title: 'Usuwanie urządzenia',
				message: 'Usunąć urządzenie z listy?',
			})
		)
	)
		return

	devices.splice(index, 1)
	saveData()
}
/* === Monitor Device Actions: End === */

/* === Monitor Table Rendering: Start === */
function updateSummary(stats, totalCount = stats.all) {
	if (!summary) return

	if (totalCount === 0) {
		summary.textContent = 'Baza jest pusta, dodaj pierwsze urządzenie do monitoringu domeny.'
		return
	}

	if (searchQuery.trim()) {
		if (stats.all === 0) {
			summary.textContent = 'Brak wyników wyszukiwania. Szukaj po nazwie, RU, numerze SN lub dacie z tej tabeli.'
			return
		}

		summary.textContent = `Wyniki wyszukiwania: ${stats.all} z ${totalCount} urządzeń · aktywne: ${stats.ok} · wygasające: ${stats.warn} · wypadły: ${stats.dead}.`
		return
	}

	summary.textContent = `Wszystkie urządzenia: ${stats.all} · aktywne: ${stats.ok} · wygasające: ${stats.warn} · wypadły: ${stats.dead}.`
}

function renderTable() {
	if (!tableBody) return
	tableBody.innerHTML = ''

	const visibleDevices = getVisibleDevices()
	const guestMode = !isAuthenticated()
	const stats = { all: visibleDevices.length, ok: 0, warn: 0, dead: 0 }
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	if (visibleDevices.length === 0) {
		tableBody.innerHTML =
			devices.length === 0
				? '<tr><td colspan="5" class="empty-state-cell">Brak urządzeń w monitoringu. Dodaj pierwszy wpis albo zaimportuj plik Excel.</td></tr>'
				: '<tr><td colspan="5" class="empty-state-cell">Brak wyników wyszukiwania.<br><small>Sprawdź nazwę, RU, numer SN lub datę z tej tabeli.</small></td></tr>'
		updateSummary(stats, devices.length)
		const updateStat = (id, value) => {
			const element = document.getElementById(id)
			if (element) element.innerText = value
		}
		updateStat('stats-all', stats.all)
		updateStat('stats-active', stats.ok)
		updateStat('stats-warn', stats.warn)
		updateStat('stats-danger', stats.dead)
		return
	}

	visibleDevices.forEach(device => {
		const index = devices.findIndex(original => original === device)
		const expiryDate = AppUtils.parseDate(device.date)
		const diff = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : Number.NaN

		let statusClass = 'ok'
		let statusText = device.date || 'Brak daty'

		if (!expiryDate) {
			statusClass = 'near'
			stats.warn += 1
		} else if (diff < 0) {
			statusClass = 'expired'
			statusText = 'Wypadł z domeny'
			stats.dead += 1
		} else if (diff <= 14) {
			statusClass = 'near'
			statusText = AppUtils.formatDate(expiryDate)
			stats.warn += 1
		} else {
			statusText = AppUtils.formatDate(expiryDate)
			stats.ok += 1
		}

		const row = document.createElement('tr')
		row.innerHTML = `
			<td>
				<span class="monitor-name">${(device.name || '').toUpperCase()}</span>
				${AppUtils.buildAuditMarkup(device)}
			</td>
			<td>
				<span class="monitor-ru">${device.ru || '---'}</span>
			</td>
			<td>
				<span class="monitor-sn-badge">${(device.sn || '---').toUpperCase()}</span>
			</td>
			<td>
				<span class="status-pill ${statusClass}">${statusText}</span>
			</td>
			<td class="cell-center">
				<div class="monitor-actions">
					<button class="icon-button monitor-row-btn monitor-row-btn-extend" type="button" data-action="extend" data-index="${index}" aria-label="Przedłuż o 60 dni" title="${guestMode ? 'Zaloguj się, aby modyfikować urządzenia' : 'Przedłuż o 60 dni'}" ${guestMode ? 'disabled' : ''}>
						<i class="app-icon rotate-right-solid-full"></i>
					</button>
					<button class="icon-button monitor-row-btn monitor-row-btn-edit" type="button" data-action="edit" data-index="${index}" aria-label="Edytuj urządzenie" title="${guestMode ? 'Zaloguj się, aby edytować urządzenia' : 'Edytuj urządzenie'}" ${guestMode ? 'disabled' : ''}>
						<i class="app-icon pen-to-square-solid-full"></i>
					</button>
					<button class="icon-button monitor-row-btn monitor-row-btn-danger" type="button" data-action="delete" data-index="${index}" aria-label="Usuń urządzenie" title="${guestMode ? 'Zaloguj się, aby usuwać urządzenia' : 'Usuń urządzenie'}" ${guestMode ? 'disabled' : ''}>
						<i class="app-icon trash-solid-full"></i>
					</button>
				</div>
			</td>
		`
		tableBody.appendChild(row)
	})

	const updateStat = (id, value) => {
		const element = document.getElementById(id)
		if (element) element.innerText = value
	}

	updateStat('stats-all', stats.all)
	updateStat('stats-active', stats.ok)
	updateStat('stats-warn', stats.warn)
	updateStat('stats-danger', stats.dead)
	updateSummary(stats, devices.length)
}
/* === Monitor Table Rendering: End === */

/* === Monitor Form State: Start === */
function toggleDateInput() {
	if (!dateGroup || !dateInput) return

	const isNew = newRadio?.checked
	dateGroup.classList.toggle('is-hidden', isNew)
	dateInput.required = !isNew
	if (isNew) {
		dateInput.value = ''
	}
}
/* === Monitor Form State: End === */

/* === Monitor Init: Start === */
document.addEventListener('DOMContentLoaded', () => {
	resetFormState()

	if (ruInput) {
		ruInput.addEventListener('input', () => {
			ruInput.value = ruInput.value.replace(/[^0-9]/g, '')
		})
	}

	if (newRadio) newRadio.addEventListener('change', toggleDateInput)
	if (oldRadio) oldRadio.addEventListener('change', toggleDateInput)

	if (tableBody) {
		tableBody.addEventListener('click', event => {
			const actionButton = event.target.closest('[data-action]')
			if (!actionButton) return
			if (!requireAuthenticatedAction()) return

			const index = Number(actionButton.dataset.index)
			if (actionButton.dataset.action === 'extend') void extendDomain(index)
			if (actionButton.dataset.action === 'edit') void startEditFlow(index)
			if (actionButton.dataset.action === 'delete') void removeItem(index)
		})
	}

	if (openDrawerBtn) {
		openDrawerBtn.addEventListener('click', () => void startCreateFlow())
	}

	if (closeDrawerBtn) {
		closeDrawerBtn.addEventListener('click', () => void closeDrawer())
	}

	if (cancelDrawerBtn) {
		cancelDrawerBtn.addEventListener('click', () => void closeDrawer())
	}

	if (drawerBackdrop) {
		drawerBackdrop.addEventListener('click', () => void closeDrawer())
	}

	window.addEventListener('keydown', event => {
		if (event.key === 'Escape' && searchController.isOpen()) {
			searchController.close()
			return
		}

		if (event.key === 'Escape' && drawerShell?.classList.contains('is-open')) {
			void closeDrawer()
		}
	})

	if (deviceForm) {
		deviceForm.addEventListener('submit', async event => {
			event.preventDefault()
			if (!requireAuthenticatedAction()) return

			const isEditing = editingDeviceIndex !== null
			const name = (nameInput?.value || '').trim().toUpperCase()
			const ru = (ruInput?.value || '').trim()
			const sn = AppUtils.normalizeSN(snInput?.value || '')
			let date

			if (!name || !ru || !sn) {
				AppUtils.notify({
					type: 'warning',
					title: 'Brak wymaganych danych',
					message: 'Uzupełnij nazwę komputera, numer RU i numer SN.',
				})
				return
			}

			if (newRadio?.checked) {
				date = getDefaultDomainDate()
			} else {
				date = dateInput.value
				if (!date) {
					AppUtils.notify({
						type: 'warning',
						title: 'Brak daty',
						message: 'Wybierz datę dla starego urządzenia.',
					})
					return
				}
			}

			const duplicateIndex = findDuplicate(ru, sn, isEditing ? editingDeviceIndex : -1)
			if (duplicateIndex !== -1) {
				if (isEditing) {
					AppUtils.notify({
						type: 'error',
						title: 'Duplikat urządzenia',
						message: 'Inny rekord z takim samym numerem RU i SN już istnieje. Zmień dane albo usuń duplikat.',
					})
					return
				}

				if (
					await AppUtils.confirmDialog({
						title: 'Duplikat urządzenia',
						message: 'Urządzenie już istnieje. Odświeżyć wpis o 60 dni od dziś?',
					})
				) {
					await extendDomain(duplicateIndex, { skipSameDayConfirmation: true })
					await closeDrawer({ force: true })
				}
				return
			}

			const actor = AppUtils.auth.getAuditActorSnapshot()
			const now = new Date().toISOString()

			if (isEditing) {
				devices[editingDeviceIndex] = {
					...devices[editingDeviceIndex],
					name,
					ru,
					sn,
					date,
					updatedBy: actor,
					updatedAt: now,
				}
			} else {
				devices.push({
					name,
					ru,
					sn,
					date,
					lastExtendedOn: '',
					createdBy: actor,
					updatedBy: actor,
					createdAt: now,
					updatedAt: now,
				})
			}

			saveData()
			await closeDrawer({ force: true })
		})
	}

	if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportExcel)
	if (importExcelTrigger && importExcelInput) {
		importExcelTrigger.addEventListener('click', () => {
			if (!requireAuthenticatedAction('Musisz byc zalogowany, aby importowac dane urzadzen.')) return
			importExcelInput.click()
		})
		importExcelInput.addEventListener('change', importExcel)
	}

	if (searchInput) {
		searchInput.addEventListener('input', event => {
			searchQuery = event.target.value || ''
			renderTable()
		})
	}

	if (searchToggleBtn) {
		searchToggleBtn.addEventListener('click', searchController.toggle)
	}

	document.addEventListener('app-auth-changed', () => {
		syncProtectedUi()
		renderTable()
	})

	loadData()
	syncProtectedUi()
})
/* === Monitor Init: End === */
})()
