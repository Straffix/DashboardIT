/* === Hires State And References: Start === */
let hires = []
let editIndex = null
const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.HIRES

const hiresForm = document.getElementById('device-form')
const tableBody = document.getElementById('table-body')
const accessoryPicker = document.getElementById('accessory-picker')
const exportExcelBtn = document.getElementById('export-excel-btn')
const importExcelInput = document.getElementById('importExcelFile')
const importExcelTrigger = document.getElementById('import-excel-trigger')
const openDrawerBtn = document.getElementById('open-hire-drawer')
const closeDrawerBtn = document.getElementById('close-hire-drawer')
const cancelDrawerBtn = document.getElementById('cancel-hire-drawer')
const drawerShell = document.getElementById('hire-drawer-shell')
const drawerBackdrop = document.getElementById('hire-drawer-backdrop')
const drawerTitle = document.getElementById('hire-drawer-title')
const drawerCopy = document.getElementById('hire-drawer-copy')
const submitBtn = document.getElementById('hire-submit-btn')
const monthSummary = document.getElementById('hires-month-summary')

const monthPicker = AppUtils.createMonthPicker({
	onChange: () => renderTable(),
	getCounts: year => {
		const counts = Array.from({ length: 12 }, () => 0)

		hires.forEach(hire => {
			const hireDate = AppUtils.parseDate(hire.date)
			if (!hireDate || hireDate.getFullYear() !== year) return

			counts[hireDate.getMonth()] += 1
		})

		return counts
	},
})
/* === Hires State And References: End === */

/* === Hires Storage: Start === */
function loadData() {
	const saved = localStorage.getItem(STORAGE_KEY)
	const parsedHires = saved ? JSON.parse(saved) : []
	let hasUpdates = false

	hires = parsedHires.map(hire => {
		const normalizedDate = AppUtils.normalizeSpreadsheetDate(hire.date)
		if (normalizedDate && normalizedDate !== hire.date) {
			hasUpdates = true
		}

		return {
			...hire,
			date: normalizedDate || hire.date || '',
		}
	})

	const currentViewDate = monthPicker.getCurrentDate()
	const hasCurrentMonthData = hires.some(hire => AppUtils.isSameMonth(hire.date, currentViewDate))
	if (!hasCurrentMonthData) {
		const latestHireDate = hires
			.map(hire => AppUtils.parseDate(hire.date))
			.filter(Boolean)
			.sort((left, right) => right - left)[0]

		if (latestHireDate) {
			monthPicker.setCurrentDate(latestHireDate, { render: false })
		}
	}

	if (hasUpdates) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(hires))
	}

	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(hires))
	renderTable()
}
/* === Hires Storage: End === */

/* === Hires View Helpers: Start === */
function getCurrentMonthContext() {
	const currentViewDate = monthPicker.getCurrentDate()
	const month = String(currentViewDate.getMonth() + 1).padStart(2, '0')

	return {
		currentViewDate,
		monthKey: `${currentViewDate.getFullYear()}-${month}`,
		monthLabel: `${AppUtils.config.MONTH_NAMES[currentViewDate.getMonth()].toUpperCase()} ${currentViewDate.getFullYear()}`,
	}
}

function getCurrentMonthHires() {
	const { currentViewDate } = getCurrentMonthContext()
	return hires.filter(hire => AppUtils.isSameMonth(hire.date, currentViewDate))
}

function getSelectedAccessories() {
	return Array.from(document.querySelectorAll('.accessory-item.active')).map(item => item.dataset.item)
}

function hasDrawerFormChanges() {
	if (!hiresForm) return false

	const textInputs = Array.from(hiresForm.querySelectorAll('input'))
	const hasValue = textInputs.some(input => {
		if (input.type === 'date') return Boolean(input.value)
		if (input.type === 'text') return input.value.trim() !== ''
		return false
	})

	return hasValue || getSelectedAccessories().length > 0
}

function updateMonthSummary(visibleCount, totalCount, monthLabel) {
	if (!monthSummary) return

	if (totalCount === 0) {
		monthSummary.textContent = `${monthLabel} · baza jest pusta, możesz dodać pierwszy onboarding.`
		return
	}

	if (visibleCount === totalCount) {
		monthSummary.textContent = `${monthLabel} · widoczne wpisy: ${visibleCount}.`
		return
	}

	monthSummary.textContent = `${monthLabel} · widoczne wpisy: ${visibleCount} z ${totalCount} w całej bazie.`
}
/* === Hires View Helpers: End === */

