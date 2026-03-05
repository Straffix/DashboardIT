let devices = []
const STORAGE_KEY = 'monitor_laptopow_dane'
const BACKUP_KEY = 'monitor_laptopow_backup'
const deviceForm = document.getElementById('device-form')
const newRadio = document.getElementById('new-device')
const oldRadio = document.getElementById('old-device')
const dateGroup = document.getElementById('date-group')
const dateInput = document.getElementById('date')

function formatDate(date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function loadData() {
	const saved = localStorage.getItem(STORAGE_KEY)
	devices = saved ? JSON.parse(saved) : []
	autoBackup()
	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(devices))
	autoBackup()
	renderTable()
}

function autoBackup() {
	localStorage.setItem(BACKUP_KEY, JSON.stringify(devices))
}

function exportJSON() {
	if (devices.length === 0) return alert('Brak danych do eksportu.')
	const data = JSON.stringify(devices, null, 2)
	const blob = new Blob([data], { type: 'application/json' })
	const link = document.createElement('a')
	link.href = URL.createObjectURL(blob)
	link.download = 'urzadzenia.json'
	link.click()
}

function importJSON(event) {
	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = function (e) {
		try {
			const imported = JSON.parse(e.target.result)
			if (!Array.isArray(imported)) throw new Error()
			if (confirm('Czy na pewno chcesz nadpisać obecne dane zaimportowanym plikiem?')) {
				devices = imported
				saveData()
				alert('Import zakończony sukcesem.')
			}
		} catch (err) {
			alert('Błąd: Niepoprawny format pliku JSON.')
		}
		event.target.value = ''
	}
	reader.readAsText(file)
}

function normalizeSN(sn) {
	return sn.trim().replace(/-/g, '').toUpperCase()
}

function findDuplicate(ru, sn) {
	const normalizedSn = normalizeSN(sn)
	return devices.findIndex(d => d.ru === ru && normalizeSN(d.sn) === normalizedSn)
}

function extendDomain(index) {
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	let currentExpiry = new Date(devices[index].date)
	currentExpiry.setHours(0, 0, 0, 0)

	let baseDate
	if (currentExpiry < today || isNaN(currentExpiry.getTime())) {
		baseDate = today
	} else {
		baseDate = currentExpiry
	}

	baseDate.setDate(baseDate.getDate() + 60)
	devices[index].date = formatDate(baseDate)
	saveData()

	console.log(`Przedłużono ${devices[index].name}. Nowa data: ${devices[index].date}`)
}

function removeItem(index) {
	if (confirm('Usunąć urządzenie z listy?')) {
		devices.splice(index, 1)
		saveData()
	}
}

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
			statusText = d.date
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
            </td>
        `
		tbody.appendChild(row)
	})

	if (document.getElementById('stats-all')) document.getElementById('stats-all').innerText = stats.all
	if (document.getElementById('stats-active')) document.getElementById('stats-active').innerText = stats.ok
	if (document.getElementById('stats-warn')) document.getElementById('stats-warn').innerText = stats.warn
	if (document.getElementById('stats-danger')) document.getElementById('stats-danger').innerText = stats.dead
}

const toggleDateInput = () => {
	if (!dateGroup) return
	if (newRadio.checked) {
		dateGroup.style.display = 'none'
		dateInput.required = false
	} else {
		dateGroup.style.display = 'block'
		dateInput.required = true
	}
}

if (newRadio) newRadio.addEventListener('change', toggleDateInput)
if (oldRadio) oldRadio.addEventListener('change', toggleDateInput)

deviceForm.addEventListener('submit', e => {
	e.preventDefault()

	const name = document.getElementById('name').value.toUpperCase()
	const ru = document.getElementById('ru').value
	const sn = document.getElementById('sn').value.toUpperCase()
	let date

	if (newRadio.checked) {
		let d = new Date()
		d.setDate(d.getDate() + 60)
		date = formatDate(d)
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
loadData()
toggleDateInput()
