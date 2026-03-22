/* === Hires State And References: Start === */
let hires = []
const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.HIRES

const hiresForm = document.getElementById('device-form')
const tableBody = document.getElementById('table-body')
const accessoryPicker = document.getElementById('accessory-picker')
const exportExcelBtn = document.getElementById('export-excel-btn')
const importExcelInput = document.getElementById('importExcelFile')
const importExcelTrigger = document.getElementById('import-excel-trigger')

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
/* === Hires View Helpers: End === */

/* === Hires Table Rendering: Start === */
function renderTable() {
	if (!tableBody) return
	tableBody.innerHTML = ''
	monthPicker.refreshView()

	const { monthLabel } = getCurrentMonthContext()
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const filteredHires = getCurrentMonthHires()

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
		}

		const accessoriesHTML = AppUtils.renderAccessoryIcons(hire.accessories, {
			size: '1rem',
			maxVisible: 9,
			columns: 3,
			wrapperClass: 'inline-accessories accessories-table',
		})

		const row = document.createElement('tr')
		row.innerHTML = `
			<td><b>${hire.name}</b></td>
			<td>${hire.ru}</td>
			<td>${hire.sn}</td>
			<td><span class="status-pill ${statusClass}">${statusText}</span></td>
			<td class="cell-center">${accessoriesHTML}</td>
			<td class="cell-right">
				<button class="icon-button delete-btn" type="button" data-action="delete" data-index="${originalIndex}" aria-label="Usuń wpis">
					<i class="fas fa-trash"></i>
				</button>
			</td>
		`
		tableBody.appendChild(row)
	})
}
/* === Hires Table Rendering: End === */

/* === Hires Actions: Start === */
function removeItem(index) {
	if (!confirm('Usunąć wpis?')) return

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
			const actionButton = event.target.closest('[data-action="delete"]')
			if (!actionButton) return

			removeItem(Number(actionButton.dataset.index))
		})
	}

	if (hiresForm) {
		hiresForm.addEventListener('submit', event => {
			event.preventDefault()

			const selectedAccessories = Array.from(document.querySelectorAll('.accessory-item.active')).map(item => item.dataset.item)
			const newHireDate = document.getElementById('date').value

			hires.push({
				name: document.getElementById('name').value.toUpperCase(),
				ru: document.getElementById('ru').value,
				sn: AppUtils.normalizeSN(document.getElementById('sn').value),
				date: newHireDate,
				accessories: selectedAccessories,
			})

			monthPicker.setCurrentDate(AppUtils.parseDate(newHireDate) || new Date(), { render: false })
			event.target.reset()
			document.querySelectorAll('.accessory-item').forEach(item => item.classList.remove('active'))
			saveData()
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
