/* === Hires State And References: Start === */
let hires = []
let editingId = null
const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.HIRES
const ACCESSORIES = [
	{ id: 'monitor', label: 'Monitor' },
	{ id: 'mouse', label: 'Mysz' },
	{ id: 'keyboard', label: 'Klawiatura' },
	{ id: 'yealink', label: 'Yealink' },
	{ id: 'logiZone', label: 'Logi Zone Vibe' },
	{ id: 'lenovo', label: 'Lenovo' },
	{ id: 'bag', label: 'Torba' },
	{ id: 'backpack', label: 'Plecak' },
	{ id: 'laptopStand', label: 'Podstawka pod laptop' },
	{ id: 'presenter', label: 'Prezenter' },
	{ id: 'printer', label: 'Drukarka' },
]

const HANDOVER_STATUSES = [
	{ value: 'W trakcie', tone: 'warn' },
	{ value: 'Gotowy do wydania', tone: 'ready' },
	{ value: 'Wydany', tone: 'ok' },
	{ value: 'Nie odebrano', tone: 'danger' },
	{ value: 'Ponowna dystrybucja', tone: 'danger' },
]

const STATUS_OPTIONS = {
	laptopStatus: HANDOVER_STATUSES,
	monitorStatus: [...HANDOVER_STATUSES, { value: 'Nie zamówiono', tone: 'muted' }],
	laptopEmag: [
		{ value: 'Brak konta', tone: 'danger' },
		{ value: 'Do potwierdzenia', tone: 'warn' },
		{ value: 'Potwierdzony', tone: 'ok' },
	],
	monitorEmag: [
		{ value: 'Brak konta', tone: 'danger' },
		{ value: 'Dokument wystawiony, do potwierdzenia', tone: 'warn' },
		{ value: 'Dokument potwierdzony', tone: 'ok' },
	],
}

const FORM_FIELDS = [
	'serviceDesk',
	'user',
	'startDate',
	'preparedBy',
	'location',
	'laptopSn',
	'laptopRu',
	'laptopStatus',
	'laptopEmag',
	'monitorRu',
	'monitorStatus',
	'monitorEmag',
	'notes',
]

const CSV_COLUMNS = [
	{ field: 'serviceDesk', header: 'Service Desk', asText: true },
	{ field: 'user', header: 'Użytkownik' },
	{ field: 'startDate', header: 'Data startu' },
	{ field: 'preparedBy', header: 'Przygotował/a' },
	{ field: 'location', header: 'Lokalizacja' },
	{ field: 'laptopSn', header: 'Laptop SN', asText: true },
	{ field: 'laptopRu', header: 'Laptop RU', asText: true },
	{ field: 'laptopStatus', header: 'Laptop status' },
	{ field: 'laptopEmag', header: 'Laptop eMag' },
	{ field: 'monitorRu', header: 'Monitor RU', asText: true },
	{ field: 'monitorStatus', header: 'Monitor status' },
	{ field: 'monitorEmag', header: 'Monitor eMag' },
	{ field: 'notes', header: 'Uwagi' },
]

const tableBody = document.getElementById('table-body')
const exportExcelBtn = document.getElementById('export-excel-btn')
const importExcelInput = document.getElementById('importExcelFile')
const importExcelTrigger = document.getElementById('import-excel-trigger')
const addHireBtn = document.getElementById('add-hire-btn')
const hireDialog = document.getElementById('hire-dialog')
const hireForm = document.getElementById('hire-form')
const hireDialogTitle = document.getElementById('hire-dialog-title')
const hireSubmitBtn = document.getElementById('hire-submit-btn')
const hireCancelBtn = document.getElementById('hire-cancel-btn')
const accessoriesBox = document.getElementById('hire-accessories')
const preparedByList = document.getElementById('prepared-by-list')
const searchInput = document.getElementById('hire-search')
const monthHeader = document.querySelector('.table-header')

const monthDisplay = document.getElementById('current-month-display')
const monthPopover = document.getElementById('month-popover')
const yearSelect = document.getElementById('year-select')
const monthCells = document.querySelectorAll('.month-cell')

let viewYear = new Date().getFullYear()
let viewMonth = new Date().getMonth()
/* === Hires State And References: End === */

/* === Hires Storage: Start === */
function loadData() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY)
		const parsed = saved ? JSON.parse(saved) : []
		hires = Array.isArray(parsed) ? parsed.map(addMeta) : []
	} catch (error) {
		hires = []
	}
	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(hires))
	renderTable()
}
/* === Hires Storage: End === */

