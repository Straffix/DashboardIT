import type { ChangeEvent } from 'react'
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import { PageIntro } from '../../components/PageIntro'
import { buildExchangeExportRows, prepareImportedExchangeRecords } from '../../features/exchanges/excel'
import {
	useCompleteExchangeRecordMutation,
	useCreateExchangeRecordMutation,
	useDeleteExchangeRecordMutation,
	useExchangeRecordsQuery,
	useReplaceExchangeRecordsMutation,
	useUpdateExchangeRecordMutation,
} from '../../features/exchanges/hooks'
import { ExchangeDrawer } from '../../features/exchanges/ExchangeDrawer'
import { ExchangeStats } from '../../features/exchanges/ExchangeStats'
import { ExchangeTable } from '../../features/exchanges/ExchangeTable'
import type { ExchangeDraft, ExchangeRecord } from '../../features/exchanges/types'
import {
	formatMonthLabel,
	getCurrentMonthKey,
	getLatestExchangeMonthKey,
	getMonthKey,
	matchesExchangeSearch,
	sortExchangeRecords,
	validateExchangeDraft,
} from '../../features/exchanges/utils'
import { exportRowsToExcelFile, readFirstSheetRows } from '../../lib/xlsx'

export function ExchangesPage() {
	const { data: records = [], isLoading } = useExchangeRecordsQuery()
	const createMutation = useCreateExchangeRecordMutation()
	const updateMutation = useUpdateExchangeRecordMutation()
	const completeMutation = useCompleteExchangeRecordMutation()
	const deleteMutation = useDeleteExchangeRecordMutation()
	const replaceMutation = useReplaceExchangeRecordsMutation()

	const [selectedMonth, setSelectedMonth] = useState('')
	const [searchValue, setSearchValue] = useState('')
	const deferredSearch = useDeferredValue(searchValue)
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [editingRecord, setEditingRecord] = useState<ExchangeRecord | null>(null)
	const [formError, setFormError] = useState('')
	const [feedback, setFeedback] = useState('')
	const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'success' | 'warning'>('neutral')

	const importInputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		if (selectedMonth) return
		setSelectedMonth(getLatestExchangeMonthKey(records) || getCurrentMonthKey())
	}, [records, selectedMonth])

	const activeMonth = selectedMonth || getCurrentMonthKey()
	const monthRecords = useMemo(
		() => sortExchangeRecords(records.filter(record => getMonthKey(record.plannedDate) === activeMonth)),
		[activeMonth, records]
	)
	const filteredRecords = useMemo(() => {
		const source = deferredSearch.trim() ? records : monthRecords
		return sortExchangeRecords(source.filter(record => matchesExchangeSearch(record, deferredSearch)))
	}, [deferredSearch, monthRecords, records])

	const stats = useMemo(() => {
		return filteredRecords.reduce(
			(summary, record) => {
				summary.visible += 1
				if (record.status === 'done') {
					summary.done += 1
				} else {
					summary.pending += 1
				}
				return summary
			},
			{ visible: 0, pending: 0, done: 0 }
		)
	}, [filteredRecords])

	const monthLabel = formatMonthLabel(activeMonth)
	const summaryText = deferredSearch.trim()
		? `Wyniki wyszukiwania: ${filteredRecords.length} z ${records.length} wpisow na stronie wymian.`
		: monthRecords.length > 0
			? `${monthLabel} - widoczne wymiany: ${monthRecords.length} z ${records.length} w calej bazie.`
			: `${monthLabel} - brak wpisow w tym miesiacu.`

	const openCreateDrawer = () => {
		setEditingRecord(null)
		setFormError('')
		setDrawerOpen(true)
	}

	const openEditDrawer = (record: ExchangeRecord) => {
		setEditingRecord(record)
		setFormError('')
		setDrawerOpen(true)
	}

	const closeDrawer = () => {
		setDrawerOpen(false)
		setEditingRecord(null)
		setFormError('')
	}

	const handleSubmit = async (draft: ExchangeDraft, recordId?: string) => {
		const nextError = validateExchangeDraft(draft, records, recordId)
		if (nextError) {
			setFormError(nextError)
			return
		}

		if (recordId) {
			await updateMutation.mutateAsync({ recordId, draft })
		} else {
			await createMutation.mutateAsync(draft)
		}

		closeDrawer()
	}

	const handleExport = async () => {
		if (monthRecords.length === 0) {
			setFeedbackTone('warning')
			setFeedback(`Nic nie wyladowalo w eksporcie za ${monthLabel}. Ten miesiac jest pusty.`)
			return
		}

		try {
			setFeedback('')
			await exportRowsToExcelFile(buildExchangeExportRows(monthRecords), {
				filename: `wymiany_${activeMonth}.xlsx`,
				sheetName: 'Wymiany',
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
			const { importedRecords, mergedRecords, skippedCount } = prepareImportedExchangeRecords(rows, records)

			if (importedRecords.length === 0) {
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
					? `Zaimportowac ${importedRecords.length} wpisow? Pomine ${skippedCount} duplikatow lub niepelnych wierszy.`
					: `Zaimportowac ${importedRecords.length} wpisow z Excela?`
			)
			if (!shouldImport) return

			await replaceMutation.mutateAsync(mergedRecords)

			const importedMonths = importedRecords
				.map(record => getMonthKey(record.plannedDate))
				.filter(Boolean)
				.sort()
			const latestImportedMonth = importedMonths[importedMonths.length - 1]
			if (latestImportedMonth) {
				startTransition(() => {
					setSelectedMonth(latestImportedMonth)
				})
			}

			setFeedbackTone('success')
			setFeedback(`Dodano ${importedRecords.length} nowych wpisow wymian z pliku Excel.`)
		} catch (error) {
			setFeedbackTone('warning')
			setFeedback(error instanceof Error ? error.message : 'Nie udalo sie zaimportowac planu wymian.')
		}
	}

	return (
		<div className="page-stack">
			<PageIntro
				eyebrow="Drugi modul w React"
				title="Wymiana sprzetu"
				description="Ten modul jest juz przepisany na React z filtrem miesiaca, wyszukiwarka, drawerem i finalizacja wymiany, ktora aktualizuje tez dane w monitoringu."
				actions={
					<div className="page-actions">
						<label className="search-input">
							<span>Miesiac</span>
							<input
								type="month"
								value={activeMonth}
								onChange={event => {
									startTransition(() => {
										setSelectedMonth(event.target.value)
									})
								}}
							/>
						</label>
						<label className="search-input">
							<span>Szukaj</span>
							<input
								type="search"
								value={searchValue}
								onChange={event => {
									startTransition(() => {
										setSearchValue(event.target.value)
									})
								}}
								placeholder="Pracownik, data, SN, notatka"
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
							Zaplanuj wymiane
						</button>
					</div>
				}
			/>

			<ExchangeStats
				visible={stats.visible}
				month={monthRecords.length}
				pending={stats.pending}
				done={stats.done}
			/>

			<section className="data-card month-summary-card">
				<p className="month-summary-card__label">Podsumowanie widoku</p>
				<strong>{monthLabel}</strong>
				<span>{summaryText}</span>
				{feedback ? (
					<p className={`helper-note${feedbackTone === 'warning' ? ' is-warning' : feedbackTone === 'success' ? ' is-success' : ''}`}>
						{feedback}
					</p>
				) : null}
			</section>

			{isLoading ? (
				<section className="data-card data-card--empty">
					<h3>Ladowanie</h3>
					<p>Pobieram dane modulu wymian sprzetu.</p>
				</section>
			) : (
				<ExchangeTable
					records={filteredRecords}
					onEdit={openEditDrawer}
					onComplete={recordId => {
						const shouldComplete = window.confirm('Sfinalizowac te wymiane i zaktualizowac monitoring?')
						if (!shouldComplete) return
						void completeMutation.mutateAsync(recordId)
					}}
					onDelete={recordId => {
						const shouldDelete = window.confirm('Usunac ten wpis z planu wymian?')
						if (!shouldDelete) return
						void deleteMutation.mutateAsync(recordId)
					}}
				/>
			)}

			<ExchangeDrawer
				isOpen={drawerOpen}
				record={editingRecord}
				isSubmitting={createMutation.isPending || updateMutation.isPending}
				errorMessage={formError}
				onClose={closeDrawer}
				onSubmit={handleSubmit}
			/>
		</div>
	)
}
