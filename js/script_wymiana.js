let exchanges = []
const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.EXCHANGES

// Zmienna sterująca widokiem daty
let currentViewDate = new Date()
let isAnimating = false
let editIndex = null
let monthPopover = null
let monthPopoverCleanup = null

function supportsMonthInput() {
	const input = document.createElement('input')
	input.setAttribute('type', 'month')
	return input.type === 'month'
}

function parseYearMonth(value) {
	if (!value) return null

	const match = value.match(/^(\d{4})-(\d{1,2})/)
	if (!match) return null

	const year = Number(match[1])
	const month = Number(match[2])
	if (!year || month < 1 || month > 12) return null

	return { year, month }
}

function closeMonthPopover() {
	if (monthPopoverCleanup) {
		monthPopoverCleanup()
		monthPopoverCleanup = null
	}

	if (monthPopover) {
		monthPopover.remove()
		monthPopover = null
	}
}

function openFallbackMonthPopover() {
	closeMonthPopover()

	const trigger = document.getElementById('month-trigger')
	if (!trigger) return

	const monthNames = AppUtils.config.MONTH_NAMES
	const selectedYear = currentViewDate.getFullYear()
	const selectedMonth = currentViewDate.getMonth()

	const popover = document.createElement('div')
	popover.className = 'month-fallback-popover'
	popover.setAttribute('role', 'dialog')
	popover.setAttribute('aria-label', 'Wybór miesiąca')

	const monthOptions = monthNames
		.map((name, idx) => `<option value="${idx}" ${idx === selectedMonth ? 'selected' : ''}>${name}</option>`)
		.join('')

	let yearOptions = ''
	for (let year = selectedYear - 5; year <= selectedYear + 5; year += 1) {
		yearOptions += `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}</option>`
	}

	popover.innerHTML = `
		<div class="month-fallback-title">Wybierz miesiąc</div>
		<div class="month-fallback-grid">
			<label class="month-fallback-field">
				<span>Miesiąc</span>
				<select id="fallback-month-select">${monthOptions}</select>
			</label>
			<label class="month-fallback-field">
				<span>Rok</span>
				<select id="fallback-year-select">${yearOptions}</select>
			</label>
		</div>
		<div class="month-fallback-actions">
			<button type="button" class="month-fallback-btn" id="fallback-month-cancel">Anuluj</button>
			<button type="button" class="month-fallback-btn is-primary" id="fallback-month-apply">Zastosuj</button>
		</div>
	`

	document.body.appendChild(popover)
	monthPopover = popover

	const triggerRect = trigger.getBoundingClientRect()
	const popoverRect = popover.getBoundingClientRect()
	const top = triggerRect.bottom + window.scrollY + 8
	const left = Math.max(12, Math.min(triggerRect.left + window.scrollX, window.scrollX + window.innerWidth - popoverRect.width - 12))
	popover.style.top = `${top}px`
	popover.style.left = `${left}px`

	const monthSelect = popover.querySelector('#fallback-month-select')
	const yearSelect = popover.querySelector('#fallback-year-select')
	const applyBtn = popover.querySelector('#fallback-month-apply')
	const cancelBtn = popover.querySelector('#fallback-month-cancel')

	const apply = () => {
		const year = Number(yearSelect.value)
		const month = Number(monthSelect.value)
		if (!year || month < 0 || month > 11) return

		currentViewDate = new Date(year, month, 1)
		renderTable()
		closeMonthPopover()
	}

	applyBtn.addEventListener('click', apply)
	cancelBtn.addEventListener('click', closeMonthPopover)

	const onKeyDown = e => {
		if (e.key === 'Escape') {
			e.preventDefault()
			closeMonthPopover()
		}
	}

	const onDocClick = e => {
		if (!popover.contains(e.target) && !trigger.contains(e.target)) {
			closeMonthPopover()
		}
	}

	window.addEventListener('keydown', onKeyDown)
	setTimeout(() => {
		document.addEventListener('click', onDocClick)
	}, 0)

	monthPopoverCleanup = () => {
		window.removeEventListener('keydown', onKeyDown)
		document.removeEventListener('click', onDocClick)
	}
}

/* ======= INICJALIZACJA ======= */

document.addEventListener('DOMContentLoaded', () => {
	// Obsługa klikania w ikonki akcesoriów
	const accessoryItems = document.querySelectorAll('.accessory-item')

	accessoryItems.forEach(item => {
		item.addEventListener('click', () => {
			item.classList.toggle('active')
			item.style.transform = 'scale(0.9)'
			setTimeout(() => {
				item.style.transform = ''
			}, 100)
		})
	})

	// Obsługa wyboru miesiąca
	const mInput = document.getElementById('hidden-month-input')
	if (mInput) {
		if (!supportsMonthInput()) {
			// Safari fallback: trzymamy tylko wybór miesiąca (bez dni).
			mInput.type = 'text'
			mInput.readOnly = true
			mInput.inputMode = 'none'
		}

		syncMonthInputWithView()

		if (mInput.type === 'month') {
			const handleDatePick = e => {
				const parsed = parseYearMonth(e.target.value)
				if (!parsed) return

				currentViewDate = new Date(parsed.year, parsed.month - 1, 1)
				renderTable()
			}

			mInput.addEventListener('change', handleDatePick)
			mInput.addEventListener('input', handleDatePick)
		}
	}

	// Dostępność: Enter / Spacja na kontenerze miesiąca
	const monthTrigger = document.getElementById('month-trigger')
	if (monthTrigger) {
		monthTrigger.addEventListener('keydown', e => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault()
				openMonthPicker()
			}
		})
	}

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
	if (!display) return

	const monthName = AppUtils.config.MONTH_NAMES[currentViewDate.getMonth()].toUpperCase()
	display.innerText = `${monthName} ${currentViewDate.getFullYear()}`
}