/* === Hires Drawer: Start === */
function resetFormState() {
	editIndex = null

	if (hiresForm) {
		hiresForm.reset()
	}

	document.querySelectorAll('.accessory-item').forEach(item => {
		item.classList.remove('active', 'is-tapped')
	})

	if (drawerTitle) {
		drawerTitle.textContent = 'Dodaj pracownika'
	}

	if (drawerCopy) {
		drawerCopy.textContent = 'Uzupełnij dane i zapisz nowy onboarding.'
	}

	if (submitBtn) {
		submitBtn.classList.remove('btn-submit-primary')
		submitBtn.classList.add('btn-submit-soft-danger')
		submitBtn.textContent = 'Dodaj do listy'
	}
}

function openDrawer() {
	if (!drawerShell) return

	drawerShell.classList.add('is-open')
	drawerShell.setAttribute('aria-hidden', 'false')
	document.body.classList.add('hire-drawer-open')

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
	document.body.classList.remove('hire-drawer-open')
	resetFormState()
	return true
}

function startCreateFlow() {
	resetFormState()
	openDrawer()
}

function startEditFlow(index) {
	const hire = hires[index]
	if (!hire) return

	resetFormState()
	editIndex = index

	document.getElementById('name').value = hire.name || ''
	document.getElementById('ru').value = hire.ru || ''
	document.getElementById('sn').value = hire.sn || ''
	document.getElementById('date').value = AppUtils.normalizeSpreadsheetDate(hire.date) || ''

	document.querySelectorAll('.accessory-item').forEach(item => {
		const itemName = item.dataset.item
		item.classList.toggle('active', hire.accessories && hire.accessories.includes(itemName))
	})

	if (drawerTitle) {
		drawerTitle.textContent = 'Edytuj pracownika'
	}

	if (drawerCopy) {
		drawerCopy.textContent = 'Zmień dane wpisu i zapisz poprawki bez wychodzenia z widoku tabeli.'
	}

	if (submitBtn) {
		submitBtn.classList.remove('btn-submit-soft-danger')
		submitBtn.classList.add('btn-submit-primary')
		submitBtn.textContent = 'Zapisz zmiany'
	}

	openDrawer()
}
/* === Hires Drawer: End === */

/* === Hires Table Rendering: Start === */
function renderTable() {
	if (!tableBody) return
	tableBody.innerHTML = ''
	monthPicker.refreshView()

	const { monthLabel } = getCurrentMonthContext()
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const filteredHires = getCurrentMonthHires()
	updateMonthSummary(filteredHires.length, hires.length, monthLabel)

	if (filteredHires.length === 0) {
		const hiddenCount = hires.length
		tableBody.innerHTML =
			`<tr><td colspan="6" class="empty-state-cell">Brak planowanych zatrudnień w tym miesiącu.${
				hiddenCount > 0 ? `<br><small>W bazie jest jeszcze ${hiddenCount} rekordów, ale eksport Excel działa dla wybranego miesiąca: ${monthLabel}.</small>` : ''
			}</td></tr>`
		return
	}

	filteredHires.forEach(hire => {
		const originalIndex = hires.findIndex(original => original === hire)
		const startDate = AppUtils.parseDate(hire.date)
		const diff = startDate ? Math.ceil((startDate - today) / (1000 * 60 * 60 * 24)) : Number.POSITIVE_INFINITY

		let statusClass = 'ok'
		let statusText = hire.date

		if (!startDate) {
			statusClass = 'near'
			statusText = 'Nieprawidłowa data'
		} else if (diff < 0) {
			statusClass = 'expired'
			statusText = 'Zatrudniony'
		} else if (diff <= 3) {
			statusClass = 'near'
			statusText = AppUtils.formatDate(startDate)
		} else {
			statusText = AppUtils.formatDate(startDate)
		}

		const accessoriesHTML = AppUtils.renderAccessoryIcons(hire.accessories, {
			size: '1rem',
			wrapperClass: 'inline-accessories hires-accessories',
		})

		const row = document.createElement('tr')
		row.innerHTML = `
			<td>
				<span class="hire-name">${hire.name}</span>
			</td>
			<td>
				<span class="hire-ru">${hire.ru || '---'}</span>
			</td>
			<td>
				<span class="hire-sn-badge">${hire.sn || '---'}</span>
			</td>
			<td>
				<span class="status-pill ${statusClass}">${statusText}</span>
			</td>
			<td class="cell-center">${accessoriesHTML}</td>
			<td class="cell-center">
				<div class="hire-actions">
					<button class="icon-button hire-action-btn" type="button" data-action="edit" data-index="${originalIndex}" aria-label="Edytuj wpis" title="Edytuj wpis">
						<i class="fas fa-pen"></i>
					</button>
					<button class="icon-button hire-action-btn hire-action-btn-danger" type="button" data-action="delete" data-index="${originalIndex}" aria-label="Usuń wpis" title="Usuń wpis">
						<i class="fas fa-trash"></i>
					</button>
				</div>
			</td>
		`
		tableBody.appendChild(row)
	})
}
/* === Hires Table Rendering: End === */

