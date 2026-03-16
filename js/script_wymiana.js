let exchanges = []
const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.EXCHANGES

// Zmienna sterująca widokiem daty
let currentViewDate = new Date()
let isAnimating = false // Blokada dla płynności animacji

/* ======= INICJALIZACJA I IKONKI ======= */

document.addEventListener('DOMContentLoaded', () => {
	// Obsługa klikania w ikonki akcesoriów
	const accessoryItems = document.querySelectorAll('.accessory-item')

	accessoryItems.forEach(item => {
		item.addEventListener('click', () => {
			item.classList.toggle('active')
			// Efekt fizycznego kliknięcia
			item.style.transform = 'scale(0.9)'
			setTimeout(() => (item.style.transform = ''), 100)
		})
	})

	loadData()
})

/* ======= DANE ======= */

function loadData() {
	const saved = localStorage.getItem(STORAGE_KEY)
	exchanges = saved ? JSON.parse(saved) : []
	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(exchanges))
	renderTable()
}

/* ======= WIDOK I KALENDARZ ======= */

function updateMonthDisplay() {
	const display = document.getElementById('current-month-display')
	if (display) {
		const monthName = AppUtils.config.MONTH_NAMES[currentViewDate.getMonth()].toUpperCase()
		display.innerText = `${monthName} ${currentViewDate.getFullYear()}`
	}
}

function changeMonth(delta) {
	if (isAnimating) return
	const tbody = document.getElementById('table-body')
	if (!tbody) return

	isAnimating = true

	// 1. Animacja wyjścia
	tbody.classList.remove('slide-in')
	tbody.classList.add('slide-out')

	setTimeout(() => {
		// 2. Zmiana danych w tle
		currentViewDate.setMonth(currentViewDate.getMonth() + delta)
		renderTable()

		// 3. Przygotowanie do wejścia (sprężynka)
		tbody.style.visibility = 'hidden'
		tbody.classList.remove('slide-out')

		requestAnimationFrame(() => {
			tbody.style.visibility = 'visible'
			tbody.classList.add('slide-in')

			// Odblokowanie klikania po zakończeniu animacji
			setTimeout(() => {
				isAnimating = false
			}, 500)
		})
	}, 250)
}

/* ======= RENDER TABELI ======= */

function renderTable() {
	const tbody = document.getElementById('table-body')
	if (!tbody) return
	tbody.innerHTML = ''

	updateMonthDisplay()

	// Filtrowanie wymian po miesiącu (na podstawie planowanej daty)
	const filteredExchanges = exchanges.filter(ex => {
		const exDate = new Date(ex.plannedDate)
		return exDate.getMonth() === currentViewDate.getMonth() && exDate.getFullYear() === currentViewDate.getFullYear()
	})

	if (filteredExchanges.length === 0) {
		tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 50px; color: #94a3b8;">Brak planowanych wymian w tym miesiącu.</td></tr>`
		return
	}

	// Mapowanie nazw akcesoriów na ikonki FontAwesome
	const accessoryIcons = {
		mouse: 'fa-mouse',
		keyboard: 'fa-keyboard',
		headset: 'fa-headset',
		monitor: 'fa-desktop',
		bag: 'fa-briefcase',
	}

	filteredExchanges.forEach(ex => {
		const originalIndex = exchanges.findIndex(original => original === ex)
		const isDone = ex.status === 'done'
		const row = document.createElement('tr')
		if (isDone) row.classList.add('is-done')

		// Generowanie HTML dla wybranych ikonek
		const accHtml = (ex.accessories || [])
			.map(
				acc =>
					`<i class="fas ${accessoryIcons[acc]}" style="margin: 0 4px; color: #6366f1; font-size: 1.2rem;" title="${acc}"></i>`,
			)
			.join('')

		row.innerHTML = `
            <td><b>${ex.name}</b><br><small style="color: #94a3b8;">${ex.plannedDate}</small></td>
            <td><span class="sn-badge out">STARY:</span> ${AppUtils.normalizeSN(ex.oldSn)}</td>
            <td><span class="sn-badge in">NOWY:</span> ${AppUtils.normalizeSN(ex.newSn)}</td>
            <td style="text-align:center">${accHtml}</td>
            <td style="text-align:center">
                ${
									isDone
										? '<span class="status-pill ok"><i class="fas fa-check"></i> GOTOWE</span>'
										: `<button class="btn-finish" onclick="completeExchange(${originalIndex})"><i class="fas fa-play"></i> OK</button>`
								}
            </td>
            <td>
                <span class="delete-btn" onclick="removeItem(${originalIndex})">
                    <i class="fas fa-trash"></i>
                </span>
            </td>
        `
		tbody.appendChild(row)
	})
}

/* ======= LOGIKA PROCESU ======= */

