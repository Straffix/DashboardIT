let hires = []
const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.HIRES

let currentViewDate = new Date()
let isAnimating = false
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

/* ======= DANE (LocalStorage) ======= */

function loadData() {
	const saved = localStorage.getItem(STORAGE_KEY)
	hires = saved ? JSON.parse(saved) : []
	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(hires))
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

function setViewDateFromInputValue(value) {
	const parsed = parseYearMonth(value)
	if (!parsed) return

	currentViewDate = new Date(parsed.year, parsed.month - 1, 1)
	renderTable()
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

/* ======= LOGIKA AKCESORIÓW ======= */

document.addEventListener('click', e => {
	const item = e.target.closest('.accessory-item')
	if (item) {
		item.classList.toggle('active')
	}
})

/* ======= RENDER TABELI ======= */

function renderTable() {
	const tbody = document.getElementById('table-body')
	if (!tbody) return
	tbody.innerHTML = ''

	updateMonthDisplay()
	syncMonthInputWithView()

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

		const accessoriesHTML = AppUtils.renderAccessoryIcons(h.accessories, '1.2rem')

		const row = document.createElement('tr')
		row.innerHTML = `
            <td><b>${h.name}</b></td>
            <td>${h.ru}</td>
            <td>${h.sn}</td>
            <td><span class="status-pill ${statusClass}">${statusText}</span></td>
            <td style="text-align:center">${accessoriesHTML}</td>
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

/* ======= FORMULARZ ======= */

const deviceForm = document.getElementById('device-form')
if (deviceForm) {
	deviceForm.addEventListener('submit', e => {
		e.preventDefault()

		const selectedAcc = []
		document.querySelectorAll('.accessory-item.active').forEach(item => {
			selectedAcc.push(item.dataset.item)
		})

		const newHireDate = document.getElementById('date').value

		hires.push({
			name: document.getElementById('name').value.toUpperCase(),
			ru: document.getElementById('ru').value,
			sn: AppUtils.normalizeSN(document.getElementById('sn').value),
			date: newHireDate,
			accessories: selectedAcc,
		})

		currentViewDate = new Date(newHireDate)
		e.target.reset()
		document.querySelectorAll('.accessory-item').forEach(i => i.classList.remove('active'))
		saveData()
	})
}

/* ======= EKSPORT / IMPORT EXCEL ======= */

function exportExcel() {
	if (hires.length === 0) return alert('Brak danych!')
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
	XLSX.writeFile(workbook, `zatrudnienia_${AppUtils.formatDate(new Date())}.xlsx`)
}

function importExcel(event) {
	const file = event.target.files[0]
	if (!file) return
	const reader = new FileReader()
	reader.onload = function (e) {
		const data = new Uint8Array(e.target.result)
		const workbook = XLSX.read(data, { type: 'array' })
		const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])

		const importedHires = jsonData.map(row => ({
			name: (row['Imię i Nazwisko'] || '').toString().toUpperCase(),
			ru: row['Dział / Stanowisko'] || '',
			sn: AppUtils.normalizeSN(row['SN Sprzętu']),
			date: row['Data rozpoczęcia'] || '',
			accessories: row['Akcesoria'] ? row['Akcesoria'].split(', ').filter(a => a) : [],
		}))

		if (confirm(`Zaimportować ${importedHires.length} wpisów?`)) {
			hires = [...hires, ...importedHires]
			saveData()
		}
		event.target.value = ''
	}
	reader.readAsArrayBuffer(file)
}

document.addEventListener('DOMContentLoaded', () => {
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
				setViewDateFromInputValue(e.target.value)
			}

			mInput.addEventListener('change', handleDatePick)
			mInput.addEventListener('input', handleDatePick)
		}
	}

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

/* ======= START I GLOBALIZACJA ======= */

window.openMonthPicker = openMonthPicker
window.changeMonth = changeMonth
window.removeItem = removeItem
window.exportExcel = exportExcel
window.importExcel = importExcel
