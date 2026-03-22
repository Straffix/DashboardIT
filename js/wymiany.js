/* === Exchanges State And References: Start === */
let exchanges = []
let editIndex = null
const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.EXCHANGES

const exchangeForm = document.getElementById('exchange-form')
const exchangeAside = document.querySelector('aside')
const tableBody = document.getElementById('table-body')
const accessoryPicker = document.getElementById('accessory-picker')
const submitBtn = document.getElementById('submit-btn')
const cancelEditBtn = document.getElementById('cancel-edit-btn')
const exportExcelBtn = document.getElementById('export-excel-btn')
const importExcelInput = document.getElementById('importExcelFile')
const importExcelTrigger = document.getElementById('import-excel-trigger')

const monthPicker = AppUtils.createMonthPicker({
	onChange: () => renderTable(),
	getCounts: year => {
		const counts = Array.from({ length: 12 }, () => 0)

		exchanges.forEach(exchange => {
			const exchangeDate = AppUtils.parseDate(exchange.plannedDate)
			if (!exchangeDate || exchangeDate.getFullYear() !== year) return

			counts[exchangeDate.getMonth()] += 1
		})

		return counts
	},
})
/* === Exchanges State And References: End === */

/* === Exchanges Storage: Start === */
function loadData() {
	const saved = localStorage.getItem(STORAGE_KEY)
	const parsedExchanges = saved ? JSON.parse(saved) : []
	let hasUpdates = false

	exchanges = parsedExchanges.map(exchange => {
		const normalizedDate = AppUtils.normalizeSpreadsheetDate(exchange.plannedDate)
		if (normalizedDate && normalizedDate !== exchange.plannedDate) {
			hasUpdates = true
		}

		return {
			...exchange,
			plannedDate: normalizedDate || exchange.plannedDate || '',
		}
	})

	const currentViewDate = monthPicker.getCurrentDate()
	const hasCurrentMonthData = exchanges.some(exchange => AppUtils.isSameMonth(exchange.plannedDate, currentViewDate))
	if (!hasCurrentMonthData) {
		const latestExchangeDate = exchanges
			.map(exchange => AppUtils.parseDate(exchange.plannedDate))
			.filter(Boolean)
			.sort((left, right) => right - left)[0]

		if (latestExchangeDate) {
			monthPicker.setCurrentDate(latestExchangeDate, { render: false })
		}
	}

	if (hasUpdates) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(exchanges))
	}

	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(exchanges))
	renderTable()
}
/* === Exchanges Storage: End === */

/* === Exchanges View Helpers: Start === */
function getCurrentMonthContext() {
	const currentViewDate = monthPicker.getCurrentDate()
	const month = String(currentViewDate.getMonth() + 1).padStart(2, '0')

	return {
		currentViewDate,
		monthKey: `${currentViewDate.getFullYear()}-${month}`,
		monthLabel: `${AppUtils.config.MONTH_NAMES[currentViewDate.getMonth()].toUpperCase()} ${currentViewDate.getFullYear()}`,
	}
}

function getCurrentMonthExchanges() {
	const { currentViewDate } = getCurrentMonthContext()
	return exchanges.filter(exchange => AppUtils.isSameMonth(exchange.plannedDate, currentViewDate))
}
/* === Exchanges View Helpers: End === */

/* === Exchanges Form State: Start === */
function getSelectedAccessories() {
	return Array.from(document.querySelectorAll('.accessory-item.active')).map(item => item.dataset.item)
}

function resetFormState() {
	editIndex = null

	if (exchangeForm) {
		exchangeForm.reset()
	}

	document.querySelectorAll('.accessory-item').forEach(item => {
		item.classList.remove('active', 'is-tapped')
	})

	if (submitBtn) {
		submitBtn.classList.remove('btn-submit-primary')
		submitBtn.classList.add('btn-submit-warning')
		submitBtn.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Zatwierdź i zaplanuj'
	}

	if (cancelEditBtn) {
		cancelEditBtn.classList.add('is-hidden')
	}

	if (exchangeAside) {
		exchangeAside.classList.remove('editing-active')
	}
}
/* === Exchanges Form State: End === */

