/* === Monitor State And References: Start === */
let devices = []
const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.MONITOR

const deviceForm = document.getElementById('device-form')
const tableBody = document.getElementById('table-body')
const newRadio = document.getElementById('new-device')
const oldRadio = document.getElementById('old-device')
const dateGroup = document.getElementById('date-group')
const dateInput = document.getElementById('date')
const ruInput = document.getElementById('ru')
const exportExcelBtn = document.getElementById('export-excel-btn')
const importExcelInput = document.getElementById('importExcelFile')
const importExcelTrigger = document.getElementById('import-excel-trigger')
const openDrawerBtn = document.getElementById('open-monitor-drawer')
const closeDrawerBtn = document.getElementById('close-monitor-drawer')
const cancelDrawerBtn = document.getElementById('cancel-monitor-drawer')
const drawerShell = document.getElementById('monitor-drawer-shell')
const drawerBackdrop = document.getElementById('monitor-drawer-backdrop')
const summary = document.getElementById('monitor-summary')
/* === Monitor State And References: End === */

/* === Monitor Storage: Start === */
function loadData() {
	const saved = localStorage.getItem(STORAGE_KEY)
	const parsedDevices = saved ? JSON.parse(saved) : []
	let hasUpdates = false

	devices = parsedDevices.map(device => {
		const normalizedDate = AppUtils.normalizeSpreadsheetDate(device.date)
		if (normalizedDate && normalizedDate !== device.date) {
			hasUpdates = true
		}

		return {
			...device,
			date: normalizedDate || device.date || '',
		}
	})

	if (hasUpdates) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(devices))
	}

	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(devices))
	renderTable()
}
/* === Monitor Storage: End === */

/* === Monitor Drawer: Start === */
function hasDrawerFormChanges() {
	if (!deviceForm) return false

	const textInputs = Array.from(deviceForm.querySelectorAll('input[type="text"], input[type="date"]'))
	const hasValue = textInputs.some(input => input.value.trim() !== '')

	return hasValue || oldRadio?.checked
}

function resetFormState() {
	if (deviceForm) {
		deviceForm.reset()
	}

	if (newRadio) {
		newRadio.checked = true
	}

	toggleDateInput()
}

function openDrawer() {
	if (!drawerShell) return

	drawerShell.classList.add('is-open')
	drawerShell.setAttribute('aria-hidden', 'false')
	document.body.classList.add('monitor-drawer-open')

	const firstField = document.getElementById('name')
	window.setTimeout(() => firstField?.focus(), 80)
}

function closeDrawer({ force = false } = {}) {
	if (!drawerShell) return false

	if (!force && hasDrawerFormChanges()) {
		const shouldClose = confirm('Zamknąć panel? Niezapisane zmiany zostaną utracone.')
		if (!shouldClose) return false
	}

	drawerShell.classList.remove('is-open')
	drawerShell.setAttribute('aria-hidden', 'true')
	document.body.classList.remove('monitor-drawer-open')
	resetFormState()
	return true
}

function startCreateFlow() {
	resetFormState()
	openDrawer()
}
/* === Monitor Drawer: End === */

