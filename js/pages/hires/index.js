(function initializeHiresPage() {
/* === Hires State And References: Start === */
let hires = []
let editIndex = null
let drawerInitialState = ''
let searchQuery = ''
const hiresService = window.AppServices?.hiresService

const hiresForm = document.getElementById('device-form')
const tableBody = document.getElementById('table-body')
const accessoryPicker = document.getElementById('accessory-picker')
const exportExcelBtn = document.getElementById('export-excel-btn')
const importExcelInput = document.getElementById('importExcelFile')
const importExcelTrigger = document.getElementById('import-excel-trigger')
const openDrawerBtn = document.getElementById('open-hire-drawer')
const closeDrawerBtn = document.getElementById('close-hire-drawer')
const cancelDrawerBtn = document.getElementById('cancel-hire-drawer')
const workspaceActions = document.querySelector('.workspace-actions')
const drawerShell = document.getElementById('hire-drawer-shell')
const drawerBackdrop = document.getElementById('hire-drawer-backdrop')
const drawerTitle = document.getElementById('hire-drawer-title')
const drawerCopy = document.getElementById('hire-drawer-copy')
const submitBtn = document.getElementById('hire-submit-btn')
const monthSummary = document.getElementById('hires-month-summary')
const hiresWorkspace = document.querySelector('.hires-workspace')
const searchToggleBtn = document.getElementById('hire-search-toggle')
const searchPanel = document.getElementById('hire-search-panel')
const searchInput = document.getElementById('hire-search-input')
const isAuthenticated = () => Boolean(AppUtils.auth?.isAuthenticated?.())

function requireAuthenticatedAction(message = 'Musisz byc zalogowany, aby modyfikowac nowe zatrudnienia.') {
	if (isAuthenticated()) return true

	AppUtils.notify({
		type: 'warning',
		title: 'Tylko podglad',
		message,
	})
	AppUtils.auth.openAuthModal?.('login')
	return false
}

function syncProtectedUi() {
	const guestMode = !isAuthenticated()

	if (openDrawerBtn) {
		openDrawerBtn.innerHTML = guestMode
			? '<i class="fa-solid fa-right-to-bracket"></i><span>Zaloguj się, aby dodawać</span>'
			: '<i class="fa-solid fa-plus"></i><span>Dodaj pracownika</span>'
	}

	if (importExcelTrigger) {
		importExcelTrigger.innerHTML = guestMode
			? '<i class="fa-solid fa-lock"></i><span>Import po zalogowaniu</span>'
			: '<i class="fa-solid fa-file-import"></i><span>Import Excel</span>'
	}

	hiresForm
		?.querySelectorAll('input, textarea, select, button[type="submit"]')
		.forEach(control => {
			control.disabled = guestMode
		})

	if (guestMode && drawerShell?.classList.contains('is-open')) {
		void closeDrawer({ force: true })
	}
}

let workspaceHeightAnimationFallbackId = null

const monthPicker = AppUtils.createMonthPicker({
	onChange: () => renderTable({ animateContainer: true }),
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

const searchController = AppUtils.createSearchController({
	panel: searchPanel,
	workspaceActions,
	toggleButton: searchToggleBtn,
	input: searchInput,
	onClear: () => {
		searchQuery = ''
		renderTable()
	},
})
/* === Hires State And References: End === */

/* === Hires Storage: Start === */
function loadData() {
	const parsedHires = hiresService?.getAll?.() || []
	let hasUpdates = false

	const normalizedHires = parsedHires.map(hire => {
		const normalizedDate = AppUtils.normalizeSpreadsheetDate(hire.date)
		const normalizedAudit = AppUtils.normalizeAuditFields(hire)
		if (normalizedDate && normalizedDate !== hire.date) {
			hasUpdates = true
		}

		if (
			normalizedAudit.updatedBy !== (hire.updatedBy || hire.createdBy || null) ||
			normalizedAudit.createdAt !== (hire.createdAt || '') ||
			normalizedAudit.updatedAt !== (hire.updatedAt || hire.createdAt || '')
		) {
			hasUpdates = true
		}

		return {
			...hire,
			date: normalizedDate || hire.date || '',
			...normalizedAudit,
		}
	})

	const { records: deduplicatedHires, removedCount } = dedupeHires(normalizedHires)
	if (removedCount > 0) {
		hasUpdates = true
	}

	hires = deduplicatedHires

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
		hiresService?.saveAll?.(hires)
	}

	renderTable()
}

function saveData() {
	hiresService?.saveAll?.(hires)
	renderTable()
}
/* === Hires Storage: End === */

/* === Hires View Helpers: Start === */
function getHireDuplicateKey(hire) {
	const name = String(hire?.name || '').trim().toUpperCase()
	const ru = String(hire?.ru || '').trim()
	const sn = AppUtils.normalizeSN(hire?.sn || '')
	const date = String(hire?.date || '').trim()
	if (!name || !ru || !sn || !date) return ''
	return `${name}::${ru}::${sn}::${date}`
}

function dedupeHires(records) {
	const seenKeys = new Set()
	const deduplicatedRecords = []
	let removedCount = 0

	records.forEach(record => {
		const key = getHireDuplicateKey(record)
		if (key && seenKeys.has(key)) {
			removedCount += 1
			return
		}

		if (key) {
			seenKeys.add(key)
		}

		deduplicatedRecords.push(record)
	})

	return { records: deduplicatedRecords, removedCount }
}

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

function getVisibleHires() {
	const source = searchQuery.trim() ? hires : getCurrentMonthHires()
	return source.filter(hire =>
		AppUtils.matchesSearchQuery([(hire.name || '').toUpperCase(), hire.ru || '', hire.sn || '', hire.date || ''], searchQuery)
	)
}

function getFormState() {
	return {
		name: (document.getElementById('name')?.value || '').trim().toUpperCase(),
		ru: (document.getElementById('ru')?.value || '').trim(),
		sn: AppUtils.normalizeSN(document.getElementById('sn')?.value || ''),
		date: document.getElementById('date')?.value || '',
		accessories: AppUtils.getSelectedAccessories(),
	}
}

function captureDrawerSnapshot() {
	drawerInitialState = JSON.stringify(getFormState())
}

function hasDrawerFormChanges() {
	return Boolean(hiresForm) && JSON.stringify(getFormState()) !== drawerInitialState
}

function updateMonthSummary({ visibleCount, monthCount, totalCount, monthLabel }) {
	if (!monthSummary) return

	if (totalCount === 0) {
		monthSummary.textContent = `${monthLabel} · baza jest pusta, możesz dodać pierwszy onboarding.`
		return
	}

	if (searchQuery.trim()) {
		monthSummary.textContent = `Wyniki wyszukiwania: ${visibleCount} z ${totalCount} wpisów na stronie nowych zatrudnień.`
		return
	}

	if (monthCount === 0) {
		monthSummary.textContent = `${monthLabel} · brak wpisów w tym miesiącu.`
		return
	}

	if (monthCount === totalCount) {
		monthSummary.textContent = `${monthLabel} · widoczne wpisy: ${monthCount}.`
		return
	}

	monthSummary.textContent = `${monthLabel} · widoczne wpisy: ${monthCount} z ${totalCount} w całej bazie.`
}
function prefersReducedMotion() {
	return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function setMonthTransitionState(isActive) {
	document.body.classList.toggle('hires-month-transitioning', isActive)
	hiresWorkspace?.classList.toggle('is-month-transitioning', isActive)
}

function resetWorkspaceHeightAnimation() {
	if (!hiresWorkspace) return

	hiresWorkspace.style.height = ''
	hiresWorkspace.style.overflow = ''
	hiresWorkspace.style.transition = ''
	hiresWorkspace.style.willChange = ''
	setMonthTransitionState(false)
}

function renderTableContent() {
	renderTable({ skipAnimationReset: true })
}

function animateWorkspaceHeight(renderContent) {
	if (!hiresWorkspace || prefersReducedMotion()) {
		renderContent()
		return
	}

	window.clearTimeout(workspaceHeightAnimationFallbackId)
	resetWorkspaceHeightAnimation()

	const startHeight = hiresWorkspace.getBoundingClientRect().height

	setMonthTransitionState(true)
	hiresWorkspace.style.height = `${startHeight}px`
	hiresWorkspace.style.overflow = 'hidden'
	hiresWorkspace.style.transition = 'none'
	hiresWorkspace.style.willChange = 'height'

	renderContent()

	hiresWorkspace.style.height = 'auto'
	const endHeight = hiresWorkspace.getBoundingClientRect().height
	hiresWorkspace.style.height = `${startHeight}px`
	void hiresWorkspace.offsetHeight

	if (Math.abs(endHeight - startHeight) < 2) {
		resetWorkspaceHeightAnimation()
		return
	}

	const finishAnimation = event => {
		if (event && event.propertyName !== 'height') return

		hiresWorkspace.removeEventListener('transitionend', finishAnimation)
		window.clearTimeout(workspaceHeightAnimationFallbackId)
		resetWorkspaceHeightAnimation()
	}

	hiresWorkspace.addEventListener('transitionend', finishAnimation)
	workspaceHeightAnimationFallbackId = window.setTimeout(() => finishAnimation(), 460)

	requestAnimationFrame(() => {
		hiresWorkspace.style.transition = 'height 360ms cubic-bezier(0.22, 1, 0.36, 1)'
		hiresWorkspace.style.height = `${endHeight}px`
	})
}
/* === Hires View Helpers: End === */

/* === Hires Drawer: Start === */
function resetFormState() {
	editIndex = null

	if (hiresForm) {
		hiresForm.reset()
	}

	document.querySelectorAll('.accessory-item').forEach(item => {
		item.classList.remove('active', 'is-tapped')
	})

	if (drawerTitle) {
		drawerTitle.textContent = 'Dodaj pracownika'
	}

	if (drawerCopy) {
		drawerCopy.textContent = 'Uzupełnij dane i zapisz nowy onboarding.'
	}

	if (submitBtn) {
		submitBtn.classList.remove('btn-submit-primary')
		submitBtn.classList.add('btn-submit-soft-danger')
		submitBtn.textContent = 'Dodaj do listy'
	}

	captureDrawerSnapshot()
}

function openDrawer() {
	if (!drawerShell) return

	drawerShell.classList.add('is-open')
	drawerShell.setAttribute('aria-hidden', 'false')
	document.body.classList.add('hire-drawer-open')

	const firstField = document.getElementById('name')
	window.setTimeout(() => firstField?.focus(), 80)
}

async function closeDrawer({ force = false } = {}) {
	if (!drawerShell) return false

	if (!force && hasDrawerFormChanges()) {
		const shouldClose = await AppUtils.confirmDialog({
			title: 'Niezapisane zmiany',
			message: 'Zamknąć panel? Niezapisane zmiany zostaną utracone.',
		})
		if (!shouldClose) return false
	}

	drawerShell.classList.remove('is-open')
	drawerShell.setAttribute('aria-hidden', 'true')
	document.body.classList.remove('hire-drawer-open')
	resetFormState()
	return true
}

function startCreateFlow() {
	if (!requireAuthenticatedAction()) return
	resetFormState()
	openDrawer()
}

function startEditFlow(index) {
	if (!requireAuthenticatedAction()) return
	const hire = hires[index]
	if (!hire) return

	resetFormState()
	editIndex = index

	document.getElementById('name').value = hire.name || ''
	document.getElementById('ru').value = hire.ru || ''
	document.getElementById('sn').value = hire.sn || ''
	document.getElementById('date').value = AppUtils.normalizeSpreadsheetDate(hire.date) || ''

	document.querySelectorAll('.accessory-item').forEach(item => {
		const itemName = item.dataset.item
		item.classList.toggle('active', hire.accessories && hire.accessories.includes(itemName))
	})

	if (drawerTitle) {
		drawerTitle.textContent = 'Edytuj pracownika'
	}

	if (drawerCopy) {
		drawerCopy.textContent = 'Zmień dane wpisu i zapisz poprawki bez wychodzenia z widoku tabeli.'
	}

	if (submitBtn) {
		submitBtn.classList.remove('btn-submit-soft-danger')
		submitBtn.classList.add('btn-submit-primary')
		submitBtn.textContent = 'Zapisz zmiany'
	}

	captureDrawerSnapshot()
	openDrawer()
}
/* === Hires Drawer: End === */

/* === Hires Table Rendering: Start === */
function renderTable({ animateContainer = false, skipAnimationReset = false } = {}) {
	if (!tableBody) return
	const guestMode = !isAuthenticated()

	if (animateContainer) {
		animateWorkspaceHeight(renderTableContent)
		return
	}

	if (!skipAnimationReset) {
		window.clearTimeout(workspaceHeightAnimationFallbackId)
		resetWorkspaceHeightAnimation()
	}

	tableBody.innerHTML = ''
	monthPicker.refreshView()

	const { monthLabel } = getCurrentMonthContext()
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const monthHires = getCurrentMonthHires()
	const filteredHires = getVisibleHires()
	updateMonthSummary({
		visibleCount: filteredHires.length,
		monthCount: monthHires.length,
		totalCount: hires.length,
		monthLabel,
	})

	if (filteredHires.length === 0) {
		if (searchQuery.trim()) {
			tableBody.innerHTML =
				'<tr><td colspan="6" class="empty-state-cell">Brak wyników wyszukiwania na stronie nowych zatrudnień.<br><small>Sprawdź imię, nazwisko, sekcję, numer SN lub datę startu w tej tabeli.</small></td></tr>'
			return
		}

		if (monthHires.length === 0) {
			const hiddenCount = hires.length
			tableBody.innerHTML =
				`<tr><td colspan="6" class="empty-state-cell">Brak planowanych zatrudnień w tym miesiącu.${
					hiddenCount > 0 ? `<br><small>W bazie jest jeszcze ${hiddenCount} rekordów, ale eksport Excel działa dla wybranego miesiąca: ${monthLabel}.</small>` : ''
				}</td></tr>`
			return
		}
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
			statusText = AppUtils.formatDate(startDate)
		} else {
			statusText = AppUtils.formatDate(startDate)
		}

		const accessoriesHTML = AppUtils.renderAccessoryIcons(hire.accessories, {
			size: '1rem',
			wrapperClass: 'inline-accessories hires-accessories',
		})

		const row = document.createElement('tr')
		row.innerHTML = `
			<td>
				<span class="hire-name">${hire.name}</span>
				${AppUtils.buildAuditMarkup(hire)}
			</td>
			<td>
				<span class="hire-ru">${hire.ru || '---'}</span>
			</td>
			<td>
				<span class="hire-sn-badge">${hire.sn || '---'}</span>
			</td>
			<td>
				<span class="status-pill ${statusClass}">${statusText}</span>
			</td>
			<td class="cell-center">${accessoriesHTML}</td>
			<td class="cell-center">
				<div class="hire-actions">
					<button class="icon-button hire-action-btn" type="button" data-action="edit" data-index="${originalIndex}" aria-label="Edytuj wpis" title="${guestMode ? 'Zaloguj się, aby edytować wpisy' : 'Edytuj wpis'}" ${guestMode ? 'disabled' : ''}>
						<i class="fas fa-pen"></i>
					</button>
					<button class="icon-button hire-action-btn hire-action-btn-danger" type="button" data-action="delete" data-index="${originalIndex}" aria-label="Usuń wpis" title="${guestMode ? 'Zaloguj się, aby usuwać wpisy' : 'Usuń wpis'}" ${guestMode ? 'disabled' : ''}>
						<i class="fas fa-trash"></i>
					</button>
				</div>
			</td>
		`
		tableBody.appendChild(row)
	})
}
/* === Hires Table Rendering: End === */

/* === Hires Actions: Start === */
async function removeItem(index) {
	if (!requireAuthenticatedAction()) return
	if (
		!(
			await AppUtils.confirmDialog({
				title: 'Usuwanie wpisu',
				message: 'Usunąć wpis?',
			})
		)
	)
		return

	if (editIndex === index) {
		await closeDrawer({ force: true })
	} else if (editIndex !== null && editIndex > index) {
		editIndex -= 1
	}

	hires.splice(index, 1)
	saveData()
}
/* === Hires Actions: End === */

/* === Hires Excel Backup: Start === */
function exportExcel() {
	const { monthKey, monthLabel } = getCurrentMonthContext()
	const hiresToExport = getCurrentMonthHires()

	if (hiresToExport.length === 0) {
		AppUtils.notify({
			type: 'warning',
			title: 'Brak danych do eksportu',
			message: `Arkusz za ${monthLabel} pozostał pusty. Zmień miesiąc albo dodaj wpis, a wtedy eksport ruszy bez problemu.`,
		})
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
	if (!requireAuthenticatedAction('Musisz byc zalogowany, aby importowac dane nowych zatrudnien.')) {
		if (event?.target) event.target.value = ''
		return
	}

	const file = event.target.files[0]
	if (!file) return

	const reader = new FileReader()
	reader.onload = async loadEvent => {
		const data = new Uint8Array(loadEvent.target.result)
		const workbook = XLSX.read(data, { type: 'array' })
		const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])

		const actor = AppUtils.auth.getAuditActorSnapshot()
		const importedAt = new Date().toISOString()
		let skippedCount = 0
		const importedHires = jsonData
			.map(row => ({
				name: (row['Imię i Nazwisko'] || '').toString().toUpperCase(),
				ru: row['Dział / Stanowisko'] || '',
				sn: AppUtils.normalizeSN(row['SN Sprzętu']),
				date: AppUtils.normalizeSpreadsheetDate(row['Data rozpoczęcia']) || '',
				accessories: row.Akcesoria ? row.Akcesoria.split(', ').filter(Boolean) : [],
				createdBy: actor,
				updatedBy: actor,
				createdAt: importedAt,
				updatedAt: importedAt,
			}))
			.filter(hire => {
				const isValid = Boolean(hire.name && hire.ru && hire.sn && hire.date)
				if (!isValid) {
					skippedCount += 1
				}
				return isValid
			})
		const existingKeys = new Set(hires.map(getHireDuplicateKey).filter(Boolean))
		const importedKeys = new Set()
		const importedUniqueHires = importedHires.filter(hire => {
			const key = getHireDuplicateKey(hire)
			if (!key) return true
			if (existingKeys.has(key) || importedKeys.has(key)) {
				skippedCount += 1
				return false
			}

			importedKeys.add(key)
			return true
		})

		if (importedUniqueHires.length === 0) {
			AppUtils.notify({
				type: 'warning',
				title: 'Brak nowych wpisów',
				message:
					skippedCount > 0
						? 'Wszystkie rekordy z importu już istnieją, powtarzają się w pliku albo są niepełne.'
						: 'Plik nie zawiera poprawnych, nowych wpisów do dodania.',
			})
			event.target.value = ''
			return
		}

		if (
			await AppUtils.confirmDialog({
				title: 'Import zatrudnień',
				message:
					skippedCount > 0
						? `Zaimportować ${importedUniqueHires.length} wpisów? Pominę ${skippedCount} duplikatów lub niepełnych wierszy.`
						: `Zaimportować ${importedUniqueHires.length} wpisów?`,
			})
		) {
			hires = [...hires, ...importedUniqueHires]
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
	resetFormState()

	document.querySelectorAll('[data-month-delta]').forEach(button => {
		button.addEventListener('click', () => {
			monthPicker.changeMonth(Number(button.dataset.monthDelta))
		})
	})

	if (accessoryPicker) {
		accessoryPicker.addEventListener('click', event => {
			const item = event.target.closest('.accessory-item')
			if (!item) return
			if (!requireAuthenticatedAction()) return

			item.classList.toggle('active')
		})
	}

	if (tableBody) {
		tableBody.addEventListener('click', event => {
			const actionButton = event.target.closest('[data-action]')
			if (!actionButton) return

			const index = Number(actionButton.dataset.index)
			const { action } = actionButton.dataset
			if (!requireAuthenticatedAction()) return

			if (action === 'edit') startEditFlow(index)
			if (action === 'delete') void removeItem(index)
		})
	}

	if (openDrawerBtn) {
		openDrawerBtn.addEventListener('click', startCreateFlow)
	}

	if (closeDrawerBtn) {
		closeDrawerBtn.addEventListener('click', () => void closeDrawer())
	}

	if (cancelDrawerBtn) {
		cancelDrawerBtn.addEventListener('click', () => void closeDrawer())
	}

	if (drawerBackdrop) {
		drawerBackdrop.addEventListener('click', () => void closeDrawer())
	}

	window.addEventListener('keydown', event => {
		if (event.key === 'Escape' && searchController.isOpen()) {
			searchController.close()
			return
		}

		if (event.key === 'Escape' && drawerShell?.classList.contains('is-open')) {
			void closeDrawer()
		}
	})

	if (hiresForm) {
		hiresForm.addEventListener('submit', async event => {
			event.preventDefault()
			if (!requireAuthenticatedAction()) return

			const selectedAccessories = AppUtils.getSelectedAccessories()
			const newHireDate = document.getElementById('date').value
			const hireData = {
				name: document.getElementById('name').value.toUpperCase(),
				ru: document.getElementById('ru').value,
				sn: AppUtils.normalizeSN(document.getElementById('sn').value),
				date: newHireDate,
				accessories: selectedAccessories,
			}

			const actor = AppUtils.auth.getAuditActorSnapshot()
			const now = new Date().toISOString()
			const duplicateKey = getHireDuplicateKey(hireData)
			const duplicateIndex = hires.findIndex((hire, index) => index !== editIndex && getHireDuplicateKey(hire) === duplicateKey)

			if (duplicateKey && duplicateIndex !== -1) {
				AppUtils.notify({
					type: 'warning',
					title: 'Duplikat zatrudnienia',
					message: 'Taki onboarding już istnieje. Zmień dane albo edytuj istniejący wpis.',
				})
				return
			}

			if (editIndex !== null) {
				hires[editIndex] = {
					...hires[editIndex],
					...hireData,
					updatedBy: actor,
					updatedAt: now,
				}
			} else {
				hires.push({
					...hireData,
					createdBy: actor,
					updatedBy: actor,
					createdAt: now,
					updatedAt: now,
				})
			}

			monthPicker.setCurrentDate(AppUtils.parseDate(newHireDate) || new Date(), { render: false })
			saveData()
			await closeDrawer({ force: true })
		})
	}

	if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportExcel)
	if (importExcelTrigger && importExcelInput) {
		importExcelTrigger.addEventListener('click', () => {
			if (!requireAuthenticatedAction('Musisz byc zalogowany, aby importowac dane nowych zatrudnien.')) return
			importExcelInput.click()
		})
		importExcelInput.addEventListener('change', importExcel)
	}

	if (searchInput) {
		searchInput.addEventListener('input', event => {
			searchQuery = event.target.value || ''
			renderTable()
		})
	}

	if (searchToggleBtn) {
		searchToggleBtn.addEventListener('click', searchController.toggle)
	}

	document.addEventListener('app-auth-changed', () => {
		syncProtectedUi()
		renderTable()
	})

	loadData()
	syncProtectedUi()
})
/* === Hires Init: End === */
})()
