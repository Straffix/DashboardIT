import { useEffect, useState } from 'react'

import type { MonitorDevice, MonitorDeviceDraft } from './types'
import { createEmptyMonitorDraft } from './utils'

type MonitorDrawerProps = {
	isOpen: boolean
	device: MonitorDevice | null
	isSubmitting: boolean
	errorMessage: string
	onClose: () => void
	onSubmit: (draft: MonitorDeviceDraft, deviceId?: string) => void
}

export function MonitorDrawer({
	isOpen,
	device,
	isSubmitting,
	errorMessage,
	onClose,
	onSubmit,
}: MonitorDrawerProps) {
	const [draft, setDraft] = useState<MonitorDeviceDraft>(createEmptyMonitorDraft())

	useEffect(() => {
		if (!isOpen) return

		if (device) {
			setDraft({
				name: device.name,
				ru: device.ru,
				sn: device.sn,
				deviceType: device.deviceType,
				date: device.date,
			})
			return
		}

		setDraft(createEmptyMonitorDraft())
	}, [device, isOpen])

	if (!isOpen) return null

	const isEditMode = Boolean(device)

	return (
		<div className="drawer-shell" role="presentation">
			<div className="drawer-shell__backdrop" onClick={onClose} />
			<aside className="drawer-card" aria-modal="true" role="dialog" aria-labelledby="monitor-drawer-title">
				<div className="drawer-card__header">
					<div>
						<p className="drawer-card__eyebrow">Urzadzenia w domenie</p>
						<h3 id="monitor-drawer-title">{isEditMode ? 'Edytuj urzadzenie' : 'Dodaj urzadzenie'}</h3>
						<p>
							{isEditMode
								? 'Aktualizujesz istniejacy wpis w module urzadzen.'
								: 'Dodajesz nowe urzadzenie do glownej listy monitoringu domeny.'}
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
						onSubmit(draft, device?.id)
					}}>
					<label className="field">
						<span>Nazwa komputera</span>
						<input
							type="text"
							value={draft.name}
							onChange={event => setDraft(current => ({ ...current, name: event.target.value.toUpperCase() }))}
							placeholder="np. REKRUTACJA746"
							required
						/>
					</label>

					<label className="field">
						<span>Numer RU</span>
						<input
							type="text"
							value={draft.ru}
							onChange={event =>
								setDraft(current => ({ ...current, ru: event.target.value.replace(/[^0-9]/g, '') }))
							}
							placeholder="Tylko cyfry"
							required
						/>
					</label>

					<label className="field">
						<span>SN</span>
						<input
							type="text"
							value={draft.sn}
							onChange={event => setDraft(current => ({ ...current, sn: event.target.value.toUpperCase() }))}
							placeholder="np. PF928402"
							required
						/>
					</label>

					<fieldset className="field fieldset">
						<legend>Typ urzadzenia</legend>
						<div className="toggle-group">
							<label>
								<input
									type="radio"
									name="deviceType"
									checked={draft.deviceType === 'new'}
									onChange={() => setDraft(current => ({ ...current, deviceType: 'new', date: '' }))}
								/>
								<span>Nowe</span>
							</label>
							<label>
								<input
									type="radio"
									name="deviceType"
									checked={draft.deviceType === 'old'}
									onChange={() => setDraft(current => ({ ...current, deviceType: 'old' }))}
								/>
								<span>Stare</span>
							</label>
						</div>
					</fieldset>

					{draft.deviceType === 'old' ? (
						<label className="field">
							<span>W domenie do</span>
							<input
								type="date"
								value={draft.date}
								onChange={event => setDraft(current => ({ ...current, date: event.target.value }))}
								required
							/>
						</label>
					) : null}

					{errorMessage ? <p className="form-error">{errorMessage}</p> : null}

					<div className="drawer-form__actions">
						<button type="button" className="button-secondary" onClick={onClose}>
							Anuluj
						</button>
						<button type="submit" className="button-primary" disabled={isSubmitting}>
							{isSubmitting ? 'Zapisywanie...' : isEditMode ? 'Zapisz zmiany' : 'Dodaj urzadzenie'}
						</button>
					</div>
				</form>
			</aside>
		</div>
	)
}
