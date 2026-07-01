import type { MonitorDevice } from './types'
import { getMonitorDeviceStatus } from './utils'

type MonitorTableProps = {
	devices: MonitorDevice[]
	onEdit: (device: MonitorDevice) => void
	onExtend: (deviceId: string) => void
	onDelete: (deviceId: string) => void
}

export function MonitorTable({ devices, onEdit, onExtend, onDelete }: MonitorTableProps) {
	if (devices.length === 0) {
		return (
			<section className="data-card data-card--empty">
				<h3>Brak wynikow</h3>
				<p>Nie ma jeszcze urzadzen spelniajacych ten filtr. Zmien wyszukiwanie albo dodaj nowy wpis.</p>
			</section>
		)
	}

	return (
		<section className="data-card">
			<div className="table-scroll">
				<table className="monitor-table">
					<thead>
						<tr>
							<th>Nazwa</th>
							<th>RU</th>
							<th>Sprzet / SN</th>
							<th>W domenie do</th>
							<th>Akcje</th>
						</tr>
					</thead>
					<tbody>
						{devices.map(device => {
							const status = getMonitorDeviceStatus(device)

							return (
								<tr key={device.id}>
									<td>
										<div className="device-cell">
											<strong>{device.name}</strong>
											<span>Aktualizacja: {device.updatedAt.slice(0, 10)}</span>
										</div>
									</td>
									<td>{device.ru}</td>
									<td>
										<span className="serial-pill">{device.sn}</span>
									</td>
									<td>
										<span className={`status-pill status-pill--${status.tone}`}>{status.label}</span>
									</td>
									<td>
										<div className="table-actions">
											<button type="button" onClick={() => onExtend(device.id)}>
												Przedluz 60 dni
											</button>
											<button type="button" onClick={() => onEdit(device)}>
												Edytuj
											</button>
											<button type="button" className="is-danger" onClick={() => onDelete(device.id)}>
												Usun
											</button>
										</div>
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		</section>
	)
}
