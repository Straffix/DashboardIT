let hires = []
const STORAGE_KEY = 'nowe_zatrudnienia_dane'

let currentViewDate = new Date()
const monthNames = [
	'Styczeń',
	'Luty',
	'Marzec',
	'Kwiecień',
	'Maj',
	'Czerwiec',
	'Lipiec',
	'Sierpień',
	'Wrzesień',
	'Październik',
	'Listopad',
	'Grudzień',
]

const iconMap = {
	mouse: 'fa-mouse',
	keyboard: 'fa-keyboard',
	headset: 'fa-headset',
	monitor: 'fa-desktop',
	bag: 'fa-briefcase',
}

function updateMonthDisplay() {
	const display = document.getElementById('current-month-display')
	if (display) {
		display.innerText = `${monthNames[currentViewDate.getMonth()].toUpperCase()} ${currentViewDate.getFullYear()}`
	}
}

// function changeMonth(delta) {
// 	currentViewDate.setMonth(currentViewDate.getMonth() + delta)
// 	renderTable()
// }

function changeMonth(delta) {
	const tbody = document.getElementById('table-body')

	// 1. Dodajemy klasę wyjścia (stary miesiąc znika w lewo)
	tbody.classList.add('slide-out')

	// 2. Czekamy chwilę, aż animacja wyjścia dobije do połowy/końca
	setTimeout(() => {
		// Zmieniamy datę i renderujemy nową treść
		currentViewDate.setMonth(currentViewDate.getMonth() + delta)

		// Funkcja renderTable() standardowo czyści tabelę i wstawia nowe wiersze
		renderTable()

		// 3. Usuwamy klasę wyjścia i dodajemy klasę wejścia (nowy miesiąc wpada z prawej)
		tbody.classList.remove('slide-out')
		tbody.classList.add('slide-in')

		// 4. Czyścimy klasę animacji po jej zakończeniu, by móc ją odpalić kolejny raz
		setTimeout(() => {
			tbody.classList.remove('slide-in')
		}, 300)
	}, 200) // To opóźnienie musi pasować do czasu slideOutLeft w CSS
}

//==============================

document.addEventListener('click', e => {
	const item = e.target.closest('.accessory-item')
	if (item) {
		item.classList.toggle('active')
	}
})

function loadData() {
	const saved = localStorage.getItem(STORAGE_KEY)
	hires = saved ? JSON.parse(saved) : []
	renderTable()
}

function saveData() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(hires))
	renderTable()
}

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

		const accessoriesHTML = (h.accessories || [])
			.map(
				acc =>
					`<i class="fas ${iconMap[acc]}" style="margin: 0 4px; color: #64748b; font-size: 1.2rem;" title="${acc}"></i>`,
			)
			.join('')

		const row = document.createElement('tr')
		row.innerHTML = `
            <td><b>${h.name}</b></td>
            <td>${h.ru}</td>
            <td>${h.sn}</td>
            <td><span class="status-pill ${statusClass}">${statusText}</span></td>
            <td style="text-align:center">${accessoriesHTML || '<small style="color:#ccc">brak</small>'}</td>
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

// --- FORMULARZ ---
document.getElementById('device-form').addEventListener('submit', e => {
	e.preventDefault()

	const selectedAcc = []
	document.querySelectorAll('.accessory-item.active').forEach(item => {
		selectedAcc.push(item.dataset.item)
	})

	const newHireDate = document.getElementById('date').value

	hires.push({
		name: document.getElementById('name').value.toUpperCase(),
		ru: document.getElementById('ru').value,
		sn: document.getElementById('sn').value.toUpperCase(),
		date: newHireDate,
		accessories: selectedAcc,
	})

	currentViewDate = new Date(newHireDate)

	e.target.reset()
	document.querySelectorAll('.accessory-item').forEach(i => i.classList.remove('active'))

	saveData()
})

const hiddenMonthInput = document.getElementById('hidden-month-input')

if (hiddenMonthInput) {
	hiddenMonthInput.addEventListener('change', e => {
		const selectedValue = e.target.value
		if (selectedValue) {
			const [year, month] = selectedValue.split('-')

			currentViewDate = new Date(year, month - 1, 1)

			renderTable()
		}
	})
}

loadData()
