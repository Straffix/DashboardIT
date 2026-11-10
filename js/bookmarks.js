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