/* === Exchanges Table Rendering: Start === */
function renderTable() {
	if (!tableBody) return
	tableBody.innerHTML = ''
	monthPicker.refreshView()

	const { monthLabel } = getCurrentMonthContext()
	const filteredExchanges = getCurrentMonthExchanges()

	if (filteredExchanges.length === 0) {
		const hiddenCount = exchanges.length
		tableBody.innerHTML = `<tr><td colspan="7" class="empty-state-cell">Brak planowanych wymian w tym miesiącu.${
			hiddenCount > 0 ? `<br><small>W bazie jest jeszcze ${hiddenCount} rekordów, ale eksport Excel działa dla wybranego miesiąca: ${monthLabel}.</small>` : ''
		}</td></tr>`
		return
	}

	filteredExchanges.forEach(exchange => {
		const originalIndex = exchanges.findIndex(original => original === exchange)
		const isDone = exchange.status === 'done'
		const row = document.createElement('tr')

		if (isDone) {
			row.classList.add('is-done')
		}

		const infoHtml =
			exchange.notes && exchange.notes.trim() !== ''
				? `<div class="notes-tooltip-container">
						<i class="fas fa-info-circle notes-icon"></i>
						<span class="notes-tooltip-text">${exchange.notes}</span>
					</div>`
				: ''

		const accessoriesHtml = AppUtils.renderAccessoryIcons(exchange.accessories, {
			size: '1rem',
			maxVisible: 9,
			columns: 3,
			wrapperClass: 'inline-accessories accessories-table',
		})

		row.innerHTML = `
			<td class="col-info-narrow">
				<div class="td-info-center">${infoHtml}</div>
			</td>
			<td class="col-worker">
				<span class="worker-name">${exchange.name}</span>
			</td>
			<td class="col-date">
				<span class="date-text">${exchange.plannedDate}</span>
			</td>
			<td class="col-laptop">
				<span class="sn-badge out">RU: ${exchange.oldSn || '---'}</span>
			</td>
			<td class="col-laptop">
				<span class="sn-badge in">RU: ${exchange.newSn || '---'}</span>
			</td>
			<td class="col-acc">${accessoriesHtml}</td>
			<td class="col-actions">
				<div class="action-wrapper">
					${
						!isDone
							? `<button class="btn-table btn-ok" type="button" data-action="complete" data-index="${originalIndex}" title="Finalizuj"><i class="fas fa-check"></i></button>`
							: ''
					}
					<button class="btn-table btn-edit" type="button" data-action="edit" data-index="${originalIndex}" title="Edytuj"><i class="fas fa-edit"></i></button>
					<button class="btn-table btn-delete" type="button" data-action="delete" data-index="${originalIndex}" title="Usuń"><i class="fas fa-trash"></i></button>
				</div>
			</td>
		`

		tableBody.appendChild(row)
	})
}
/* === Exchanges Table Rendering: End === */

