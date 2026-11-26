/* === Shared Config: Start === */
const APP_CONFIG = {
	MONTH_NAMES: [
		'Stycze\u0144',
		'Luty',
		'Marzec',
		'Kwiecie\u0144',
		'Maj',
		'Czerwiec',
		'Lipiec',
		'Sierpie\u0144',
		'Wrzesie\u0144',
		'Pa\u017adziernik',
		'Listopad',
		'Grudzie\u0144',
	],
	STORAGE_KEYS: {
		MONITOR: 'monitor_laptopow_dane',
		HIRES: 'nowe_zatrudnienia_dane',
		BOOKMARKS: 'dashboard_zakladki',
	},
}
/* === Shared Config: End === */

/* === Shared Formatters: Start === */
const formatDate = date => {
	const parsedDate = new Date(date)
	if (Number.isNaN(parsedDate.getTime())) return ''

	const year = parsedDate.getFullYear()
	const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
	const day = String(parsedDate.getDate()).padStart(2, '0')

	return `${year}-${month}-${day}`
}

const normalizeSN = sn => (sn ? sn.toString().trim().replace(/-/g, '').toUpperCase() : '')
const createId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const addMeta = item => {
	const today = formatDate(new Date())
	return {
		...item,
		id: item.id || createId(),
		createdAt: item.createdAt || today,
		updatedAt: item.updatedAt || today,
	}
}

const createEl = (tag, className, text) => {
	const element = document.createElement(tag)
	if (className) element.className = className
	if (text !== undefined) element.textContent = text
	return element
}

const createActionButton = (action, icon, label, id) => {
	const button = createEl('button', `row-action-btn is-${action}`)
	button.type = 'button'
	button.dataset.action = action
	button.dataset.id = id
	button.title = label
	button.setAttribute('aria-label', label)
	button.append(createEl('i', `fa-solid ${icon}`))
	return button
}

const appendEmptyRow = (tbody, text, columns) => {
	const emptyRow = createEl('tr')
	const emptyCell = createEl('td', 'empty-state-cell', text)
	emptyCell.colSpan = columns
	emptyRow.append(emptyCell)
	tbody.append(emptyRow)
}
/* === Shared Formatters: End === */

/* === Shared Global UI: Start === */
const currentYear = document.getElementById('current-year')
if (currentYear) {
	currentYear.textContent = new Date().getFullYear()
}
/* === Shared Global UI: End === */

/* === Shared CSV: Start === */
const CSV_SEPARATOR = ';'

// Przygotowuje jedną komórkę tabeli.
// Jeśli tekst zawiera średnik, cudzysłów albo nową linię,
// trzeba go ująć w cudzysłowy, a cudzysłowy w środku podwoić.
const escapeCSVValue = value => {
	const text = value === undefined || value === null ? '' : String(value)

	if (text.includes(CSV_SEPARATOR) || text.includes('"') || text.includes('\n')) {
		return '"' + text.replaceAll('"', '""') + '"'
	}

	return text
}

// Zamienia tablicę obiektów na plik CSV i pobiera go.
const downloadCSV = (rows, fileName) => {
	const headers = Object.keys(rows[0])
	const lines = [headers.map(escapeCSVValue).join(CSV_SEPARATOR)]

	for (const row of rows) {
		const cells = headers.map(header => escapeCSVValue(row[header]))
		lines.push(cells.join(CSV_SEPARATOR))
	}

	const content = '\uFEFF' + lines.join('\r\n')
	const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })

	const link = document.createElement('a')
	link.href = URL.createObjectURL(blob)
	link.download = fileName
	link.click()
	URL.revokeObjectURL(link.href)
}

// Dzieli tekst CSV na wiersze i komórki.
// Idzie znak po znaku, bo średnik albo nowa linia wewnątrz cudzysłowów
// są częścią tekstu, a nie podziałem.
const splitCSV = text => {
	const rows = []
	let row = []
	let cell = ''
	let insideQuotes = false

	for (let i = 0; i < text.length; i++) {
		const char = text[i]
		const nextChar = text[i + 1]

		if (insideQuotes) {
			if (char === '"' && nextChar === '"') {
				cell += '"'
				i++
			} else if (char === '"') {
				insideQuotes = false
			} else {
				cell += char
			}
		} else if (char === '"') {
			insideQuotes = true
		} else if (char === CSV_SEPARATOR) {
			row.push(cell)
			cell = ''
		} else if (char === '\n') {
			row.push(cell)
			rows.push(row)
			row = []
			cell = ''
		} else if (char !== '\r') {
			cell += char
		}
	}

	if (cell !== '' || row.length > 0) {
		row.push(cell)
		rows.push(row)
	}

	return rows
}

// Zamienia tekst CSV na tablicę obiektów (klucze = nagłówki z 1. wiersza).
const parseCSV = text => {
	const cleanText = text.replace('\uFEFF', '')
	const [headers, ...dataRows] = splitCSV(cleanText)
	if (!headers) return []

	const result = []

	for (const cells of dataRows) {
		const isEmptyRow = cells.every(cell => cell.trim() === '')
		if (isEmptyRow) continue

		const row = {}
		headers.forEach((header, index) => {
			let value = (cells[index] || '').trim()

			if (value.startsWith('="') && value.endsWith('"')) {
				value = value.slice(2, -1)
			}

			row[header.trim()] = value
		})
		result.push(row)
	}

	return result
}

// Zamienia datę z Excela (05-01-2027, 05.01.2027, 5/1/2027) na format aplikacji (2027-01-05).
const normalizeDate = value => {
	const text = String(value || '').trim()

	if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

	const match = text.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/)
	if (!match) return ''

	const day = match[1].padStart(2, '0')
	const month = match[2].padStart(2, '0')
	const year = match[3]

	return `${year}-${month}-${day}`
}

// Każe Excelowi traktować wartość jako tekst (zachowuje zera na początku).
const asExcelText = value => (value ? `="${value}"` : '')

/* === Shared CSV: End === */

/* === Shared Public API: Start === */
window.AppUtils = {
	config: APP_CONFIG,
	formatDate,
	normalizeSN,
	downloadCSV,
	parseCSV,
	normalizeDate,
	asExcelText,
	createId,
	addMeta,
	createEl,
	createActionButton,
	appendEmptyRow,
}
/* === Shared Public API: End === */
