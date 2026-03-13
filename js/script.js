document.addEventListener('DOMContentLoaded', () => {
	let devices = []

	const STORAGE_KEY = 'monitor_laptopow_dane'
	const BACKUP_KEY = 'monitor_laptopow_backup'

	const deviceForm = document.getElementById('device-form')
	const newRadio = document.getElementById('new-device')
	const oldRadio = document.getElementById('old-device')
	const dateGroup = document.getElementById('date-group')
	const dateInput = document.getElementById('date')

	/* ======= AUTOMATYCZNY ROK W FOOTERZE ======= */

	document.querySelectorAll('#current-year').forEach(el => {
		el.textContent = new Date().getFullYear()
	})

	/* ======= JEŚLI STRONA NIE MA FORMULARZA — ZATRZYMAJ SKRYPT ======= */

	if (!deviceForm) return

	/* ======= DANE ======= */

	function loadData() {
		const saved = localStorage.getItem(STORAGE_KEY)
		devices = saved ? JSON.parse(saved) : []

		autoBackup()
		renderTable()
	}

	function saveData() {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(devices))
		autoBackup()
		renderTable()
	}

	function autoBackup() {
		localStorage.setItem(BACKUP_KEY, JSON.stringify(devices))
	}

	/* ======= EXPORT / IMPORT ======= */

	function exportJSON() {
		if (devices.length === 0) return alert('Brak danych do eksportu.')

		const data = JSON.stringify(devices, null, 2)
		downloadFile(data, 'urzadzenia.json')
	}

	function downloadFile(content, filename) {
		const blob = new Blob([content], { type: 'application/json' })
		const link = document.createElement('a')

		link.href = URL.createObjectURL(blob)
		link.download = filename
		link.click()

		URL.revokeObjectURL(link.href)
	}

	function importJSON(event) {
		const file = event.target.files[0]
		if (!file) return

		const reader = new FileReader()

		reader.onload = function (e) {
			try {
				const imported = JSON.parse(e.target.result)

				if (!Array.isArray(imported)) throw new Error()

				if (confirm('Czy na pewno chcesz nadpisać obecne dane zaimportowanym plikiem?')) {
					devices = imported
					saveData()
					alert('Import zakończony sukcesem.')
				}
			} catch (err) {
				alert('Błąd: Niepoprawny format pliku JSON.')
			}

			event.target.value = ''
		}

		reader.readAsText(file)
	}

	/* ======= LOGIKA ======= */

	function normalizeSN(sn) {
		return sn.trim().replace(/-/g, '').toUpperCase()
	}

	function findDuplicate(ru, sn) {
		const normalizedSn = normalizeSN(sn)
		return devices.findIndex(d => d.ru === ru && normalizeSN(d.sn) === normalizedSn)
	}

	function extendDomain(index) {
		const d = devices[index]
		let baseDate = new Date(d.date)

		if (isNaN(baseDate.getTime())) {
			baseDate = new Date()
		}

		baseDate.setDate(baseDate.getDate() + 60)
		devices[index].date = baseDate.toISOString().split('T')[0]

		saveData()
	}

	function removeItem(index) {
		if (confirm('Czy na pewno chcesz usunąć to urządzenie z listy?')) {
			devices.splice(index, 1)
			saveData()
		}
	}

	/* ======= RENDER TABELI ======= */

	function renderTable() {
		const tbody = document.getElementById('table-body')
		if (!tbody) return

		tbody.innerHTML = ''

		let stats = { all: devices.length, ok: 0, warn: 0, dead: 0 }

		const dzisiaj = new Date()
		dzisiaj.setHours(0, 0, 0, 0)

		devices.forEach((d, index) => {
			const dataWygasniecia = new Date(d.date)
			const dniDoKonca = Math.ceil((dataWygasniecia - dzisiaj) / (1000 * 60 * 60 * 24))

			let statusText = dataWygasniecia.toLocaleDateString('pl-PL').replaceAll('.', '-')
			let statusClass = 'ok'

			if (dniDoKonca < 0) {
				statusText = 'Wypadł z domeny'
				statusClass = 'expired'
				stats.dead++
			} else if (dniDoKonca <= 14) {
				statusClass = 'near'
				stats.warn++
			} else {
				stats.ok++
			}

			const row = document.createElement('tr')

			row.innerHTML = `
		<td><b>${d.name.toUpperCase()}</b></td>
		<td>${d.ru}</td>
		<td>${d.sn}</td>
		<td><span class="status-pill ${statusClass}">${statusText}</span></td>
		<td style="text-align:center">
			<button class="extend-btn" onclick="extendDomain(${index})">
				<i class="fa-solid fa-plus"></i> 60 dni
			</button>
		</td>
		<td style="text-align:right">
			<span class="delete-btn" onclick="removeItem(${index})">
				<i class="fa-solid fa-trash"></i>
			</span>
		</td>
		`

			tbody.appendChild(row)
		})

		const statsAll = document.getElementById('stats-all')
		const statsActive = document.getElementById('stats-active')
		const statsWarn = document.getElementById('stats-warn')
		const statsDanger = document.getElementById('stats-danger')

		if (statsAll) statsAll.innerText = stats.all
		if (statsActive) statsActive.innerText = stats.ok
		if (statsWarn) statsWarn.innerText = stats.warn
		if (statsDanger) statsDanger.innerText = stats.dead
	}

	/* ======= FORMULARZ ======= */

	const toggleDateInput = () => {
		if (newRadio.checked) {
			dateGroup.style.display = 'none'
			dateInput.required = false
		} else {
			dateGroup.style.display = 'block'
			dateInput.required = true
		}
	}

	newRadio.addEventListener('change', toggleDateInput)
	oldRadio.addEventListener('change', toggleDateInput)

	deviceForm.addEventListener('submit', function (e) {
		e.preventDefault()

		const name = document.getElementById('name').value.toUpperCase()
		const ru = document.getElementById('ru').value
		const sn = document.getElementById('sn').value.toUpperCase()

		let date

		if (newRadio.checked) {
			const today = new Date()
			today.setDate(today.getDate() + 60)
			date = today.toISOString().split('T')[0]
		} else {
			date = dateInput.value
			if (!date) return alert('Proszę wybrać datę dla starego urządzenia.')
		}

		const duplicateIndex = findDuplicate(ru, sn)

		if (duplicateIndex !== -1) {
			if (
				confirm('Urządzenie o tym numerze RU i SN już istnieje. Czy chcesz przedłużyć mu ważność o kolejne 60 dni?')
			) {
				extendDomain(duplicateIndex)
				this.reset()
				toggleDateInput()
			}

			return
		}

		devices.push({ name, ru, sn, date })

		this.reset()
		toggleDateInput()

		saveData()
	})

	/* ======= START ======= */

	loadData()
	toggleDateInput()

	/* ======= GLOBAL (dla onclick) ======= */

	window.extendDomain = extendDomain
	window.removeItem = removeItem
	window.exportJSON = exportJSON
	window.importJSON = importJSON
})

/* ======= FULLSCREEN BUTTON ======= */

const fullscreenBtn = document.getElementById('fullscreen-btn')

if (fullscreenBtn) {
	fullscreenBtn.addEventListener('click', () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen()
			document.body.classList.add('fullscreen-mode')
			fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>'
		} else {
			document.exitFullscreen()
			document.body.classList.remove('fullscreen-mode')
			fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>'
		}
	})
}
