import type { BookmarkIconOption } from './types'

export const BOOKMARKS_REACT_STORAGE_KEY = 'dashboardit.react.bookmarks.entries'
export const BOOKMARKS_LEGACY_STORAGE_KEY = 'dashboard_user_bookmarks'
export const BOOKMARK_DEFAULT_COLOR = '#94a3b8'

export const BOOKMARK_ICON_OPTIONS: BookmarkIconOption[] = [
	{ id: '', label: 'Auto', hint: 'favicon strony', token: 'WWW' },
	{ id: 'file-excel-solid-full', label: 'Excel', hint: 'arkusze', token: 'XLS' },
	{ id: 'file-word-solid-full', label: 'Word', hint: 'dokumenty', token: 'DOC' },
	{ id: 'file-pdf-solid-full', label: 'PDF', hint: 'instrukcje', token: 'PDF' },
	{ id: 'file-powerpoint-solid-full', label: 'Prezentacja', hint: 'slajdy', token: 'PPT' },
	{ id: 'folder-open-solid-full', label: 'Folder', hint: 'zasoby', token: 'DIR' },
	{ id: 'link-solid-full', label: 'Link', hint: 'odnosnik', token: 'URL' },
	{ id: 'cloud-solid-full', label: 'SharePoint', hint: 'chmura', token: 'SP' },
	{ id: 'users-solid-full', label: 'Zespol', hint: 'ludzie', token: 'TM' },
	{ id: 'envelope-solid-full', label: 'Mail', hint: 'poczta', token: 'ML' },
	{ id: 'calendar-days-solid-full', label: 'Kalendarz', hint: 'terminy', token: 'CAL' },
	{ id: 'ticket-simple-solid-full', label: 'Zgloszenia', hint: 'helpdesk', token: 'IT' },
	{ id: 'desktop-solid-full', label: 'Komputer', hint: 'stacje robocze', token: 'PC' },
	{ id: 'network-wired-solid-full', label: 'Siec', hint: 'LAN/VPN', token: 'NET' },
	{ id: 'shield-halved-solid-full', label: 'Bezpieczenstwo', hint: 'ochrona', token: 'SEC' },
	{ id: 'key-solid-full', label: 'Uwaga', hint: 'wazne', token: 'KEY' },
	{ id: 'user-gear-solid-full', label: 'Admin', hint: 'uprawnienia', token: 'ADM' },
	{ id: 'gear-solid-full', label: 'Ustawienia', hint: 'konfiguracja', token: 'CFG' },
	{ id: 'chart-line-solid-full', label: 'Raport', hint: 'wyniki', token: 'RPT' },
	{ id: 'chart-pie-solid-full', label: 'Dashboard', hint: 'analiza', token: 'BI' },
	{ id: 'table-solid-full', label: 'Tabela', hint: 'dane', token: 'TAB' },
]
