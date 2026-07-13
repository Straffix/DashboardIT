import { useEffect, useState } from 'react'

import type { HireDraft, HireRecord } from './types'
import {
	createEmptyHireDraft,
	hireAccessoryCatalog,
	laptopStatusOptions,
	monitorStatusOptions,
	preparedByOptions,
	warehouseStatusOptions,
} from './utils'

type HiresDrawerProps = {
	isOpen: boolean
	record: HireRecord | null
	isSubmitting: boolean
	errorMessage: string
	onClose: () => void
	onSubmit: (draft: HireDraft, recordId?: string) => void
}

export function HiresDrawer({ isOpen, record, isSubmitting, errorMessage, onClose, onSubmit }: HiresDrawerProps) {
	const [draft, setDraft] = useState<HireDraft>(createEmptyHireDraft())

	useEffect(() => {
		if (!isOpen) return

		if (record) {
			setDraft({
				purchaseRequest: record.purchaseRequest,
				targetUser: record.targetUser,
				startDate: record.startDate,
				laptopModel: record.laptopModel,
				laptopRu: record.laptopRu,
				laptopStatus: record.laptopStatus,
				laptopWarehouse: record.laptopWarehouse,
				monitorRu: record.monitorRu,
				monitorStatus: record.monitorStatus,
				monitorWarehouse: record.monitorWarehouse,
				preparedBy: record.preparedBy,
				deliveryLocation: record.deliveryLocation,
				peripheralNotes: record.peripheralNotes,
				monitorDock: record.monitorDock,
				mouse: record.mouse,
				keyboard: record.keyboard,
				yealink: record.yealink,
				logiZoneVibe: record.logiZoneVibe,
				lenovo: record.lenovo,
				bag: record.bag,
				backpack: record.backpack,
				laptopStand: record.laptopStand,
				presenter: record.presenter,
				printer: record.printer,
			})
			return
		}

		setDraft(createEmptyHireDraft())
	}, [isOpen, record])

	if (!isOpen) return null

	const isEditMode = Boolean(record)
	const selectedAccessoriesCount = hireAccessoryCatalog.filter(accessory => draft[accessory.id]).length

	return (
		<div className="drawer-shell" role="presentation">
			<div className="drawer-shell__backdrop" onClick={onClose} />
			<aside className="drawer-card hires-drawer" aria-modal="true" role="dialog" aria-labelledby="hires-drawer-title">
				<div className="drawer-card__header">
					<div>
						<p className="drawer-card__eyebrow">Nowe zatrudnienia</p>
						<h3 id="hires-drawer-title">{isEditMode ? 'Edytuj onboarding' : 'Dodaj onboarding'}</h3>
						<p>
							{isEditMode
								? 'Aktualizujesz Reactowy wpis dla nowego pracownika.'
								: 'Dodajesz nowy onboarding do glownej listy pracy zespolu IT.'}
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
					<section className="drawer-form__section">
						<div className="drawer-form__section-copy">
							<h4>Dane glowne</h4>
							<p>Podstawowe informacje o nowym pracowniku i miejscu wydania.</p>
						</div>

						<div className="drawer-form__grid">
							<label className="field">
								<span>Service Desk</span>
								<input
									type="text"
									value={draft.purchaseRequest}
									onChange={event => setDraft(current => ({ ...current, purchaseRequest: event.target.value.toUpperCase() }))}
									placeholder="np. SD-2026-018"
								/>
							</label>

							<label className="field">
								<span>Uzytkownik</span>
								<input
									type="text"
									value={draft.targetUser}
									onChange={event => setDraft(current => ({ ...current, targetUser: event.target.value }))}
									placeholder="np. Jan Kowalski"
									required
								/>
							</label>

							<label className="field">
								<span>Data rozpoczecia</span>
								<input
									type="date"
									value={draft.startDate}
									onChange={event => setDraft(current => ({ ...current, startDate: event.target.value }))}
									required
								/>
							</label>

							<label className="field">
								<span>Przygotowal/a</span>
								<select
									value={draft.preparedBy}
									onChange={event => setDraft(current => ({ ...current, preparedBy: event.target.value }))}>
									<option value="">Wybierz osobe</option>
									{preparedByOptions.map(option => (
										<option key={option} value={option}>
											{option}
										</option>
									))}
								</select>
							</label>

							<label className="field field--full">
								<span>Lokalizacja</span>
								<input
									type="text"
									value={draft.deliveryLocation}
									onChange={event => setDraft(current => ({ ...current, deliveryLocation: event.target.value }))}
									placeholder="np. Warszawa / Centrala / pok. 204"
								/>
							</label>
						</div>
					</section>

					<section className="drawer-form__section">
						<div className="drawer-form__section-copy">
							<h4>Laptop i monitor</h4>
							<p>Statusy, RU i magazyn w jednym miejscu.</p>
						</div>

						<div className="drawer-form__grid">
							<label className="field">
								<span>Laptop - SN</span>
								<input
									type="text"
									value={draft.laptopModel}
									onChange={event => setDraft(current => ({ ...current, laptopModel: event.target.value.toUpperCase() }))}
									placeholder="np. T14G5-PL-101"
								/>
							</label>

							<label className="field">
								<span>Laptop - RU</span>
								<input
									type="text"
									value={draft.laptopRu}
									onChange={event => setDraft(current => ({ ...current, laptopRu: event.target.value.toUpperCase() }))}
									placeholder="np. RU123456"
								/>
							</label>

							<label className="field">
								<span>Laptop - status</span>
								<select
									value={draft.laptopStatus}
									onChange={event => setDraft(current => ({ ...current, laptopStatus: event.target.value }))}>
									<option value="">Wybierz status</option>
									{laptopStatusOptions.map(option => (
										<option key={option} value={option}>
											{option}
										</option>
									))}
								</select>
							</label>

							<label className="field">
								<span>Laptop - eMagazyn</span>
								<select
									value={draft.laptopWarehouse}
									onChange={event => setDraft(current => ({ ...current, laptopWarehouse: event.target.value }))}>
									<option value="">Wybierz status</option>
									{warehouseStatusOptions.map(option => (
										<option key={option} value={option}>
											{option}
										</option>
									))}
								</select>
							</label>

							<label className="field">
								<span>Monitor - RU</span>
								<input
									type="text"
									value={draft.monitorRu}
									onChange={event => setDraft(current => ({ ...current, monitorRu: event.target.value.toUpperCase() }))}
									placeholder="np. MON220144"
								/>
							</label>

							<label className="field">
								<span>Monitor - status</span>
								<select
									value={draft.monitorStatus}
									onChange={event => setDraft(current => ({ ...current, monitorStatus: event.target.value }))}>
									<option value="">Wybierz status</option>
									{monitorStatusOptions.map(option => (
										<option key={option} value={option}>
											{option}
										</option>
									))}
								</select>
							</label>

							<label className="field field--full">
								<span>Monitor - eMagazyn</span>
								<select
									value={draft.monitorWarehouse}
									onChange={event => setDraft(current => ({ ...current, monitorWarehouse: event.target.value }))}>
									<option value="">Wybierz status</option>
									{warehouseStatusOptions.map(option => (
										<option key={option} value={option}>
											{option}
										</option>
									))}
								</select>
							</label>
						</div>
					</section>

					<section className="drawer-form__section">
						<div className="drawer-form__section-copy">
							<h4>Akcesoria</h4>
							<p>Wybrane: {selectedAccessoriesCount}. Akcesoria zapisza sie razem z onboardingiem.</p>
						</div>

						<div className="accessory-picker">
							{hireAccessoryCatalog.map(accessory => {
								const isActive = draft[accessory.id]

								return (
									<button
										key={accessory.id}
										type="button"
										className={isActive ? 'accessory-toggle is-active' : 'accessory-toggle'}
										onClick={() =>
											setDraft(current => ({
												...current,
												[accessory.id]: !current[accessory.id],
											}))
										}>
										<span>{accessory.shortLabel}</span>
										<small>{accessory.label}</small>
									</button>
								)
							})}
						</div>

						<label className="field">
							<span>Uwagi</span>
							<textarea
								value={draft.peripheralNotes}
								onChange={event => setDraft(current => ({ ...current, peripheralNotes: event.target.value }))}
								rows={4}
								placeholder="Komentarz, niestandardowe wyposazenie, dodatkowe ustalenia."
							/>
						</label>
					</section>

					{errorMessage ? <p className="form-error">{errorMessage}</p> : null}

					<div className="drawer-form__actions">
						<button type="button" className="button-secondary" onClick={onClose}>
							Anuluj
						</button>
						<button type="submit" className="button-primary" disabled={isSubmitting}>
							{isSubmitting ? 'Zapisywanie...' : isEditMode ? 'Zapisz zmiany' : 'Dodaj onboarding'}
						</button>
					</div>
				</form>
			</aside>
		</div>
	)
}