function syncMonthInputWithView() {
	const input = document.getElementById('hidden-month-input')
	if (!input) return

	const year = currentViewDate.getFullYear()
	const month = String(currentViewDate.getMonth() + 1).padStart(2, '0')
	input.value = `${year}-${month}`
}

function openMonthPicker() {
	const input = document.getElementById('hidden-month-input')
	if (!input) return

	syncMonthInputWithView()

	if (input.type !== 'month') {
		openFallbackMonthPopover()
		return
	}

	try {
		if (typeof input.showPicker === 'function') {
			input.showPicker()
			return
		}
	} catch (err) {
		// fallback poniżej
	}

	input.focus()
	input.click()
}

function changeMonth(delta) {
	if (isAnimating) return

	const tbody = document.getElementById('table-body')
	if (!tbody) return

	isAnimating = true

	tbody.classList.remove('slide-in')
	tbody.classList.add('slide-out')

	setTimeout(() => {
		currentViewDate.setMonth(currentViewDate.getMonth() + delta)
		syncMonthInputWithView()
		renderTable()

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
	syncMonthInputWithView()

	const filteredExchanges = exchanges.filter(ex => {
		const exDate = new Date(ex.plannedDate)
		return exDate.getMonth() === currentViewDate.getMonth() && exDate.getFullYear() === currentViewDate.getFullYear()
	})

	if (filteredExchanges.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="7" class="empty-state" style="text-align:center; padding: 40px; color: #94a3b8;">Brak planowanych wymian w tym miesiącu.</td></tr>'
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

		const infoHtml =
			ex.notes && ex.notes.trim() !== ''
				? `<div class="notes-tooltip-container">
					<i class="fas fa-info-circle notes-icon"></i>
					<span class="notes-tooltip-text">${ex.notes}</span>
				</div>`
				: ''

		const accHtml = (ex.accessories || [])
			.map(acc => `<i class="fas ${accessoryIcons[acc] || ''} acc-icon" title="${acc}"></i>`)
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
					${
						!isDone
							? `<button class="btn-table btn-ok" onclick="completeExchange(${originalIndex})" title="Finalizuj" type="button"><i class="fas fa-check"></i></button>`
							: ''
					}
					<button class="btn-table btn-edit" onclick="editExchange(${originalIndex})" title="Edytuj" type="button"><i class="fas fa-edit"></i></button>
					<button class="btn-table btn-delete" onclick="removeItem(${originalIndex})" title="Usuń" type="button"><i class="fas fa-trash"></i></button>
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

	editIndex = index

	document.getElementById('emp-name').value = ex.name
	document.getElementById('exchange-date').value = ex.plannedDate
	document.getElementById('old-sn').value = ex.oldSn
	document.getElementById('new-sn').value = ex.newSn
	document.getElementById('notes').value = ex.notes || ''

	document.querySelectorAll('.accessory-item').forEach(item => {
		const itemName = item.dataset.item
		item.classList.toggle('active', ex.accessories && ex.accessories.includes(itemName))
	})

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
			</button>
		`
	}

	document.querySelector('aside').classList.add('editing-active')
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
		const d = new Date()
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

		const exchangeData = {
			name: document.getElementById('emp-name').value.toUpperCase(),
			plannedDate: document.getElementById('exchange-date').value,
			oldSn: document.getElementById('old-sn').value,
			newSn: document.getElementById('new-sn').value,
			notes: document.getElementById('notes').value,
			accessories: selectedAccessories,
			status: editIndex !== null ? exchanges[editIndex].status : 'pending',
			createdAt: editIndex !== null ? exchanges[editIndex].createdAt : new Date(),
		}

		if (editIndex !== null) {
			exchanges[editIndex] = exchangeData
			editIndex = null
			alert('Zmiany zostały zapisane.')
		} else {
			exchanges.push(exchangeData)
		}

		saveData()

		e.target.reset()
		document.querySelectorAll('.accessory-item').forEach(item => item.classList.remove('active'))
		document.querySelector('aside').classList.remove('editing-active')

		const submitBtn = document.getElementById('submit-btn')
		if (submitBtn) {
			submitBtn.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Zatwierdź i zaplanuj'
			submitBtn.style.background = '#f59e0b'
		}

		const cancelContainer = document.getElementById('cancel-edit-container')
		if (cancelContainer) {
			cancelContainer.innerHTML = ''
		}

		renderTable()
	})
}

/* ======= EXPORT / IMPORT ======= */

function exportExcel() {
	if (exchanges.length === 0) {
		alert('Brak danych do eksportu!')
		return
	}

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

/* ======= GLOBALIZACJA ======= */

window.openMonthPicker = openMonthPicker
window.changeMonth = changeMonth
window.editExchange = editExchange
window.cancelEdit = cancelEdit
window.completeExchange = completeExchange
window.removeItem = removeItem
window.exportExcel = exportExcel
window.importExcel = importExcel
