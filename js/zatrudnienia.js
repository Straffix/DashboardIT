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
})
/* === Hires State And References: End === */

/* === Hires Storage: Start === */
function loadData() {
	const saved = localStorage.getItem(STORAGE_KEY)
	hires = saved ? JSON.parse(saved) : []
	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(hires))
	renderTable()
}
/* === Hires Storage: End === */

/* === Hires Table Rendering: Start === */
function renderTable() {
	if (!tableBody) return
	tableBody.innerHTML = ''
	monthPicker.refreshView()

	const currentViewDate = monthPicker.getCurrentDate()
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const filteredHires = hires.filter(hire => {
		const hireDate = new Date(hire.date)
		return (
			hireDate.getMonth() === currentViewDate.getMonth() && hireDate.getFullYear() === currentViewDate.getFullYear()
		)
	})

	if (filteredHires.length === 0) {
		tableBody.innerHTML =
			'<tr><td colspan="6" class="empty-state-cell">Brak planowanych zatrudnień w tym miesiącu.</td></tr>'
		return
	}

	filteredHires.forEach(hire => {
		const originalIndex = hires.findIndex(original => original === hire)
		const startDate = new Date(hire.date)
		const diff = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24))

		let statusClass = 'ok'
		let statusText = hire.date

		if (diff < 0) {
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
					<i class="fa-solid fa-trash"></i>
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
	if (hires.length === 0) return alert('Brak danych!')

	const dataToExport = hires.map(hire => ({
		'Imię i Nazwisko': hire.name,
		'Dział / Stanowisko': hire.ru,
		'SN Sprzętu': AppUtils.asExcelText(hire.sn),
		'Data rozpoczęcia': hire.date,
		Akcesoria: hire.accessories ? hire.accessories.join(', ') : '',
	}))
	AppUtils.downloadCSV(dataToExport, `zatrudnienia_${AppUtils.formatDate(new Date())}.csv`)
}

function importExcel(event) {
	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = loadEvent => {
		const rows = AppUtils.parseCSV(loadEvent.target.result)

		const importedHires = rows.map(row => ({
			name: (row['Imię i Nazwisko'] || '').toString().toUpperCase(),
			ru: row['Dział / Stanowisko'] || '',
			sn: AppUtils.normalizeSN(row['SN Sprzętu']),
			date: AppUtils.normalizeDate(row['Data rozpoczęcia']),
			accessories: row.Akcesoria
				? row.Akcesoria.split(',')
						.map(item => item.trim())
						.filter(Boolean)
				: [],
		}))

		if (importedHires.length === 0) {
			alert('Plik jest pusty albo ma zły format.')
		} else if (confirm(`Zastąpić obecne dane (${hires.length}) danymi z pliku (${importedHires.length})?`)) {
			hires = importedHires
			saveData()
		}

		event.target.value = ''
	}

	reader.readAsText(file, 'UTF-8')
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

			const selectedAccessories = Array.from(document.querySelectorAll('.accessory-item.active')).map(
				item => item.dataset.item,
			)
			const newHireDate = document.getElementById('date').value

			hires.push({
				name: document.getElementById('name').value.toUpperCase(),
				ru: document.getElementById('ru').value,
				sn: AppUtils.normalizeSN(document.getElementById('sn').value),
				date: newHireDate,
				accessories: selectedAccessories,
			})

			monthPicker.setCurrentDate(new Date(newHireDate), { render: false })
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