/* === Hires Month Picker: Start === */
function isInMonth(hire, year, month) {
	const startDate = new Date(hire.startDate)
	return startDate.getFullYear() === year && startDate.getMonth() === month
}

function showMonth(year, month) {
	const date = new Date(year, month, 1)
	viewYear = date.getFullYear()
	viewMonth = date.getMonth()
	renderTable()
}

function fillYearSelect() {
	const years = hires.map(hire => new Date(hire.startDate).getFullYear()).filter(Boolean)
	const firstYear = Math.min(viewYear - 1, ...years)
	const lastYear = Math.max(viewYear + 1, ...years)

	yearSelect.replaceChildren()
	for (let year = firstYear; year <= lastYear; year++) {
		yearSelect.append(new Option(year, year))
	}
	yearSelect.value = viewYear
}

function renderMonthGrid() {
	const year = Number(yearSelect.value)

	monthCells.forEach(cell => {
		const month = Number(cell.dataset.month)
		const count = hires.filter(hire => isInMonth(hire, year, month)).length
		cell.classList.toggle('is-active', year === viewYear && month === viewMonth)
		cell.querySelector('.month-count').textContent = count || ''
	})
}
/* === Hires Month Picker: End === */

/* === Hires Table Rendering: Start === */
function getAccessoryLabel(id) {
	const accessory = ACCESSORIES.find(item => item.id === id)
	return accessory ? accessory.label : id
}

function getTone(field, value) {
	const option = STATUS_OPTIONS[field].find(item => item.value === value)
	return option ? option.tone : 'empty'
}

function createStatusCell(hire, field) {
	const select = createEl('select', `status-select is-${getTone(field, hire[field])}`)
	select.dataset.id = hire.id
	select.dataset.field = field
	fillSelect(select, field, '—')
	select.value = hire[field] || ''

	const cell = createEl('td')
	cell.append(select)
	return cell
}

function createAccessoriesCell(hire) {
	const cell = createEl('td')
	if (hire.accessories.length === 0) return cell

	const preparedCount = hire.accessories.filter(id => hire.preparedAccessories.includes(id)).length
	cell.append(createEl('p', 'acc-progress', `Przygotowane: ${preparedCount}/${hire.accessories.length}`))

	const chips = createEl('div', 'acc-chips')
	hire.accessories.forEach(accessoryId => {
		const isPrepared = hire.preparedAccessories.includes(accessoryId)
		const chip = createEl('button', 'acc-chip', getAccessoryLabel(accessoryId))
		chip.type = 'button'
		chip.classList.toggle('is-prepared', isPrepared)
		chip.setAttribute('aria-pressed', isPrepared)
		chip.dataset.action = 'toggle-accessory'
		chip.dataset.id = hire.id
		chip.dataset.accessory = accessoryId
		chips.append(chip)
	})

	cell.append(chips)
	return cell
}

function renderTable() {
	tableBody.replaceChildren()
	monthDisplay.textContent = `${APP_CONFIG.MONTH_NAMES[viewMonth].toUpperCase()} ${viewYear}`

	const query = searchInput.value.trim().toUpperCase()
	monthHeader.classList.toggle('is-hidden', Boolean(query))

	const shownHires = hires
		.filter(hire => {
			if (query) {
				const searchText = [hire.user, hire.serviceDesk, hire.laptopSn, hire.laptopRu, hire.monitorRu, hire.location]
					.join(' ')
					.toUpperCase()
				return searchText.includes(query)
			}
			return isInMonth(hire, viewYear, viewMonth)
		})
		.sort((a, b) => a.startDate.localeCompare(b.startDate))

	if (shownHires.length === 0) {
		const message = query ? 'Brak wyników we wszystkich miesiącach.' : 'Brak planowanych zatrudnień w tym miesiącu.'
		appendEmptyRow(tableBody, message, 12)
	}

	let lastMonth = ''

	shownHires.forEach(hire => {
		if (query) {
			const monthName = new Date(hire.startDate).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
			if (monthName !== lastMonth) {
				const monthRow = createEl('tr')
				const monthCell = createEl('td', 'month-group-cell', monthName)
				monthCell.colSpan = 12
				monthRow.append(monthCell)
				tableBody.append(monthRow)
				lastMonth = monthName
			}
		}

		const userCell = createEl('td')
		userCell.append(createEl('p', 'device-name', hire.user))
		const meta = [hire.preparedBy, hire.location].filter(Boolean).join(' · ')
		if (meta) userCell.append(createEl('p', 'device-meta', meta))

		const snCell = createEl('td')
		if (hire.laptopSn) snCell.append(createEl('span', 'sn-pill', hire.laptopSn))

		const actions = createEl('div', 'row-actions')
		actions.append(
			createActionButton('edit', 'fa-pen-to-square', 'Edytuj', hire.id),
			createActionButton('delete', 'fa-trash', 'Usuń', hire.id),
		)
		const actionsCell = createEl('td', 'cell-right')
		actionsCell.append(actions)

		const row = createEl('tr')
		row.append(
			createEl('td', '', hire.serviceDesk),
			userCell,
			createEl('td', '', hire.startDate),
			snCell,
			createEl('td', '', hire.laptopRu),
			createStatusCell(hire, 'laptopStatus'),
			createStatusCell(hire, 'laptopEmag'),
			createEl('td', '', hire.monitorRu),
			createStatusCell(hire, 'monitorStatus'),
			createStatusCell(hire, 'monitorEmag'),
			createAccessoriesCell(hire),
			actionsCell,
		)
		tableBody.append(row)
	})
}
/* === Hires Table Rendering: End === */

