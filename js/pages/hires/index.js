(function initializeHiresPage() {
	/* === Hires State And References: Start === */
	const pageScope = window.AppPageRuntime?.createScope?.('nowe_zatrudnienia.html') || null
	const runWhenReady = callback => {
		if (typeof pageScope?.runWhenReady === 'function') {
			pageScope.runWhenReady(callback)
			return
		}

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback, { once: true })
			return
		}

		callback()
	}
	const listen = (target, type, listener, options = undefined) => {
		if (!target?.addEventListener) return
		const nextOptions = pageScope?.signal ? { ...(options || {}), signal: pageScope.signal } : options
		target.addEventListener(type, listener, nextOptions)
	}
	const scheduleTimeout = typeof pageScope?.setTimeout === 'function' ? pageScope.setTimeout.bind(pageScope) : window.setTimeout.bind(window)
	let hires = []
	let editIndex = null
	let drawerInitialState = ''
	let searchQuery = ''
	let expandedAccessoriesRowKey = null
	let editingRowKey = null
	let inlineEditState = null
	let inlineEditMetrics = null
	const hiresService = window.AppServices?.hiresService
	const escapeHtml = window.AppUtils?.escapeHtml || (value => String(value ?? ''))

	const ACCESSORY_FIELDS = [
		{ key: 'monitorDock', label: 'Monitor', previewLabel: 'Monitor', icon: 'desktop-solid-full' },
		{ key: 'mouse', label: 'Mysz', previewLabel: 'Mysz', icon: 'computer-mouse-solid-full' },
		{ key: 'keyboard', label: 'Klawiatura', previewLabel: 'Klawiatura', icon: 'keyboard-solid-full' },
		{ key: 'yealink', label: 'Yealink', previewLabel: 'Yealink', icon: 'headset-solid-full' },
		{ key: 'logiZoneVibe', label: 'Logi Zone Vibe', previewLabel: 'Logi Zone', icon: 'headset-solid-full' },
		{ key: 'lenovo', label: 'Lenovo', previewLabel: 'Lenovo', icon: 'box-solid-full' },
		{ key: 'bag', label: 'Torba', previewLabel: 'Torba', icon: 'briefcase-solid-full' },
		{ key: 'backpack', label: 'Plecak', previewLabel: 'Plecak', icon: 'backpack-icon' },
		{ key: 'laptopStand', label: 'Podstawka pod laptop', previewLabel: 'Podstawka', icon: 'table-cells-solid-full' },
		{ key: 'presenter', label: 'Prezenter', previewLabel: 'Prezenter', icon: 'pen-clip-solid-full' },
		{ key: 'printer', label: 'Drukarka', previewLabel: 'Drukarka', icon: 'print-solid-full' },
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
		{ key: 'purchaseRequest', header: 'Service Desk' },
		{ key: 'targetUser', header: 'Użytkownik' },
		{ key: 'startDate', header: 'Data rozpoczęcia pracy' },
		{ key: 'laptopModel', header: 'Laptop - model' },
		{ key: 'laptopRu', header: 'Laptop - RU' },
		{ key: 'laptopStatus', header: 'Laptop - Status' },
		{ key: 'laptopWarehouse', header: 'Laptop - eMagazyn' },
		{ key: 'monitorRu', header: 'Monitor - RU' },
		{ key: 'monitorStatus', header: 'Monitor - Status' },
		{ key: 'monitorWarehouse', header: 'Monitor - eMagazyn' },
		{ key: 'preparedBy', header: 'Przygotował/a' },
		{ key: 'deliveryLocation', header: 'Lokalizacja' },
		{ key: 'peripheralNotes', header: 'Uwagi' },
		...ACCESSORY_FIELDS.map(field => ({
			key: field.key,
			header: field.label,
			type: 'flag',
		})),
	]

	const IMPORT_ALIASES = {
		purchaseRequest: ['service desk', 'zgłoszenie na zakup sprzętu', 'zakup sprzętu', 'zakup'],
		targetUser: ['użytkownik', 'użytkownik docelowy', 'imię i nazwisko'],
		startDate: ['data rozpoczęcia pracy', 'data rozpoczęcia', 'start'],
		laptopModel: ['laptop model', 'sprzęt sn', 'sn sprzętu', 'sprzęt / sn'],
		laptopRu: ['laptop ru', 'ru laptopa', 'dział stanowisko', 'sekcja'],
		laptopStatus: ['laptop status'],
		laptopWarehouse: ['laptop emagazyn', 'laptop e magazyn'],
		monitorRu: ['monitor ru'],
		monitorStatus: ['monitor status'],
		monitorWarehouse: ['monitor emagazyn', 'monitor e magazyn'],
		preparedBy: ['przygotował/a', 'przygotował'],
		deliveryLocation: ['lokalizacja', 'lokalizacja do wydania'],
		peripheralNotes: [
			'uwagi',
			'uwagi do peryferiów',
			'uwagi dot. peryferiów',
			'proszę o wpisanie w kolumnach obok',
			'peryferiów jakie zostały zamówione',
			'komentarz',
		],
		monitorDock: ['monitor'],
		mouse: ['mysz'],
		keyboard: ['klawiatura'],
		yealink: ['yealink'],
		logiZoneVibe: ['logi zone vibe'],
		lenovo: ['lenovo'],
		bag: ['torba'],
		backpack: ['plecak'],
		laptopStand: ['podstawka pod laptop', 'podstawka pod laptopa', 'podkładka pod laptopa'],
		presenter: ['prezenter'],
		printer: ['drukarka'],
		legacyAccessories: ['akcesoria'],
	}

	const SELECT_FIELD_IDS = ['laptopStatus', 'laptopWarehouse', 'monitorStatus', 'monitorWarehouse', 'preparedBy']
	const SEMANTIC_SELECT_FIELD_IDS = ['laptopStatus', 'laptopWarehouse', 'monitorStatus', 'monitorWarehouse']
	const INLINE_SELECT_FIELD_IDS = ['laptopStatus', 'laptopWarehouse', 'monitorStatus', 'monitorWarehouse']
	const TABLE_EDITABLE_FIELD_IDS = [
		'purchaseRequest',
		'targetUser',
		'startDate',
		'laptopModel',
		'laptopRu',
		'laptopStatus',
		'laptopWarehouse',
		'monitorRu',
		'monitorStatus',
		'monitorWarehouse',
		'preparedBy',
		'deliveryLocation',
		'peripheralNotes',
	]
	const TABLE_EDITABLE_FIELD_LABELS = {
		purchaseRequest: 'Service Desk',
		targetUser: 'Uzytkownik',
		startDate: 'Data rozpoczecia pracy',
		laptopModel: 'Laptop - SN',
		laptopRu: 'Laptop - RU',
		laptopStatus: 'Laptop - status',
		laptopWarehouse: 'Laptop - eMagazyn',
		monitorRu: 'Monitor - RU',
		monitorStatus: 'Monitor - status',
		monitorWarehouse: 'Monitor - eMagazyn',
		preparedBy: 'Przygotowal/a',
		deliveryLocation: 'Lokalizacja',
		peripheralNotes: 'Uwagi',
	}

	const VISIBLE_TABLE_COLUMN_COUNT = 10

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
			preparedAccessories: [],
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
			.replaceAll(/[\u0300-\u036f]/g, '')
			.replaceAll(/[^a-z0-9]+/g, ' ')
			.trim()
	}

	function normalizeText(value) {
		return String(value ?? '').trim()
	}

	function normalizeSelectText(value) {
		return normalizeText(value).replace(/\s+/g, ' ')
	}

	function normalizeDateValue(value) {
		return AppUtils.normalizeSpreadsheetDate(value) || ''
	}

	function normalizeSelectFieldValue(fieldId, value) {
		const normalizedValue = normalizeSelectText(value)
		if (!normalizedValue) return ''

		const sourceField = document.getElementById(fieldId)
		if (!sourceField || sourceField.tagName !== 'SELECT') {
			return normalizedValue
		}

		const matchedOption = Array.from(sourceField.options).find(option => {
			const optionValue = normalizeSelectText(option.value)
			const optionLabel = normalizeSelectText(option.textContent || option.value)
			const legacyValue = normalizeSelectText(option.dataset.legacyValue || '')
			return normalizedValue === optionValue || normalizedValue === optionLabel || (legacyValue && normalizedValue === legacyValue)
		})

		return matchedOption ? normalizeSelectText(matchedOption.textContent || matchedOption.value) : normalizedValue
	}

	function harmonizeSelectOptionsWithVisibleLabels() {
		SELECT_FIELD_IDS.forEach(fieldId => {
			const field = document.getElementById(fieldId)
			if (!field || field.tagName !== 'SELECT') return

			Array.from(field.options).forEach(option => {
				const rawValue = normalizeSelectText(option.value)
				const visibleLabel = normalizeSelectText(option.textContent || option.value)

				if (!visibleLabel) {
					option.value = ''
					option.textContent = ''
					return
				}

				if (rawValue && rawValue !== visibleLabel) {
					option.dataset.legacyValue = rawValue
				}

				option.textContent = visibleLabel
				option.value = visibleLabel
			})
		})
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
			if (valueIncludesAny(normalizedValue, ['nie odebrano'])) return 'slate'
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

	function getNormalizedAccessoryFlags(source) {
		const normalizedRecord = source && typeof source === 'object' ? source : {}
		const accessoryFlags = Object.fromEntries(ACCESSORY_FIELDS.map(field => [field.key, false]))
		const rawAccessories = Array.isArray(normalizedRecord.accessories)
			? normalizedRecord.accessories
			: typeof normalizedRecord.accessories === 'string'
				? normalizedRecord.accessories.split(',')
				: []
		const normalizedLegacyAccessories = AppUtils.normalizeAccessories(rawAccessories)
		const hasLegacyKeyboardMouseSet = normalizeFlagValue(normalizedRecord.keyboardMouseSet)

		normalizedLegacyAccessories.forEach(accessory => {
			const mappedField = LEGACY_ACCESSORY_TO_FIELD[accessory]
			if (mappedField) {
				accessoryFlags[mappedField] = true
			}
		})

		ACCESSORY_FIELDS.forEach(field => {
			if (Object.prototype.hasOwnProperty.call(normalizedRecord, field.key)) {
				accessoryFlags[field.key] = normalizeFlagValue(normalizedRecord[field.key])
			}
		})

		if (hasLegacyKeyboardMouseSet) {
			accessoryFlags.mouse = true
			accessoryFlags.keyboard = true
		}

		return accessoryFlags
	}

	function normalizePreparedAccessories(value, activeAccessorySource = null) {
		const rawPreparedAccessories = Array.isArray(value)
			? value
			: typeof value === 'string'
				? value.split(',')
				: []
		const activeAccessoryFlags = activeAccessorySource && typeof activeAccessorySource === 'object'
			? getNormalizedAccessoryFlags(activeAccessorySource)
			: null
		const activeAccessoryKeys = activeAccessoryFlags
			? new Set(ACCESSORY_FIELD_KEYS.filter(key => activeAccessoryFlags[key]))
			: null
		const normalizedKeys = new Set()

		rawPreparedAccessories.forEach(entry => {
			const normalizedEntry = LEGACY_ACCESSORY_TO_FIELD[normalizeText(entry)] || normalizeText(entry)
			if (!normalizedEntry || !ACCESSORY_FIELD_KEYS.includes(normalizedEntry)) return
			if (activeAccessoryKeys && !activeAccessoryKeys.has(normalizedEntry)) return
			normalizedKeys.add(normalizedEntry)
		})

		return ACCESSORY_FIELD_KEYS.filter(key => normalizedKeys.has(key))
	}

	function buildLegacyAccessories(record) {
		const accessories = []

		if (record.monitorDock) accessories.push('monitor')
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
		const accessoryFlags = getNormalizedAccessoryFlags(normalizedRecord)

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
			monitorDock: accessoryFlags.monitorDock,
			mouse: accessoryFlags.mouse,
			keyboard: accessoryFlags.keyboard,
			yealink: accessoryFlags.yealink,
			logiZoneVibe: accessoryFlags.logiZoneVibe,
			lenovo: accessoryFlags.lenovo,
			bag: accessoryFlags.bag,
			backpack: accessoryFlags.backpack,
			laptopStand: accessoryFlags.laptopStand,
			presenter: accessoryFlags.presenter,
			printer: accessoryFlags.printer,
			preparedAccessories: normalizePreparedAccessories(normalizedRecord.preparedAccessories, accessoryFlags),
			accessories: buildLegacyAccessories({ ...normalizedRecord, ...accessoryFlags }),
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
		const normalizedAudit = AppUtils.normalizeAuditFields(mergedRecord)
		const accessoryFlags = getNormalizedAccessoryFlags(mergedRecord)

		const targetUser = normalizeText(mergedRecord.targetUser || mergedRecord.name)
		const startDate = normalizeDateValue(mergedRecord.startDate || mergedRecord.date)
		const laptopModel = normalizeText(mergedRecord.laptopModel || mergedRecord.sn)
		const laptopRu = normalizeText(mergedRecord.laptopRu || mergedRecord.ru)
		const preparedAccessories = normalizePreparedAccessories(mergedRecord.preparedAccessories, accessoryFlags)

		return {
			...createEmptyHireRecord(),
			...normalizedAudit,
			id: normalizeText(mergedRecord.id),
			purchaseRequest: normalizeText(mergedRecord.purchaseRequest),
			targetUser,
			startDate,
			laptopModel,
			laptopRu,
			laptopStatus: normalizeSelectFieldValue('laptopStatus', mergedRecord.laptopStatus),
			laptopWarehouse: normalizeSelectFieldValue('laptopWarehouse', mergedRecord.laptopWarehouse),
			monitorRu: normalizeText(mergedRecord.monitorRu),
			monitorStatus: normalizeSelectFieldValue('monitorStatus', mergedRecord.monitorStatus),
			monitorWarehouse: normalizeSelectFieldValue('monitorWarehouse', mergedRecord.monitorWarehouse),
			preparedBy: normalizeSelectFieldValue('preparedBy', mergedRecord.preparedBy),
			deliveryLocation: normalizeText(mergedRecord.deliveryLocation),
			peripheralNotes: normalizeText(mergedRecord.peripheralNotes || mergedRecord.notes),
			...accessoryFlags,
			preparedAccessories,
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
			normalizeText(record?.peripheralNotes) ||
			normalizeText(record?.deliveryLocation) ||
			record?.createdBy ||
			record?.updatedBy ||
			record?.createdAt ||
			record?.updatedAt,
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

		const normalizedValue = normalizeSelectText(value)
		if (!normalizedValue) return

		const hasOption = Array.from(field.options).some(option => normalizeSelectText(option.value) === normalizedValue)
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
		if (!hire || !TABLE_EDITABLE_FIELD_IDS.includes(fieldId)) return ''
		return `${getHireRowKey(hire, index)}::${fieldId}`
	}

	function isInlineEditActive(index, fieldId) {
		return inlineEditState === getInlineEditStateKey(index, fieldId)
	}

	function getInlineEditMetrics(index, fieldId) {
		const inlineEditKey = getInlineEditStateKey(index, fieldId)
		if (!inlineEditKey || !inlineEditMetrics || inlineEditMetrics.key !== inlineEditKey) return null
		return inlineEditMetrics
	}

	function measureInlineTriggerWidth(index, fieldId) {
		if (!tableBody) return 0

		const trigger = tableBody.querySelector(
			`[data-action="start-inline-edit"][data-index="${index}"][data-field-id="${fieldId}"]`,
		)
		if (!trigger) return 0

		const contentElement = trigger.querySelector(
			'.hire-chip, .hire-name, .status-pill, .hire-empty, .hire-accessories-meta-placeholder',
		)
		const fieldType = getInlineEditableFieldType(fieldId)
		const computedStyles = window.getComputedStyle?.(trigger)
		const inlinePadding = (parseFloat(computedStyles?.paddingLeft || '0') || 0)
			+ (parseFloat(computedStyles?.paddingRight || '0') || 0)
		const contentWidth = contentElement
			? Math.ceil(contentElement.getBoundingClientRect().width)
			: Math.ceil(trigger.getBoundingClientRect().width)
		const controlChromeAllowance = fieldType === 'select'
			? 34
			: fieldType === 'date'
				? 24
				: 18
		const minWidth = fieldType === 'select'
			? 148
			: fieldType === 'date'
				? 132
				: 110

		return Math.max(minWidth, Math.round(contentWidth + inlinePadding + controlChromeAllowance))
	}

	function isRowEditModeActive(index) {
		const hire = hires[index]
		return Boolean(hire) && editingRowKey === getHireRowKey(hire, index)
	}

	function getInlineEditableOptions(fieldId, selectedValue = '') {
		const sourceField = document.getElementById(fieldId)
		if (!sourceField || sourceField.tagName !== 'SELECT') return []

		ensureSelectValue(sourceField, selectedValue)
		syncSemanticSelectAppearance(sourceField)

		return Array.from(sourceField.options).map(option => {
			const optionValue = normalizeSelectText(option.value)
			return {
				value: optionValue,
				label: normalizeSelectText(option.textContent || optionValue || '---'),
				tone: optionValue ? getSemanticValueTone(fieldId, optionValue) || 'default' : 'placeholder',
			}
		})
	}

	function getInlineEditableFieldType(fieldId) {
		if (fieldId === 'peripheralNotes') return 'textarea'
		if (INLINE_SELECT_FIELD_IDS.includes(fieldId)) return 'select'
		if (fieldId === 'startDate') return 'date'
		return 'text'
	}

	function normalizeInlineEditableValue(fieldId, value) {
		if (SELECT_FIELD_IDS.includes(fieldId)) {
			return normalizeSelectFieldValue(fieldId, value)
		}

		if (fieldId === 'startDate') {
			return normalizeDateValue(value)
		}

		return normalizeText(value)
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
		workspaceHeightAnimationFallbackId = scheduleTimeout(() => finishAnimation(), 460)

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

	function renderHireFieldDisplayValue(record, fieldId) {
		switch (fieldId) {
			case 'purchaseRequest':
				return renderChip(record.purchaseRequest, 'hire-chip-primary')
			case 'targetUser': {
				const normalizedValue = normalizeText(record.targetUser)
				return normalizedValue
					? `<span class="hire-name">${escapeHtml(normalizedValue)}</span>`
					: '<span class="hire-empty">---</span>'
			}
			case 'startDate': {
				const startDateBadge = getStartDateBadge(record)
				return `<span class="status-pill ${startDateBadge.className}">${escapeHtml(startDateBadge.label)}</span>`
			}
			case 'laptopModel':
				return renderChip(record.laptopModel)
			case 'laptopRu':
				return renderChip(record.laptopRu)
			case 'laptopStatus':
				return renderChip(record.laptopStatus, `hire-chip-muted ${getSemanticToneClass('laptopStatus', record.laptopStatus)}`)
			case 'laptopWarehouse':
				return renderChip(record.laptopWarehouse, getSemanticToneClass('laptopWarehouse', record.laptopWarehouse))
			case 'monitorRu':
				return renderChip(record.monitorRu)
			case 'monitorStatus':
				return renderChip(record.monitorStatus, `hire-chip-muted ${getSemanticToneClass('monitorStatus', record.monitorStatus)}`)
			case 'monitorWarehouse':
				return renderChip(record.monitorWarehouse, getSemanticToneClass('monitorWarehouse', record.monitorWarehouse))
			default:
				return renderChip(record[fieldId])
		}
	}

	function renderInlineEditControl(index, fieldId, value) {
		const normalizedValue = normalizeInlineEditableValue(fieldId, value)
		const fieldLabel = TABLE_EDITABLE_FIELD_LABELS[fieldId] || fieldId
		const fieldType = getInlineEditableFieldType(fieldId)
		const inlineMetrics = getInlineEditMetrics(index, fieldId)
		const shouldPreserveWidth = fieldType !== 'textarea' && Number(inlineMetrics?.width) > 0
		const widthClassName = shouldPreserveWidth ? ' is-preserved-width' : ''
		const widthStyle = shouldPreserveWidth ? ` style="--hire-inline-width: ${inlineMetrics.width}px;"` : ''

		if (fieldType === 'select') {
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
				<select class="hire-inline-select hire-inline-control semantic-select${widthClassName}" data-index="${index}" data-field-id="${fieldId}" data-semantic-tone="${escapeHtml(selectedTone)}" aria-label="Zmien ${escapeHtml(fieldLabel)}"${widthStyle}>
					${optionsMarkup}
				</select>
			`
		}

		if (fieldType === 'textarea') {
			return `
				<textarea
					class="hire-inline-textarea hire-inline-control"
					data-index="${index}"
					data-field-id="${fieldId}"
					rows="4"
					aria-label="Edytuj ${escapeHtml(fieldLabel)}"
				>${escapeHtml(normalizedValue)}</textarea>
			`
		}

		return `
			<input
				class="hire-inline-input hire-inline-control${widthClassName}"
				type="${fieldType}"
				data-index="${index}"
				data-field-id="${fieldId}"
				value="${escapeHtml(normalizedValue)}"
				aria-label="Edytuj ${escapeHtml(fieldLabel)}"
				${widthStyle}
			>
		`
	}

	function renderRowEditableValue(index, record, fieldId, { guestMode = false } = {}) {
		if (!isRowEditModeActive(index)) {
			return renderHireFieldDisplayValue(record, fieldId)
		}

		if (isInlineEditActive(index, fieldId)) {
			return renderInlineEditControl(index, fieldId, record[fieldId])
		}

		const fieldValue = normalizeInlineEditableValue(fieldId, record[fieldId])
		const fieldLabel = TABLE_EDITABLE_FIELD_LABELS[fieldId] || fieldId
		const actionCopy = guestMode ? `Zaloguj sie, aby zmienic ${fieldLabel}` : `Kliknij, aby edytowac ${fieldLabel}`
		return `
			<button class="hire-inline-chip-btn is-edit-enabled ${fieldValue ? '' : 'is-empty'}" type="button" data-action="start-inline-edit" data-index="${index}" data-field-id="${fieldId}" aria-label="${escapeHtml(actionCopy)}" title="${escapeHtml(actionCopy)}">
				${renderHireFieldDisplayValue(record, fieldId)}
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

	function renderAccessoryPreviewIcon(field, { index = -1, guestMode = false, isPrepared = false } = {}) {
		if (!field) return ''
		const buttonLabel = guestMode
			? `${field.label}: zaloguj sie, aby oznaczac przygotowane akcesoria.`
			: isPrepared
				? `${field.label}: oznaczone jako przygotowane. Kliknij, aby oznaczyc jako nieprzygotowane.`
				: `${field.label}: kliknij, aby oznaczyc jako przygotowane.`
		return `
			<button
				class="hire-accessory-preview-icon ${isPrepared ? 'is-prepared' : ''}"
				type="button"
				data-action="toggle-accessory-prepared"
				data-index="${index}"
				data-accessory-key="${escapeHtml(field.key)}"
				aria-pressed="${isPrepared ? 'true' : 'false'}"
				aria-label="${escapeHtml(buttonLabel)}"
				title="${escapeHtml(buttonLabel)}"
				${guestMode ? 'disabled' : ''}
			>
				<i class="app-icon ${field.icon}"></i>
				<small>${escapeHtml(field.previewLabel || field.label)}</small>
			</button>
		`
	}

	function renderExpandedPanelValue(value, { multiline = false } = {}) {
		const normalizedValue = normalizeText(value)
		return normalizedValue
			? multiline
				? escapeHtml(normalizedValue).replaceAll('\n', '<br>')
				: escapeHtml(normalizedValue)
			: '<span class="hire-accessories-meta-placeholder">---</span>'
	}

	function buildExpandedPanelItemClasses({ multiline = false, wide = false, className = '', scrollable = false } = {}) {
		const itemClasses = ['hire-accessories-meta-item']
		if (multiline) itemClasses.push('is-notes')
		if (wide) itemClasses.push('is-wide')
		if (scrollable) itemClasses.push('is-scrollable')
		if (className) itemClasses.push(className)
		return itemClasses
	}

	function renderExpandedPanelDetail(label, value, { multiline = false, wide = false, className = '', scrollable = false } = {}) {
		if (String(label || '').includes('Przygot')) {
			return ''
		}

		const content = renderExpandedPanelValue(value, { multiline })
		const itemClasses = buildExpandedPanelItemClasses({ multiline, wide, className, scrollable })

		return `
			<div class="${itemClasses.join(' ')}">
				<span class="hire-accessories-meta-label">${escapeHtml(label)}</span>
				<div class="hire-accessories-meta-value">${content}</div>
			</div>
		`
	}

	function renderExpandedPanelEditableDetail(index, record, fieldId, label, { multiline = false, wide = false, className = '', scrollable = false, guestMode = false } = {}) {
		const isRowEditing = isRowEditModeActive(index)
		const isFieldEditing = isInlineEditActive(index, fieldId)
		const itemClasses = buildExpandedPanelItemClasses({
			multiline,
			wide,
			className,
			scrollable: scrollable && !isFieldEditing,
		})
		let content = renderExpandedPanelValue(record[fieldId], { multiline })

		if (isRowEditing) {
			if (isFieldEditing) {
				content = renderInlineEditControl(index, fieldId, record[fieldId])
			} else {
				const fieldValue = normalizeInlineEditableValue(fieldId, record[fieldId])
				const fieldLabel = TABLE_EDITABLE_FIELD_LABELS[fieldId] || label || fieldId
				const actionCopy = guestMode ? `Zaloguj sie, aby zmienic ${fieldLabel}` : `Kliknij, aby edytowac ${fieldLabel}`
				content = `
					<button class="hire-inline-chip-btn hire-accessories-detail-trigger is-edit-enabled ${fieldValue ? '' : 'is-empty'}" type="button" data-action="start-inline-edit" data-index="${index}" data-field-id="${fieldId}" aria-label="${escapeHtml(actionCopy)}" title="${escapeHtml(actionCopy)}">
						${renderExpandedPanelValue(record[fieldId], { multiline })}
					</button>
				`
			}
		}

		return `
			<div class="${itemClasses.join(' ')}">
				<span class="hire-accessories-meta-label">${escapeHtml(label)}</span>
				<div class="hire-accessories-meta-value ${isFieldEditing ? 'is-editing-control' : ''}">${content}</div>
			</div>
		`
	}

	function renderExpandedPanelAudit(record) {
		const auditMarkup = AppUtils.buildAuditMarkup?.(record)
		const content = auditMarkup || '<span class="hire-accessories-meta-placeholder">---</span>'

		return `
			<div class="hire-accessories-meta-item is-audit is-history">
				<span class="hire-accessories-meta-label">Historia wpisu</span>
				${content}
			</div>
		`
	}

	function renderAccessoryEditIcon(field, { index = -1, guestMode = false, isActive = false, isPrepared = false } = {}) {
		if (!field) return ''

		const statusLabel = isPrepared ? 'Gotowe' : isActive ? 'Dodane' : 'Dodaj'
		const buttonLabel = guestMode
			? `${field.label}: zaloguj sie, aby edytowac akcesoria.`
			: isActive
				? `${field.label}: kliknij, aby usunac z listy akcesoriow.`
				: `${field.label}: kliknij, aby dodac do listy akcesoriow.`

		return `
			<button
				class="hire-accessory-preview-icon is-manageable ${isActive ? 'is-active' : 'is-inactive'} ${isPrepared ? 'is-prepared' : ''}"
				type="button"
				data-action="toggle-accessory-field"
				data-index="${index}"
				data-accessory-key="${escapeHtml(field.key)}"
				aria-pressed="${isActive ? 'true' : 'false'}"
				aria-label="${escapeHtml(buttonLabel)}"
				title="${escapeHtml(buttonLabel)}"
				${guestMode ? 'disabled' : ''}
			>
				<i class="app-icon ${field.icon}"></i>
				<small>${escapeHtml(field.previewLabel || field.label)}</small>
				<span class="hire-accessory-preview-state">${escapeHtml(statusLabel)}</span>
			</button>
		`
	}

	function renderAccessoriesGroup(record, index, guestMode = false) {
		const isRowEditing = isRowEditModeActive(index)
		const activeAccessories = getActiveAccessoryFields(record)
		const preparedAccessories = new Set(normalizePreparedAccessories(record.preparedAccessories, record))
		const accessoryFields = isRowEditing ? ACCESSORY_FIELDS : activeAccessories
		const accessoriesMarkup = accessoryFields
			.map(field => {
				if (isRowEditing) {
					return renderAccessoryEditIcon(field, {
						index,
						guestMode,
						isActive: normalizeFlagValue(record[field.key]),
						isPrepared: preparedAccessories.has(field.key),
					})
				}

				return renderAccessoryPreviewIcon(field, {
					index,
					guestMode,
					isPrepared: preparedAccessories.has(field.key),
				})
			})
			.join('')

		return `
			<div class="hire-accessories-group ${accessoriesMarkup ? 'has-icons' : 'is-empty'} ${isRowEditing ? 'is-editing' : ''}">
				<span class="hire-accessories-meta-label">Akcesoria</span>
				<div class="hire-accessories-icons ${accessoriesMarkup ? '' : 'is-empty'}" style="--icon-count: ${Math.max(accessoryFields.length, 1)};">
					${accessoriesMarkup || '<span class="hire-accessories-meta-placeholder">---</span>'}
				</div>
			</div>
		`
	}

	function renderAccessoriesPanel(record, index, guestMode = false) {
		const isRowEditing = isRowEditModeActive(index)
		const editButtonLabel = guestMode
			? 'Zaloguj sie, aby edytowac wpisy'
			: isRowEditing
				? 'Wylacz edycje wiersza'
				: 'Wlacz edycje danych w wierszu'
		const deleteButtonLabel = guestMode ? 'Zaloguj sie, aby usuwac wpisy' : 'Usun wpis'
		const detailMarkup = [
			renderExpandedPanelDetail('Przygotował/a', record.preparedBy),
			renderExpandedPanelEditableDetail(index, record, 'preparedBy', 'Przygotowal/a', { guestMode }),
			renderExpandedPanelAudit(record),
			renderExpandedPanelEditableDetail(index, record, 'peripheralNotes', 'Uwagi', {
				multiline: true,
				className: 'is-notes-panel',
				scrollable: true,
				guestMode,
			}),
			renderExpandedPanelEditableDetail(index, record, 'deliveryLocation', 'Lokalizacja', {
				className: 'is-location-panel',
				guestMode,
			}),
		].join('')
		const accessoriesGroupMarkup = renderAccessoriesGroup(record, index, guestMode)
		const actionsMarkup = `
			<div class="hire-record-actions-panel">
				<span class="hire-accessories-meta-label">Akcje</span>
				<div class="hire-record-actions-stack">
					<button class="icon-button hire-action-btn ${isRowEditing ? 'is-active' : ''}" type="button" data-action="edit" data-index="${index}" aria-pressed="${isRowEditing ? 'true' : 'false'}" aria-label="${editButtonLabel}" title="${editButtonLabel}" ${guestMode ? 'disabled' : ''}>
						<i class="app-icon ${isRowEditing ? 'floppy-disk-solid-full' : 'pen-solid-full'}"></i>
					</button>
					<button class="icon-button hire-action-btn hire-action-btn-danger" type="button" data-action="delete" data-index="${index}" aria-label="Usun wpis" title="${deleteButtonLabel}" ${guestMode ? 'disabled' : ''}>
						<i class="app-icon trash-solid-full"></i>
					</button>
				</div>
			</div>
		`

		return `
			<div class="hire-accessories-panel">
				${detailMarkup ? `<div class="hire-accessories-meta">${detailMarkup}</div>` : ''}
				${accessoriesGroupMarkup}
				${actionsMarkup}
			</div>
		`
	}

	function getAccessoriesRowDomBundle(rowKey) {
		if (!tableBody || !rowKey) return null

		const mainRow = Array.from(tableBody.querySelectorAll('.hire-row-main')).find(row => row.dataset.rowKey === rowKey)
		if (!mainRow) return null

		return {
			mainRow,
			detailRow: Array.from(tableBody.querySelectorAll('.hire-accessories-row')).find(row => row.dataset.rowKey === rowKey) || null,
		}
	}

	function clearAccessoriesCollapseTransitionHandler(collapsePanel) {
		const activeHandler = collapsePanel?._hireAccessoriesTransitionHandler
		if (!collapsePanel || typeof activeHandler !== 'function') return

		collapsePanel.removeEventListener('transitionend', activeHandler)
		delete collapsePanel._hireAccessoriesTransitionHandler
	}

	function onAccessoriesCollapseHeightTransitionEnd(collapsePanel, callback) {
		if (!collapsePanel) return
		clearAccessoriesCollapseTransitionHandler(collapsePanel)

		const nextHandler = event => {
			if (event.target !== collapsePanel || event.propertyName !== 'height') return
			clearAccessoriesCollapseTransitionHandler(collapsePanel)
			callback()
		}

		collapsePanel._hireAccessoriesTransitionHandler = nextHandler
		collapsePanel.addEventListener('transitionend', nextHandler)
	}

	function setAccessoriesCollapseWillChange(collapsePanel, isAnimating) {
		if (!collapsePanel) return
		collapsePanel.style.willChange = isAnimating ? 'height' : ''
	}

	function syncAccessoriesRowDomState(rowKey, isExpanded) {
		const rowDomBundle = getAccessoriesRowDomBundle(rowKey)
		if (!rowDomBundle) return false

		rowDomBundle.mainRow.setAttribute('aria-expanded', isExpanded ? 'true' : 'false')

		if (isExpanded) {
			rowDomBundle.mainRow.classList.add('is-accessories-open')
		}
		const detailRow = rowDomBundle.detailRow
		const collapsePanel = detailRow?.querySelector('.hire-accessories-collapse')

		if (detailRow) {
			if (isExpanded) {
				detailRow.classList.remove('is-collapsed-hidden')
				detailRow.setAttribute('aria-hidden', 'false')

				if (collapsePanel) {
					clearAccessoriesCollapseTransitionHandler(collapsePanel)
					setAccessoriesCollapseWillChange(collapsePanel, true)
					collapsePanel.style.height = '0px'
				}

				window.requestAnimationFrame(() => {
					if (detailRow.getAttribute('aria-hidden') === 'false' && collapsePanel) {
						detailRow.classList.add('is-open')
						const targetHeight = collapsePanel.scrollHeight
						onAccessoriesCollapseHeightTransitionEnd(collapsePanel, () => {
							if (detailRow.classList.contains('is-open')) {
								collapsePanel.style.height = 'auto'
							}
							setAccessoriesCollapseWillChange(collapsePanel, false)
						})
						collapsePanel.style.height = `${targetHeight}px`
					} else if (detailRow.getAttribute('aria-hidden') === 'false') {
						detailRow.classList.add('is-open')
					}
				})
			} else {
				if (collapsePanel) {
					clearAccessoriesCollapseTransitionHandler(collapsePanel)
					setAccessoriesCollapseWillChange(collapsePanel, true)
					const currentHeight = collapsePanel.scrollHeight || collapsePanel.getBoundingClientRect().height
					collapsePanel.style.height = `${currentHeight}px`
					void collapsePanel.offsetHeight
				}

				detailRow.classList.remove('is-open')
				detailRow.setAttribute('aria-hidden', 'true')

				if (collapsePanel) {
					onAccessoriesCollapseHeightTransitionEnd(collapsePanel, () => {
						if (detailRow.getAttribute('aria-hidden') === 'true' && !detailRow.classList.contains('is-open')) {
							detailRow.classList.add('is-collapsed-hidden')
							collapsePanel.style.height = ''
							rowDomBundle.mainRow.classList.remove('is-accessories-open')
						}
						setAccessoriesCollapseWillChange(collapsePanel, false)
					})
					collapsePanel.style.height = '0px'
				} else {
					scheduleTimeout(() => {
						if (detailRow.getAttribute('aria-hidden') === 'true' && !detailRow.classList.contains('is-open')) {
							detailRow.classList.add('is-collapsed-hidden')
							rowDomBundle.mainRow.classList.remove('is-accessories-open')
						}
					}, 0)
				}
			}
		}

		if (detailRow && !isExpanded && !collapsePanel) {
			scheduleTimeout(() => {
				if (detailRow.getAttribute('aria-hidden') === 'true' && !detailRow.classList.contains('is-open')) {
					detailRow.classList.add('is-collapsed-hidden')
					rowDomBundle.mainRow.classList.remove('is-accessories-open')
				}
			}, 0)
		}

		if (!detailRow && !isExpanded) {
			rowDomBundle.mainRow.classList.remove('is-accessories-open')
		}

		return true
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
		scheduleTimeout(() => firstField?.focus(), 80)
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
					`<tr><td colspan="${VISIBLE_TABLE_COLUMN_COUNT}" class="empty-state-cell">Brak wyników wyszukiwania na stronie nowych zatrudnień.<br><small>Sprawdź użytkownika, statusy, lokalizacje lub akcesoria.</small></td></tr>`
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
			const rowKey = getHireRowKey(hire, originalIndex)
			const isAccessoriesExpanded = expandedAccessoriesRowKey === rowKey
			const isRowEditing = editingRowKey === rowKey
			const canExpandAccessories = true
			const detailRowId = `hire-accessories-${originalIndex}`

			const row = document.createElement('tr')
			row.className = `hire-row-main${isAccessoriesExpanded ? ' is-accessories-open' : ''}${isRowEditing ? ' is-row-editing' : ''}${canExpandAccessories ? ' is-expandable' : ''}`
			row.dataset.rowKey = rowKey
			row.dataset.index = String(originalIndex)
			row.dataset.expandable = canExpandAccessories ? 'true' : 'false'
			if (canExpandAccessories) {
				row.tabIndex = 0
				row.setAttribute('aria-controls', detailRowId)
				row.setAttribute('aria-expanded', isAccessoriesExpanded ? 'true' : 'false')
			}
			row.innerHTML = `
				<td class="is-sticky-left-1">
					${renderRowEditableValue(originalIndex, hire, 'purchaseRequest', { guestMode })}
				</td>
				<td class="is-sticky-left-2">
					${renderRowEditableValue(originalIndex, hire, 'targetUser', { guestMode })}
				</td>
				<td>
					${renderRowEditableValue(originalIndex, hire, 'startDate', { guestMode })}
				</td>
				<td>${renderRowEditableValue(originalIndex, hire, 'laptopModel', { guestMode })}</td>
				<td>${renderRowEditableValue(originalIndex, hire, 'laptopRu', { guestMode })}</td>
				<td>${renderRowEditableValue(originalIndex, hire, 'laptopStatus', { guestMode })}</td>
				<td>${renderRowEditableValue(originalIndex, hire, 'laptopWarehouse', { guestMode })}</td>
				<td>${renderRowEditableValue(originalIndex, hire, 'monitorRu', { guestMode })}</td>
				<td>${renderRowEditableValue(originalIndex, hire, 'monitorStatus', { guestMode })}</td>
				<td>${renderRowEditableValue(originalIndex, hire, 'monitorWarehouse', { guestMode })}</td>
			`
			tableBody.appendChild(row)

			const accessoriesRow = document.createElement('tr')
			accessoriesRow.className = `hire-accessories-row${isAccessoriesExpanded ? ' is-open' : ' is-collapsed-hidden'}`
			accessoriesRow.id = detailRowId
			accessoriesRow.dataset.rowKey = rowKey
			accessoriesRow.setAttribute('aria-hidden', isAccessoriesExpanded ? 'false' : 'true')
			accessoriesRow.innerHTML = `
				<td colspan="${VISIBLE_TABLE_COLUMN_COUNT}" class="hire-accessories-cell">
					<div class="hire-accessories-collapse">
						<div class="hire-accessories-collapse-inner">
							${renderAccessoriesPanel(hire, originalIndex, guestMode)}
						</div>
					</div>
				</td>
			`
			tableBody.appendChild(accessoriesRow)
		})

		if (inlineEditState) {
			window.requestAnimationFrame(() => {
				const inlineControl = tableBody.querySelector('.hire-inline-control')
				inlineControl?.focus({ preventScroll: true })
				if (inlineControl?.tagName === 'INPUT' && inlineControl.type === 'text') {
					inlineControl.select?.()
				}
			})
		}
	}
	/* === Hires Table Rendering: End === */

	/* === Hires Actions: Start === */
	function closeInlineEdit({ render = true } = {}) {
		if (!inlineEditState) return
		inlineEditState = null
		inlineEditMetrics = null
		if (render) renderTable()
	}

	function startInlineEdit(index, fieldId) {
		if (!TABLE_EDITABLE_FIELD_IDS.includes(fieldId)) return
		if (!requireAuthenticatedAction('Musisz byc zalogowany, aby edytowac dane bezposrednio w tabeli.')) return
		if (!hires[index] || !isRowEditModeActive(index)) return

		inlineEditState = getInlineEditStateKey(index, fieldId)
		const triggerWidth = measureInlineTriggerWidth(index, fieldId)
		inlineEditMetrics = triggerWidth > 0 ? { key: inlineEditState, width: triggerWidth } : null
		renderTable()
	}

	function updateInlineEditableField(index, fieldId, value, { nextAction = null } = {}) {
		if (!TABLE_EDITABLE_FIELD_IDS.includes(fieldId)) return
		if (!requireAuthenticatedAction('Musisz byc zalogowany, aby edytowac dane bezposrednio w tabeli.')) return

		const hire = hires[index]
		if (!hire) {
			closeInlineEdit()
			applyDeferredTableAction(nextAction)
			return
		}

		const normalizedValue = normalizeInlineEditableValue(fieldId, value)
		const currentValue = normalizeInlineEditableValue(fieldId, hire[fieldId])
		if (normalizedValue === currentValue) {
			inlineEditState = null
			inlineEditMetrics = null
			renderTable()
			applyDeferredTableAction(nextAction)
			return
		}

		if (SELECT_FIELD_IDS.includes(fieldId)) {
			const sourceField = document.getElementById(fieldId)
			ensureSelectValue(sourceField, normalizedValue)
		}

		const previousRowKey = getHireRowKey(hire, index)
		const actor = AppUtils.auth.getAuditActorSnapshot()
		const now = new Date().toISOString()
		hires[index] = normalizeHireRecord({
			...hire,
			[fieldId]: normalizedValue,
			updatedBy: actor,
			updatedAt: now,
		})
		const nextRowKey = getHireRowKey(hires[index], index)

		if (editingRowKey === previousRowKey) {
			editingRowKey = nextRowKey
		}

		if (expandedAccessoriesRowKey === previousRowKey) {
			expandedAccessoriesRowKey = nextRowKey
		}

		if (editIndex === index) {
			fillFormFromHire(hires[index])
			setDrawerAudit(hires[index])
			captureDrawerSnapshot()
		}

		inlineEditState = null
		inlineEditMetrics = null
		saveData()
		applyDeferredTableAction(nextAction)
	}

	function commitInlineEditFromElement(controlElement, nextAction = null) {
		if (!controlElement) return

		const index = Number(controlElement.dataset.index)
		const fieldId = controlElement.dataset.fieldId || ''
		if (Number.isNaN(index) || !fieldId) return

		updateInlineEditableField(index, fieldId, controlElement.value, { nextAction })
	}

	function toggleRowEditMode(index) {
		if (!requireAuthenticatedAction('Musisz byc zalogowany, aby edytowac dane bezposrednio w tabeli.')) return

		const hire = hires[index]
		if (!hire) return

		const rowKey = getHireRowKey(hire, index)
		const isClosingCurrentRow = editingRowKey === rowKey

		editingRowKey = isClosingCurrentRow ? null : rowKey
		inlineEditState = null
		inlineEditMetrics = null
		renderTable()
	}

	function getTableActionDescriptor(target) {
		const actionButton = target?.closest?.('[data-action]')
		if (actionButton) {
			if (actionButton.disabled) return null

			const index = Number(actionButton.dataset.index)
			if (Number.isNaN(index)) return null

			return {
				action: actionButton.dataset.action || '',
				index,
				fieldId: actionButton.dataset.fieldId || '',
				accessoryKey: actionButton.dataset.accessoryKey || '',
			}
		}

		const mainRow = target?.closest?.('.hire-row-main')
		if (!mainRow || mainRow.dataset.expandable !== 'true' || target?.closest?.('.hire-inline-control')) {
			return null
		}

		const index = Number(mainRow.dataset.index)
		if (Number.isNaN(index)) return null

		return {
			action: 'toggle-row-accessories',
			index,
			fieldId: '',
			accessoryKey: '',
		}
	}

	function applyDeferredTableAction(actionDescriptor) {
		if (!actionDescriptor) return

		const { action, index, fieldId, accessoryKey } = actionDescriptor

		if (action === 'start-inline-edit') {
			startInlineEdit(index, fieldId)
			return
		}

		if (action === 'toggle-row-accessories') {
			toggleAccessoriesRow(index)
			return
		}

		if (action === 'toggle-accessory-prepared') {
			togglePreparedAccessory(index, accessoryKey)
			return
		}

		if (action === 'toggle-accessory-field') {
			toggleAccessoryField(index, accessoryKey)
			return
		}

		if (action === 'edit') {
			toggleRowEditMode(index)
			return
		}

		if (action === 'delete') {
			void removeItem(index)
		}
	}

	function togglePreparedAccessory(index, accessoryKey) {
		if (!ACCESSORY_FIELD_KEYS.includes(accessoryKey)) return
		if (!requireAuthenticatedAction('Musisz byc zalogowany, aby oznaczac przygotowane akcesoria.')) return

		const hire = hires[index]
		if (!hire || !normalizeFlagValue(hire[accessoryKey])) return

		const preparedAccessories = new Set(normalizePreparedAccessories(hire.preparedAccessories, hire))
		if (preparedAccessories.has(accessoryKey)) {
			preparedAccessories.delete(accessoryKey)
		} else {
			preparedAccessories.add(accessoryKey)
		}

		const actor = AppUtils.auth.getAuditActorSnapshot()
		const now = new Date().toISOString()
		hires[index] = normalizeHireRecord({
			...hire,
			preparedAccessories: ACCESSORY_FIELD_KEYS.filter(key => preparedAccessories.has(key)),
			updatedBy: actor,
			updatedAt: now,
		})

		if (editIndex === index) {
			setDrawerAudit(hires[index])
		}

		saveData()
	}

	function toggleAccessoryField(index, accessoryKey) {
		if (!ACCESSORY_FIELD_KEYS.includes(accessoryKey)) return
		if (!requireAuthenticatedAction('Musisz byc zalogowany, aby edytowac akcesoria w tabeli.')) return

		const hire = hires[index]
		if (!hire) return

		const isCurrentlyActive = normalizeFlagValue(hire[accessoryKey])
		const preparedAccessories = new Set(normalizePreparedAccessories(hire.preparedAccessories, hire))
		if (isCurrentlyActive) {
			preparedAccessories.delete(accessoryKey)
		}

		const actor = AppUtils.auth.getAuditActorSnapshot()
		const now = new Date().toISOString()
		hires[index] = normalizeHireRecord({
			...hire,
			[accessoryKey]: !isCurrentlyActive,
			preparedAccessories: ACCESSORY_FIELD_KEYS.filter(key => preparedAccessories.has(key)),
			updatedBy: actor,
			updatedAt: now,
		})

		if (editIndex === index) {
			fillFormFromHire(hires[index])
			setDrawerAudit(hires[index])
			captureDrawerSnapshot()
		}

		saveData()
	}

	function toggleAccessoriesRow(index) {
		const hire = hires[index]
		if (!hire) return

		const rowKey = getHireRowKey(hire, index)
		const isClosingCurrentRow = expandedAccessoriesRowKey === rowKey
		const previouslyExpandedRowKey = expandedAccessoriesRowKey

		if (previouslyExpandedRowKey && previouslyExpandedRowKey !== rowKey) {
			syncAccessoriesRowDomState(previouslyExpandedRowKey, false)
		}

		expandedAccessoriesRowKey = isClosingCurrentRow ? null : rowKey

		if (!syncAccessoriesRowDomState(rowKey, !isClosingCurrentRow)) {
			renderTable()
		}
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
		if (hireToRemove) {
			const rowKey = getHireRowKey(hireToRemove, index)
			if (expandedAccessoriesRowKey === rowKey) {
				expandedAccessoriesRowKey = null
			}
			if (editingRowKey === rowKey) {
				editingRowKey = null
			}
			if (inlineEditState?.startsWith(`${rowKey}::`)) {
				inlineEditState = null
				inlineEditMetrics = null
			}
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
	runWhenReady(() => {
		harmonizeSelectOptionsWithVisibleLabels()
		monthPicker.init()
		resetFormState()
		syncSemanticSelects()

		document.querySelectorAll('[data-month-delta]').forEach(button => {
			listen(button, 'click', () => {
				monthPicker.changeMonth(Number(button.dataset.monthDelta))
			})
		})

		if (accessoryPicker) {
			listen(accessoryPicker, 'click', event => {
				const item = event.target.closest('.accessory-item')
				if (!item) return
				if (!requireAuthenticatedAction()) return

				item.classList.toggle('active')
			})
		}

		SEMANTIC_SELECT_FIELD_IDS.forEach(fieldId => {
			const field = document.getElementById(fieldId)
			if (field) {
				listen(field, 'change', () => syncSemanticSelectAppearance(field))
			}
		})

		if (tableBody) {
			listen(tableBody, 'pointerdown', event => {
				const activeInlineControl = tableBody.querySelector('.hire-inline-control')
				if (!activeInlineControl || event.target.closest('.hire-inline-control') === activeInlineControl) return

				const nextAction = getTableActionDescriptor(event.target)
				if (!nextAction) return

				const activeIndex = Number(activeInlineControl.dataset.index)
				const activeFieldId = activeInlineControl.dataset.fieldId || ''
				const activeInlineKey = getInlineEditStateKey(activeIndex, activeFieldId)
				if (!activeInlineKey || inlineEditState !== activeInlineKey) return

				event.preventDefault()
				commitInlineEditFromElement(activeInlineControl, nextAction)
			})

			listen(tableBody, 'change', event => {
				const inlineControl = event.target.closest('.hire-inline-control')
				if (!inlineControl) return

				commitInlineEditFromElement(inlineControl)
			})

			listen(tableBody, 'focusout', event => {
				const inlineControl = event.target.closest('.hire-inline-control')
				if (!inlineControl) return

				const blurredInlineKey = getInlineEditStateKey(
					Number(inlineControl.dataset.index),
					inlineControl.dataset.fieldId,
				)
				if (inlineEditState !== blurredInlineKey) return

				const nextAction = getTableActionDescriptor(event.relatedTarget)
				if (nextAction?.action === 'start-inline-edit') return

				commitInlineEditFromElement(inlineControl)
			})

			listen(tableBody, 'keydown', event => {
				const inlineControl = event.target.closest('.hire-inline-control')
				if (inlineControl) {
					if (event.key === 'Escape') {
						event.preventDefault()
						closeInlineEdit()
						return
					}

					if (event.key === 'Enter' && inlineControl.tagName === 'INPUT') {
						event.preventDefault()
						commitInlineEditFromElement(inlineControl)
					}

					return
				}

				const mainRow = event.target.closest('.hire-row-main')
				if (!mainRow || event.target !== mainRow || mainRow.dataset.expandable !== 'true') return

				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					toggleAccessoriesRow(Number(mainRow.dataset.index))
				}
			})

			listen(tableBody, 'click', event => {
				const actionDescriptor = getTableActionDescriptor(event.target)
				if (!actionDescriptor) return

				applyDeferredTableAction(actionDescriptor)
			})
		}

		if (openDrawerBtn) {
			listen(openDrawerBtn, 'click', startCreateFlow)
		}

		if (closeDrawerBtn) {
			listen(closeDrawerBtn, 'click', () => void closeDrawer())
		}

		if (cancelDrawerBtn) {
			listen(cancelDrawerBtn, 'click', () => void closeDrawer())
		}

		if (drawerBackdrop) {
			listen(drawerBackdrop, 'click', () => void closeDrawer())
		}

		listen(window, 'keydown', event => {
			if (event.key === 'Escape' && searchController.isOpen()) {
				searchController.close()
				return
			}

			if (event.key === 'Escape' && drawerShell?.classList.contains('is-open')) {
				void closeDrawer()
			}
		})

		if (hiresForm) {
			listen(hiresForm, 'submit', async event => {
				event.preventDefault()
				if (!requireAuthenticatedAction()) return

				const hireData = getFormState()
				if (!hireData.targetUser || !hireData.startDate) {
					AppUtils.notify({
						type: 'warning',
						title: 'Brak wymaganych danych',
						message: 'Uzupełnij użytkownika oraz datę rozpoczęcia pracy.',
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

		if (exportExcelBtn) listen(exportExcelBtn, 'click', exportExcel)
		if (importExcelTrigger && importExcelInput) {
			listen(importExcelTrigger, 'click', () => {
				if (!requireAuthenticatedAction('Musisz byc zalogowany, aby importowac dane nowych zatrudnien.')) return
				importExcelInput.click()
			})
			listen(importExcelInput, 'change', importExcel)
		}

		if (searchInput) {
			listen(searchInput, 'input', event => {
				searchQuery = event.target.value || ''
				renderTable()
			})
		}

		if (searchToggleBtn) {
			listen(searchToggleBtn, 'click', searchController.toggle)
		}

		listen(document, 'app-auth-changed', () => {
			syncProtectedUi()
			renderTable()
		})

		loadData()
		syncProtectedUi()
	})
	/* === Hires Init: End === */
})()
