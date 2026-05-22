(function initializeHiresPage() {
	/* === Hires State And References: Start === */
	let hires = []
	let editIndex = null
	let drawerInitialState = ''
	let searchQuery = ''
	let expandedAccessoriesRowKey = null
	let inlineEditState = null
	const hiresService = window.AppServices?.hiresService
	const escapeHtml = window.AppUtils?.escapeHtml || (value => String(value ?? ''))

	const ACCESSORY_FIELDS = [
		{ key: 'monitorDock', label: 'Monitor ze stacja dokujaca', icon: 'desktop-solid-full', badge: 'D' },
		{ key: 'keyboardMouseSet', label: 'Klawiatura + mysz', icon: 'keyboard-solid-full', badge: '+M' },
		{ key: 'mouse', label: 'Mysz', icon: 'computer-mouse-solid-full', badge: '' },
		{ key: 'keyboard', label: 'Klawiatura', icon: 'keyboard-solid-full', badge: '' },
		{ key: 'yealink', label: 'Yealink', icon: 'headset-solid-full', badge: 'Y' },
		{ key: 'logiZoneVibe', label: 'Logi Zone Vibe', icon: 'headset-solid-full', badge: 'LZ' },
		{ key: 'lenovo', label: 'Lenovo', icon: 'box-solid-full', badge: 'L' },
		{ key: 'bag', label: 'Torba', icon: 'briefcase-solid-full', badge: '' },
		{ key: 'backpack', label: 'Plecak', icon: 'backpack-icon', badge: '' },
		{ key: 'laptopStand', label: 'Podstawka pod laptop', icon: 'table-cells-solid-full', badge: '' },
		{ key: 'presenter', label: 'Prezenter', icon: 'pen-clip-solid-full', badge: '' },
		{ key: 'printer', label: 'Drukarka', icon: 'print-solid-full', badge: '' },
	]

	const ACCESSORY_FIELD_KEYS = ACCESSORY_FIELDS.map(field => field.key)
	const LEGACY_ACCESSORY_TO_FIELD = {
		monitor: 'monitorDock',
		keyboard: 'keyboard',
		mouse: 'mouse',
		'vertical-mouse': 'mouse',
		headset: 'yealink',
		bag: 'bag',
		backpack: 'backpack',
		pointer: 'presenter',
		printer: 'printer',
		'laptop-pad': 'laptopStand',
	}

	const EXPORT_COLUMNS = [
		{ key: 'purchaseRequest', header: 'Zgloszenie na zakup sprzetu' },
		{ key: 'targetUser', header: 'Uzytkownik docelowy' },
		{ key: 'startDate', header: 'Data rozpoczecia pracy' },
		{ key: 'laptopModel', header: 'Laptop - model' },
		{ key: 'laptopRu', header: 'Laptop - RU' },
		{ key: 'laptopStatus', header: 'Laptop - Status' },
		{ key: 'laptopWarehouse', header: 'Laptop - eMagazyn' },
		{ key: 'monitorRu', header: 'Monitor - RU' },
		{ key: 'monitorStatus', header: 'Monitor - Status' },
		{ key: 'monitorWarehouse', header: 'Monitor - eMagazyn' },
		{ key: 'preparedBy', header: 'Przygotowal/a' },
		{ key: 'deliveryLocation', header: 'Lokalizacja do wydania' },
		{ key: 'peripheralNotes', header: 'Uwagi do peryferiow' },
		...ACCESSORY_FIELDS.map(field => ({
			key: field.key,
			header: field.label,
			type: 'flag',
		})),
	]

	const IMPORT_ALIASES = {
		purchaseRequest: ['zgloszenie na zakup sprzetu', 'zakup sprzetu', 'zakup'],
		targetUser: ['uzytkownik docelowy', 'imie i nazwisko'],
		startDate: ['data rozpoczecia pracy', 'data rozpoczecia', 'start'],
		laptopModel: ['laptop model', 'sprzet sn', 'sn sprzetu', 'sprzet / sn'],
		laptopRu: ['laptop ru', 'ru laptopa', 'dzial stanowisko', 'sekcja'],
		laptopStatus: ['laptop status'],
		laptopWarehouse: ['laptop emagazyn', 'laptop e magazyn'],
		monitorRu: ['monitor ru'],
		monitorStatus: ['monitor status'],
		monitorWarehouse: ['monitor emagazyn', 'monitor e magazyn'],
		preparedBy: ['przygotowal a', 'przygotowal'],
		deliveryLocation: ['lokalizacja do wydania'],
		peripheralNotes: [
			'uwagi do peryferiow',
			'uwagi dot peryferiow',
			'prosze o wpisanie w kolumnach obok',
			'peryferiow jakie zostaly zamowione',
			'komentarz',
		],
		monitorDock: ['monitor ze stacja dokujaca'],
		keyboardMouseSet: ['klawiatura mysz', 'klawiatura + mysz'],
		mouse: ['mysz'],
		keyboard: ['klawiatura'],
		yealink: ['yealink'],
		logiZoneVibe: ['logi zone vibe'],
		lenovo: ['lenovo'],
		bag: ['torba'],
		backpack: ['plecak'],
		laptopStand: ['podstawka pod laptop', 'podstawka pod laptopa', 'podkladka pod laptopa'],
		presenter: ['prezenter'],
		printer: ['drukarka'],
		legacyAccessories: ['akcesoria'],
	}

	const SELECT_FIELD_IDS = ['laptopStatus', 'laptopWarehouse', 'monitorStatus', 'monitorWarehouse', 'preparedBy']
	const SEMANTIC_SELECT_FIELD_IDS = ['laptopStatus', 'laptopWarehouse', 'monitorStatus', 'monitorWarehouse']
	const INLINE_EDITABLE_FIELD_IDS = ['laptopStatus', 'laptopWarehouse', 'monitorStatus', 'monitorWarehouse']
	const INLINE_EDITABLE_FIELD_LABELS = {
		laptopStatus: 'Laptop - status',
		laptopWarehouse: 'Laptop - eMagazyn',
		monitorStatus: 'Monitor - status',
		monitorWarehouse: 'Monitor - eMagazyn',
	}

	const VISIBLE_TABLE_COLUMN_COUNT = 11

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
	const drawerAudit = document.getElementById('hire-drawer-audit')
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
				? '<i class="app-icon right-to-bracket-solid-full"></i><span>Zaloguj sie, aby dodawac</span>'
				: '<i class="app-icon plus-solid-full"></i><span>Dodaj pracownika</span>'
		}

		if (importExcelTrigger) {
			importExcelTrigger.innerHTML = guestMode
				? '<i class="app-icon lock-solid-full"></i><span>Import po zalogowaniu</span>'
				: '<i class="app-icon file-import-solid-full"></i><span>Import Excel</span>'
		}

		accessoryPicker?.classList.toggle('is-readonly', guestMode)

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
				const hireDate = AppUtils.parseDate(hire.startDate || hire.date)
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

	/* === Hires Record Helpers: Start === */
	function createEmptyHireRecord() {
		return {
			id: '',
			purchaseRequest: '',
			targetUser: '',
			startDate: '',
			laptopModel: '',
			laptopRu: '',
			laptopStatus: '',
			laptopWarehouse: '',
			monitorRu: '',
			monitorStatus: '',
			monitorWarehouse: '',
			preparedBy: '',
			deliveryLocation: '',
			peripheralNotes: '',
			monitorDock: false,
			keyboardMouseSet: false,
			mouse: false,
			keyboard: false,
			yealink: false,
			logiZoneVibe: false,
			lenovo: false,
			bag: false,
			backpack: false,
			laptopStand: false,
			presenter: false,
			printer: false,
			name: '',
			ru: '',
			sn: '',
			date: '',
			accessories: [],
			createdBy: null,
			updatedBy: null,
			createdAt: '',
			updatedAt: '',
		}
	}

	function normalizeLookup(value) {
		return String(value ?? '')
			.trim()
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, ' ')
			.trim()
	}

	function normalizeText(value) {
		return String(value ?? '').trim()
	}

	function normalizeDateValue(value) {
		return AppUtils.normalizeSpreadsheetDate(value) || ''
	}

	function valueIncludesAny(normalizedValue, patterns) {
		return patterns.some(pattern => normalizedValue.includes(pattern))
	}

	function getSemanticValueTone(fieldId, value) {
		const normalizedValue = normalizeLookup(value)
		if (!normalizedValue) return ''

		if (fieldId === 'laptopStatus' || fieldId === 'monitorStatus') {
			if (valueIncludesAny(normalizedValue, ['dystrybuc'])) return 'danger'
			if (valueIncludesAny(normalizedValue, ['gotowy do wydania'])) return 'info'
			if (valueIncludesAny(normalizedValue, ['wydany'])) return 'success'
			if (valueIncludesAny(normalizedValue, ['odebrany']) && valueIncludesAny(normalizedValue, ['termin'])) return 'slate'
			if (fieldId === 'monitorStatus' && valueIncludesAny(normalizedValue, ['zamow', 'zamaw'])) return 'slate'
			if (valueIncludesAny(normalizedValue, ['w trakcie', 'czekamy'])) return 'warning'
			return ''
		}

		if (fieldId === 'laptopWarehouse' || fieldId === 'monitorWarehouse') {
			if (valueIncludesAny(normalizedValue, ['brak konta'])) return 'danger-soft'
			if (valueIncludesAny(normalizedValue, ['wystawiony', 'potwierdzenia'])) return 'warning'
			if (valueIncludesAny(normalizedValue, ['potwierdzony'])) return 'success'
			return ''
		}

		return ''
	}

	function getSemanticToneClass(fieldId, value) {
		const tone = getSemanticValueTone(fieldId, value)
		return tone ? `hire-tone-${tone}` : ''
	}

	function syncSemanticSelectAppearance(select) {
		if (!select || !SEMANTIC_SELECT_FIELD_IDS.includes(select.id)) return

		Array.from(select.options).forEach(option => {
			const optionTone = option.value ? getSemanticValueTone(select.id, option.value) || 'default' : 'placeholder'
			option.dataset.semanticTone = optionTone
		})

		const selectedTone = select.value ? getSemanticValueTone(select.id, select.value) || 'default' : 'placeholder'
		select.classList.add('semantic-select')
		select.dataset.semanticTone = selectedTone
	}

	function syncSemanticSelects() {
		SEMANTIC_SELECT_FIELD_IDS.forEach(fieldId => {
			syncSemanticSelectAppearance(document.getElementById(fieldId))
		})
	}

	function normalizeFlagValue(value) {
		if (typeof value === 'boolean') return value
		if (typeof value === 'number') return Number(value) === 1

		const normalized = normalizeLookup(value)
		return ['1', 'true', 'tak', 'yes', 'y', 'x', 'zamowione', 'ordered'].includes(normalized)
	}

	function buildLegacyAccessories(record) {
		const accessories = []

		if (record.monitorDock) accessories.push('monitor')
		if (record.keyboardMouseSet) accessories.push('keyboard', 'mouse')
		if (record.mouse) accessories.push('mouse')
		if (record.keyboard) accessories.push('keyboard')
		if (record.yealink || record.logiZoneVibe) accessories.push('headset')
		if (record.bag) accessories.push('bag')
		if (record.backpack) accessories.push('backpack')
		if (record.laptopStand) accessories.push('laptop-pad')
		if (record.presenter) accessories.push('pointer')
		if (record.printer) accessories.push('printer')

		return Array.from(new Set(accessories))
	}

	function buildComparableSnapshot(record) {
		const normalizedRecord = record && typeof record === 'object' ? record : {}
		const normalizedAudit = AppUtils.normalizeAuditFields(normalizedRecord)

		return {
			id: normalizeText(normalizedRecord.id),
			purchaseRequest: normalizeText(normalizedRecord.purchaseRequest),
			targetUser: normalizeText(normalizedRecord.targetUser || normalizedRecord.name),
			startDate: normalizeDateValue(normalizedRecord.startDate || normalizedRecord.date),
			laptopModel: normalizeText(normalizedRecord.laptopModel || normalizedRecord.sn),
			laptopRu: normalizeText(normalizedRecord.laptopRu || normalizedRecord.ru),
			laptopStatus: normalizeText(normalizedRecord.laptopStatus),
			laptopWarehouse: normalizeText(normalizedRecord.laptopWarehouse),
			monitorRu: normalizeText(normalizedRecord.monitorRu),
			monitorStatus: normalizeText(normalizedRecord.monitorStatus),
			monitorWarehouse: normalizeText(normalizedRecord.monitorWarehouse),
			preparedBy: normalizeText(normalizedRecord.preparedBy),
			deliveryLocation: normalizeText(normalizedRecord.deliveryLocation),
			peripheralNotes: normalizeText(normalizedRecord.peripheralNotes || normalizedRecord.notes),
			monitorDock: normalizeFlagValue(normalizedRecord.monitorDock),
			keyboardMouseSet: normalizeFlagValue(normalizedRecord.keyboardMouseSet),
			mouse: normalizeFlagValue(normalizedRecord.mouse),
			keyboard: normalizeFlagValue(normalizedRecord.keyboard),
			yealink: normalizeFlagValue(normalizedRecord.yealink),
			logiZoneVibe: normalizeFlagValue(normalizedRecord.logiZoneVibe),
			lenovo: normalizeFlagValue(normalizedRecord.lenovo),
			bag: normalizeFlagValue(normalizedRecord.bag),
			backpack: normalizeFlagValue(normalizedRecord.backpack),
			laptopStand: normalizeFlagValue(normalizedRecord.laptopStand),
			presenter: normalizeFlagValue(normalizedRecord.presenter),
			printer: normalizeFlagValue(normalizedRecord.printer),
			accessories: buildLegacyAccessories(normalizedRecord),
			createdBy: normalizedAudit.createdBy,
			updatedBy: normalizedAudit.updatedBy,
			createdAt: normalizedAudit.createdAt,
			updatedAt: normalizedAudit.updatedAt,
		}
	}

	function normalizeHireRecord(source) {
		const rawRecord = source && typeof source === 'object' ? source : {}
		const details = rawRecord.details && typeof rawRecord.details === 'object' ? rawRecord.details : {}
		const mergedRecord = { ...rawRecord, ...details }
		const accessoryFlags = Object.fromEntries(ACCESSORY_FIELDS.map(field => [field.key, false]))
		const rawAccessories = Array.isArray(mergedRecord.accessories)
			? mergedRecord.accessories
			: typeof mergedRecord.accessories === 'string'
				? mergedRecord.accessories.split(',')
				: []
		const normalizedLegacyAccessories = AppUtils.normalizeAccessories(rawAccessories)
		const normalizedAudit = AppUtils.normalizeAuditFields(mergedRecord)

		normalizedLegacyAccessories.forEach(accessory => {
			const mappedField = LEGACY_ACCESSORY_TO_FIELD[accessory]
			if (mappedField) {
				accessoryFlags[mappedField] = true
			}
		})

		ACCESSORY_FIELDS.forEach(field => {
			if (Object.prototype.hasOwnProperty.call(mergedRecord, field.key)) {
				accessoryFlags[field.key] = normalizeFlagValue(mergedRecord[field.key])
			}
		})

		const targetUser = normalizeText(mergedRecord.targetUser || mergedRecord.name)
		const startDate = normalizeDateValue(mergedRecord.startDate || mergedRecord.date)
		const laptopModel = normalizeText(mergedRecord.laptopModel || mergedRecord.sn)
		const laptopRu = normalizeText(mergedRecord.laptopRu || mergedRecord.ru)

		return {
			...createEmptyHireRecord(),
			...normalizedAudit,
			id: normalizeText(mergedRecord.id),
			purchaseRequest: normalizeText(mergedRecord.purchaseRequest),
			targetUser,
			startDate,
			laptopModel,
			laptopRu,
			laptopStatus: normalizeText(mergedRecord.laptopStatus),
			laptopWarehouse: normalizeText(mergedRecord.laptopWarehouse),
			monitorRu: normalizeText(mergedRecord.monitorRu),
			monitorStatus: normalizeText(mergedRecord.monitorStatus),
			monitorWarehouse: normalizeText(mergedRecord.monitorWarehouse),
			preparedBy: normalizeText(mergedRecord.preparedBy),
			deliveryLocation: normalizeText(mergedRecord.deliveryLocation),
			peripheralNotes: normalizeText(mergedRecord.peripheralNotes || mergedRecord.notes),
			...accessoryFlags,
			name: targetUser,
			ru: laptopRu,
			sn: laptopModel,
			date: startDate,
			accessories: buildLegacyAccessories({ ...mergedRecord, ...accessoryFlags }),
		}
	}

	function buildImportLookup(row) {
		const lookup = new Map()
		Object.keys(row || {}).forEach(key => {
			lookup.set(normalizeLookup(key), row[key])
		})
		return lookup
	}

	function readImportedValue(lookup, aliases = []) {
		const normalizedAliases = aliases.map(normalizeLookup).filter(Boolean)

		for (const alias of normalizedAliases) {
			if (lookup.has(alias)) {
				return lookup.get(alias)
			}
		}

		for (const [lookupKey, lookupValue] of lookup.entries()) {
			if (normalizedAliases.some(alias => lookupKey.includes(alias))) {
				return lookupValue
			}
		}

		return ''
	}

	function getSelectedAccessoryKeys() {
		return Array.from(accessoryPicker?.querySelectorAll('.accessory-item.active') || [])
			.map(item => item.dataset.item)
			.filter(Boolean)
	}

	function getActiveAccessoryLabels(record) {
		return ACCESSORY_FIELDS.filter(field => Boolean(record[field.key])).map(field => field.label)
	}

	function getActiveAccessoryCount(record) {
		return ACCESSORY_FIELDS.filter(field => Boolean(record[field.key])).length
	}

	function getActiveAccessoryFields(record) {
		return ACCESSORY_FIELDS.filter(field => Boolean(record[field.key]))
	}

	function hasExpandedPanelContent(record) {
		return Boolean(
			getActiveAccessoryCount(record) > 0 ||
			normalizeText(record?.preparedBy) ||
			normalizeText(record?.peripheralNotes),
		)
	}

	function getHireRowKey(hire, fallbackIndex = -1) {
		const stableId = normalizeText(hire?.id)
		if (stableId) return `id::${stableId}`

		const duplicateKey = getHireDuplicateKey(hire)
		if (duplicateKey) return `dup::${duplicateKey}`

		return `row::${fallbackIndex}`
	}

	function clearDynamicSelectOptions() {
		SELECT_FIELD_IDS.forEach(fieldId => {
			const field = document.getElementById(fieldId)
			if (!field || field.tagName !== 'SELECT') return

			field.querySelectorAll('option[data-dynamic-option="true"]').forEach(option => option.remove())
		})
	}

	function ensureSelectValue(field, value) {
		if (!field || field.tagName !== 'SELECT') return

		const normalizedValue = String(value ?? '').trim()
		if (!normalizedValue) return

		const hasOption = Array.from(field.options).some(option => String(option.value) === normalizedValue)
		if (hasOption) return

		const dynamicOption = document.createElement('option')
		dynamicOption.value = normalizedValue
		dynamicOption.textContent = `${normalizedValue} (zapisane)`
		dynamicOption.dataset.dynamicOption = 'true'
		field.appendChild(dynamicOption)
		syncSemanticSelectAppearance(field)
	}

	function getInlineEditStateKey(index, fieldId) {
		const hire = hires[index]
		if (!hire || !INLINE_EDITABLE_FIELD_IDS.includes(fieldId)) return ''
		return `${getHireRowKey(hire, index)}::${fieldId}`
	}

	function isInlineEditActive(index, fieldId) {
		return inlineEditState === getInlineEditStateKey(index, fieldId)
	}

	function getInlineEditableOptions(fieldId, selectedValue = '') {
		const sourceField = document.getElementById(fieldId)
		if (!sourceField || sourceField.tagName !== 'SELECT') return []

		ensureSelectValue(sourceField, selectedValue)
		syncSemanticSelectAppearance(sourceField)

		return Array.from(sourceField.options).map(option => {
			const optionValue = String(option.value ?? '')
			return {
				value: optionValue,
				label: normalizeText(option.textContent || optionValue || '---'),
				tone: optionValue ? getSemanticValueTone(fieldId, optionValue) || 'default' : 'placeholder',
			}
		})
	}
	/* === Hires Record Helpers: End === */

	/* === Hires Storage: Start === */
	function loadData() {
		const parsedHires = hiresService?.getAll?.() || []
		let hasUpdates = false

		const normalizedHires = parsedHires.map(hire => {
			const normalizedHire = normalizeHireRecord(hire)
			if (JSON.stringify(buildComparableSnapshot(hire)) !== JSON.stringify(buildComparableSnapshot(normalizedHire))) {
				hasUpdates = true
			}
			return normalizedHire
		})

		const { records: deduplicatedHires, removedCount } = dedupeHires(normalizedHires)
		if (removedCount > 0) {
			hasUpdates = true
		}

		hires = deduplicatedHires

		const currentViewDate = monthPicker.getCurrentDate()
		const hasCurrentMonthData = hires.some(hire => AppUtils.isSameMonth(hire.startDate || hire.date, currentViewDate))
		if (!hasCurrentMonthData) {
			const latestHireDate = hires
				.map(hire => AppUtils.parseDate(hire.startDate || hire.date))
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
		const purchaseRequest = normalizeLookup(hire?.purchaseRequest || '')
		const targetUser = normalizeLookup(hire?.targetUser || hire?.name || '')
		const startDate = normalizeDateValue(hire?.startDate || hire?.date || '')
		const laptopRu = normalizeLookup(hire?.laptopRu || hire?.ru || '')
		const laptopModel = normalizeLookup(hire?.laptopModel || hire?.sn || '')

		if (!targetUser && !purchaseRequest) return ''
		return [purchaseRequest || '-', targetUser || '-', startDate || '-', laptopRu || '-', laptopModel || '-'].join('::')
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
		return hires.filter(hire => AppUtils.isSameMonth(hire.startDate || hire.date, currentViewDate))
	}

	function getVisibleHires() {
		const source = searchQuery.trim() ? hires : getCurrentMonthHires()
		return source.filter(hire => {
			const searchValues = [
				hire.purchaseRequest,
				hire.targetUser,
				hire.startDate,
				hire.laptopModel,
				hire.laptopRu,
				hire.laptopStatus,
				hire.laptopWarehouse,
				hire.monitorRu,
				hire.monitorStatus,
				hire.monitorWarehouse,
				hire.preparedBy,
				hire.deliveryLocation,
				hire.peripheralNotes,
				...getActiveAccessoryLabels(hire),
			]

			return AppUtils.matchesSearchQuery(searchValues, searchQuery)
		})
	}

	function getInputValue(id) {
		if (id === 'startDate') {
			return document.getElementById(id)?.value || ''
		}
		return normalizeText(document.getElementById(id)?.value || '')
	}

	function getFormState() {
		const accessoryKeys = new Set(getSelectedAccessoryKeys())
		return normalizeHireRecord({
			purchaseRequest: getInputValue('purchaseRequest'),
			targetUser: getInputValue('targetUser'),
			startDate: getInputValue('startDate'),
			laptopModel: getInputValue('laptopModel'),
			laptopRu: getInputValue('laptopRu'),
			laptopStatus: getInputValue('laptopStatus'),
			laptopWarehouse: getInputValue('laptopWarehouse'),
			monitorRu: getInputValue('monitorRu'),
			monitorStatus: getInputValue('monitorStatus'),
			monitorWarehouse: getInputValue('monitorWarehouse'),
			preparedBy: getInputValue('preparedBy'),
			deliveryLocation: getInputValue('deliveryLocation'),
			peripheralNotes: getInputValue('peripheralNotes'),
			...Object.fromEntries(ACCESSORY_FIELDS.map(field => [field.key, accessoryKeys.has(field.key)])),
		})
	}

	function captureDrawerSnapshot() {
		drawerInitialState = JSON.stringify(buildComparableSnapshot(getFormState()))
	}

	function hasDrawerFormChanges() {
		return Boolean(hiresForm) && JSON.stringify(buildComparableSnapshot(getFormState())) !== drawerInitialState
	}

	function updateMonthSummary({ visibleCount, monthCount, totalCount, monthLabel }) {
		if (!monthSummary) return

		if (totalCount === 0) {
			monthSummary.textContent = `${monthLabel} · baza jest pusta, mozesz dodac pierwszy onboarding.`
			return
		}

		if (searchQuery.trim()) {
			monthSummary.textContent = `Wyniki wyszukiwania: ${visibleCount} z ${totalCount} wpisow na stronie nowych zatrudnien.`
			return
		}

		if (monthCount === 0) {
			monthSummary.textContent = `${monthLabel} · brak wpisow w tym miesiacu.`
			return
		}

		if (monthCount === totalCount) {
			monthSummary.textContent = `${monthLabel} · widoczne wpisy: ${monthCount}.`
			return
		}

		monthSummary.textContent = `${monthLabel} · widoczne wpisy: ${monthCount} z ${totalCount} w calej bazie.`
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

	function renderChip(value, className = '') {
		const normalizedValue = normalizeText(value)
		if (!normalizedValue) {
			return '<span class="hire-empty">---</span>'
		}

		return `<span class="hire-chip ${className}">${escapeHtml(normalizedValue)}</span>`
	}

	function renderInlineEditableValue(index, fieldId, value, { className = '', guestMode = false } = {}) {
		const normalizedValue = normalizeText(value)
		const fieldLabel = INLINE_EDITABLE_FIELD_LABELS[fieldId] || fieldId

		if (isInlineEditActive(index, fieldId)) {
			const selectedTone = normalizedValue ? getSemanticValueTone(fieldId, normalizedValue) || 'default' : 'placeholder'
			const optionsMarkup = getInlineEditableOptions(fieldId, normalizedValue)
				.map(
					option => `
						<option value="${escapeHtml(option.value)}" data-semantic-tone="${escapeHtml(option.tone)}" ${option.value === normalizedValue ? 'selected' : ''}>
							${escapeHtml(option.label)}
						</option>
					`
				)
				.join('')

			return `
				<select class="hire-inline-select semantic-select" data-index="${index}" data-field-id="${fieldId}" data-semantic-tone="${escapeHtml(selectedTone)}" aria-label="Zmien ${escapeHtml(fieldLabel)}">
					${optionsMarkup}
				</select>
			`
		}

		const actionCopy = guestMode ? `Zaloguj sie, aby zmienic ${fieldLabel}` : `Kliknij, aby zmienic ${fieldLabel}`
		return `
			<button class="hire-inline-chip-btn ${normalizedValue ? '' : 'is-empty'}" type="button" data-action="start-inline-edit" data-index="${index}" data-field-id="${fieldId}" aria-label="${escapeHtml(actionCopy)}" title="${escapeHtml(actionCopy)}">
				${renderChip(value, className)}
			</button>
		`
	}

	function getStartDateBadge(hire) {
		const dateValue = hire.startDate || hire.date
		const parsedDate = AppUtils.parseDate(dateValue)
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		if (!parsedDate) {
			return { className: 'near', label: 'Brak poprawnej daty' }
		}

		const diff = Math.ceil((parsedDate - today) / (1000 * 60 * 60 * 24))
		if (diff < 0) {
			return { className: 'expired', label: 'Zatrudniony' }
		}

		if (diff <= 3) {
			return { className: 'near', label: AppUtils.formatDate(parsedDate) }
		}

		return { className: 'ok', label: AppUtils.formatDate(parsedDate) }
	}

	function renderAccessoryToggleButton(index, record, isExpanded) {
		const activeCount = getActiveAccessoryCount(record)
		const canExpand = hasExpandedPanelContent(record)
		const hasAccessories = activeCount > 0
		const buttonLabel = !canExpand
			? 'Brak dodatkowych danych'
			: isExpanded
				? 'Ukryj szczegoly'
				: 'Pokaz szczegoly'

		return `
			<button class="icon-button hire-action-btn hire-action-btn-toggle ${hasAccessories ? 'has-accessories' : 'is-empty'} ${isExpanded ? 'is-active' : ''}" type="button" data-action="toggle-accessories" data-index="${index}" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-label="${buttonLabel}" title="${buttonLabel}" ${canExpand ? '' : 'disabled'}>
				<i class="app-icon layer-group-solid-full"></i>
			</button>
		`
	}

	function renderAccessoryPreviewIcon(field) {
		if (!field) return ''
		const badgeMarkup = field.badge ? `<small>${escapeHtml(field.badge)}</small>` : ''
		return `
			<span class="hire-accessory-preview-icon" title="${escapeHtml(field.label)}" aria-label="${escapeHtml(field.label)}">
				<i class="app-icon ${field.icon}"></i>
				${badgeMarkup}
			</span>
		`
	}

	function renderExpandedPanelDetail(label, value, { multiline = false } = {}) {
		const normalizedValue = normalizeText(value)
		const content = normalizedValue
			? multiline
				? escapeHtml(normalizedValue).replace(/\n/g, '<br>')
				: escapeHtml(normalizedValue)
			: '<span class="hire-accessories-meta-placeholder">---</span>'

		return `
			<div class="hire-accessories-meta-item ${multiline ? 'is-notes' : ''}">
				<span class="hire-accessories-meta-label">${escapeHtml(label)}</span>
				<span class="hire-accessories-meta-value">${content}</span>
			</div>
		`
	}

	function renderAccessoriesPanel(record) {
		const activeAccessories = getActiveAccessoryFields(record)
		const detailMarkup = [
			renderExpandedPanelDetail('Przygotowal/a', record.preparedBy),
			renderExpandedPanelDetail('Uwagi', record.peripheralNotes, { multiline: true }),
			renderExpandedPanelDetail('Lokalizacja do wydania', record.deliveryLocation),
		].join('')
		const accessoriesMarkup = activeAccessories
			.map(field => renderAccessoryPreviewIcon(field))
			.join('')
		const accessoriesGroupMarkup = `
			<div class="hire-accessories-group ${accessoriesMarkup ? 'has-icons' : 'is-empty'}">
				<span class="hire-accessories-meta-label">Akcesoria</span>
				<div class="hire-accessories-icons ${accessoriesMarkup ? '' : 'is-empty'}" style="--icon-count: ${Math.max(activeAccessories.length, 1)};">
					${accessoriesMarkup || '<span class="hire-accessories-meta-placeholder">---</span>'}
				</div>
			</div>
		`

		return `
			<div class="hire-accessories-panel">
				${detailMarkup ? `<div class="hire-accessories-meta">${detailMarkup}</div>` : ''}
				${accessoriesGroupMarkup}
			</div>
		`
	}
	/* === Hires View Helpers: End === */

	/* === Hires Drawer: Start === */
	function setDrawerAudit(record) {
		if (!drawerAudit) return

		if (!record) {
			drawerAudit.innerHTML = ''
			drawerAudit.hidden = true
			return
		}

		drawerAudit.innerHTML = `
			<p class="hire-drawer-audit-label">Historia wpisu</p>
			${AppUtils.buildAuditMarkup(record)}
		`
		drawerAudit.hidden = false
	}

	function resetFormState() {
		editIndex = null

		if (hiresForm) {
			hiresForm.reset()
		}

		clearDynamicSelectOptions()
		syncSemanticSelects()

		document.querySelectorAll('.accessory-item').forEach(item => {
			item.classList.remove('active', 'is-tapped')
		})

		if (drawerTitle) {
			drawerTitle.textContent = 'Dodaj pracownika'
		}

		if (drawerCopy) {
			drawerCopy.textContent = 'Uzupelnij dane i zapisz nowy onboarding.'
		}

		setDrawerAudit(null)

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

		const firstField = document.getElementById('purchaseRequest') || document.getElementById('targetUser')
		window.setTimeout(() => firstField?.focus(), 80)
	}

	async function closeDrawer({ force = false } = {}) {
		if (!drawerShell) return false

		if (!force && hasDrawerFormChanges()) {
			const shouldClose = await AppUtils.confirmDialog({
				title: 'Niezapisane zmiany',
				message: 'Zamknac panel? Niezapisane zmiany zostana utracone.',
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

	function fillFormFromHire(hire) {
		const fieldMap = {
			purchaseRequest: 'purchaseRequest',
			targetUser: 'targetUser',
			startDate: 'startDate',
			laptopModel: 'laptopModel',
			laptopRu: 'laptopRu',
			laptopStatus: 'laptopStatus',
			laptopWarehouse: 'laptopWarehouse',
			monitorRu: 'monitorRu',
			monitorStatus: 'monitorStatus',
			monitorWarehouse: 'monitorWarehouse',
			preparedBy: 'preparedBy',
			deliveryLocation: 'deliveryLocation',
			peripheralNotes: 'peripheralNotes',
		}

		Object.entries(fieldMap).forEach(([recordKey, fieldId]) => {
			const field = document.getElementById(fieldId)
			if (!field) return
			ensureSelectValue(field, hire[recordKey] || '')
			field.value = hire[recordKey] || ''
		})
		syncSemanticSelects()

		document.querySelectorAll('.accessory-item').forEach(item => {
			const itemKey = item.dataset.item
			item.classList.toggle('active', Boolean(itemKey && hire[itemKey]))
		})
	}

	function startEditFlow(index) {
		if (!requireAuthenticatedAction()) return
		const hire = hires[index]
		if (!hire) return

		resetFormState()
		editIndex = index
		fillFormFromHire(hire)

		if (drawerTitle) {
			drawerTitle.textContent = 'Edytuj pracownika'
		}

		if (drawerCopy) {
			drawerCopy.textContent = 'Zmien dane wpisu i zapisz poprawki bez wychodzenia z widoku tabeli.'
		}

		setDrawerAudit(hire)

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
					`<tr><td colspan="${VISIBLE_TABLE_COLUMN_COUNT}" class="empty-state-cell">Brak wynikow wyszukiwania na stronie nowych zatrudnien.<br><small>Sprawdz uzytkownika docelowego, statusy, lokalizacje lub ikonowe peryferia.</small></td></tr>`
				return
			}

			if (monthHires.length === 0) {
				const hiddenCount = hires.length
				tableBody.innerHTML =
					`<tr><td colspan="${VISIBLE_TABLE_COLUMN_COUNT}" class="empty-state-cell">Brak planowanych zatrudnien w tym miesiacu.${
						hiddenCount > 0
							? `<br><small>W bazie jest jeszcze ${hiddenCount} rekordow, ale eksport Excel dziala dla wybranego miesiaca: ${monthLabel}.</small>`
							: ''
					}</td></tr>`
				return
			}
		}

		filteredHires.forEach(hire => {
			const originalIndex = hires.findIndex(original => original === hire)
			const startDateBadge = getStartDateBadge(hire)
			const rowKey = getHireRowKey(hire, originalIndex)
			const isAccessoriesExpanded = expandedAccessoriesRowKey === rowKey

			const row = document.createElement('tr')
			row.className = `hire-row-main${isAccessoriesExpanded ? ' is-accessories-open' : ''}`
			row.innerHTML = `
				<td class="is-sticky-left-1">
					${renderChip(hire.purchaseRequest, 'hire-chip-primary')}
				</td>
				<td class="is-sticky-left-2">
					<span class="hire-name">${escapeHtml(hire.targetUser || '---')}</span>
				</td>
				<td>
					<span class="status-pill ${startDateBadge.className}">${escapeHtml(startDateBadge.label)}</span>
				</td>
				<td>${renderChip(hire.laptopModel)}</td>
				<td>${renderChip(hire.laptopRu)}</td>
				<td>${renderInlineEditableValue(originalIndex, 'laptopStatus', hire.laptopStatus, { className: `hire-chip-muted ${getSemanticToneClass('laptopStatus', hire.laptopStatus)}`, guestMode })}</td>
				<td>${renderInlineEditableValue(originalIndex, 'laptopWarehouse', hire.laptopWarehouse, { className: getSemanticToneClass('laptopWarehouse', hire.laptopWarehouse), guestMode })}</td>
				<td>${renderChip(hire.monitorRu)}</td>
				<td>${renderInlineEditableValue(originalIndex, 'monitorStatus', hire.monitorStatus, { className: `hire-chip-muted ${getSemanticToneClass('monitorStatus', hire.monitorStatus)}`, guestMode })}</td>
				<td>${renderInlineEditableValue(originalIndex, 'monitorWarehouse', hire.monitorWarehouse, { className: getSemanticToneClass('monitorWarehouse', hire.monitorWarehouse), guestMode })}</td>
				<td class="cell-center is-sticky-right">
					<div class="hire-actions">
						${renderAccessoryToggleButton(originalIndex, hire, isAccessoriesExpanded)}
						<button class="icon-button hire-action-btn" type="button" data-action="edit" data-index="${originalIndex}" aria-label="Edytuj wpis" title="${guestMode ? 'Zaloguj sie, aby edytowac wpisy' : 'Edytuj wpis'}" ${guestMode ? 'disabled' : ''}>
							<i class="app-icon pen-solid-full"></i>
						</button>
						<button class="icon-button hire-action-btn hire-action-btn-danger" type="button" data-action="delete" data-index="${originalIndex}" aria-label="Usun wpis" title="${guestMode ? 'Zaloguj sie, aby usuwac wpisy' : 'Usun wpis'}" ${guestMode ? 'disabled' : ''}>
							<i class="app-icon trash-solid-full"></i>
						</button>
					</div>
				</td>
			`
			tableBody.appendChild(row)

			if (isAccessoriesExpanded) {
				const accessoriesRow = document.createElement('tr')
				accessoriesRow.className = 'hire-accessories-row'
				accessoriesRow.innerHTML = `
					<td colspan="${VISIBLE_TABLE_COLUMN_COUNT}" class="hire-accessories-cell">
						${renderAccessoriesPanel(hire)}
					</td>
				`
				tableBody.appendChild(accessoriesRow)
			}
		})

		if (inlineEditState) {
			window.requestAnimationFrame(() => {
				tableBody.querySelector('.hire-inline-select')?.focus({ preventScroll: true })
			})
		}
	}
	/* === Hires Table Rendering: End === */

	/* === Hires Actions: Start === */
	function closeInlineEdit({ render = true } = {}) {
		if (!inlineEditState) return
		inlineEditState = null
		if (render) renderTable()
	}

	function startInlineEdit(index, fieldId) {
		if (!INLINE_EDITABLE_FIELD_IDS.includes(fieldId)) return
		if (!requireAuthenticatedAction('Musisz byc zalogowany, aby szybko zmieniac statusy bezposrednio w tabeli.')) return
		if (!hires[index]) return

		inlineEditState = getInlineEditStateKey(index, fieldId)
		renderTable()
	}

	function updateInlineEditableField(index, fieldId, value) {
		if (!INLINE_EDITABLE_FIELD_IDS.includes(fieldId)) return
		if (!requireAuthenticatedAction('Musisz byc zalogowany, aby szybko zmieniac statusy bezposrednio w tabeli.')) return

		const hire = hires[index]
		if (!hire) {
			closeInlineEdit()
			return
		}

		const normalizedValue = normalizeText(value)
		const currentValue = normalizeText(hire[fieldId])
		if (normalizedValue === currentValue) {
			closeInlineEdit()
			return
		}

		const sourceField = document.getElementById(fieldId)
		ensureSelectValue(sourceField, normalizedValue)

		const actor = AppUtils.auth.getAuditActorSnapshot()
		const now = new Date().toISOString()
		hires[index] = normalizeHireRecord({
			...hire,
			[fieldId]: normalizedValue,
			updatedBy: actor,
			updatedAt: now,
		})

		if (editIndex === index) {
			fillFormFromHire(hires[index])
			setDrawerAudit(hires[index])
			captureDrawerSnapshot()
		}

		inlineEditState = null
		saveData()
	}

	function toggleAccessoriesRow(index) {
		const hire = hires[index]
		if (!hire) return

		const rowKey = getHireRowKey(hire, index)
		expandedAccessoriesRowKey = expandedAccessoriesRowKey === rowKey ? null : rowKey
		renderTable({ animateContainer: true })
	}

	async function removeItem(index) {
		if (!requireAuthenticatedAction()) return
		if (
			!(
				await AppUtils.confirmDialog({
					title: 'Usuwanie wpisu',
					message: 'Usunac wpis?',
				})
			)
		)
			return

		const hireToRemove = hires[index]
		if (hireToRemove && expandedAccessoriesRowKey === getHireRowKey(hireToRemove, index)) {
			expandedAccessoriesRowKey = null
		}

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
		if (typeof XLSX === 'undefined') {
			AppUtils.notify({
				type: 'warning',
				title: 'Biblioteka Excela nie jest gotowa',
				message: 'Poczekaj chwile i sprobuj ponownie.',
			})
			return
		}

		const { monthKey, monthLabel } = getCurrentMonthContext()
		const hiresToExport = getCurrentMonthHires()

		if (hiresToExport.length === 0) {
			AppUtils.notify({
				type: 'warning',
				title: 'Brak danych do eksportu',
				message: `Arkusz za ${monthLabel} pozostal pusty. Zmien miesiac albo dodaj wpis, a wtedy eksport ruszy bez problemu.`,
			})
			return
		}

		const dataToExport = hiresToExport.map(hire => {
			const row = {}
			EXPORT_COLUMNS.forEach(column => {
				row[column.header] = column.type === 'flag' ? (hire[column.key] ? 1 : 0) : hire[column.key] || ''
			})
			return row
		})

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

		if (typeof XLSX === 'undefined') {
			AppUtils.notify({
				type: 'warning',
				title: 'Biblioteka Excela nie jest gotowa',
				message: 'Poczekaj chwile i sprobuj ponownie.',
			})
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
				.map(row => {
					const lookup = buildImportLookup(row)
					const partialRecord = {
						purchaseRequest: normalizeText(readImportedValue(lookup, IMPORT_ALIASES.purchaseRequest)),
						targetUser: normalizeText(readImportedValue(lookup, IMPORT_ALIASES.targetUser)),
						startDate: normalizeDateValue(readImportedValue(lookup, IMPORT_ALIASES.startDate)),
						laptopModel: normalizeText(readImportedValue(lookup, IMPORT_ALIASES.laptopModel)),
						laptopRu: normalizeText(readImportedValue(lookup, IMPORT_ALIASES.laptopRu)),
						laptopStatus: normalizeText(readImportedValue(lookup, IMPORT_ALIASES.laptopStatus)),
						laptopWarehouse: normalizeText(readImportedValue(lookup, IMPORT_ALIASES.laptopWarehouse)),
						monitorRu: normalizeText(readImportedValue(lookup, IMPORT_ALIASES.monitorRu)),
						monitorStatus: normalizeText(readImportedValue(lookup, IMPORT_ALIASES.monitorStatus)),
						monitorWarehouse: normalizeText(readImportedValue(lookup, IMPORT_ALIASES.monitorWarehouse)),
						preparedBy: normalizeText(readImportedValue(lookup, IMPORT_ALIASES.preparedBy)),
						deliveryLocation: normalizeText(readImportedValue(lookup, IMPORT_ALIASES.deliveryLocation)),
						peripheralNotes: normalizeText(readImportedValue(lookup, IMPORT_ALIASES.peripheralNotes)),
						...Object.fromEntries(
							ACCESSORY_FIELDS.map(field => [field.key, normalizeFlagValue(readImportedValue(lookup, IMPORT_ALIASES[field.key]))])
						),
					}

					const legacyAccessoriesValue = readImportedValue(lookup, IMPORT_ALIASES.legacyAccessories)
					if (legacyAccessoriesValue) {
						AppUtils.normalizeAccessories(String(legacyAccessoriesValue).split(',')).forEach(accessory => {
							const mappedField = LEGACY_ACCESSORY_TO_FIELD[accessory]
							if (mappedField) {
								partialRecord[mappedField] = true
							}
						})
					}

					return normalizeHireRecord({
						...partialRecord,
						createdBy: actor,
						updatedBy: actor,
						createdAt: importedAt,
						updatedAt: importedAt,
					})
				})
				.filter(hire => {
					const isValid = Boolean(hire.targetUser && hire.startDate)
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
					title: 'Brak nowych wpisow',
					message:
						skippedCount > 0
							? 'Wszystkie rekordy z importu juz istnieja, powtarzaja sie w pliku albo sa niepelne.'
							: 'Plik nie zawiera poprawnych, nowych wpisow do dodania.',
				})
				event.target.value = ''
				return
			}

			if (
				await AppUtils.confirmDialog({
					title: 'Import zatrudnien',
					message:
						skippedCount > 0
							? `Zaimportowac ${importedUniqueHires.length} wpisow? Pomine ${skippedCount} duplikatow lub niepelnych wierszy.`
							: `Zaimportowac ${importedUniqueHires.length} wpisow?`,
				})
			) {
				const latestImportedDate = importedUniqueHires
					.map(hire => AppUtils.parseDate(hire.startDate))
					.filter(Boolean)
					.sort((left, right) => right - left)[0]

				hires = [...hires, ...importedUniqueHires]
				if (latestImportedDate) {
					monthPicker.setCurrentDate(latestImportedDate, { render: false })
				}
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
		syncSemanticSelects()

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

		SEMANTIC_SELECT_FIELD_IDS.forEach(fieldId => {
			const field = document.getElementById(fieldId)
			field?.addEventListener('change', () => syncSemanticSelectAppearance(field))
		})

		if (tableBody) {
			tableBody.addEventListener('pointerdown', event => {
				const inlineTrigger = event.target.closest('[data-action="start-inline-edit"]')
				if (!inlineTrigger || !inlineEditState) return

				const index = Number(inlineTrigger.dataset.index)
				const fieldId = inlineTrigger.dataset.fieldId
				const nextInlineKey = getInlineEditStateKey(index, fieldId)
				if (!nextInlineKey || nextInlineKey === inlineEditState) return

				event.preventDefault()
				startInlineEdit(index, fieldId)
			})

			tableBody.addEventListener('change', event => {
				const inlineSelect = event.target.closest('.hire-inline-select')
				if (!inlineSelect) return

				updateInlineEditableField(
					Number(inlineSelect.dataset.index),
					inlineSelect.dataset.fieldId,
					inlineSelect.value,
				)
			})

			tableBody.addEventListener('focusout', event => {
				const inlineSelect = event.target.closest('.hire-inline-select')
				if (!inlineSelect) return
				const nextInlineTrigger = event.relatedTarget?.closest?.('[data-action="start-inline-edit"]')
				if (nextInlineTrigger) return
				const blurredInlineKey = getInlineEditStateKey(
					Number(inlineSelect.dataset.index),
					inlineSelect.dataset.fieldId,
				)

				window.requestAnimationFrame(() => {
					if (document.activeElement === inlineSelect) return
					if (inlineEditState === blurredInlineKey) closeInlineEdit()
				})
			})

			tableBody.addEventListener('keydown', event => {
				const inlineSelect = event.target.closest('.hire-inline-select')
				if (!inlineSelect) return

				if (event.key === 'Escape') {
					event.preventDefault()
					closeInlineEdit()
				}
			})

			tableBody.addEventListener('click', event => {
				const actionButton = event.target.closest('[data-action]')
				if (!actionButton) return

				const index = Number(actionButton.dataset.index)
				const { action } = actionButton.dataset

				if (action === 'start-inline-edit') {
					startInlineEdit(index, actionButton.dataset.fieldId)
					return
				}

				if (action === 'toggle-accessories') {
					toggleAccessoriesRow(index)
					return
				}

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

				const hireData = getFormState()
				if (!hireData.targetUser || !hireData.startDate) {
					AppUtils.notify({
						type: 'warning',
						title: 'Brak wymaganych danych',
						message: 'Uzupelnij uzytkownika docelowego oraz date rozpoczecia pracy.',
					})
					return
				}

				const actor = AppUtils.auth.getAuditActorSnapshot()
				const now = new Date().toISOString()
				const duplicateKey = getHireDuplicateKey(hireData)
				const duplicateIndex = hires.findIndex((hire, index) => index !== editIndex && getHireDuplicateKey(hire) === duplicateKey)

				if (duplicateKey && duplicateIndex !== -1) {
					AppUtils.notify({
						type: 'warning',
						title: 'Duplikat zatrudnienia',
						message: 'Taki onboarding juz istnieje. Zmien dane albo edytuj istniejacy wpis.',
					})
					return
				}

				if (editIndex !== null) {
					hires[editIndex] = normalizeHireRecord({
						...hires[editIndex],
						...hireData,
						updatedBy: actor,
						updatedAt: now,
					})
				} else {
					hires.push(
						normalizeHireRecord({
							...hireData,
							createdBy: actor,
							updatedBy: actor,
							createdAt: now,
							updatedAt: now,
						})
					)
				}

				monthPicker.setCurrentDate(AppUtils.parseDate(hireData.startDate) || new Date(), { render: false })
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
