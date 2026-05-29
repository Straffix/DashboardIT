;(function initializeDashboardPageRouter() {
	const runtimeRegistry = window.__dashboardRuntimeScriptRegistry || { pageScriptsByFile: {} }
	const moduleRouteConfig = {
		'nowe-zatrudnienia': 'nowe_zatrudnienia.html',
		urzadzenia: 'monitor_laptopow.html',
		'wymiana-sprzetu': 'wymiana_sprzetu.html',
		obiady: 'rezerwacja_obiadow.html',
		chat: 'notatnik.html',
	}
	const modulePageConfig = {
		'nowe_zatrudnienia.html': { styleHref: './styles/css/zatrudnienia.css' },
		'monitor_laptopow.html': { styleHref: './styles/css/monitor.css' },
		'wymiana_sprzetu.html': { styleHref: './styles/css/wymiany.css' },
		'rezerwacja_obiadow.html': { styleHref: './styles/css/lunch.css' },
		'notatnik.html': { styleHref: './styles/css/notes.css' },
	}

	const loadedScriptPromises = new Map()
	let activePageScope = null
	let navigationInFlight = false
	let activeModulePageName = ''

	const modulePageNames = Object.keys(modulePageConfig)
	const moduleRouteEntries = Object.entries(moduleRouteConfig)
	const defaultModuleRouteKey = moduleRouteEntries[0]?.[0] || ''

	const normalizePageName = value => {
		const normalizedValue = String(value || '').trim()
		if (!normalizedValue) return ''
		return normalizedValue.split('/').pop().split('?')[0].split('#')[0]
	}

	const normalizeRouteKey = value => {
		const normalizedValue = String(value || '').trim().replace(/^#/, '')
		if (!normalizedValue) return ''
		return normalizedValue.split('?')[0].split('/').pop().toLowerCase()
	}

	const getCurrentPageName = () => normalizePageName(window.location.pathname || 'index.html') || 'index.html'
	const isDashboardShellPage = () => getCurrentPageName() === 'dashboard.html'
	const isModuleShellPage = () => document.body?.classList?.contains('module-page')
	const isModulePageName = pageName => modulePageNames.includes(normalizePageName(pageName))
	const getRouteKeyForPageName = pageName =>
		moduleRouteEntries.find(([, routePageName]) => routePageName === normalizePageName(pageName))?.[0] || ''
	const getPageNameForRouteKey = routeKey => moduleRouteConfig[normalizeRouteKey(routeKey)] || ''
	const getRequestedRouteKey = () => {
		const hashRouteKey = normalizeRouteKey(window.location.hash)
		if (getPageNameForRouteKey(hashRouteKey)) {
			return hashRouteKey
		}

		const currentPageRouteKey = getRouteKeyForPageName(getCurrentPageName())
		if (currentPageRouteKey) {
			return currentPageRouteKey
		}

		return defaultModuleRouteKey
	}
	const getBodyModulePageName = () => normalizePageName(document.body?.dataset?.modulePage)

	const createScopedTimerSet = clearTimer => {
		const activeTimers = new Set()
		return {
			register(timerId) {
				activeTimers.add(timerId)
				return timerId
			},
			clear(timerId) {
				if (!activeTimers.has(timerId)) return
				clearTimer(timerId)
				activeTimers.delete(timerId)
			},
			clearAll() {
				activeTimers.forEach(timerId => clearTimer(timerId))
				activeTimers.clear()
			},
		}
	}

	const pageRuntime = {
		createScope(pageName) {
			if (activePageScope) {
				activePageScope.destroy()
			}

			const abortController = typeof AbortController === 'function' ? new AbortController() : null
			const cleanupCallbacks = []
			const localTimeouts = createScopedTimerSet(timerId => window.clearTimeout(timerId))
			const localIntervals = createScopedTimerSet(timerId => window.clearInterval(timerId))

			const scope = {
				pageName: normalizePageName(pageName) || getCurrentPageName(),
				signal: abortController?.signal || null,
				onCleanup(callback) {
					if (typeof callback === 'function') {
						cleanupCallbacks.push(callback)
					}
				},
				runWhenReady(callback) {
					if (typeof callback !== 'function') return

					if (document.readyState === 'loading') {
						document.addEventListener('DOMContentLoaded', callback, {
							once: true,
							...(abortController ? { signal: abortController.signal } : {}),
						})
						return
					}

					callback()
				},
				setTimeout(callback, delay = 0) {
					return localTimeouts.register(window.setTimeout(callback, delay))
				},
				clearTimeout(timerId) {
					localTimeouts.clear(timerId)
				},
				setInterval(callback, delay = 0) {
					return localIntervals.register(window.setInterval(callback, delay))
				},
				clearInterval(timerId) {
					localIntervals.clear(timerId)
				},
				destroy() {
					localTimeouts.clearAll()
					localIntervals.clearAll()
					if (abortController) {
						abortController.abort()
					}
					while (cleanupCallbacks.length > 0) {
						const callback = cleanupCallbacks.pop()
						try {
							callback?.()
						} catch (error) {
							console.error(error)
						}
					}
					if (activePageScope === scope) {
						activePageScope = null
					}
				},
			}

			activePageScope = scope
			return scope
		},
		destroyActiveScope() {
			activePageScope?.destroy()
		},
		getActiveScope() {
			return activePageScope
		},
	}

	window.AppPageRuntime = pageRuntime

	const loadScript = (path, { fresh = false } = {}) => {
		if (!fresh && loadedScriptPromises.has(path)) {
			return loadedScriptPromises.get(path)
		}

		const src = fresh ? `${path}${path.includes('?') ? '&' : '?'}runtime=${Date.now()}` : path
		const scriptPromise = new Promise((resolve, reject) => {
			const script = document.createElement('script')
			script.src = src
			script.charset = 'utf-8'
			script.async = false
			script.onload = () => {
				if (fresh) {
					script.remove()
				}
				resolve()
			}
			script.onerror = () => reject(new Error(`Nie udalo sie zaladowac skryptu ${path}.`))
			document.head.appendChild(script)
		})

		if (!fresh) {
			loadedScriptPromises.set(path, scriptPromise)
		}

		return scriptPromise
	}

	const ensurePageScripts = async pageName => {
		const normalizedPageName = normalizePageName(pageName)
		const scriptPaths = Array.isArray(runtimeRegistry.pageScriptsByFile?.[normalizedPageName])
			? runtimeRegistry.pageScriptsByFile[normalizedPageName]
			: []

		const dependencyScripts = scriptPaths.filter(path => !/\/js\/pages\//.test(path))
		const pageEntryScripts = scriptPaths.filter(path => /\/js\/pages\//.test(path))

		for (const dependencyPath of dependencyScripts) {
			await loadScript(dependencyPath)
		}

		for (const pageScriptPath of pageEntryScripts) {
			await loadScript(pageScriptPath, { fresh: true })
		}
	}

	const getCurrentModuleStylesheet = () =>
		document.querySelector('link[rel="stylesheet"][href*="styles/css/"]:not([href*="style.css"])')

	const syncModuleStylesheet = pageName => {
		const pageConfig = modulePageConfig[normalizePageName(pageName)]
		if (!pageConfig?.styleHref) return

		const currentStylesheet = getCurrentModuleStylesheet()
		if (currentStylesheet) {
			currentStylesheet.href = pageConfig.styleHref
			return
		}

		const stylesheet = document.createElement('link')
		stylesheet.rel = 'stylesheet'
		stylesheet.href = pageConfig.styleHref
		document.head.appendChild(stylesheet)
	}

	const updateBodyClasses = (nextBodyClassList, nextPageName = '') => {
		const nextClasses = Array.from(nextBodyClassList || [])
		const preservedClasses = Array.from(document.body.classList).filter(className =>
			className === 'app-user-logged-in' || className === 'module-shell-page' || className.startsWith('theme-')
		)

		document.body.className = [...new Set([...nextClasses, ...preservedClasses])].join(' ')
		if (nextPageName) {
			document.body.dataset.modulePage = normalizePageName(nextPageName)
		}
	}

	const getModuleBrandMarkup = nextDocument => {
		const nextBrand = nextDocument.querySelector('.module-header .logo-section')
		return nextBrand ? nextBrand.cloneNode(true) : null
	}

	const updateModuleBrand = nextDocument => {
		const currentBrand = document.querySelector('.module-header .logo-section')
		const nextBrand = getModuleBrandMarkup(nextDocument)
		if (currentBrand && nextBrand) {
			currentBrand.replaceWith(nextBrand)
		}
	}

	const getRouteKeyForNavLink = link => {
		if (!link) return ''

		const dataRouteKey = normalizeRouteKey(link.dataset?.moduleRoute)
		if (getPageNameForRouteKey(dataRouteKey)) {
			return dataRouteKey
		}

		const href = String(link.getAttribute('href') || '').trim()
		if (!href) return ''

		if (href.startsWith('#')) {
			const hashRouteKey = normalizeRouteKey(href)
			return getPageNameForRouteKey(hashRouteKey) ? hashRouteKey : ''
		}

		return getRouteKeyForPageName(href)
	}

	const syncModuleNavState = pageName => {
		const activeRouteKey = getRouteKeyForPageName(pageName) || getRequestedRouteKey()
		document.querySelectorAll('.module-nav-link').forEach(link => {
			const linkRouteKey = getRouteKeyForNavLink(link)
			if (!linkRouteKey) {
				link.removeAttribute('aria-current')
				return
			}

			if (linkRouteKey === activeRouteKey) {
				link.setAttribute('aria-current', 'page')
			} else {
				link.removeAttribute('aria-current')
			}
		})
	}

	const syncModuleNavLinksForShell = () => {
		if (!isDashboardShellPage()) return

		document.querySelectorAll('.module-nav-link').forEach(link => {
			const linkRouteKey = getRouteKeyForNavLink(link)
			if (!linkRouteKey) return

			link.dataset.moduleRoute = linkRouteKey
			link.setAttribute('href', `#${linkRouteKey}`)
		})
	}

	const replaceModuleView = nextDocument => {
		const currentWrapper = document.querySelector('.wrapper')
		const currentHeader = currentWrapper?.querySelector('.module-header')
		const currentFooter = currentWrapper?.querySelector('.main-footer')
		const nextWrapper = nextDocument.querySelector('.wrapper')
		const nextHeader = nextWrapper?.querySelector('.module-header')
		const nextFooter = nextWrapper?.querySelector('.main-footer')

		if (!currentWrapper || !currentHeader || !currentFooter || !nextWrapper || !nextHeader || !nextFooter) {
			throw new Error('Nie udalo sie odnalezc kontenerow modulu do podmiany.')
		}

		let currentNode = currentHeader.nextSibling
		while (currentNode && currentNode !== currentFooter) {
			const nodeToRemove = currentNode
			currentNode = currentNode.nextSibling
			nodeToRemove.remove()
		}

		const nextModuleNodes = []
		let nextNode = nextHeader.nextSibling
		while (nextNode && nextNode !== nextFooter) {
			nextModuleNodes.push(nextNode.cloneNode(true))
			nextNode = nextNode.nextSibling
		}

		currentFooter.before(...nextModuleNodes)

		document.querySelectorAll('.workspace-backup-dock').forEach(node => node.remove())
		Array.from(nextDocument.querySelectorAll('.workspace-backup-dock')).forEach(node => {
			document.body.appendChild(node.cloneNode(true))
		})
	}

	const getSourcePageUrl = pageName => new URL(normalizePageName(pageName), window.location.href)
	const getHistoryUrl = (pageName, routeKey) => {
		const historyUrl = new URL(window.location.href)
		historyUrl.pathname = historyUrl.pathname.replace(/[^/]*$/, 'dashboard.html')
		historyUrl.hash = normalizeRouteKey(routeKey || getRouteKeyForPageName(pageName) || defaultModuleRouteKey)
		return historyUrl
	}

	const applyModuleDocument = (nextDocument, pageName) => {
		updateModuleBrand(nextDocument)
		replaceModuleView(nextDocument)
		syncModuleStylesheet(pageName)
		updateBodyClasses(nextDocument.body.classList, pageName)
		document.title = nextDocument.title || document.title
		syncModuleNavLinksForShell()
		syncModuleNavState(pageName)
		window.AppUi?.refreshModuleShellUi?.()
	}

	const transitionToModuleDocument = async (nextDocument, pageName) => {
		if (typeof document.startViewTransition === 'function') {
			const transition = document.startViewTransition(() => {
				applyModuleDocument(nextDocument, pageName)
			})
			try {
				await transition.finished
			} catch (error) {
				console.error(error)
			}
			return
		}

		applyModuleDocument(nextDocument, pageName)
	}

	const navigateToModulePage = async (pageName, { historyMode = 'push', routeKey = '' } = {}) => {
		const normalizedPageName = normalizePageName(pageName)
		if (!isModulePageName(normalizedPageName) || navigationInFlight || normalizedPageName === activeModulePageName) {
			return
		}

		navigationInFlight = true
		const targetRouteKey = normalizeRouteKey(routeKey || getRouteKeyForPageName(normalizedPageName) || defaultModuleRouteKey)
		const sourcePageUrl = getSourcePageUrl(normalizedPageName)
		const historyUrl = getHistoryUrl(normalizedPageName, targetRouteKey)

		try {
			const response = await fetch(sourcePageUrl.toString(), {
				headers: {
					'X-Requested-With': 'DashboardIT-Soft-Navigation',
				},
			})

			if (!response.ok) {
				throw new Error(`Serwer zwrocil HTTP ${response.status}.`)
			}

			const responseHtml = await response.text()
			const nextDocument = new DOMParser().parseFromString(responseHtml, 'text/html')
			if (!nextDocument.body.classList.contains('module-page')) {
				window.location.href = sourcePageUrl.toString()
				return
			}

			pageRuntime.destroyActiveScope()
			await transitionToModuleDocument(nextDocument, normalizedPageName)

			await ensurePageScripts(normalizedPageName)
			activeModulePageName = normalizedPageName
			document.dispatchEvent(
				new CustomEvent('app-module-page-changed', {
					detail: {
						pageName: normalizedPageName,
						routeKey: targetRouteKey,
						historyMode,
					},
				})
			)

			if (historyMode === 'push') {
				window.history.pushState({ modulePage: normalizedPageName, moduleRoute: targetRouteKey }, '', historyUrl.toString())
			} else if (historyMode === 'replace') {
				window.history.replaceState(
					{ modulePage: normalizedPageName, moduleRoute: targetRouteKey },
					'',
					historyUrl.toString()
				)
			}
		} catch (error) {
			console.error(error)
			window.location.href = sourcePageUrl.toString()
		} finally {
			navigationInFlight = false
		}
	}

	const getNavigationTarget = link => {
		if (!link) return null

		const routeKey = getRouteKeyForNavLink(link)
		const pageNameFromRoute = getPageNameForRouteKey(routeKey)
		if (pageNameFromRoute) {
			return {
				pageName: pageNameFromRoute,
				routeKey,
			}
		}

		const href = String(link.getAttribute('href') || '').trim()
		const pageName = normalizePageName(href)
		if (!isModulePageName(pageName)) {
			return null
		}

		return {
			pageName,
			routeKey: getRouteKeyForPageName(pageName),
		}
	}

	const isEligibleNavClick = event => {
		if (event.defaultPrevented || event.button !== 0) return false
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false

		const targetLink = event.target.closest('.module-nav-link')
		if (!targetLink) return false
		if (targetLink.hasAttribute('download') || targetLink.target === '_blank') return false

		return Boolean(getNavigationTarget(targetLink))
	}

	document.addEventListener('click', event => {
		if (!isModuleShellPage() || !isEligibleNavClick(event)) return

		const targetLink = event.target.closest('.module-nav-link')
		const navigationTarget = getNavigationTarget(targetLink)
		if (!navigationTarget) return

		event.preventDefault()
		void navigateToModulePage(navigationTarget.pageName, {
			historyMode: 'push',
			routeKey: navigationTarget.routeKey,
		})
	})

	window.addEventListener('popstate', event => {
		if (!isModuleShellPage()) return

		const pageName = normalizePageName(
			event.state?.modulePage || getPageNameForRouteKey(event.state?.moduleRoute) || getBodyModulePageName() || getCurrentPageName()
		)
		if (!isModulePageName(pageName)) {
			window.location.reload()
			return
		}

		void navigateToModulePage(pageName, {
			historyMode: 'replace',
			routeKey: normalizeRouteKey(event.state?.moduleRoute || getRouteKeyForPageName(pageName)),
		})
	})

	window.addEventListener('hashchange', () => {
		if (!isModuleShellPage() || !isDashboardShellPage() || navigationInFlight) return

		const routeKey = getRequestedRouteKey()
		const pageName = getPageNameForRouteKey(routeKey)
		if (!pageName || pageName === activeModulePageName) return

		void navigateToModulePage(pageName, { historyMode: 'replace', routeKey })
	})

	const initialPageScriptPaths = Array.isArray(runtimeRegistry.pageScriptsByFile?.[getCurrentPageName()])
		? runtimeRegistry.pageScriptsByFile[getCurrentPageName()]
		: []
	initialPageScriptPaths
		.filter(path => !/\/js\/pages\//.test(path))
		.forEach(path => {
			if (!loadedScriptPromises.has(path)) {
				loadedScriptPromises.set(path, Promise.resolve())
			}
		})

	if (isModuleShellPage()) {
		const initialPageName = getBodyModulePageName() || getCurrentPageName()
		activeModulePageName = isDashboardShellPage() ? '' : initialPageName
		const initialRouteKey = getRequestedRouteKey() || getRouteKeyForPageName(initialPageName) || defaultModuleRouteKey
		syncModuleNavLinksForShell()
		syncModuleNavState(getPageNameForRouteKey(initialRouteKey) || initialPageName)

		if (isDashboardShellPage()) {
			const initialDashboardPageName = getPageNameForRouteKey(initialRouteKey)
			window.history.replaceState(
				{ modulePage: initialDashboardPageName || '', moduleRoute: initialRouteKey },
				'',
				getHistoryUrl(initialDashboardPageName || '', initialRouteKey).toString()
			)
			if (initialDashboardPageName) {
				void navigateToModulePage(initialDashboardPageName, { historyMode: 'replace', routeKey: initialRouteKey })
			}
			return
		}

		window.history.replaceState(
			{ modulePage: activeModulePageName, moduleRoute: getRouteKeyForPageName(activeModulePageName) },
			'',
			getHistoryUrl(activeModulePageName, getRouteKeyForPageName(activeModulePageName)).toString()
		)
		syncModuleNavLinksForShell()
		syncModuleNavState(activeModulePageName)
	}
})()