/* === Exchanges Actions: Start === */
function editExchange(index) {
	const exchange = exchanges[index]
	if (!exchange) return

	editIndex = index

	document.getElementById('emp-name').value = exchange.name
	document.getElementById('exchange-date').value = AppUtils.normalizeSpreadsheetDate(exchange.plannedDate) || ''
	document.getElementById('old-sn').value = exchange.oldSn
	document.getElementById('new-sn').value = exchange.newSn
	document.getElementById('notes').value = exchange.notes || ''

	document.querySelectorAll('.accessory-item').forEach(item => {
		const itemName = item.dataset.item
		item.classList.toggle('active', exchange.accessories && exchange.accessories.includes(itemName))
	})

	if (submitBtn) {
		submitBtn.classList.remove('btn-submit-warning')
		submitBtn.classList.add('btn-submit-primary')
		submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Zapisz zmiany'
	}

	if (cancelEditBtn) {
		cancelEditBtn.classList.remove('is-hidden')
	}

	if (exchangeAside) {
		exchangeAside.classList.add('editing-active')
	}

	monthPicker.setCurrentDate(AppUtils.parseDate(exchange.plannedDate) || new Date(), { render: false })
	renderTable()
	window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit() {
	if (!confirm('Anulować edycję? Zmiany nie zostaną zapisane.')) return
	resetFormState()
}

function completeExchange(index) {
	const exchange = exchanges[index]
	if (!exchange || exchange.status === 'done') return
	if (!confirm(`Sfinalizować wymianę dla: ${exchange.name}?`)) return

	const monitorKey = AppUtils.config.STORAGE_KEYS.MONITOR
	let monitorData = JSON.parse(localStorage.getItem(monitorKey)) || []

	if (exchange.oldSn) {
		const cleanOldSn = AppUtils.normalizeSN(exchange.oldSn)
		monitorData = monitorData.filter(device => AppUtils.normalizeSN(device.sn) !== cleanOldSn)
	}

	if (exchange.newSn) {
		const newDate = new Date()
		newDate.setDate(newDate.getDate() + 60)

		monitorData.push({
			name: exchange.name,
			ru: 'WYMIANA',
			sn: AppUtils.normalizeSN(exchange.newSn).toUpperCase(),
			date: AppUtils.formatDate(newDate),
		})
	}

	localStorage.setItem(monitorKey, JSON.stringify(monitorData))
	exchanges[index].status = 'done'
	saveData()
}

function removeItem(index) {
	if (!confirm('Usunąć ten wpis?')) return

	exchanges.splice(index, 1)
	saveData()
}
/* === Exchanges Actions: End === */

/* === Exchanges Excel Backup: Start === */
function exportExcel() {
	const { monthKey, monthLabel } = getCurrentMonthContext()
	const exchangesToExport = getCurrentMonthExchanges()

	if (exchangesToExport.length === 0) {
		alert(`Nic nie wyladowalo w eksporcie za ${monthLabel}. Ten miesiac jest czysty, wiec plik nie zostal pobrany.`)
		return
	}

	const data = exchangesToExport.map(exchange => ({
		Pracownik: exchange.name,
		Data: exchange.plannedDate,
		'Stary SN': exchange.oldSn,
		'Nowy SN': exchange.newSn,
		Akcesoria: (exchange.accessories || []).join(', '),
		Status: exchange.status === 'done' ? 'Zakończono' : 'Planowana',
	}))

	const worksheet = XLSX.utils.json_to_sheet(data)
	const workbook = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Wymiany')
	XLSX.writeFile(workbook, `wymiany_${monthKey}.xlsx`)
}

function importExcel(event) {
	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = loadEvent => {
		try {
			const data = new Uint8Array(loadEvent.target.result)
			const workbook = XLSX.read(data, { type: 'array' })
			const worksheet = workbook.Sheets[workbook.SheetNames[0]]
			const jsonData = XLSX.utils.sheet_to_json(worksheet)

			const imported = jsonData.map(row => ({
				name: (row.Pracownik || row.Użytkownik || '').toString().toUpperCase(),
				plannedDate:
					AppUtils.normalizeSpreadsheetDate(row.Data || row['Data planowanej wymiany']) || AppUtils.formatDate(new Date()),
				oldSn: row['Stary SN'] || row['SN do zwrotu'] || '',
				newSn: row['Nowy SN'] || row['SN do wydania'] || '',
				accessories: row.Akcesoria ? row.Akcesoria.split(',').map(item => item.trim()).filter(Boolean) : [],
				notes: row.Uwagi || '',
				status: row.Status === 'Zakończono' ? 'done' : 'pending',
				createdAt: new Date(),
			}))

			if (imported.length > 0 && confirm(`Zaimportować ${imported.length} rekordów?`)) {
				exchanges = [...exchanges, ...imported]
				saveData()
				alert('Import zakończony!')
			}
		} catch (error) {
			alert('Błąd importu pliku Excel.')
		}

		event.target.value = ''
	}

	reader.readAsArrayBuffer(file)
}
/* === Exchanges Excel Backup: End === */

/* === Exchanges Init: Start === */
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
			item.classList.add('is-tapped')
			setTimeout(() => {
				item.classList.remove('is-tapped')
			}, 100)
		})
	}

	if (tableBody) {
		tableBody.addEventListener('click', event => {
			const actionButton = event.target.closest('[data-action]')
			if (!actionButton) return

			const index = Number(actionButton.dataset.index)
			const action = actionButton.dataset.action

			if (action === 'complete') completeExchange(index)
			if (action === 'edit') editExchange(index)
			if (action === 'delete') removeItem(index)
		})
	}

	if (exchangeForm) {
		exchangeForm.addEventListener('submit', event => {
			event.preventDefault()

			const exchangeData = {
				name: document.getElementById('emp-name').value.toUpperCase(),
				plannedDate: document.getElementById('exchange-date').value,
				oldSn: document.getElementById('old-sn').value,
				newSn: document.getElementById('new-sn').value,
				notes: document.getElementById('notes').value,
				accessories: getSelectedAccessories(),
				status: editIndex !== null ? exchanges[editIndex].status : 'pending',
				createdAt: editIndex !== null ? exchanges[editIndex].createdAt : new Date(),
			}

			if (editIndex !== null) {
				exchanges[editIndex] = exchangeData
				alert('Zmiany zostały zapisane.')
			} else {
				exchanges.push(exchangeData)
			}

			monthPicker.setCurrentDate(AppUtils.parseDate(exchangeData.plannedDate) || new Date(), { render: false })
			saveData()
			resetFormState()
		})
	}

	if (cancelEditBtn) {
		cancelEditBtn.addEventListener('click', cancelEdit)
	}

	if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportExcel)
	if (importExcelTrigger && importExcelInput) {
		importExcelTrigger.addEventListener('click', () => importExcelInput.click())
		importExcelInput.addEventListener('change', importExcel)
	}

	loadData()
	resetFormState()
})
/* === Exchanges Init: End === */
