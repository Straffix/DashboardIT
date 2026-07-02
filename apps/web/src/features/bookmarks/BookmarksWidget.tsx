import { useEffect, useState } from 'react'

import { useAppSession } from '../session/AppSessionProvider'
import { BookmarkEditorModal } from './BookmarkEditorModal'
import { BOOKMARK_DEFAULT_COLOR } from './constants'
import { useBookmarksQuery, useCreateBookmarkMutation, useDeleteBookmarkMutation, useUpdateBookmarkMutation } from './hooks'
import type { BookmarkDraft, BookmarkRecord } from './types'
import {
	getBookmarkAccentStyle,
	getBookmarkFaviconSources,
	getBookmarkIconOption,
	getBookmarkMetaLabel,
	normalizeBookmarkColor,
	normalizeLinkTarget,
	validateBookmarkDraft,
} from './utils'

function BookmarkVisual({
	iconName,
	label,
	url,
}: Pick<BookmarkRecord, 'iconName' | 'label' | 'url'>) {
	const customIcon = getBookmarkIconOption(iconName)
	const faviconSources = !customIcon.id ? getBookmarkFaviconSources({ url }) : []
	const [sourceIndex, setSourceIndex] = useState(0)

	useEffect(() => {
		setSourceIndex(0)
	}, [faviconSources.length, url])

	if (customIcon.id) {
		return (
			<span className="bookmark-chip bookmark-chip--custom" aria-hidden="true">
				{customIcon.token}
			</span>
		)
	}

	const currentFaviconSource = faviconSources[sourceIndex] || ''
	if (currentFaviconSource) {
		return (
			<span className="bookmark-chip bookmark-chip--favicon" aria-hidden="true">
				<img
					src={currentFaviconSource}
					alt=""
					loading="lazy"
					referrerPolicy="no-referrer"
					onError={() => {
						setSourceIndex(currentIndex => currentIndex + 1)
					}}
				/>
			</span>
		)
	}

	const initials = String(label || 'BM')
		.trim()
		.slice(0, 2)
		.toUpperCase()

	return (
		<span className="bookmark-chip" aria-hidden="true">
			{initials || 'BM'}
		</span>
	)
}

