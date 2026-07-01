import type { ChangeEvent } from 'react'
import { useDeferredValue, useMemo, useRef, useState } from 'react'

import { PageIntro } from '../../components/PageIntro'
import { exportRowsToExcelFile, readFirstSheetRows } from '../../lib/xlsx'
import { buildMonitorExportRows, prepareImportedMonitorDevices } from '../../features/monitor/excel'
import {
	useCreateMonitorDeviceMutation,
	useDeleteMonitorDeviceMutation,
	useExtendMonitorDeviceMutation,
	useMonitorDevicesQuery,
	useReplaceMonitorDevicesMutation,
	useUpdateMonitorDeviceMutation,
} from '../../features/monitor/hooks'
import { MonitorDrawer } from '../../features/monitor/MonitorDrawer'
import { MonitorStats } from '../../features/monitor/MonitorStats'
import { MonitorTable } from '../../features/monitor/MonitorTable'
import type { MonitorDevice, MonitorDeviceDraft } from '../../features/monitor/types'
import { getMonitorDeviceStatus, matchesMonitorSearch, validateMonitorDraft } from '../../features/monitor/utils'

export function MonitorPage() {
	const { data: devices = [], isLoading } = useMonitorDevicesQuery()
	const createMutation = useCreateMonitorDeviceMutation()
	const updateMutation = useUpdateMonitorDeviceMutation()
	const extendMutation = useExtendMonitorDeviceMutation()
	const deleteMutation = useDeleteMonitorDeviceMutation()
	const replaceMutation = useReplaceMonitorDevicesMutation()

	const [searchValue, setSearchValue] = useState('')
	const deferredSearch = useDeferredValue(searchValue)
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [editingDevice, setEditingDevice] = useState<MonitorDevice | null>(null)
	const [formError, setFormError] = useState('')
	const [feedback, setFeedback] = useState('')
	const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'success' | 'warning'>('neutral')

	const importInputRef = useRef<HTMLInputElement | null>(null)

	const filteredDevices = useMemo(
		() => devices.filter(device => matchesMonitorSearch(device, deferredSearch)),
		[deferredSearch, devices]
	)

	const stats = useMemo(() => {
		return filteredDevices.reduce(
			(summary, device) => {
				const status = getMonitorDeviceStatus(device)
				summary.all += 1
				if (status.tone === 'active') summary.active += 1
				if (status.tone === 'warning') summary.warning += 1
				if (status.tone === 'expired') summary.expired += 1
				return summary
			},
			{ all: 0, active: 0, warning: 0, expired: 0 }
		)
	}, [filteredDevices])

	const openCreateDrawer = () => {
		setEditingDevice(null)
		setFormError('')
		setDrawerOpen(true)
	}

	const openEditDrawer = (device: MonitorDevice) => {
		setEditingDevice(device)
		setFormError('')
		setDrawerOpen(true)
	}

	const closeDrawer = () => {
		setDrawerOpen(false)
		setEditingDevice(null)
		setFormError('')
	}

	const handleSubmit = async (draft: MonitorDeviceDraft, deviceId?: string) => {
		const nextError = validateMonitorDraft(draft, devices, deviceId)
		if (nextError) {
			setFormError(nextError)
			return
		}

		if (deviceId) {
			await updateMutation.mutateAsync({ deviceId, draft })
		} else {
			await createMutation.mutateAsync(draft)
		}

		closeDrawer()
	}

	const handleExport = async () => {
		if (devices.length === 0) {
			setFeedbackTone('warning')
			setFeedback('Brak danych do eksportu. Dodaj urzadzenie albo zaimportuj plik, a backup ruszy od razu.')
			return
		}

		try {
			setFeedback('')
			await exportRowsToExcelFile(buildMonitorExportRows(devices), {
				filename: `monitor_laptopow_${new Date().toISOString().slice(0, 10)}.xlsx`,
				sheetName: 'Urzadzenia',
			})
		} catch (error) {
			setFeedbackTone('warning')
			setFeedback(error instanceof Error ? error.message : 'Nie udalo sie wyeksportowac pliku Excel.')
		}
	}

	const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		event.target.value = ''
		if (!file) return

		try {
			setFeedback('')
			const rows = await readFirstSheetRows(file)
			const { importedDevices, skippedCount } = prepareImportedMonitorDevices(rows, devices)

			if (importedDevices.length === 0) {
				setFeedbackTone('warning')
				setFeedback(
					skippedCount > 0
						? 'Wszystkie rekordy z importu juz istnieja, powtarzaja sie w pliku albo sa niepelne.'
						: 'Plik nie zawiera poprawnych, nowych rekordow do dodania.'
				)
				return
			}

			const shouldImport = window.confirm(
				skippedCount > 0
					? `Zaimportowac ${importedDevices.length} urzadzen? Pomine ${skippedCount} duplikatow lub niepelnych wierszy.`
					: `Zaimportowac ${importedDevices.length} urzadzen z Excela?`
			)
			if (!shouldImport) return

			await replaceMutation.mutateAsync([...devices, ...importedDevices])
			setFeedbackTone('success')
			setFeedback(`Dodano ${importedDevices.length} nowych urzadzen z pliku Excel.`)
		} catch (error) {
			setFeedbackTone('warning')
			setFeedback(error instanceof Error ? error.message : 'Nie udalo sie zaimportowac danych z Excela.')
		}
	}

	return (
		<div className="page-stack">
			<PageIntro
				eyebrow="Pierwszy modul w React"
				title="Urzadzenia w domenie"
				description="Ten ekran jest juz zbudowany jako komponenty React z routingiem, lokalnym storage i rozdzieleniem logiki od widoku. To jest nasz wzorzec na dalsza migracje."
				actions={
					<div className="page-actions">
						<label className="search-input">
							<span>Szukaj</span>
							<input
								type="search"
								value={searchValue}
								onChange={event => setSearchValue(event.target.value)}
								placeholder="Nazwa, RU, SN lub data"
							/>
						</label>
						<input
							ref={importInputRef}
							hidden
							accept=".xlsx,.xls"
							type="file"
							onChange={handleImport}
						/>
						<button type="button" className="button-secondary" onClick={() => void handleExport()}>
							Eksport Excel
						</button>
						<button
							type="button"
							className="button-secondary"
							disabled={replaceMutation.isPending}
							onClick={() => {
								importInputRef.current?.click()
							}}>
							{replaceMutation.isPending ? 'Import trwa...' : 'Import Excel'}
						</button>
						<button type="button" className="button-primary" onClick={openCreateDrawer}>
							Dodaj urzadzenie
						</button>
					</div>
				}
			/>

			<MonitorStats {...stats} />

			{feedback ? (
				<section className={`helper-note${feedbackTone === 'warning' ? ' is-warning' : feedbackTone === 'success' ? ' is-success' : ''}`}>
					{feedback}
				</section>
			) : null}

			{isLoading ? (
				<section className="data-card data-card--empty">
					<h3>Ladowanie</h3>
					<p>Pobieram dane modulu monitoringu.</p>
				</section>
			) : (
				<MonitorTable
					devices={filteredDevices}
					onEdit={openEditDrawer}
					onExtend={deviceId => void extendMutation.mutateAsync(deviceId)}
					onDelete={deviceId => {
						const shouldDelete = window.confirm('Usunac urzadzenie z listy?')
						if (!shouldDelete) return
						void deleteMutation.mutateAsync(deviceId)
					}}
				/>
			)}

			<MonitorDrawer
				isOpen={drawerOpen}
				device={editingDevice}
				isSubmitting={createMutation.isPending || updateMutation.isPending}
				errorMessage={formError}
				onClose={closeDrawer}
				onSubmit={handleSubmit}
			/>
		</div>
	)
}
