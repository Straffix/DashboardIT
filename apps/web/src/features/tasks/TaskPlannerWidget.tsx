import type { FormEvent } from 'react'
import { startTransition, useEffect, useMemo, useState } from 'react'

import type { AppSessionUser } from '../session/types'

import { useCreateDashboardTaskMutation, useDashboardTasksQuery, useDeleteDashboardTaskMutation } from './hooks'
import type { DashboardTaskPriority, DashboardTaskRecord } from './types'
import { useTaskReminders } from './useTaskReminders'
import {
	buildTaskCalendarCells,
	compareTasks,
	formatTaskDateLabel,
	formatTaskMonthLabel,
	formatTaskPreviewTime,
	formatTaskDateKey,
	getTaskDateTime,
	getTodayTaskDateKey,
	TASK_PRIORITY_META,
} from './utils'

const WEEKDAY_LABELS = ['Pn', 'Wt', 'Sr', 'Cz', 'Pt', 'Sb', 'Nd']
const MINUTE_OPTIONS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

type TaskPlannerWidgetProps = {
	activeUser: AppSessionUser | null
}

function getTaskCountLabel(taskCount: number) {
	if (taskCount === 1) return '1 zadanie'
	const lastDigit = taskCount % 10
	const lastTwoDigits = taskCount % 100
	if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) {
		return `${taskCount} zadania`
	}

	return `${taskCount} zadan`
}

