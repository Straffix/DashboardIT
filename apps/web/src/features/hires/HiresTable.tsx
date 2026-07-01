import { Fragment, useEffect, useState } from 'react'

import type { HireAccessoryId, HireInlineEditableField, HireRecord } from './types'
import {
	formatAuditDateTime,
	getAccessoryLabel,
	getAccessoryProgress,
	getActiveAccessoryIds,
	getHireStatusTone,
	getInlineEditOptions,
} from './utils'

type HiresTableProps = {
	records: HireRecord[]
	isSaving: boolean
	onEdit: (record: HireRecord) => void
	onDelete: (recordId: string) => void
	onInlineUpdate: (record: HireRecord, fieldId: HireInlineEditableField, value: string) => void
	onTogglePreparedAccessory: (record: HireRecord, accessoryId: HireAccessoryId) => void
}

export function HiresTable({
	records,
	isSaving,
	onEdit,
	onDelete,
	onInlineUpdate,
	onTogglePreparedAccessory,
}: HiresTableProps) {
	const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null)
	const [inlineEditState, setInlineEditState] = useState<{
		recordId: string
		fieldId: HireInlineEditableField
	} | null>(null)

	useEffect(() => {
		if (expandedRecordId && !records.some(record => record.id === expandedRecordId)) {
			setExpandedRecordId(null)
		}

		if (inlineEditState && !records.some(record => record.id === inlineEditState.recordId)) {
			setInlineEditState(null)
		}
	}, [expandedRecordId, inlineEditState, records])

	if (records.length === 0) {
		return (
			<section className="data-card data-card--empty">
				<h3>Brak wpisow</h3>
				<p>Nie ma jeszcze onboardingow w tym widoku. Zmien miesiac, filtr albo dodaj nowy rekord.</p>
			</section>
		)
	}

	const renderInlineCell = (record: HireRecord, fieldId: HireInlineEditableField, label: string) => {
		const isEditing = inlineEditState?.recordId === record.id && inlineEditState.fieldId === fieldId
		const currentValue = record[fieldId]

		if (isEditing) {
			const options = getInlineEditOptions(fieldId)

			return (
				<select
					autoFocus
					className="hire-inline-select"
					value={currentValue}
					disabled={isSaving}
					onBlur={() => setInlineEditState(null)}
					onChange={event => {
						setInlineEditState(null)
						onInlineUpdate(record, fieldId, event.target.value)
					}}
					onKeyDown={event => {
						if (event.key === 'Escape') {
							event.preventDefault()
							setInlineEditState(null)
						}
					}}>
					<option value="">Wybierz status</option>
					{options.map(option => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			)
		}

		return (
			<button
				type="button"
				className="hire-inline-button"
				disabled={isSaving}
				onClick={() => setInlineEditState({ recordId: record.id, fieldId })}
				title={`Kliknij, aby szybko zmienic: ${label}`}>
				<span className={`status-pill status-pill--${getHireStatusTone(currentValue)}`}>
					{currentValue || 'Brak statusu'}
				</span>
			</button>
		)
	}

	return (
		<section className="data-card">
			<div className="table-scroll">
				<table className="monitor-table hires-table-react">
					<thead>
						<tr>
							<th>Service Desk</th>
							<th>Uzytkownik</th>
							<th>Start</th>
							<th>Laptop</th>
							<th>Status laptopa</th>
							<th>Monitor</th>
							<th>Status monitora</th>
							<th>Akcesoria</th>
							<th>Akcje</th>
						</tr>
					</thead>
					<tbody>
						{records.map(record => {
							const activeAccessoryIds = getActiveAccessoryIds(record)
							const accessoryProgress = getAccessoryProgress(record)
							const isExpanded = expandedRecordId === record.id

							return (
								<Fragment key={record.id}>
									<tr key={record.id}>
										<td>
											<span className="serial-pill">{record.purchaseRequest || 'Brak'}</span>
										</td>
										<td>
											<div className="hire-person-cell">
												<strong>{record.targetUser}</strong>
												<span>{record.deliveryLocation || 'Brak lokalizacji'}</span>
												<span>{record.preparedBy ? `Przygotowal/a: ${record.preparedBy}` : 'Brak osoby przygotowujacej'}</span>
												{record.peripheralNotes ? <small>{record.peripheralNotes}</small> : null}
											</div>
										</td>
										<td>
											<span className="status-pill status-pill--warning">{record.startDate || 'Brak'}</span>
										</td>
										<td>
											<div className="hire-stack-cell">
												<strong>{record.laptopModel || 'Brak SN'}</strong>
												<span>RU: {record.laptopRu || 'Brak'}</span>
												<span>eMag: {record.laptopWarehouse || 'Brak'}</span>
											</div>
										</td>
										<td>{renderInlineCell(record, 'laptopStatus', 'Laptop - status')}</td>
										<td>
											<div className="hire-stack-cell">
												<strong>{record.monitorRu || 'Brak RU'}</strong>
												<span>eMag: {record.monitorWarehouse || 'Brak'}</span>
											</div>
										</td>
										<td>{renderInlineCell(record, 'monitorStatus', 'Monitor - status')}</td>
										<td>
											<div className="hire-accessory-cell">
												{activeAccessoryIds.length > 0 ? (
													<>
														<div className="accessory-chip-list">
															{activeAccessoryIds.map(accessoryId => (
																<span key={accessoryId} className="accessory-chip">
																	{getAccessoryLabel(accessoryId)}
																</span>
															))}
														</div>
														<span className="hire-accessory-progress">
															Przygotowane: {accessoryProgress.prepared}/{accessoryProgress.total}
														</span>
													</>
												) : (
													<span className="empty-dash">Brak</span>
												)}
											</div>
										</td>
										<td>
											<div className="table-actions">
												<button
													type="button"
													className={isExpanded ? 'is-active' : undefined}
													onClick={() =>
														setExpandedRecordId(current => (current === record.id ? null : record.id))
													}>
													{isExpanded ? 'Ukryj' : 'Szczegoly'}
												</button>
												<button type="button" onClick={() => onEdit(record)}>
													Edytuj
												</button>
												<button type="button" className="is-danger" onClick={() => onDelete(record.id)}>
													Usun
												</button>
											</div>
										</td>
									</tr>
									{isExpanded ? (
										<tr className="hires-table-react__detail-row">
											<td colSpan={9} className="hires-table-react__detail-cell">
												<div className="hires-table-react__details">
													<div className="hire-detail-meta">
														<article className="hire-detail-card">
															<p>Magazyn laptopa</p>
															{renderInlineCell(record, 'laptopWarehouse', 'Laptop - eMagazyn')}
														</article>
														<article className="hire-detail-card">
															<p>Magazyn monitora</p>
															{renderInlineCell(record, 'monitorWarehouse', 'Monitor - eMagazyn')}
														</article>
														<article className="hire-detail-card">
															<p>Historia wpisu</p>
															<span>Utworzono: {formatAuditDateTime(record.createdAt)}</span>
															<span>Aktualizacja: {formatAuditDateTime(record.updatedAt)}</span>
														</article>
													</div>

													<div className="hire-detail-card hire-detail-card--wide">
														<p>Akcesoria do przygotowania</p>
														{activeAccessoryIds.length > 0 ? (
															<div className="hire-prepared-grid">
																{activeAccessoryIds.map(accessoryId => {
																	const isPrepared = record.preparedAccessories.includes(accessoryId)

																	return (
																		<button
																			key={accessoryId}
																			type="button"
																			className={isPrepared ? 'hire-prepared-toggle is-prepared' : 'hire-prepared-toggle'}
																			disabled={isSaving}
																			onClick={() => onTogglePreparedAccessory(record, accessoryId)}>
																			<span>{getAccessoryLabel(accessoryId)}</span>
																			<small>{isPrepared ? 'Przygotowane' : 'Do przygotowania'}</small>
																		</button>
																	)
																})}
															</div>
														) : (
															<span className="empty-dash">Brak aktywnych akcesoriow</span>
														)}
													</div>
												</div>
											</td>
										</tr>
									) : null}
								</Fragment>
							)
						})}
					</tbody>
				</table>
			</div>
		</section>
	)
}