/* === Monitor Excel Backup: Start === */
function exportExcel() {
	if (devices.length === 0) {
		alert('Brak danych do eksportu. Dodaj urządzenie albo zaimportuj plik, a backup ruszy od razu.')
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
	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = loadEvent => {
		const data = new Uint8Array(loadEvent.target.result)
		const workbook = XLSX.read(data, { type: 'array' })
		const worksheet = workbook.Sheets[workbook.SheetNames[0]]
		const jsonData = XLSX.utils.sheet_to_json(worksheet)

		const imported = jsonData.map(row => ({
			name: (row['Nazwa użytkownika'] || '').toString().toUpperCase(),
			ru: row['Dział / RU'] || '',
			sn: AppUtils.normalizeSN(row['Numer Seryjny']),
			date: AppUtils.normalizeSpreadsheetDate(row['Data ważności domeny']) || '',
		}))

		if (confirm(`Zaimportować ${imported.length} urządzeń z Excela?`)) {
			devices = [...devices, ...imported]
			saveData()
		}

		event.target.value = ''
	}

	reader.readAsArrayBuffer(file)
}
/* === Monitor Excel Backup: End === */

/* === Monitor Device Actions: Start === */
function findDuplicate(ru, sn) {
	const normalizedSn = AppUtils.normalizeSN(sn)
	return devices.findIndex(device => device.ru === ru && AppUtils.normalizeSN(device.sn) === normalizedSn)
}

function extendDomain(index) {
	const device = devices[index]
	if (!device) return

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const currentExpiry = AppUtils.parseDate(device.date)
	const baseDate = !currentExpiry || currentExpiry < today ? today : new Date(currentExpiry)
	baseDate.setDate(baseDate.getDate() + 60)

	devices[index].date = AppUtils.formatDate(baseDate)
	saveData()
}

function removeItem(index) {
	if (!confirm('Usunąć urządzenie z listy?')) return

	devices.splice(index, 1)
	saveData()
}
/* === Monitor Device Actions: End === */

/* === Monitor Table Rendering: Start === */
function updateSummary(stats) {
	if (!summary) return

	if (stats.all === 0) {
		summary.textContent = 'Baza jest pusta, dodaj pierwsze urządzenie do monitoringu domeny.'
		return
	}

	summary.textContent = `Wszystkie urządzenia: ${stats.all} · aktywne: ${stats.ok} · wygasające: ${stats.warn} · wypadły: ${stats.dead}.`
}

function renderTable() {
	if (!tableBody) return
	tableBody.innerHTML = ''

	const stats = { all: devices.length, ok: 0, warn: 0, dead: 0 }
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	if (devices.length === 0) {
		tableBody.innerHTML = '<tr><td colspan="5" class="empty-state-cell">Brak urządzeń w monitoringu. Dodaj pierwszy wpis albo zaimportuj plik Excel.</td></tr>'
		updateSummary(stats)
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

	devices.forEach((device, index) => {
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
					<button class="icon-button monitor-row-btn monitor-row-btn-extend" type="button" data-action="extend" data-index="${index}" aria-label="Przedłuż o 60 dni" title="Przedłuż o 60 dni">
						<i class="fa-solid fa-rotate-right"></i>
					</button>
					<button class="icon-button monitor-row-btn monitor-row-btn-danger" type="button" data-action="delete" data-index="${index}" aria-label="Usuń urządzenie" title="Usuń urządzenie">
						<i class="fa-solid fa-trash"></i>
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
	updateSummary(stats)
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

			const index = Number(actionButton.dataset.index)
			if (actionButton.dataset.action === 'extend') extendDomain(index)
			if (actionButton.dataset.action === 'delete') removeItem(index)
		})
	}

	if (openDrawerBtn) {
		openDrawerBtn.addEventListener('click', startCreateFlow)
	}

	if (closeDrawerBtn) {
		closeDrawerBtn.addEventListener('click', () => closeDrawer())
	}

	if (cancelDrawerBtn) {
		cancelDrawerBtn.addEventListener('click', () => closeDrawer())
	}

	if (drawerBackdrop) {
		drawerBackdrop.addEventListener('click', () => closeDrawer())
	}

	window.addEventListener('keydown', event => {
		if (event.key === 'Escape' && drawerShell?.classList.contains('is-open')) {
			closeDrawer()
		}
	})

	if (deviceForm) {
		deviceForm.addEventListener('submit', event => {
			event.preventDefault()

			const name = document.getElementById('name').value.toUpperCase()
			const ru = document.getElementById('ru').value
			const sn = AppUtils.normalizeSN(document.getElementById('sn').value)
			let date

			if (newRadio?.checked) {
				const newDate = new Date()
				newDate.setDate(newDate.getDate() + 60)
				date = AppUtils.formatDate(newDate)
			} else {
				date = dateInput.value
				if (!date) {
					alert('Wybierz datę dla starego urządzenia.')
					return
				}
			}

			const duplicateIndex = findDuplicate(ru, sn)
			if (duplicateIndex !== -1) {
				if (confirm('Urządzenie już istnieje. Odświeżyć wpis o 60 dni od dziś?')) {
					extendDomain(duplicateIndex)
					closeDrawer({ force: true })
				}
				return
			}

			devices.push({ name, ru, sn, date })
			saveData()
			closeDrawer({ force: true })
		})
	}

	if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportExcel)
	if (importExcelTrigger && importExcelInput) {
		importExcelTrigger.addEventListener('click', () => importExcelInput.click())
		importExcelInput.addEventListener('change', importExcel)
	}

	loadData()
})
/* === Monitor Init: End === */