function completeExchange(index) {
	const ex = exchanges[index]
	if (ex.status === 'done') return

	if (!confirm(`Sfinalizować wymianę dla: ${ex.name}?`)) return

	const monitorKey = AppUtils.config.STORAGE_KEYS.MONITOR
	let monitorData = JSON.parse(localStorage.getItem(monitorKey)) || []

	// 1. Usuń stary laptop z monitoringu
	if (ex.oldSn) {
		const cleanOldSn = AppUtils.normalizeSN(ex.oldSn)
		monitorData = monitorData.filter(d => AppUtils.normalizeSN(d.sn) !== cleanOldSn)
	}

	// 2. Dodaj nowy laptop do monitoringu (+60 dni)
	if (ex.newSn) {
		let d = new Date()
		d.setDate(d.getDate() + 60)

		monitorData.push({
			name: ex.name,
			ru: 'WYMIANA',
			sn: AppUtils.normalizeSN(ex.newSn).toUpperCase(),
			date: AppUtils.formatDate(d),
		})
	}

	localStorage.setItem(monitorKey, JSON.stringify(monitorData))
	exchanges[index].status = 'done'
	saveData()
}

function removeItem(index) {
	if (confirm('Usunąć ten wpis?')) {
		exchanges.splice(index, 1)
		saveData()
	}
}

/* ======= FORMULARZ ======= */

const exchangeForm = document.getElementById('exchange-form')
if (exchangeForm) {
	exchangeForm.addEventListener('submit', e => {
		e.preventDefault()

		// Pobieranie aktywnych akcesoriów
		const selectedAccessories = []
		document.querySelectorAll('.accessory-item.active').forEach(item => {
			selectedAccessories.push(item.dataset.item)
		})

		const newExchange = {
			name: document.getElementById('emp-name').value.toUpperCase(),
			plannedDate: document.getElementById('exchange-date').value,
			oldSn: document.getElementById('old-sn').value,
			newSn: document.getElementById('new-sn').value,
			notes: document.getElementById('notes').value,
			accessories: selectedAccessories,
			status: 'pending',
			createdAt: new Date(),
		}

		exchanges.push(newExchange)

		// Reset formularza i ikonek
		e.target.reset()
		document.querySelectorAll('.accessory-item').forEach(item => item.classList.remove('active'))

		saveData()
	})
}

/* ======= EXPORT / IMPORT (EXCEL & JSON) ======= */

function exportExcel() {
	if (exchanges.length === 0) return alert('Brak danych do eksportu!')
	const data = exchanges.map(ex => ({
		Pracownik: ex.name,
		Data: ex.plannedDate,
		'Stary SN': ex.oldSn,
		'Nowy SN': ex.newSn,
		Akcesoria: (ex.accessories || []).join(', '),
		Status: ex.status === 'done' ? 'Zakończono' : 'Planowana',
	}))
	const ws = XLSX.utils.json_to_sheet(data)
	const wb = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(wb, ws, 'Wymiany')
	XLSX.writeFile(wb, `wymiany_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function exportJSON() {
	const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exchanges))
	const downloadAnchorNode = document.createElement('a')
	downloadAnchorNode.setAttribute('href', dataStr)
	downloadAnchorNode.setAttribute('download', 'wymiany_backup.json')
	document.body.appendChild(downloadAnchorNode)
	downloadAnchorNode.click()
	downloadAnchorNode.remove()
}

function importExcel(event) {
	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = function (e) {
		try {
			const data = new Uint8Array(e.target.result)
			const workbook = XLSX.read(data, { type: 'array' })

			// Pobieramy pierwszy arkusz
			const firstSheetName = workbook.SheetNames[0]
			const worksheet = workbook.Sheets[firstSheetName]

			// Konwertujemy na JSON
			const jsonData = XLSX.utils.sheet_to_json(worksheet)

			// Mapujemy dane z Excela na format Twojej aplikacji
			const imported = jsonData.map(row => ({
				name: (row['Pracownik'] || row['Użytkownik'] || '').toString().toUpperCase(),
				plannedDate: row['Data'] || row['Data planowanej wymiany'] || new Date().toISOString().split('T')[0],
				oldSn: row['Stary SN'] || row['SN do zwrotu'] || '',
				newSn: row['Nowy SN'] || row['SN do wydania'] || '',
				accessories: row['Akcesoria'] ? row['Akcesoria'].split(',').map(a => a.trim()) : [],
				notes: row['Uwagi'] || '',
				status: row['Status'] === 'Zakończono' ? 'done' : 'pending',
				createdAt: new Date(),
			}))

			if (imported.length === 0) {
				alert('Nie znaleziono poprawnych danych w pliku.')
				return
			}

			if (confirm(`Czy chcesz zaimportować ${imported.length} rekordów?`)) {
				exchanges = [...exchanges, ...imported]
				saveData() // To automatycznie wywoła renderTable()
				alert('Import zakończony sukcesem!')
			}
		} catch (err) {
			console.error(err)
			alert('Błąd podczas odczytu pliku Excel. Upewnij się, że format jest poprawny.')
		}

		// Resetujemy input, żeby można było wybrać ten sam plik ponownie
		event.target.value = ''
	}
	reader.readAsArrayBuffer(file)
}

// Globalizacja funkcji dla onclick w HTML
window.changeMonth = changeMonth
window.completeExchange = completeExchange
window.removeItem = removeItem
window.exportExcel = exportExcel
window.exportJSON = exportJSON
