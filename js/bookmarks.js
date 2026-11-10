/* === Bookmarks Storage: Start === */
const BOOKMARKS_KEY = AppUtils.config.STORAGE_KEYS.BOOKMARKS
let bookmarks = []

function loadBookmarks() {
	try {
		const saved = localStorage.getItem(BOOKMARKS_KEY)
		const parsed = saved ? JSON.parse(saved) : []
		bookmarks = Array.isArray(parsed) ? parsed : []
	} catch (error) {
		bookmarks = []
	}
}

function saveBookmarks() {
	localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks))
}
/* === Bookmarks Storage: End === */

/* === Bookmarks Dialog: Start === */
const bookmarkDialog = document.getElementById('bookmark-dialog')
const bookmarkForm = document.getElementById('bookmark-form')
const bookmarkAddBtn = document.getElementById('bookmark-add-btn')
const bookmarkCancelBtn = document.getElementById('bookmark-cancel-btn')

bookmarkAddBtn.addEventListener('click', () => {
	bookmarkForm.reset()
	bookmarkDialog.showModal()
})

bookmarkCancelBtn.addEventListener('click', () => {
	bookmarkDialog.close()
})
/* === Bookmarks Dialog: End === */

/* === Bookmarks Rendering: Start === */
const bookmarksList = document.getElementById('bookmarks-list')

function isSafeUrl(value) {
	try {
		const url = new URL(value)
		return url.protocol === 'https:' || url.protocol === 'http:'
	} catch (error) {
		return false
	}
}

function renderBookmarks() {
	bookmarksList.innerHTML = ''

	for (const bookmark of bookmarks) {
		if (!isSafeUrl(bookmark.url)) continue

		const item = document.createElement('li')
		const link = document.createElement('a')
		const icon = document.createElement('i')
		const label = document.createElement('span')

		link.className = 'bookmark-link'
		link.href = bookmark.url
		link.target = '_blank'
		link.rel = 'noopener noreferrer'
		link.title = bookmark.url

		icon.className = 'fa-solid fa-arrow-up-right-from-square'
		label.textContent = bookmark.name

		link.append(icon, label)
		item.append(link)
		bookmarksList.append(item)
	}
}

/* === Bookmarks Rendering: End === */

/* === Bookmarks Init: Start === */
loadBookmarks()
renderBookmarks()

/* === Bookmarks Init: End === */
