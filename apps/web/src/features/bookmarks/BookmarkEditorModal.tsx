import { useEffect, useState } from 'react'

import { BOOKMARK_ICON_OPTIONS } from './constants'
import type { BookmarkDraft, BookmarkRecord } from './types'
import { getBookmarkDraftDefaults, normalizeBookmarkColor } from './utils'

type BookmarkEditorModalProps = {
	defaultColor: string
	errorMessage: string
	isOpen: boolean
	isSubmitting: boolean
	bookmark: BookmarkRecord | null
	onClose: () => void
	onSubmit: (draft: BookmarkDraft, bookmarkId?: string) => void
}

export function BookmarkEditorModal({
	defaultColor,
	errorMessage,
	isOpen,
	isSubmitting,
	bookmark,
	onClose,
	onSubmit,
}: BookmarkEditorModalProps) {
	const [draft, setDraft] = useState<BookmarkDraft>(() => getBookmarkDraftDefaults(defaultColor))

	useEffect(() => {
		if (!isOpen) return

		setDraft(
			bookmark
				? {
						label: bookmark.label,
						url: bookmark.url,
						description: bookmark.description,
						colorHex: normalizeBookmarkColor(bookmark.colorHex || defaultColor, defaultColor),
						iconName: bookmark.iconName,
					}
				: getBookmarkDraftDefaults(defaultColor)
		)
	}, [bookmark, defaultColor, isOpen])

	useEffect(() => {
		if (!isOpen) return

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen, onClose])

	if (!isOpen) return null

	return (
		<div className="drawer-shell" role="presentation">
			<div className="drawer-shell__backdrop" onClick={onClose} />
			<section className="drawer-card bookmark-modal-card" role="dialog" aria-modal="true" aria-labelledby="bookmark-modal-title">
				<header className="drawer-card__header">
					<div className="bookmark-modal-card__copy">
						<p className="drawer-card__eyebrow">Zakladki uzytkownika</p>
						<h3 id="bookmark-modal-title">{bookmark ? 'Edytuj zakladke' : 'Dodaj zakladke'}</h3>
						<p>
							{bookmark
								? 'Zmien nazwe, adres, kolor lub ikonke prywatnego skrotu.'
								: 'Zapisz szybki link tylko dla wybranego konta roboczego.'}
						</p>
					</div>

					<button type="button" className="drawer-card__close" onClick={onClose}>
						Zamknij
					</button>
				</header>

				<form
					className="drawer-form"
					onSubmit={event => {
						event.preventDefault()
						onSubmit(draft, bookmark?.id)
					}}>
					<div className="bookmark-modal-card__toolbar">
						<label className="field bookmark-color-field">
							<span>Kolor</span>
							<input
								type="color"
								value={draft.colorHex}
								onChange={event => {
									setDraft(currentDraft => ({
										...currentDraft,
										colorHex: normalizeBookmarkColor(event.target.value, defaultColor),
									}))
								}}
							/>
						</label>
					</div>

					<fieldset className="fieldset">
						<legend>Ikonka</legend>
						<div className="bookmark-icon-grid" role="list">
							{BOOKMARK_ICON_OPTIONS.map(option => {
								const isActive = option.id === draft.iconName || (!option.id && !draft.iconName)

								return (
									<button
										key={option.id || 'auto'}
										type="button"
										className={`bookmark-icon-choice${isActive ? ' is-active' : ''}`}
										onClick={() => {
											setDraft(currentDraft => ({
												...currentDraft,
												iconName: option.id,
											}))
										}}>
										<span className="bookmark-icon-choice__preview">{option.token}</span>
										<strong>{option.label}</strong>
										<small>{option.hint}</small>
									</button>
								)
							})}
						</div>
					</fieldset>

					<label className="field">
						<span>Nazwa</span>
						<input
							type="text"
							maxLength={60}
							value={draft.label}
							placeholder="Np. Raport wymian"
							onChange={event => {
								setDraft(currentDraft => ({
									...currentDraft,
									label: event.target.value,
								}))
							}}
						/>
					</label>

					<label className="field">
						<span>Adres lub sciezka</span>
						<input
							type="text"
							value={draft.url}
							placeholder="https://... lub C:\\folder\\plik.xlsx"
							onChange={event => {
								setDraft(currentDraft => ({
									...currentDraft,
									url: event.target.value,
								}))
							}}
						/>
					</label>

					<label className="field">
						<span>Krotki opis</span>
						<textarea
							rows={3}
							maxLength={180}
							value={draft.description}
							placeholder="Opcjonalnie: do czego sluzy ten link"
							onChange={event => {
								setDraft(currentDraft => ({
									...currentDraft,
									description: event.target.value,
								}))
							}}
						/>
					</label>

					{errorMessage ? <p className="form-error">{errorMessage}</p> : null}

					<div className="drawer-form__actions">
						<button type="button" className="button-secondary" onClick={onClose}>
							Anuluj
						</button>
						<button type="submit" className="button-primary" disabled={isSubmitting}>
							{isSubmitting ? 'Zapisuje...' : bookmark ? 'Zapisz zmiany' : 'Zapisz zakladke'}
						</button>
					</div>
				</form>
			</section>
		</div>
	)
}