export function BookmarksWidget() {
	const { activeUser, setUserBookmarkDefaultColor } = useAppSession()
	const activeUserId = activeUser?.id || ''
	const defaultColor = normalizeBookmarkColor(activeUser?.bookmarkDefaultColor, BOOKMARK_DEFAULT_COLOR)
	const { data: bookmarks = [], isLoading } = useBookmarksQuery(activeUserId)
	const createMutation = useCreateBookmarkMutation(activeUserId)
	const updateMutation = useUpdateBookmarkMutation(activeUserId)
	const deleteMutation = useDeleteBookmarkMutation(activeUserId)

	const [feedback, setFeedback] = useState('')
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [editingBookmark, setEditingBookmark] = useState<BookmarkRecord | null>(null)
	const [formError, setFormError] = useState('')

	const closeDrawer = () => {
		setDrawerOpen(false)
		setEditingBookmark(null)
		setFormError('')
	}

	const openCreateDrawer = () => {
		if (!activeUser) {
			setFeedback('Wybierz osobe robocza, aby dodawac prywatne zakladki.')
			return
		}

		setFeedback('')
		setEditingBookmark(null)
		setFormError('')
		setDrawerOpen(true)
	}

	const openEditDrawer = (bookmark: BookmarkRecord) => {
		setFeedback('')
		setEditingBookmark(bookmark)
		setFormError('')
		setDrawerOpen(true)
	}

	const handleSubmit = async (draft: BookmarkDraft, bookmarkId?: string) => {
		if (!activeUser) {
			setFeedback('Wybierz osobe robocza, aby zarzadzac zakladkami.')
			closeDrawer()
			return
		}

		const nextError = validateBookmarkDraft(draft)
		if (nextError) {
			setFormError(nextError)
			return
		}

		try {
			setFeedback('')

			if (bookmarkId) {
				await updateMutation.mutateAsync({ bookmarkId, draft })
			} else {
				await createMutation.mutateAsync(draft)
			}

			if (activeUser.bookmarkDefaultColor !== draft.colorHex) {
				setUserBookmarkDefaultColor(activeUser.id, draft.colorHex)
			}

			closeDrawer()
		} catch (error) {
			setFormError(error instanceof Error ? error.message : 'Nie udalo sie zapisac zakladki.')
		}
	}

	return (
		<>
			<section className="data-card bookmarks-widget" aria-labelledby="dashboard-bookmarks-title">
				<div className="bookmarks-widget__head">
					<div className="dashboard-home-section-head">
						<p className="month-summary-card__label">Zakladki</p>
						<strong id="dashboard-bookmarks-title">Prywatne skroty robocze</strong>
						<span>
							{activeUser
								? 'Ten panel przejmuje legacy bookmarki: szybkie linki per-user, kolor akcentu, favicony i reczna ikonke.'
								: 'Zakladki sa przypisane do wybranej osoby roboczej. Wybierz sesje, aby zobaczyc albo dopisac swoje skroty.'}
						</span>
					</div>

					<button type="button" className="button-primary" onClick={openCreateDrawer}>
						Dodaj zakladke
					</button>
				</div>

				{feedback ? <p className="helper-note is-warning">{feedback}</p> : null}

				{!activeUser ? (
					<p className="dashboard-home-empty">
						Brak aktywnej osoby. Po wyborze sesji zobaczysz prywatne linki zapisane dla danego konta.
					</p>
				) : isLoading ? (
					<p className="dashboard-home-empty">Laduje zapisane zakladki dla wybranego konta.</p>
				) : (
					<div className="bookmarks-grid">
						{bookmarks.map(bookmark => {
							const bookmarkColor = normalizeBookmarkColor(bookmark.colorHex || defaultColor, defaultColor)
							const href = normalizeLinkTarget(bookmark.url)

							return (
								<article
									key={bookmark.id}
									className="bookmark-card"
									style={getBookmarkAccentStyle(bookmarkColor)}>
									<a className="bookmark-card__main" href={href || '#'} rel="noopener noreferrer" title={bookmark.description || bookmark.label}>
										<BookmarkVisual iconName={bookmark.iconName} label={bookmark.label} url={bookmark.url} />

										<div className="bookmark-card__copy">
											<strong>{bookmark.label}</strong>
											<span>{getBookmarkMetaLabel(bookmark)}</span>
											<p>{bookmark.description || 'Prywatny skrot zapisany dla tego konta roboczego.'}</p>
										</div>
									</a>

									<div className="bookmark-card__actions">
										<button type="button" className="button-secondary" onClick={() => openEditDrawer(bookmark)}>
											Edytuj
										</button>
										<button
											type="button"
											className="button-secondary is-danger"
											onClick={() => {
												const shouldDelete = window.confirm(`Usunac zakladke "${bookmark.label}"?`)
												if (!shouldDelete) return

												void deleteMutation.mutateAsync(bookmark.id)
											}}>
											Usun
										</button>
									</div>
								</article>
							)
						})}

						<button type="button" className="bookmark-add-tile" onClick={openCreateDrawer}>
							<span className="bookmark-add-tile__plus">+</span>
							<strong>Nowy skrot</strong>
							<span>Zapisz link, folder albo raport tylko dla tego konta.</span>
						</button>
					</div>
				)}

				{activeUser && !isLoading && bookmarks.length === 0 ? (
					<p className="dashboard-home-empty">
						Ten uzytkownik nie ma jeszcze zapisanych zakladek. Zacznij od pierwszego skrotu i zbuduj dashboard pod swoj workflow.
					</p>
				) : null}
			</section>

			<BookmarkEditorModal
				bookmark={editingBookmark}
				defaultColor={defaultColor}
				errorMessage={formError}
				isOpen={drawerOpen}
				isSubmitting={createMutation.isPending || updateMutation.isPending}
				onClose={closeDrawer}
				onSubmit={handleSubmit}
			/>
		</>
	)
}
