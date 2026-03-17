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

		// 3. Przygotowanie do wejścia
		tbody.style.visibility = 'hidden'
		tbody.classList.remove('slide-out')

		requestAnimationFrame(() => {
			tbody.style.visibility = 'visible'
			tbody.classList.add('slide-in')

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

	const filteredExchanges = exchanges.filter(ex => {
		const exDate = new Date(ex.plannedDate)
		return exDate.getMonth() === currentViewDate.getMonth() && exDate.getFullYear() === currentViewDate.getFullYear()
	})

	if (filteredExchanges.length === 0) {
		tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="text-align:center; padding: 40px; color: #94a3b8;">Brak planowanych wymian w tym miesiącu.</td></tr>`
		return
	}

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

		// INFO - Tooltip (Poprawiony zgodnie z nowym SCSS)
		const infoHtml =
			ex.notes && ex.notes.trim() !== ''
				? `<div class="notes-tooltip-container">
                 <i class="fas fa-info-circle notes-icon"></i>
                 <span class="notes-tooltip-text">${ex.notes}</span>
               </div>`
				: ''

		// AKCESORIA
		const accHtml = (ex.accessories || [])
			.map(acc => `<i class="fas ${accessoryIcons[acc]} acc-icon" title="${acc}"></i>`)
			.join('')

		row.innerHTML = `
            <td class="col-info-narrow">
                <div class="td-info-center">${infoHtml}</div>
            </td>
            <td class="col-worker">
                <span class="worker-name">${ex.name}</span>
            </td>
            <td class="col-date">
                <span class="date-text">${ex.plannedDate}</span>
            </td>
            <td class="col-laptop">
                <span class="sn-badge out">RU: ${ex.oldSn || '---'}</span>
            </td>
            <td class="col-laptop">
                <span class="sn-badge in">RU: ${ex.newSn || '---'}</span>
            </td>
            <td class="col-acc">
                <div class="acc-wrapper">${accHtml}</div>
            </td>
            <td class="col-actions">
                <div class="action-wrapper">
                    ${!isDone ? `<button class="btn-table btn-ok" onclick="completeExchange(${originalIndex})" title="Finalizuj"><i class="fas fa-check"></i></button>` : ''}
                    <button class="btn-table btn-edit" onclick="editExchange(${originalIndex})" title="Edytuj"><i class="fas fa-edit"></i></button>
                    <button class="btn-table btn-delete" onclick="removeItem(${originalIndex})" title="Usuń"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `
		tbody.appendChild(row)
	})
}

/* ======= LOGIKA PROCESU ======= */

function editExchange(index) {
	const ex = exchanges[index]
	if (!ex) return

	// 1. Wypełnienie formularza
	document.getElementById('emp-name').value = ex.name
	document.getElementById('exchange-date').value = ex.plannedDate
	document.getElementById('old-sn').value = ex.oldSn
	document.getElementById('new-sn').value = ex.newSn
	document.getElementById('notes').value = ex.notes || ''

	// 2. Akcesoria
	document.querySelectorAll('.accessory-item').forEach(item => {
		const itemName = item.dataset.item
		item.classList.toggle('active', ex.accessories && ex.accessories.includes(itemName))
	})

	// 3. Interfejs edycji
	const submitBtn = document.getElementById('submit-btn')
	if (submitBtn) {
		submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Zapisz zmiany'
		submitBtn.style.background = '#6366f1'
	}

	const cancelContainer = document.getElementById('cancel-edit-container')
	if (cancelContainer) {
		cancelContainer.innerHTML = `
            <button type="button" class="btn-submit" style="background:#94a3b8; margin-top:10px;" onclick="cancelEdit()">
                <i class="fa-solid fa-times"></i> Anuluj edycję
            </button>`
	}

	document.querySelector('aside').classList.add('editing-active')

	// 4. Usuwamy stary, by dodać "nowy" po zapisie
	exchanges.splice(index, 1)

	window.scrollTo({ top: 0, behavior: 'smooth' })
	renderTable()
}

function cancelEdit() {
	if (confirm('Anulować edycję? Zmiany nie zostaną zapisane.')) {
		location.reload()
	}
}

function completeExchange(index) {
	const ex = exchanges[index]
	if (!ex || ex.status === 'done') return

	if (!confirm(`Sfinalizować wymianę dla: ${ex.name}?`)) return

	const monitorKey = AppUtils.config.STORAGE_KEYS.MONITOR
	let monitorData = JSON.parse(localStorage.getItem(monitorKey)) || []

	if (ex.oldSn) {
		const cleanOldSn = AppUtils.normalizeSN(ex.oldSn)
		monitorData = monitorData.filter(d => AppUtils.normalizeSN(d.sn) !== cleanOldSn)
	}

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

		// Jeśli byliśmy w trybie edycji, po zapisie odświeżamy stronę by zresetować UI
		const isEditing = document.querySelector('aside').classList.contains('editing-active')
		if (isEditing) {
			saveData()
			location.reload()
		} else {
			e.target.reset()
			document.querySelectorAll('.accessory-item').forEach(item => item.classList.remove('active'))
			saveData()
		}
	})
}

/* ======= EXPORT / IMPORT ======= */

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

function importExcel(event) {
	const file = event.target.files[0]
	if (!file) return
	const reader = new FileReader()
	reader.onload = function (e) {
		try {
			const data = new Uint8Array(e.target.result)
			const workbook = XLSX.read(data, { type: 'array' })
			const worksheet = workbook.Sheets[workbook.SheetNames[0]]
			const jsonData = XLSX.utils.sheet_to_json(worksheet)

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

			if (imported.length > 0 && confirm(`Zaimportować ${imported.length} rekordów?`)) {
				exchanges = [...exchanges, ...imported]
				saveData()
				alert('Import zakończony!')
			}
		} catch (err) {
			alert('Błąd importu pliku Excel.')
		}
		event.target.value = ''
	}
	reader.readAsArrayBuffer(file)
}

// Globalizacja
window.changeMonth = changeMonth
window.editExchange = editExchange
window.cancelEdit = cancelEdit
window.completeExchange = completeExchange
window.removeItem = removeItem
window.exportExcel = exportExcel