/* === Hires Actions: Start === */
function removeItem(id) {
	if (!confirm('Usunąć wpis?')) return

	hires = hires.filter(hire => hire.id !== id)
	saveData()
}

function toggleAccessory(id, accessoryId) {
	const hire = hires.find(item => item.id === id)

	if (hire.preparedAccessories.includes(accessoryId)) {
		hire.preparedAccessories = hire.preparedAccessories.filter(item => item !== accessoryId)
	} else {
		hire.preparedAccessories.push(accessoryId)
	}

	hire.updatedAt = AppUtils.formatDate(new Date())
	saveData()
}
/* === Hires Actions: End === */

/* === Hires Form: Start === */
function fillSelect(select, field, emptyText) {
	const emptyOption = createEl('option', '', emptyText)
	emptyOption.value = ''
	select.append(emptyOption)
	STATUS_OPTIONS[field].forEach(option => select.append(createEl('option', '', option.value)))
}

function fillFormOptions() {
	Object.keys(STATUS_OPTIONS).forEach(field => fillSelect(document.getElementById(field), field, '— wybierz —'))

	ACCESSORIES.forEach(accessory => {
		const item = createEl('label', 'check-item')
		const checkbox = createEl('input')
		checkbox.type = 'checkbox'
		checkbox.value = accessory.id
		item.append(checkbox, createEl('span', '', accessory.label))
		accessoriesBox.append(item)
	})
}

function updatePreparedByList() {
	const names = [...new Set(hires.map(hire => hire.preparedBy).filter(Boolean))].sort()
	preparedByList.replaceChildren(...names.map(name => createEl('option', '', name)))
}

function openHireDialog(hire) {
	hireForm.reset()
	editingId = hire ? hire.id : null
	hireDialogTitle.textContent = hire ? 'Edytuj pracownika' : 'Dodaj pracownika'
	hireSubmitBtn.textContent = hire ? 'Zapisz zmiany' : 'Dodaj pracownika'
	updatePreparedByList()

	if (hire) {
		FORM_FIELDS.forEach(field => {
			document.getElementById(field).value = hire[field] || ''
		})
		accessoriesBox.querySelectorAll('input').forEach(checkbox => {
			checkbox.checked = hire.accessories.includes(checkbox.value)
		})
	}

	hireDialog.showModal()
}

function saveHire(event) {
	event.preventDefault()

	const data = {}
	FORM_FIELDS.forEach(field => {
		data[field] = document.getElementById(field).value.trim()
	})
	data.laptopSn = AppUtils.normalizeSN(data.laptopSn)
	data.accessories = Array.from(accessoriesBox.querySelectorAll('input:checked'), checkbox => checkbox.value)

	if (!data.user) return alert('Wpisz użytkownika.')

	const today = AppUtils.formatDate(new Date())

	if (editingId) {
		const hire = hires.find(item => item.id === editingId)
		Object.assign(hire, data, { updatedAt: today })
		hire.preparedAccessories = hire.preparedAccessories.filter(id => data.accessories.includes(id))
	} else {
		hires.push({ ...data, preparedAccessories: [], id: AppUtils.createId(), createdAt: today, updatedAt: today })
	}

	const savedDate = new Date(data.startDate)
	viewYear = savedDate.getFullYear()
	viewMonth = savedDate.getMonth()
	saveData()
	hireDialog.close()
}
/* === Hires Form: End === */

