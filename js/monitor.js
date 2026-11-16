/* === Monitor State And References: Start === */
let devices = []
let editingId = null
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
const deviceDialog = document.getElementById('device-dialog')
const addDeviceBtn = document.getElementById('add-device-btn')
const deviceCancelBtn = document.getElementById('device-cancel-btn')
const deviceDialogTitle = document.getElementById('device-dialog-title')
const deviceSubmitBtn = document.getElementById('device-submit-btn')
const searchInput = document.getElementById('device-search')

/* === Monitor State And References: End === */

/* === Monitor Storage: Start === */
function addMeta(device) {
	const today = AppUtils.formatDate(new Date())
	return {
		...device,
		id: device.id || AppUtils.createId(),
		createdAt: device.createdAt || today,
		updatedAt: device.updatedAt || today,
	}
}

function loadData() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY)
		const parsed = saved ? JSON.parse(saved) : []
		devices = Array.isArray(parsed) ? parsed.map(addMeta) : []
	} catch (error) {
		devices = []
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(devices))
	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(devices))
	renderTable()
}
/* === Monitor Storage: End === */

/* === Monitor Excel Backup: Start === */
function exportExcel() {
	if (devices.length === 0) return alert('Brak danych do eksportu!')

	const dataToExport = devices.map(device => ({
		'Nazwa użytkownika': device.name,
		'Dział / RU': AppUtils.asExcelText(device.ru),
		'Numer Seryjny': AppUtils.asExcelText(device.sn),
		'Data ważności domeny': device.date,
	}))
	AppUtils.downloadCSV(dataToExport, `monitor_laptopow_${new Date().toISOString().slice(0, 10)}.csv`)
}

function importExcel(event) {
	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = loadEvent => {
		const rows = AppUtils.parseCSV(loadEvent.target.result)

		const imported = rows.map(row =>
			addMeta({
				name: (row['Nazwa użytkownika'] || '').toString().toUpperCase(),
				ru: row['Dział / RU'] || '',
				sn: AppUtils.normalizeSN(row['Numer Seryjny']),
				date: AppUtils.normalizeDate(row['Data ważności domeny']),
			}),
		)

		if (imported.length === 0) {
			alert('Plik jest pusty albo ma zły format.')
		} else if (confirm(`Zastąpić obecne dane (${devices.length}) danymi z pliku (${imported.length})?`)) {
			devices = imported
			saveData()
		}

		event.target.value = ''
	}

	reader.readAsText(file, 'UTF-8')
}
/* === Monitor Excel Backup: End === */

/* === Monitor Device Actions: Start === */
function findDuplicate(ru, sn, ignoreId) {
	const normalizedSn = AppUtils.normalizeSN(sn)
	return devices.find(
		device => device.id !== ignoreId && device.ru === ru && AppUtils.normalizeSN(device.sn) === normalizedSn,
	)
}

function extendDomain(id) {
	const device = devices.find(item => item.id === id)
	if (!device) return

	const newDate = new Date()
	newDate.setDate(newDate.getDate() + 60)
	const newDateText = AppUtils.formatDate(newDate)

	if (device.date === newDateText) return alert(`${device.name} jest już odświeżony do ${newDateText}.`)
	if (!confirm(`Czy laptop ${device.name} został odbity w domenie?\n\nNowa data ważności: ${newDateText}`)) return

	device.date = newDateText
	device.updatedAt = AppUtils.formatDate(new Date())
	saveData()
}

function removeItem(id) {
	if (!confirm('Usunąć urządzenie z listy?')) return

	devices = devices.filter(device => device.id !== id)
	saveData()
}
/* === Monitor Device Actions: End === */

/* === Monitor Table Rendering: Start === */
function createEl(tag, className, text) {
	const element = document.createElement(tag)
	if (className) element.className = className
	if (text !== undefined) element.textContent = text
	return element
}

function createActionButton(action, icon, label, id) {
	const button = createEl('button', `row-action-btn is-${action}`)
	button.type = 'button'
	button.dataset.action = action
	button.dataset.id = id
	button.title = label
	button.setAttribute('aria-label', label)
	button.append(createEl('i', `fa-solid ${icon}`))
	return button
}

function appendEmptyRow(text) {
	const emptyRow = createEl('tr')
	const emptyCell = createEl('td', 'empty-state-cell', text)
	emptyCell.colSpan = 5
	emptyRow.append(emptyCell)
	tableBody.append(emptyRow)
}

