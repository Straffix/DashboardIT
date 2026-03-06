let hires = []
const STORAGE_KEY = 'nowe_zatrudnienia_dane'

let currentViewDate = new Date()
const monthNames = [
	'Styczeń',
	'Luty',
	'Marzec',
	'Kwiecień',
	'Maj',
	'Czerwiec',
	'Lipiec',
	'Sierpień',
	'Wrzesień',
	'Październik',
	'Listopad',
	'Grudzień',
]

const iconMap = {
	mouse: 'fa-mouse',
	keyboard: 'fa-keyboard',
	headset: 'fa-headset',
	monitor: 'fa-desktop',
	bag: 'fa-briefcase',
}

function updateMonthDisplay() {
	const display = document.getElementById('current-month-display')
	if (display) {
		display.innerText = `${monthNames[currentViewDate.getMonth()].toUpperCase()} ${currentViewDate.getFullYear()}`
	}
}

function changeMonth(delta) {
	const table = document.querySelector('table') // Zmiana z tbody na table

	// Dodaj efekt zanikania
	table.style.opacity = '0'

	setTimeout(() => {
		currentViewDate.setMonth(currentViewDate.getMonth() + delta)
		renderTable()

		// Przywróć widoczność i dodaj efekt wejścia
		table.style.opacity = '1'
		table.classList.add('fade-in')

		setTimeout(() => {
			table.classList.remove('fade-in')
		}, 300)
	}, 200)
}

//==============================

document.addEventListener('click', e => {
	const item = e.target.closest('.accessory-item')
	if (item) {
		item.classList.toggle('active')
	}
})

function loadData() {
	const saved = localStorage.getItem(STORAGE_KEY)
	hires = saved ? JSON.parse(saved) : []
	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(hires))
	renderTable()
}

function renderTable() {
	const tbody = document.getElementById('table-body')
	if (!tbody) return
	tbody.innerHTML = ''

	updateMonthDisplay()

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const filteredHires = hires.filter(h => {
		const hDate = new Date(h.date)
		return hDate.getMonth() === currentViewDate.getMonth() && hDate.getFullYear() === currentViewDate.getFullYear()
	})

	if (filteredHires.length === 0) {
		tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 50px; color: #94a3b8;">Brak planowanych zatrudnień w tym miesiącu.</td></tr>`
		return
	}

	filteredHires.forEach(h => {
		const originalIndex = hires.findIndex(original => original === h)

		const startDate = new Date(h.date)
		const diff = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24))

		let statusClass = 'ok'
		let statusText = h.date

		if (diff < 0) {
			statusClass = 'expired'
			statusText = 'Zatrudniony'
		} else if (diff <= 3) {
			statusClass = 'near'
		}

		const accessoriesHTML = (h.accessories || [])
			.map(
				acc =>
					`<i class="fas ${iconMap[acc]}" style="margin: 0 4px; color: #64748b; font-size: 1.2rem;" title="${acc}"></i>`,
			)
			.join('')

		const row = document.createElement('tr')
		row.innerHTML = `
            <td><b>${h.name}</b></td>
            <td>${h.ru}</td>
            <td>${h.sn}</td>
            <td><span class="status-pill ${statusClass}">${statusText}</span></td>
            <td style="text-align:center">${accessoriesHTML || '<small style="color:#ccc">brak</small>'}</td>
            <td style="text-align:right">
                <span class="delete-btn" onclick="removeItem(${originalIndex})">
                    <i class="fas fa-trash"></i>
                </span>
            </td>
        `
		tbody.appendChild(row)
	})
}

function removeItem(index) {
	if (confirm('Usunąć wpis?')) {
		hires.splice(index, 1)
		saveData()
	}
}

// --- FORMULARZ ---
document.getElementById('device-form').addEventListener('submit', e => {
	e.preventDefault()

	const selectedAcc = []
	document.querySelectorAll('.accessory-item.active').forEach(item => {
		selectedAcc.push(item.dataset.item)
	})

	const newHireDate = document.getElementById('date').value

	hires.push({
		name: document.getElementById('name').value.toUpperCase(),
		ru: document.getElementById('ru').value,
		sn: document.getElementById('sn').value.toUpperCase(),
		date: newHireDate,
		accessories: selectedAcc,
	})

	currentViewDate = new Date(newHireDate)

	e.target.reset()
	document.querySelectorAll('.accessory-item').forEach(i => i.classList.remove('active'))

	saveData()
})