export function TaskPlannerWidget({ activeUser }: TaskPlannerWidgetProps) {
	const todayDateKey = getTodayTaskDateKey()
	const [selectedDate, setSelectedDate] = useState(todayDateKey)
	const [calendarCursor, setCalendarCursor] = useState(() => new Date())
	const [isOpen, setIsOpen] = useState(false)
	const [draftTitle, setDraftTitle] = useState('')
	const [draftDate, setDraftDate] = useState(todayDateKey)
	const [draftHour, setDraftHour] = useState('')
	const [draftMinute, setDraftMinute] = useState('')
	const [draftPriority, setDraftPriority] = useState<DashboardTaskPriority>('high')
	const [draftDescription, setDraftDescription] = useState('')
	const [feedback, setFeedback] = useState('')

	const { data: tasks = [], isLoading } = useDashboardTasksQuery()
	const createTaskMutation = useCreateDashboardTaskMutation()
	const deleteTaskMutation = useDeleteDashboardTaskMutation()

	const tasksByDate = useMemo(() => {
		return tasks.reduce<Record<string, DashboardTaskRecord[]>>((accumulator, task) => {
			const currentTasks = accumulator[task.date] || []
			accumulator[task.date] = [...currentTasks, task].sort(compareTasks)
			return accumulator
		}, {})
	}, [tasks])

	const todayTasks = tasksByDate[todayDateKey] || []
	const selectedDayTasks = tasksByDate[selectedDate] || []
	const upcomingTask = [...tasks]
		.filter(task => getTaskDateTime(task).getTime() >= Date.now())
		.sort(compareTasks)[0]
	const currentMonthTaskCount = tasks.filter(task => String(task.date || '').slice(0, 7) === formatTaskDateKey(calendarCursor).slice(0, 7)).length
	const calendarCells = buildTaskCalendarCells(calendarCursor, selectedDate)

	const { dismissToast, requestPermission, toasts } = useTaskReminders(tasks, task => {
		startTransition(() => {
			setSelectedDate(task.date)
			setDraftDate(task.date)
			setCalendarCursor(new Date(`${task.date}T12:00:00`))
			setIsOpen(true)
		})
	})

	const isBusy = createTaskMutation.isPending || deleteTaskMutation.isPending

	useEffect(() => {
		if (!isOpen) return

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return
			setIsOpen(false)
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen])

	const handleRequireUser = () => {
		setFeedback('Wybierz osobe robocza, aby dodawac lub usuwac zadania.')
	}

	const handleOpenPlanner = () => {
		setFeedback('')
		setIsOpen(true)
	}

	const handleClosePlanner = () => {
		setIsOpen(false)
	}

	const resetDraft = (nextDate = selectedDate) => {
		setDraftTitle('')
		setDraftDate(nextDate)
		setDraftHour('')
		setDraftMinute('')
		setDraftPriority('high')
		setDraftDescription('')
	}

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!activeUser) {
			handleRequireUser()
			return
		}

		try {
			setFeedback('')
			const nextTime = draftHour && draftMinute ? `${draftHour}:${draftMinute}` : ''
			await createTaskMutation.mutateAsync({
				title: draftTitle,
				date: draftDate,
				time: nextTime,
				priority: draftPriority,
				description: draftDescription,
			})
			await requestPermission()

			startTransition(() => {
				setSelectedDate(draftDate)
				setCalendarCursor(new Date(`${draftDate}T12:00:00`))
			})
			resetDraft(draftDate)
		} catch (error) {
			setFeedback(error instanceof Error ? error.message : 'Nie udalo sie zapisac zadania.')
		}
	}

	const handleDelete = async (taskId: string) => {
		if (!activeUser) {
			handleRequireUser()
			return
		}

		const shouldDelete = window.confirm('Usunac to zadanie z planera?')
		if (!shouldDelete) return

		try {
			setFeedback('')
			await deleteTaskMutation.mutateAsync(taskId)
		} catch (error) {
			setFeedback(error instanceof Error ? error.message : 'Nie udalo sie usunac zadania.')
		}
	}

	return (
		<>
			<section className="data-card planner-widget" aria-labelledby="dashboard-planner-title">
				<div className="planner-widget__head">
					<div className="dashboard-home-section-head">
						<p className="month-summary-card__label">Planer dnia</p>
						<strong id="dashboard-planner-title">Zadania i kalendarz</strong>
						<span>React przejmuje preview dnia, kalendarz miesiaca oraz dodawanie i usuwanie zadan bez otwierania legacy modala.</span>
					</div>

					<button type="button" className="button-secondary" onClick={handleOpenPlanner}>
						Otworz planer
					</button>
				</div>

				<div className="planner-widget__summary">
					<article className="planner-summary-card">
						<p className="month-summary-card__label">Dzisiaj</p>
						<strong>{todayTasks.length}</strong>
						<span>{getTaskCountLabel(todayTasks.length)}</span>
					</article>
					<article className="planner-summary-card">
						<p className="month-summary-card__label">Najblizsze</p>
						<strong>{upcomingTask ? formatTaskPreviewTime(upcomingTask.time) : '--:--'}</strong>
						<span>{upcomingTask ? upcomingTask.title : 'Brak kolejnych zadan'}</span>
					</article>
					<article className="planner-summary-card">
						<p className="month-summary-card__label">Ten miesiac</p>
						<strong>{currentMonthTaskCount}</strong>
						<span>{formatTaskMonthLabel(calendarCursor)}</span>
					</article>
				</div>

				{feedback ? <p className="helper-note is-warning">{feedback}</p> : null}

				<div className="planner-preview-list" aria-label="Podglad zadan na dzis">
					{isLoading ? (
						<p className="dashboard-home-empty">Laduje zadania planera.</p>
					) : todayTasks.length > 0 ? (
						todayTasks.slice(0, 4).map(task => (
							<article key={task.id} className="planner-preview-item">
								<div className="planner-preview-item__row">
									<strong>{task.title}</strong>
									<span className={`status-pill status-pill--${TASK_PRIORITY_META[task.priority].tone}`}>{task.time}</span>
								</div>
								<p>{task.description || 'Bez dodatkowego opisu.'}</p>
							</article>
						))
					) : (
						<p className="dashboard-home-empty">
							Brak zadan na dzis. Otworz planer i dodaj pierwszy wpis do kalendarza.
						</p>
					)}
				</div>
			</section>

			{isOpen ? (
				<div className="planner-modal-shell" role="presentation">
					<button type="button" className="planner-modal-backdrop" aria-label="Zamknij planer" onClick={handleClosePlanner} />
					<section className="planner-modal-card" role="dialog" aria-modal="true" aria-labelledby="planner-modal-title">
						<div className="planner-modal-card__head">
							<div className="planner-modal-card__copy">
								<p className="month-summary-card__label">Planer dnia</p>
								<h3 id="planner-modal-title">Zadania i kalendarz</h3>
								<span>
									{activeUser
										? `Pracujesz jako ${activeUser.fullName}. Zadania sa wspolne dla calego dashboardu.`
										: 'Mozesz podgladac kalendarz, ale do zmian potrzebna jest wybrana osoba robocza.'}
								</span>
							</div>
							<button type="button" className="button-secondary" onClick={handleClosePlanner}>
								Zamknij
							</button>
						</div>

						<div className="planner-modal-layout">
							<section className="planner-calendar-panel" aria-label="Kalendarz zadan">
								<div className="planner-calendar-head">
									<button
										type="button"
										className="planner-calendar-nav"
										aria-label="Poprzedni miesiac"
										onClick={() => {
											startTransition(() => {
												setCalendarCursor(currentCursor => new Date(currentCursor.getFullYear(), currentCursor.getMonth() - 1, 1))
											})
										}}>
										Poprzedni
									</button>
									<strong>{formatTaskMonthLabel(calendarCursor)}</strong>
									<button
										type="button"
										className="planner-calendar-nav"
										aria-label="Nastepny miesiac"
										onClick={() => {
											startTransition(() => {
												setCalendarCursor(currentCursor => new Date(currentCursor.getFullYear(), currentCursor.getMonth() + 1, 1))
											})
										}}>
										Nastepny
									</button>
								</div>

								<div className="planner-calendar-weekdays">
									{WEEKDAY_LABELS.map(label => (
										<span key={label}>{label}</span>
									))}
								</div>

								<div className="planner-calendar-grid">
									{calendarCells.map(cell => {
										const dayTasks = tasksByDate[cell.dateKey] || []
										return (
											<button
												key={cell.dateKey}
												type="button"
												className={`planner-calendar-day${cell.isCurrentMonth ? ' is-current-month' : ''}${cell.isSelected ? ' is-selected' : ''}${cell.isToday ? ' is-today' : ''}`}
												disabled={!cell.isCurrentMonth}
												onClick={() => {
													startTransition(() => {
														setSelectedDate(cell.dateKey)
														setDraftDate(cell.dateKey)
													})
												}}>
												<span className="planner-calendar-day__number">{cell.dayNumber}</span>
												<span className="planner-calendar-day__dots">
													{dayTasks.slice(0, 3).map(task => (
														<span
															key={`${cell.dateKey}-${task.id}`}
															className={`planner-calendar-day__dot planner-calendar-day__dot--${task.priority}`}
														/>
													))}
												</span>
											</button>
										)
									})}
								</div>
							</section>

							<section className="planner-form-panel">
								<form className="planner-form" onSubmit={handleSubmit}>
									<label className="field">
										<span>Tytul</span>
										<input
											type="text"
											maxLength={80}
											value={draftTitle}
											placeholder="Np. Przeglad ticketow"
											disabled={!activeUser || isBusy}
											onChange={event => {
												setDraftTitle(event.target.value)
											}}
										/>
									</label>

									<div className="planner-form__row">
										<label className="field">
											<span>Data</span>
											<input
												type="date"
												value={draftDate}
												disabled={!activeUser || isBusy}
												onChange={event => {
													const nextDate = event.target.value
													setDraftDate(nextDate)
													setSelectedDate(nextDate)
													setCalendarCursor(new Date(`${nextDate}T12:00:00`))
												}}
											/>
										</label>

										<div className="planner-time-picker">
											<label className="field">
												<span>Godz.</span>
												<select
													value={draftHour}
													disabled={!activeUser || isBusy}
													onChange={event => {
														setDraftHour(event.target.value)
													}}>
													<option value="">--</option>
													{Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0')).map(hour => (
														<option key={hour} value={hour}>
															{hour}
														</option>
													))}
												</select>
											</label>

											<label className="field">
												<span>Min.</span>
												<select
													value={draftMinute}
													disabled={!activeUser || isBusy}
													onChange={event => {
														setDraftMinute(event.target.value)
													}}>
													<option value="">--</option>
													{MINUTE_OPTIONS.map(minute => (
														<option key={minute} value={minute}>
															{minute}
														</option>
													))}
												</select>
											</label>
										</div>
									</div>

									<label className="field">
										<span>Priorytet</span>
										<select
											value={draftPriority}
											disabled={!activeUser || isBusy}
											onChange={event => {
												setDraftPriority(event.target.value as DashboardTaskPriority)
											}}>
											<option value="high">Wysoki</option>
											<option value="medium">Sredni</option>
											<option value="low">Niski</option>
										</select>
									</label>

									<label className="field">
										<span>Opis</span>
										<textarea
											rows={4}
											value={draftDescription}
											placeholder="Krotki opis zadania"
											disabled={!activeUser || isBusy}
											onChange={event => {
												setDraftDescription(event.target.value)
											}}
										/>
									</label>

									<div className="planner-form__actions">
										<button type="submit" className="button-primary" disabled={!activeUser || isBusy}>
											{createTaskMutation.isPending ? 'Zapisuje...' : 'Dodaj zadanie'}
										</button>
										<button
											type="button"
											className="button-secondary"
											disabled={isBusy}
											onClick={() => {
												resetDraft(selectedDate)
												setFeedback('')
											}}>
											Wyczysc formularz
										</button>
									</div>
								</form>

								<div className="planner-agenda">
									<div className="planner-agenda__head">
										<div>
											<p className="month-summary-card__label">Agenda dnia</p>
											<strong>{formatTaskDateLabel(selectedDate)}</strong>
										</div>
										<span className="status-pill status-pill--neutral">{selectedDayTasks.length}</span>
									</div>

									{selectedDayTasks.length > 0 ? (
										<div className="planner-agenda__list">
											{selectedDayTasks.map(task => (
												<article key={task.id} className={`planner-agenda-item planner-agenda-item--${task.priority}`}>
													<div className="planner-agenda-item__main">
														<div className="planner-agenda-item__row">
															<span className={`status-pill status-pill--${TASK_PRIORITY_META[task.priority].tone}`}>{TASK_PRIORITY_META[task.priority].label}</span>
															<strong>{task.time}</strong>
														</div>
														<h4>{task.title}</h4>
														<p>{task.description || 'Bez dodatkowego opisu.'}</p>
													</div>
													<button
														type="button"
														className="button-secondary planner-agenda-item__delete"
														disabled={!activeUser || isBusy}
														onClick={() => {
															void handleDelete(task.id)
														}}>
														Usun
													</button>
												</article>
											))}
										</div>
									) : (
										<p className="dashboard-home-empty">Brak zadan na wybrany dzien.</p>
									)}
								</div>
							</section>
						</div>
					</section>
				</div>
			) : null}

			{toasts.length > 0 ? (
				<div className="planner-toast-stack" aria-live="polite" aria-atomic="false">
					{toasts.map(toast => (
						<article key={toast.id} className={`planner-toast planner-toast--${toast.priority}`}>
							<div className="planner-toast__copy">
								<strong>{toast.title}</strong>
								<span>{toast.description}</span>
							</div>
							<button
								type="button"
								className="planner-toast__close"
								aria-label="Zamknij przypomnienie"
								onClick={() => {
									dismissToast(toast.id)
								}}>
								Zamknij
							</button>
						</article>
					))}
				</div>
			) : null}
		</>
	)
}