function renderTable() {
	if (!tableBody) return
	tableBody.replaceChildren()

	if (devices.length === 0) appendEmptyRow('Brak urządzeń. Dodaj pierwsze przyciskiem +.')

	const query = searchInput.value.trim().toUpperCase()
	let shownCount = 0

	const stats = { all: devices.length, ok: 0, warn: 0, dead: 0 }
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	devices.forEach(device => {
		const expiryDate = new Date(device.date)
		expiryDate.setHours(0, 0, 0, 0)
		const diff = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))

		let statusClass = 'ok'
		let statusText = device.date

		if (diff < 0) {
			statusClass = 'expired'
			statusText = 'Wypadł z domeny'
			stats.dead += 1
		} else if (diff <= 14) {
			statusClass = 'near'
			stats.warn += 1
		} else {
			stats.ok += 1
		}

		const searchText = `${device.name} ${device.ru} ${device.sn}`.toUpperCase()
		if (!searchText.includes(query)) return
		shownCount += 1

		const row = createEl('tr')

		const nameCell = createEl('td')
		nameCell.append(
			createEl('p', 'device-name', device.name.toUpperCase()),
			createEl('p', 'device-meta', `Aktualizacja: ${device.updatedAt}`),
		)

		const snCell = createEl('td')
		snCell.append(createEl('span', 'sn-pill', device.sn.toUpperCase()))

		const statusCell = createEl('td')
		statusCell.append(createEl('span', `status-pill ${statusClass}`, statusText))

		const actions = createEl('div', 'row-actions')
		actions.append(
			createActionButton('extend', 'fa-calendar-check', 'Odbity w domenie (+60 dni)', device.id),
			createActionButton('edit', 'fa-pen-to-square', 'Edytuj', device.id),
			createActionButton('delete', 'fa-trash', 'Usuń', device.id),
		)
		const actionsCell = createEl('td', 'cell-right')
		actionsCell.append(actions)

		row.append(nameCell, createEl('td', '', device.ru), snCell, statusCell, actionsCell)
		tableBody.append(row)
	})

	if (devices.length > 0 && shownCount === 0) appendEmptyRow('Brak wyników dla tego wyszukiwania.')

	const updateStat = (id, value) => {
		const element = document.getElementById(id)
		if (element) element.innerText = value
	}

	updateStat('stats-all', stats.all)
	updateStat('stats-active', stats.ok)
	updateStat('stats-warn', stats.warn)
	updateStat('stats-danger', stats.dead)
}
/* === Monitor Table Rendering: End === */

/* === Monitor Form State: Start === */
function toggleDateInput() {
	if (!dateGroup) return

	const isNew = newRadio.checked
	dateGroup.classList.toggle('is-hidden', isNew)
	dateInput.required = !isNew
}

function openDeviceDialog(device) {
	deviceForm.reset()
	editingId = device ? device.id : null
	deviceDialogTitle.textContent = device ? 'Edytuj urządzenie' : 'Dodaj urządzenie'
	deviceSubmitBtn.textContent = device ? 'Zapisz zmiany' : 'Dodaj urządzenie'

	if (device) {
		document.getElementById('name').value = device.name
		ruInput.value = device.ru
		document.getElementById('sn').value = device.sn
		oldRadio.checked = true
		dateInput.value = device.date
	}

	toggleDateInput()
	deviceDialog.showModal()
}
/* === Monitor Form State: End === */

/* === Monitor Init: Start === */
document.addEventListener('DOMContentLoaded', () => {
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

			const id = actionButton.dataset.id
			if (actionButton.dataset.action === 'extend') extendDomain(id)
			if (actionButton.dataset.action === 'delete') removeItem(id)
			if (actionButton.dataset.action === 'edit') openDeviceDialog(devices.find(device => device.id === id))
		})
	}

	if (deviceForm) {
		deviceForm.addEventListener('submit', event => {
			event.preventDefault()

			const name = document.getElementById('name').value.toUpperCase()
			const ru = document.getElementById('ru').value
			const sn = AppUtils.normalizeSN(document.getElementById('sn').value)
			let date

			if (newRadio.checked) {
				const newDate = new Date()
				newDate.setDate(newDate.getDate() + 60)
				date = AppUtils.formatDate(newDate)
			} else {
				date = dateInput.value
				if (!date) return alert('Wybierz datę dla starego urządzenia.')
			}

			if (editingId) {
				if (findDuplicate(ru, sn, editingId)) return alert('Inne urządzenie na liście ma już ten RU i SN.')

				const device = devices.find(item => item.id === editingId)
				device.name = name
				device.ru = ru
				device.sn = sn
				device.date = date
				device.updatedAt = AppUtils.formatDate(new Date())
				saveData()
				deviceDialog.close()
				return
			}

			const duplicate = findDuplicate(ru, sn)
			if (duplicate) {
				alert(`To urządzenie jest już na liście (${duplicate.name}).`)
				extendDomain(duplicate.id)
				deviceForm.reset()
				toggleDateInput()
				deviceDialog.close()
				return
			}

			const today = AppUtils.formatDate(new Date())
			devices.push({ id: AppUtils.createId(), name, ru, sn, date, createdAt: today, updatedAt: today })

			deviceForm.reset()
			toggleDateInput()
			saveData()
			deviceDialog.close()
		})
	}

	addDeviceBtn.addEventListener('click', () => openDeviceDialog())

	searchInput.addEventListener('input', renderTable)

	deviceCancelBtn.addEventListener('click', () => {
		deviceDialog.close()
	})

	if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportExcel)
	if (importExcelTrigger && importExcelInput) {
		importExcelTrigger.addEventListener('click', () => importExcelInput.click())
		importExcelInput.addEventListener('change', importExcel)
	}

	loadData()
	toggleDateInput()
})
/* === Monitor Init: End === */
