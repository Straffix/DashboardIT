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
const exportJsonBtn = document.getElementById('export-json-btn')
const importJsonInput = document.getElementById('importFile')
const importJsonTrigger = document.getElementById('import-json-trigger')

function loadData() {
	const saved = localStorage.getItem(STORAGE_KEY)
	devices = saved ? JSON.parse(saved) : []
	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(devices))
	renderTable()
}

function exportExcel() {
	if (devices.length === 0) return alert('Brak danych do eksportu!')

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
			date: row['Data ważności domeny'] || '',
		}))

		if (confirm(`Zaimportować ${imported.length} urządzeń z Excela?`)) {
			devices = [...devices, ...imported]
			saveData()
		}

		event.target.value = ''
	}

	reader.readAsArrayBuffer(file)
}

function exportJSON() {
	if (devices.length === 0) return alert('Brak danych do eksportu!')

	const blob = new Blob([JSON.stringify(devices, null, 2)], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = `monitor_laptopow_${new Date().toISOString().slice(0, 10)}.json`
	link.click()
	URL.revokeObjectURL(url)
}

function importJSON(event) {
	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = loadEvent => {
		try {
			const imported = JSON.parse(loadEvent.target.result)
			if (!Array.isArray(imported)) {
				throw new Error('Niepoprawny format')
			}

			if (confirm(`Zaimportować ${imported.length} urządzeń z pliku JSON?`)) {
				devices = [...devices, ...imported]
				saveData()
			}
		} catch (error) {
			alert('Nie udało się odczytać pliku JSON.')
		}

		event.target.value = ''
	}

	reader.readAsText(file)
}

function findDuplicate(ru, sn) {
	const normalizedSn = AppUtils.normalizeSN(sn)
	return devices.findIndex(device => device.ru === ru && AppUtils.normalizeSN(device.sn) === normalizedSn)
}

function extendDomain(index) {
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const currentExpiry = new Date(devices[index].date)
	const baseDate = Number.isNaN(currentExpiry.getTime()) || currentExpiry < today ? today : currentExpiry
	baseDate.setDate(baseDate.getDate() + 60)

	devices[index].date = AppUtils.formatDate(baseDate)
	saveData()
}

function removeItem(index) {
	if (!confirm('Usunąć urządzenie z listy?')) return

	devices.splice(index, 1)
	saveData()
}

function renderTable() {
	if (!tableBody) return
	tableBody.innerHTML = ''

	const stats = { all: devices.length, ok: 0, warn: 0, dead: 0 }
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	devices.forEach((device, index) => {
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

		const row = document.createElement('tr')
		row.innerHTML = `
			<td><b>${device.name.toUpperCase()}</b></td>
			<td>${device.ru}</td>
			<td>${device.sn.toUpperCase()}</td>
			<td><span class="status-pill ${statusClass}">${statusText}</span></td>
			<td class="cell-center">
				<button class="extend-btn" type="button" data-action="extend" data-index="${index}">
					<i class="fa-solid fa-plus"></i> 60 dni
				</button>
			</td>
			<td class="cell-right">
				<button class="icon-button delete-btn" type="button" data-action="delete" data-index="${index}" aria-label="Usuń urządzenie">
					<i class="fa-solid fa-trash"></i>
				</button>
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
}

function toggleDateInput() {
	if (!dateGroup) return

	const isNew = newRadio.checked
	dateGroup.classList.toggle('is-hidden', isNew)
	dateInput.required = !isNew
}

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

			const index = Number(actionButton.dataset.index)
			if (actionButton.dataset.action === 'extend') extendDomain(index)
			if (actionButton.dataset.action === 'delete') removeItem(index)
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

			const duplicateIndex = findDuplicate(ru, sn)
			if (duplicateIndex !== -1) {
				if (confirm('Urządzenie już istnieje. Odświeżyć o 60 dni od dziś?')) {
					extendDomain(duplicateIndex)
					deviceForm.reset()
					toggleDateInput()
				}
				return
			}

			devices.push({ name, ru, sn, date })
			deviceForm.reset()
			toggleDateInput()
			saveData()
		})
	}

	if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportExcel)
	if (importExcelTrigger && importExcelInput) {
		importExcelTrigger.addEventListener('click', () => importExcelInput.click())
		importExcelInput.addEventListener('change', importExcel)
	}

	if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportJSON)
	if (importJsonTrigger && importJsonInput) {
		importJsonTrigger.addEventListener('click', () => importJsonInput.click())
		importJsonInput.addEventListener('change', importJSON)
	}

	loadData()
	toggleDateInput()
})