/* === Hires Actions: Start === */
function removeItem(index) {
	if (!confirm('Usunąć wpis?')) return

	if (editIndex === index) {
		closeDrawer({ force: true })
	} else if (editIndex !== null && editIndex > index) {
		editIndex -= 1
	}

	hires.splice(index, 1)
	saveData()
}
/* === Hires Actions: End === */

/* === Hires Excel Backup: Start === */
function exportExcel() {
	const { monthKey, monthLabel } = getCurrentMonthContext()
	const hiresToExport = getCurrentMonthHires()

	if (hiresToExport.length === 0) {
		alert(`Arkusz za ${monthLabel} pozostal pusty. Zmien miesiac albo dodaj wpis, a wtedy eksport ruszy bez problemu.`)
		return
	}

	const dataToExport = hiresToExport.map(hire => ({
		'Imię i Nazwisko': hire.name,
		'Dział / Stanowisko': hire.ru,
		'SN Sprzętu': hire.sn,
		'Data rozpoczęcia': hire.date,
		Akcesoria: hire.accessories ? hire.accessories.join(', ') : '',
	}))
	const worksheet = XLSX.utils.json_to_sheet(dataToExport)
	const workbook = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Zatrudnienia')
	XLSX.writeFile(workbook, `zatrudnienia_${monthKey}.xlsx`)
}

function importExcel(event) {
	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = loadEvent => {
		const data = new Uint8Array(loadEvent.target.result)
		const workbook = XLSX.read(data, { type: 'array' })
		const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])

		const importedHires = jsonData.map(row => ({
			name: (row['Imię i Nazwisko'] || '').toString().toUpperCase(),
			ru: row['Dział / Stanowisko'] || '',
			sn: AppUtils.normalizeSN(row['SN Sprzętu']),
			date: AppUtils.normalizeSpreadsheetDate(row['Data rozpoczęcia']) || '',
			accessories: row.Akcesoria ? row.Akcesoria.split(', ').filter(Boolean) : [],
		}))

		if (confirm(`Zaimportować ${importedHires.length} wpisów?`)) {
			hires = [...hires, ...importedHires]
			saveData()
		}

		event.target.value = ''
	}

	reader.readAsArrayBuffer(file)
}
/* === Hires Excel Backup: End === */

/* === Hires Init: Start === */
document.addEventListener('DOMContentLoaded', () => {
	monthPicker.init()
	resetFormState()

	document.querySelectorAll('[data-month-delta]').forEach(button => {
		button.addEventListener('click', () => {
			monthPicker.changeMonth(Number(button.dataset.monthDelta))
		})
	})

	if (accessoryPicker) {
		accessoryPicker.addEventListener('click', event => {
			const item = event.target.closest('.accessory-item')
			if (!item) return

			item.classList.toggle('active')
		})
	}

	if (tableBody) {
		tableBody.addEventListener('click', event => {
			const actionButton = event.target.closest('[data-action]')
			if (!actionButton) return

			const index = Number(actionButton.dataset.index)
			const { action } = actionButton.dataset

			if (action === 'edit') startEditFlow(index)
			if (action === 'delete') removeItem(index)
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

	if (hiresForm) {
		hiresForm.addEventListener('submit', event => {
			event.preventDefault()

			const selectedAccessories = getSelectedAccessories()
			const newHireDate = document.getElementById('date').value
			const hireData = {
				name: document.getElementById('name').value.toUpperCase(),
				ru: document.getElementById('ru').value,
				sn: AppUtils.normalizeSN(document.getElementById('sn').value),
				date: newHireDate,
				accessories: selectedAccessories,
			}

			if (editIndex !== null) {
				hires[editIndex] = hireData
			} else {
				hires.push(hireData)
			}

			monthPicker.setCurrentDate(AppUtils.parseDate(newHireDate) || new Date(), { render: false })
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
/* === Hires Init: End === */
