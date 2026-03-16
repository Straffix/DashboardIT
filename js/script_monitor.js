let devices = []
const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.MONITOR

const deviceForm = document.getElementById('device-form')
const newRadio = document.getElementById('new-device')
const oldRadio = document.getElementById('old-device')
const dateGroup = document.getElementById('date-group')
const dateInput = document.getElementById('date')

/* ======= DANE ======= */

function loadData() {
	const saved = localStorage.getItem(STORAGE_KEY)
	devices = saved ? JSON.parse(saved) : []
	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(devices))
	renderTable()
}

/* ======= EXPORT / IMPORT EXCEL ======= */

function exportExcel() {
	if (devices.length === 0) return alert('Brak danych do eksportu!')
	const dataToExport = devices.map(d => ({
		'Nazwa użytkownika': d.name,
		'Dział / RU': d.ru,
		'Numer Seryjny': d.sn,
		'Data ważności domeny': d.date,
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
	reader.onload = function (e) {
		const data = new Uint8Array(e.target.result)
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

/* ======= LOGIKA ======= */

function findDuplicate(ru, sn) {
	const normalizedSn = AppUtils.normalizeSN(sn)
	return devices.findIndex(d => d.ru === ru && AppUtils.normalizeSN(d.sn) === normalizedSn)
}

function extendDomain(index) {
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	let currentExpiry = new Date(devices[index].date)
	let baseDate = isNaN(currentExpiry.getTime()) || currentExpiry < today ? today : currentExpiry

	baseDate.setDate(baseDate.getDate() + 60)
	devices[index].date = AppUtils.formatDate(baseDate)
	saveData()
}

function removeItem(index) {
	if (confirm('Usunąć urządzenie z listy?')) {
		devices.splice(index, 1)
		saveData()
	}
}

/* ======= RENDER TABELI ======= */

function renderTable() {
	const tbody = document.getElementById('table-body')
	if (!tbody) return
	tbody.innerHTML = ''

	let stats = { all: devices.length, ok: 0, warn: 0, dead: 0 }
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	devices.forEach((d, index) => {
		const expiryDate = new Date(d.date)
		expiryDate.setHours(0, 0, 0, 0)
		const diff = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))

		let statusClass = 'ok'
		let statusText = d.date

		if (diff < 0) {
			statusClass = 'expired'
			statusText = 'Wypadł z domeny'
			stats.dead++
		} else if (diff <= 14) {
			statusClass = 'near'
			stats.warn++
		} else {
			stats.ok++
		}

		const row = document.createElement('tr')
		row.innerHTML = `
            <td><b>${d.name.toUpperCase()}</b></td>
            <td>${d.ru}</td>
            <td>${d.sn.toUpperCase()}</td>
            <td><span class="status-pill ${statusClass}">${statusText}</span></td>
            <td style="text-align:center">
                <button class="extend-btn" onclick="extendDomain(${index})">
                    <i class="fa-solid fa-plus"></i> 60 dni
                </button>
            </td>
            <td style="text-align:right">
                <span class="delete-btn" onclick="removeItem(${index})">
                    <i class="fa-solid fa-trash"></i>
                </span>
            </td>`
		tbody.appendChild(row)
	})

	const updateStat = (id, val) => {
		const el = document.getElementById(id)
		if (el) el.innerText = val
	}
	updateStat('stats-all', stats.all)
	updateStat('stats-active', stats.ok)
	updateStat('stats-warn', stats.warn)
	updateStat('stats-danger', stats.dead)
}

/* ======= FORMULARZ ======= */

const toggleDateInput = () => {
	if (!dateGroup) return
	const isNew = newRadio.checked
	dateGroup.style.display = isNew ? 'none' : 'block'
	dateInput.required = !isNew
}

if (newRadio) newRadio.addEventListener('change', toggleDateInput)
if (oldRadio) oldRadio.addEventListener('change', toggleDateInput)

if (deviceForm) {
	deviceForm.addEventListener('submit', e => {
		e.preventDefault()
		const name = document.getElementById('name').value.toUpperCase()
		const ru = document.getElementById('ru').value
		const sn = AppUtils.normalizeSN(document.getElementById('sn').value)
		let date

		if (newRadio.checked) {
			let d = new Date()
			d.setDate(d.getDate() + 60)
			date = AppUtils.formatDate(d)
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

// Globalizacja funkcji
window.extendDomain = extendDomain
window.removeItem = removeItem
window.exportExcel = exportExcel
window.importExcel = importExcel

// Start
loadData()
toggleDateInput()
