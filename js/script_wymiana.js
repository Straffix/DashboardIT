let exchanges = []
const EXCH_KEY = 'wymiana_sprzetu_dane'
const MONITOR_KEY = 'monitor_laptopow_dane'

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

//===========================
function loadData() {
	const saved = localStorage.getItem(EXCH_KEY)
	exchanges = saved ? JSON.parse(saved) : []
	renderTable()
}

function saveData() {
	localStorage.setItem(EXCH_KEY, JSON.stringify(exchanges))
	renderTable()
}

document.addEventListener('click', e => {
	const item = e.target.closest('.accessory-item')
	if (item) {
		item.classList.toggle('active')
	}
})

function completeExchange(index) {
	const ex = exchanges[index]
	if (ex.status === 'done') return

	if (!confirm(`Zakończyć wymianę dla: ${ex.name}? \n`)) return

	let monitorData = JSON.parse(localStorage.getItem(MONITOR_KEY)) || []

	if (ex.oldSn) {
		const cleanedSn = ex.oldSn.trim().toUpperCase()
		monitorData = monitorData.filter(d => d.sn.trim().toUpperCase() !== cleanedSn)
	}

	if (ex.newSn) {
		let d = new Date()
		d.setDate(d.getDate() + 60)

		const year = d.getFullYear()
		const month = String(d.getMonth() + 1).padStart(2, '0')
		const day = String(d.getDate()).padStart(2, '0')
		const newDateStr = `${year}-${month}-${day}`

		monitorData.push({
			name: ex.name,
			ru: 'WYMIANA',
			sn: ex.newSn.trim().toUpperCase(),
			date: newDateStr,
		})
	}

	localStorage.setItem(MONITOR_KEY, JSON.stringify(monitorData))
	exchanges[index].status = 'done'
	saveData()

	alert('Wymiana sfinalizowana! Baza monitoringu została zaktualizowana.')
}

function renderTable() {
	const tbody = document.getElementById('table-body')
	if (!tbody) return
	tbody.innerHTML = ''

	updateMonthDisplay()

	const filteredExchanges = exchanges.filter(ex => {
		const exDate = new Date(ex.date)
		return exDate.getMonth() === currentViewDate.getMonth() && exDate.getFullYear() === currentViewDate.getFullYear()
	})

	if (filteredExchanges.length === 0) {
		tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 50px; color: #94a3b8;">Brak planowanych wymian w tym miesiącu.</td></tr>`
		return
	}

	filteredExchanges.forEach(ex => {
		const originalIndex = exchanges.findIndex(orig => orig === ex)
		const isDone = ex.status === 'done'

		const accHTML = (ex.accessories || [])
			.map(
				a => `<i class="fas ${iconMap[a]}" style="margin: 0 6px; color: #64748b; font-size: 1.8rem;" title="${a}"></i>`,
			)
			.join('')

		const row = document.createElement('tr')
		if (isDone) row.classList.add('is-done')

		row.innerHTML = `
            <td>
                <b>${ex.name}</b><br>
                <small>${ex.notes || ''}</small>
            </td>
            <td>${ex.date}</td>
            <td><span class="sn-badge out">STARY: ${ex.oldSn || '---'}</span></td>
            <td><span class="sn-badge in">NOWY: ${ex.newSn || '---'}</span></td>
            <td style="text-align:center">${accHTML || '<small style="color:#ccc">-</small>'}</td>
            <td style="text-align:right">
                ${
									!isDone
										? `
                    <button onclick="completeExchange(${originalIndex})" class="btn-finish">
                        <i class="fa-solid fa-check"></i> FINAŁ
                    </button>
                `
										: '<span class="status-pill ok">Zrealizowano</span>'
								}
                <span class="delete-btn" onclick="removeItem(${originalIndex})" style="margin-left: 15px;">
                    <i class="fas fa-trash"></i>
                </span>
            </td>
        `
		tbody.appendChild(row)
	})
}

function removeItem(index) {
	if (confirm('Usunąć ten wpis z harmonogramu wymian?')) {
		exchanges.splice(index, 1)
		saveData()
	}
}

document.getElementById('exchange-form').addEventListener('submit', e => {
	e.preventDefault()

	const selectedAcc = []
	document.querySelectorAll('.accessory-item.active').forEach(i => {
		selectedAcc.push(i.dataset.item)
	})

	const newExDate = document.getElementById('exchange-date').value

	const newExchange = {
		name: document.getElementById('emp-name').value.toUpperCase(),
		date: newExDate,
		oldSn: document.getElementById('old-sn').value.toUpperCase(),
		newSn: document.getElementById('new-sn').value.toUpperCase(),
		notes: document.getElementById('notes').value,
		accessories: selectedAcc,
		status: 'planned',
	}

	exchanges.push(newExchange)
	currentViewDate = new Date(newExDate)

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
