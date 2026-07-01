import { useEffect, useState } from 'react'

import type { ExchangeDraft, ExchangeRecord } from './types'
import { createEmptyExchangeDraft, exchangeAccessoryCatalog } from './utils'

type ExchangeDrawerProps = {
	isOpen: boolean
	record: ExchangeRecord | null
	isSubmitting: boolean
	errorMessage: string
	onClose: () => void
	onSubmit: (draft: ExchangeDraft, recordId?: string) => void
}

export function ExchangeDrawer({
	isOpen,
	record,
	isSubmitting,
	errorMessage,
	onClose,
	onSubmit,
}: ExchangeDrawerProps) {
	const [draft, setDraft] = useState<ExchangeDraft>(createEmptyExchangeDraft())

	useEffect(() => {
		if (!isOpen) return

		if (record) {
			setDraft({
				name: record.name,
				plannedDate: record.plannedDate,
				oldSn: record.oldSn,
				newSn: record.newSn,
				notes: record.notes,
				accessories: record.accessories,
			})
			return
		}

		setDraft(createEmptyExchangeDraft())
	}, [isOpen, record])

	if (!isOpen) return null

	const isEditMode = Boolean(record)

	return (
		<div className="drawer-shell" role="presentation">
			<div className="drawer-shell__backdrop" onClick={onClose} />
			<aside className="drawer-card" aria-modal="true" role="dialog" aria-labelledby="exchange-drawer-title">
				<div className="drawer-card__header">
					<div>
						<p className="drawer-card__eyebrow">Wymiana sprzetu</p>
						<h3 id="exchange-drawer-title">{isEditMode ? 'Edytuj plan wymiany' : 'Zaplanuj nowa wymiane'}</h3>
						<p>
							{isEditMode
								? 'Aktualizujesz dane wymiany w Reactowej wersji modulu.'
								: 'Ten formularz jest juz przepisany na React i wspolgra z modulem monitoringu.'}
						</p>
					</div>
					<button type="button" className="drawer-card__close" onClick={onClose}>
						Zamknij
					</button>
				</div>

				<form
					className="drawer-form"
					onSubmit={event => {
						event.preventDefault()
						onSubmit(draft, record?.id)
					}}>
					<label className="field">
						<span>Pracownik</span>
						<input
							type="text"
							value={draft.name}
							onChange={event => setDraft(current => ({ ...current, name: event.target.value.toUpperCase() }))}
							placeholder="Imie i nazwisko"
							required
						/>
					</label>

					<label className="field">
						<span>Data planowanej wymiany</span>
						<input
							type="date"
							value={draft.plannedDate}
							onChange={event => setDraft(current => ({ ...current, plannedDate: event.target.value }))}
							required
						/>
					</label>

					<div className="dual-field-grid">
						<label className="field">
							<span>Stary laptop (SN)</span>
							<input
								type="text"
								value={draft.oldSn}
								onChange={event => setDraft(current => ({ ...current, oldSn: event.target.value.toUpperCase() }))}
								placeholder="SN do zwrotu"
							/>
						</label>

						<label className="field">
							<span>Nowy laptop (SN)</span>
							<input
								type="text"
								value={draft.newSn}
								onChange={event => setDraft(current => ({ ...current, newSn: event.target.value.toUpperCase() }))}
								placeholder="SN do wydania"
							/>
						</label>
					</div>

					<div className="field">
						<span>Dodatkowe wydania</span>
						<div className="accessory-picker">
							{exchangeAccessoryCatalog.map(accessory => {
								const isActive = draft.accessories.includes(accessory.id)

								return (
									<button
										key={accessory.id}
										type="button"
										className={isActive ? 'accessory-toggle is-active' : 'accessory-toggle'}
										onClick={() =>
											setDraft(current => ({
												...current,
												accessories: isActive
													? current.accessories.filter(item => item !== accessory.id)
													: [...current.accessories, accessory.id],
											}))
										}>
										<span>{accessory.shortLabel}</span>
										<small>{accessory.label}</small>
									</button>
								)
							})}
						</div>
					</div>

					<label className="field">
						<span>Uwagi</span>
						<textarea
							value={draft.notes}
							onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))}
							placeholder="Np. uszkodzenia starego laptopa albo dodatkowe wydanie."
							rows={4}
						/>
					</label>

					{errorMessage ? <p className="form-error">{errorMessage}</p> : null}

					<div className="drawer-form__actions">
						<button type="button" className="button-secondary" onClick={onClose}>
							Anuluj
						</button>
						<button type="submit" className="button-primary" disabled={isSubmitting}>
							{isSubmitting ? 'Zapisywanie...' : isEditMode ? 'Zapisz zmiany' : 'Zatwierdz i zaplanuj'}
						</button>
					</div>
				</form>
			</aside>
		</div>
	)
}
