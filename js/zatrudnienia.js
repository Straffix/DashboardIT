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

const monthPicker = AppUtils.createMonthPicker({
	onChange: () => renderTable(),
})
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

/* === Hires Table Rendering: Start === */
function getAccessoryLabel(id) {
	const accessory = ACCESSORIES.find(item => item.id === id)
	return accessory ? accessory.label : id
}

function renderTable() {
	tableBody.replaceChildren()
	monthPicker.refreshView()

	const viewDate = monthPicker.getCurrentDate()
	const monthHires = hires
		.filter(hire => {
			const startDate = new Date(hire.startDate)
			return startDate.getMonth() === viewDate.getMonth() && startDate.getFullYear() === viewDate.getFullYear()
		})
		.sort((a, b) => a.startDate.localeCompare(b.startDate))

	if (monthHires.length === 0) appendEmptyRow(tableBody, 'Brak planowanych zatrudnień w tym miesiącu.', 12)

	monthHires.forEach(hire => {
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
			createEl('td', '', hire.laptopStatus),
			createEl('td', '', hire.laptopEmag),
			createEl('td', '', hire.monitorRu),
			createEl('td', '', hire.monitorStatus),
			createEl('td', '', hire.monitorEmag),
			createEl('td', '', hire.accessories.map(getAccessoryLabel).join(', ')),
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

/* === Hires Actions: End === */

/* === Hires Form: Start === */
function fillFormOptions() {
	Object.entries(STATUS_OPTIONS).forEach(([field, options]) => {
		const select = document.getElementById(field)
		const emptyOption = createEl('option', '', '— wybierz —')
		emptyOption.value = ''
		select.append(emptyOption)
		options.forEach(option => select.append(createEl('option', '', option.value)))
	})

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

	monthPicker.setCurrentDate(new Date(data.startDate), { render: false })
	saveData()
	hireDialog.close()
}
/* === Hires Form: End === */

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

	tableBody.addEventListener('click', event => {
		const actionButton = event.target.closest('[data-action]')
		if (!actionButton) return

		const id = actionButton.dataset.id
		if (actionButton.dataset.action === 'edit') openHireDialog(hires.find(hire => hire.id === id))
		if (actionButton.dataset.action === 'delete') removeItem(id)
	})

	fillFormOptions()
	hireForm.addEventListener('submit', saveHire)
	addHireBtn.addEventListener('click', () => openHireDialog())
	hireCancelBtn.addEventListener('click', () => hireDialog.close())

	if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportExcel)
	if (importExcelTrigger && importExcelInput) {
		importExcelTrigger.addEventListener('click', () => importExcelInput.click())
		importExcelInput.addEventListener('change', importExcel)
	}

	loadData()
})
/* === Hires Init: End === */
