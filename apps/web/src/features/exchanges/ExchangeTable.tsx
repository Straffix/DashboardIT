import type { ExchangeRecord } from './types'
import { getAccessoryLabel } from './utils'

type ExchangeTableProps = {
	records: ExchangeRecord[]
	onEdit: (record: ExchangeRecord) => void
	onComplete: (recordId: string) => void
	onDelete: (recordId: string) => void
}

export function ExchangeTable({ records, onEdit, onComplete, onDelete }: ExchangeTableProps) {
	if (records.length === 0) {
		return (
			<section className="data-card data-card--empty">
				<h3>Brak wpisow</h3>
				<p>Nie ma jeszcze planowanych wymian w tym widoku. Zmien miesiac, filtr albo dodaj nowy rekord.</p>
			</section>
		)
	}

	return (
		<section className="data-card">
			<div className="table-scroll">
				<table className="monitor-table exchange-table">
					<thead>
						<tr>
							<th>Pracownik</th>
							<th>Data</th>
							<th>Zwrot</th>
							<th>Wydanie</th>
							<th>Akcesoria</th>
							<th>Status</th>
							<th>Akcje</th>
						</tr>
					</thead>
					<tbody>
						{records.map(record => (
							<tr key={record.id}>
								<td>
									<div className="device-cell">
										<strong>{record.name}</strong>
										<span>{record.notes ? record.notes : 'Brak dodatkowych uwag.'}</span>
									</div>
								</td>
								<td>{record.plannedDate}</td>
								<td>
									{record.oldSn ? (
										<span className="serial-pill serial-pill--danger">{record.oldSn}</span>
									) : (
										<span className="empty-dash">Brak</span>
									)}
								</td>
								<td>
									{record.newSn ? (
										<span className="serial-pill serial-pill--success">{record.newSn}</span>
									) : (
										<span className="empty-dash">Brak</span>
									)}
								</td>
								<td>
									{record.accessories.length > 0 ? (
										<div className="accessory-chip-list">
											{record.accessories.map(accessory => (
												<span key={accessory} className="accessory-chip">
													{getAccessoryLabel(accessory)}
												</span>
											))}
										</div>
									) : (
										<span className="empty-dash">Brak</span>
									)}
								</td>
								<td>
									<span className={`status-pill status-pill--${record.status === 'done' ? 'active' : 'warning'}`}>
										{record.status === 'done' ? 'Zakonczona' : 'Planowana'}
									</span>
								</td>
								<td>
									<div className="table-actions">
										{record.status !== 'done' ? (
											<button type="button" onClick={() => onComplete(record.id)}>
												Finalizuj
											</button>
										) : null}
										<button type="button" onClick={() => onEdit(record)}>
											Edytuj
										</button>
										<button type="button" className="is-danger" onClick={() => onDelete(record.id)}>
											Usun
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	)
}
