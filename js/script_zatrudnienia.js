let hires = []
const STORAGE_KEY = AppUtils.config.STORAGE_KEYS.HIRES

let currentViewDate = new Date()

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
	if (display) {
		const monthName = AppUtils.config.MONTH_NAMES[currentViewDate.getMonth()].toUpperCase()
		display.innerText = `${monthName} ${currentViewDate.getFullYear()}`
	}
}

function changeMonth(delta) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    tbody.classList.remove('slide-in');
    tbody.classList.add('slide-out');

    setTimeout(() => {
        currentViewDate.setMonth(currentViewDate.getMonth() + delta);
        renderTable();

        tbody.style.visibility = 'hidden';
        tbody.classList.remove('slide-out');

        requestAnimationFrame(() => {
            tbody.style.visibility = 'visible';
            tbody.classList.add('slide-in');
        });

    }, 250);
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

/* ======= START I GLOBALIZACJA ======= */

window.changeMonth = changeMonth
window.removeItem = removeItem
window.exportExcel = exportExcel
window.importExcel = importExcel

loadData()