const hiddenMonthInput = document.getElementById('hidden-month-input')

if (hiddenMonthInput) {
	hiddenMonthInput.addEventListener('change', e => {
		const selectedValue = e.target.value
		if (selectedValue) {
			const [year, month] = selectedValue.split('-')

			currentViewDate = new Date(year, month - 1, 1)

			renderTable()
		}
	})
}

// --- EKSPORT DO EXCELA ---
function exportExcel() {
	if (hires.length === 0) {
		alert('Brak danych do eksportu!')
		return
	}

	// Mapujemy dane, aby nagłówki w Excelu były czytelne
	const dataToExport = hires.map(h => ({
		'Imię i Nazwisko': h.name,
		'Dział / Stanowisko': h.ru,
		'SN Sprzętu': h.sn,
		'Data rozpoczęcia': h.date,
		Akcesoria: h.accessories ? h.accessories.join(', ') : '',
	}))

	const worksheet = XLSX.utils.json_to_sheet(dataToExport)
	const workbook = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Zatrudnienia')

	// Generowanie nazwy pliku z aktualną datą
	const fileName = `zatrudnienia_backup_${new Date().toISOString().slice(0, 10)}.xlsx`

	XLSX.writeFile(workbook, fileName)
}

// --- IMPORT Z EXCELA ---
function importExcel(event) {
	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = function (e) {
		const data = new Uint8Array(e.target.result)
		const workbook = XLSX.read(data, { type: 'array' })

		// Pobieramy pierwszy arkusz
		const firstSheetName = workbook.SheetNames[0]
		const worksheet = workbook.Sheets[firstSheetName]

		// Konwersja na JSON
		const jsonData = XLSX.utils.sheet_to_json(worksheet)

		// Mapowanie z formatu Excelowego z powrotem na Twój format obiektów
		const importedHires = jsonData.map(row => ({
			name: (row['Imię i Nazwisko'] || '').toString().toUpperCase(),
			ru: row['Dział / Stanowisko'] || '',
			sn: (row['SN Sprzętu'] || '').toString().toUpperCase(),
			date: row['Data rozpoczęcia'] || '',
			accessories: row['Akcesoria'] ? row['Akcesoria'].split(', ').filter(a => a) : [],
		}))

		if (confirm(`Czy zaimportować ${importedHires.length} wpisów? (Istniejące dane pozostaną)`)) {
			hires = [...hires, ...importedHires]
			saveData()
			event.target.value = '' // Reset inputa
		}
	}
	reader.readAsArrayBuffer(file)
}

// --- EKSPORT DO JSON ---
function exportJSON() {
	if (hires.length === 0) {
		alert('Brak danych do eksportu!')
		return
	}
	const dataStr = JSON.stringify(hires, null, 2)
	const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

	const exportFileDefaultName = `backup_zatrudnienia_${new Date().toISOString().slice(0, 10)}.json`

	const linkElement = document.createElement('a')
	linkElement.setAttribute('href', dataUri)
	linkElement.setAttribute('download', exportFileDefaultName)
	linkElement.click()
}

// --- IMPORT Z JSON ---
function importJSON(event) {
	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = function (e) {
		try {
			const importedData = JSON.parse(e.target.result)

			if (Array.isArray(importedData)) {
				if (confirm(`Czy zaimportować ${importedData.length} wpisów z pliku JSON?`)) {
					hires = [...hires, ...importedData]
					saveData()
					alert('Dane zostały zaimportowane!')
				}
			} else {
				alert('Nieprawidłowy format pliku JSON.')
			}
		} catch (err) {
			alert('Błąd podczas odczytu pliku JSON.')
			console.error(err)
		}
		event.target.value = '' // Reset inputa
	}
	reader.readAsText(file)
}

loadData()
