import type { ChangeEvent } from 'react'
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import { PageIntro } from '../../components/PageIntro'
import { HiresDrawer } from '../../features/hires/HiresDrawer'
import { buildHireExportRows, prepareImportedHires } from '../../features/hires/excel'
import {
	useCreateHireMutation,
	useDeleteHireMutation,
	useHiresQuery,
	useReplaceHiresMutation,
	useSaveHireRecordMutation,
	useUpdateHireMutation,
} from '../../features/hires/hooks'
import { HiresStats } from '../../features/hires/HiresStats'
import { HiresTable } from '../../features/hires/HiresTable'
import type { HireAccessoryId, HireDraft, HireInlineEditableField, HireRecord } from '../../features/hires/types'
import {
	formatMonthLabel,
	getCurrentMonthKey,
	getHireStatusTone,
	getLatestHireMonthKey,
	getMonthKey,
	matchesHireSearch,
	normalizeHireRecord,
	sortHires,
	validateHireDraft,
} from '../../features/hires/utils'
import { exportRowsToExcelFile, readFirstSheetRows } from '../../lib/xlsx'

export function HiresPage() {
	const { data: records = [], isLoading } = useHiresQuery()
	const createMutation = useCreateHireMutation()
	const updateMutation = useUpdateHireMutation()
	const deleteMutation = useDeleteHireMutation()
	const saveRecordMutation = useSaveHireRecordMutation()
	const replaceMutation = useReplaceHiresMutation()

	const [selectedMonth, setSelectedMonth] = useState('')
	const [searchValue, setSearchValue] = useState('')
	const deferredSearch = useDeferredValue(searchValue)
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [editingRecord, setEditingRecord] = useState<HireRecord | null>(null)
	const [formError, setFormError] = useState('')
	const [feedback, setFeedback] = useState('')
	const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'success' | 'warning'>('neutral')

	const importInputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		if (selectedMonth) return
		setSelectedMonth(getLatestHireMonthKey(records) || getCurrentMonthKey())
	}, [records, selectedMonth])

	const activeMonth = selectedMonth || getCurrentMonthKey()
	const monthRecords = useMemo(
		() => sortHires(records.filter(record => getMonthKey(record.startDate) === activeMonth)),
		[activeMonth, records]
	)
	const filteredRecords = useMemo(() => {
		const source = deferredSearch.trim() ? records : monthRecords
		return sortHires(source.filter(record => matchesHireSearch(record, deferredSearch)))
	}, [deferredSearch, monthRecords, records])

	const stats = useMemo(() => {
		return filteredRecords.reduce(
			(summary, record) => {
				summary.visible += 1
				if (getHireStatusTone(record.laptopStatus) === 'active') summary.laptopReady += 1
				if (getHireStatusTone(record.monitorStatus) === 'active') summary.monitorReady += 1
				return summary
			},
			{ visible: 0, laptopReady: 0, monitorReady: 0 }
		)
	}, [filteredRecords])

	const monthLabel = formatMonthLabel(activeMonth)
	const summaryText = deferredSearch.trim()
		? `Wyniki wyszukiwania: ${filteredRecords.length} z ${records.length} onboardingow.`
		: monthRecords.length > 0
			? `${monthLabel} - widoczne onboardingi: ${monthRecords.length} z ${records.length} w calej bazie.`
			: `${monthLabel} - brak onboardingow w tym miesiacu.`

	const openCreateDrawer = () => {
		setEditingRecord(null)
		setFormError('')
		setDrawerOpen(true)
	}

	const openEditDrawer = (record: HireRecord) => {
		setEditingRecord(record)
		setFormError('')
		setDrawerOpen(true)
	}

	const closeDrawer = () => {
		setDrawerOpen(false)
		setEditingRecord(null)
		setFormError('')
	}

	const handleSubmit = async (draft: HireDraft, recordId?: string) => {
		const nextError = validateHireDraft(draft, records, recordId)
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

	const handleInlineUpdate = (record: HireRecord, fieldId: HireInlineEditableField, value: string) => {
		const nextRecord = normalizeHireRecord({
			...record,
			[fieldId]: value,
			updatedAt: new Date().toISOString(),
		})

		void saveRecordMutation.mutateAsync(nextRecord)
	}

	const handleTogglePreparedAccessory = (record: HireRecord, accessoryId: HireAccessoryId) => {
		if (!record[accessoryId]) return

		const preparedAccessories = new Set(record.preparedAccessories)
		if (preparedAccessories.has(accessoryId)) {
			preparedAccessories.delete(accessoryId)
		} else {
			preparedAccessories.add(accessoryId)
		}

		const nextRecord = normalizeHireRecord({
			...record,
			preparedAccessories: Array.from(preparedAccessories),
			updatedAt: new Date().toISOString(),
		})

		void saveRecordMutation.mutateAsync(nextRecord)
	}

	const isAnyMutationPending =
		createMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending ||
		saveRecordMutation.isPending ||
		replaceMutation.isPending

	const handleExport = async () => {
		if (monthRecords.length === 0) {
			setFeedbackTone('warning')
			setFeedback(`Arkusz za ${monthLabel} pozostal pusty. Zmien miesiac albo dodaj wpis.`)
			return
		}

		try {
			setFeedback('')
			await exportRowsToExcelFile(buildHireExportRows(monthRecords), {
				filename: `zatrudnienia_${activeMonth}.xlsx`,
				sheetName: 'Zatrudnienia',
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
			const { importedRecords, mergedRecords, skippedCount } = prepareImportedHires(rows, records)

			if (importedRecords.length === 0) {
				setFeedbackTone('warning')
				setFeedback(
					skippedCount > 0
						? 'Wszystkie rekordy z importu juz istnieja, powtarzaja sie w pliku albo sa niepelne.'
						: 'Plik nie zawiera poprawnych, nowych wpisow do dodania.'
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
				.map(record => getMonthKey(record.startDate))
				.filter(Boolean)
				.sort()
			const latestImportedMonth = importedMonths[importedMonths.length - 1]
			if (latestImportedMonth) {
				startTransition(() => {
					setSelectedMonth(latestImportedMonth)
				})
			}

			setFeedbackTone('success')
			setFeedback(`Dodano ${importedRecords.length} nowych onboardingow z pliku Excel.`)
		} catch (error) {
			setFeedbackTone('warning')
			setFeedback(error instanceof Error ? error.message : 'Nie udalo sie zaimportowac danych nowych zatrudnien.')
		}
	}

	return (
		<div className="page-stack">
			<PageIntro
				eyebrow="Najwiekszy legacy CRUD"
				title="Nowe zatrudnienia"
				description="Ten modul nie jest juz placeholderem. Najgrubszy ekran z vanilla JS ma teraz Reactowa tabele, wyszukiwarke, filtr miesiaca i drawer do zarzadzania onboardingiem."
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
								placeholder="Uzytkownik, status, lokalizacja, akcesoria"
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
							Dodaj onboarding
						</button>
					</div>
				}
			/>

			<HiresStats
				visible={stats.visible}
				month={monthRecords.length}
				laptopReady={stats.laptopReady}
				monitorReady={stats.monitorReady}
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
					<p>Pobieram dane modulu nowych zatrudnien.</p>
				</section>
			) : (
				<HiresTable
					records={filteredRecords}
					isSaving={isAnyMutationPending}
					onEdit={openEditDrawer}
					onDelete={recordId => {
						const shouldDelete = window.confirm('Usunac ten onboarding z listy?')
						if (!shouldDelete) return
						void deleteMutation.mutateAsync(recordId)
					}}
					onInlineUpdate={handleInlineUpdate}
					onTogglePreparedAccessory={handleTogglePreparedAccessory}
				/>
			)}

			<HiresDrawer
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