/* === Hires Excel Backup: Start === */
function exportExcel() {
	if (hires.length === 0) return alert('Brak danych do eksportu!')

	const dataToExport = hires.map(hire => {
		const row = {}
		CSV_COLUMNS.forEach(column => {
			const value = hire[column.field] || ''
			row[column.header] = column.asText ? AppUtils.asExcelText(value) : value
		})
		row.Akcesoria = hire.accessories.map(getAccessoryLabel).join(', ')
		row.Przygotowane = hire.preparedAccessories.map(getAccessoryLabel).join(', ')
		return row
	})

	AppUtils.downloadCSV(dataToExport, `zatrudnienia_${AppUtils.formatDate(new Date())}.csv`)
}

function labelsToIds(text) {
	return (text || '')
		.split(',')
		.map(label => label.trim())
		.filter(Boolean)
		.map(label => {
			const accessory = ACCESSORIES.find(item => item.label === label)
			return accessory ? accessory.id : label
		})
}

function importExcel(event) {
	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = loadEvent => {
		const rows = AppUtils.parseCSV(loadEvent.target.result)

		const imported = rows
			.map(row => {
				const hire = {}
				CSV_COLUMNS.forEach(column => {
					hire[column.field] = row[column.header] || ''
				})
				hire.startDate = AppUtils.normalizeDate(hire.startDate)
				hire.laptopSn = AppUtils.normalizeSN(hire.laptopSn)
				hire.accessories = labelsToIds(row.Akcesoria)
				hire.preparedAccessories = labelsToIds(row.Przygotowane).filter(id => hire.accessories.includes(id))
				return addMeta(hire)
			})
			.filter(hire => hire.user && hire.startDate)

		if (imported.length === 0) {
			alert('Plik jest pusty albo ma zły format.')
		} else if (confirm(`Zastąpić obecne dane (${hires.length}) danymi z pliku (${imported.length})?`)) {
			hires = imported
			saveData()
		}

		event.target.value = ''
	}

	reader.readAsText(file, 'UTF-8')
}
/* === Hires Excel Backup: End === */

/* === Hires Init: Start === */
document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('[data-month-delta]').forEach(button => {
		button.addEventListener('click', () => {
			showMonth(viewYear, viewMonth + Number(button.dataset.monthDelta))
		})
	})

	monthPopover.addEventListener('toggle', event => {
		if (event.newState === 'open') {
			fillYearSelect()
			renderMonthGrid()
		}
	})

	yearSelect.addEventListener('change', renderMonthGrid)

	monthCells.forEach(cell => {
		cell.addEventListener('click', () => {
			showMonth(Number(yearSelect.value), Number(cell.dataset.month))
			monthPopover.hidePopover()
		})
	})

	tableBody.addEventListener('click', event => {
		const actionButton = event.target.closest('[data-action]')
		if (!actionButton) return

		const id = actionButton.dataset.id
		if (actionButton.dataset.action === 'edit') openHireDialog(hires.find(hire => hire.id === id))
		if (actionButton.dataset.action === 'delete') removeItem(id)
		if (actionButton.dataset.action === 'toggle-accessory') toggleAccessory(id, actionButton.dataset.accessory)
	})

	tableBody.addEventListener('change', event => {
		const select = event.target.closest('.status-select')
		if (!select) return

		const hire = hires.find(item => item.id === select.dataset.id)
		hire[select.dataset.field] = select.value
		hire.updatedAt = AppUtils.formatDate(new Date())
		saveData()
	})

	fillFormOptions()
	hireForm.addEventListener('submit', saveHire)
	addHireBtn.addEventListener('click', () => openHireDialog())
	searchInput.addEventListener('input', renderTable)
	hireCancelBtn.addEventListener('click', () => hireDialog.close())

	if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportExcel)
	if (importExcelTrigger && importExcelInput) {
		importExcelTrigger.addEventListener('click', () => importExcelInput.click())
		importExcelInput.addEventListener('change', importExcel)
	}

	loadData()
})
/* === Hires Init: End === */
