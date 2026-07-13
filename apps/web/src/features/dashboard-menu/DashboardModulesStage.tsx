import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { AppModuleDefinition, MigrationState } from '../../data/modules'

import { useDashboardModuleOrder } from './hooks'
import { buildOrderedModuleList } from './utils'

function moveModuleToTarget(modules: AppModuleDefinition[], currentOrder: string[], sourceId: string, targetId: string) {
	const orderedIds = buildOrderedModuleList(modules, currentOrder).map(module => module.id)
	const sourceIndex = orderedIds.indexOf(sourceId)
	const targetIndex = orderedIds.indexOf(targetId)

	if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
		return orderedIds
	}

	const nextOrder = [...orderedIds]
	nextOrder.splice(sourceIndex, 1)
	nextOrder.splice(targetIndex, 0, sourceId)
	return nextOrder
}

function moveModuleByStep(modules: AppModuleDefinition[], currentOrder: string[], moduleId: string, step: number) {
	const orderedIds = buildOrderedModuleList(modules, currentOrder).map(module => module.id)
	const currentIndex = orderedIds.indexOf(moduleId)
	if (currentIndex === -1) return orderedIds

	const nextIndex = currentIndex + step
	if (nextIndex < 0 || nextIndex >= orderedIds.length) return orderedIds

	const nextOrder = [...orderedIds]
	nextOrder.splice(currentIndex, 1)
	nextOrder.splice(nextIndex, 0, moduleId)
	return nextOrder
}

type DashboardModulesStageProps = {
	activeUserId: string
	moduleInsights: Record<string, { detail: string; summary: string }>
	modules: AppModuleDefinition[]
	migrationLabelByState: Record<MigrationState, string>
	sectionId?: string
}

export function DashboardModulesStage({
	activeUserId,
	moduleInsights,
	modules,
	migrationLabelByState,
	sectionId,
}: DashboardModulesStageProps) {
	const { orderedItems, persistOrder } = useDashboardModuleOrder(modules, activeUserId)
	const [isEditing, setIsEditing] = useState(false)
	const [draftOrder, setDraftOrder] = useState<string[]>(() => orderedItems.map(module => module.id))
	const [draggedModuleId, setDraggedModuleId] = useState('')
	const [dropTargetId, setDropTargetId] = useState('')
	const [feedback, setFeedback] = useState('')

	const orderedModuleIds = useMemo(() => orderedItems.map(module => module.id), [orderedItems])
	const orderedModuleIdsKey = useMemo(() => orderedModuleIds.join('::'), [orderedModuleIds])

	useEffect(() => {
		if (isEditing) return
		setDraftOrder(orderedModuleIds)
	}, [isEditing, orderedModuleIds, orderedModuleIdsKey])

	useEffect(() => {
		if (!isEditing) return

		setDraftOrder(orderedModuleIds)
		setDraggedModuleId('')
		setDropTargetId('')
		setIsEditing(false)
	}, [activeUserId, isEditing, orderedModuleIds, orderedModuleIdsKey])

	const visibleModules = useMemo(
		() => (isEditing ? buildOrderedModuleList(modules, draftOrder) : orderedItems),
		[draftOrder, isEditing, modules, orderedItems]
	)

	const enterEditMode = () => {
		if (!activeUserId) {
			setFeedback('Wybierz osobe robocza, aby zapisac wlasny uklad modulow dashboardu.')
			return
		}

		setFeedback('')
		setDraftOrder(orderedModuleIds)
		setIsEditing(true)
	}

	const cancelEditMode = () => {
		setDraftOrder(orderedModuleIds)
		setDraggedModuleId('')
		setDropTargetId('')
		setIsEditing(false)
	}

	const saveEditMode = () => {
		persistOrder(draftOrder)
		setDraggedModuleId('')
		setDropTargetId('')
		setIsEditing(false)
	}

	return (
		<section
			id={sectionId}
			className={`dashboard-modules-stage${isEditing ? ' is-editing' : ''}`}
			aria-labelledby="dashboard-modules-stage-title">
			<div className="dashboard-modules-stage__toolbar">
				<div className="dashboard-home-section-head">
					<p className="month-summary-card__label">Moduly pracy</p>
					<strong id="dashboard-modules-stage-title">Twoj uklad dashboardu</strong>
					<span>
						Uklad zapisuje sie dla wybranej osoby roboczej i odswieza tez gorna nawigacje, dzieki czemu
						dashboard mozna ustawic pod swoj rytm pracy.
					</span>
				</div>

				<div className="dashboard-modules-stage__actions">
					{isEditing ? (
						<>
							<button type="button" className="button-secondary" onClick={cancelEditMode}>
								Anuluj
							</button>
							<button type="button" className="button-primary" onClick={saveEditMode}>
								Zapisz uklad
							</button>
						</>
					) : (
						<button type="button" className="button-secondary" onClick={enterEditMode}>
							Edytuj kolejnosc
						</button>
					)}
				</div>
			</div>

			{feedback ? <p className="helper-note is-warning">{feedback}</p> : null}

			<div className="dashboard-home-grid" aria-label="Moduly dashboardu">
				{visibleModules.map((module, index) => {
					const isDragged = draggedModuleId === module.id
					const isDropTarget = dropTargetId === module.id && draggedModuleId && draggedModuleId !== module.id

					return (
						<article
							key={module.id}
							className={`dashboard-home-card dashboard-module-card${isEditing ? ' is-editing' : ''}${isDragged ? ' is-dragging' : ''}${isDropTarget ? ' is-drop-target' : ''}`}
							draggable={isEditing}
							onDragStart={event => {
								if (!isEditing) return
								setDraggedModuleId(module.id)
								setDropTargetId('')
								event.dataTransfer.effectAllowed = 'move'
								event.dataTransfer.setData('text/plain', module.id)
							}}
							onDragEnd={() => {
								setDraggedModuleId('')
								setDropTargetId('')
							}}
							onDragOver={event => {
								if (!isEditing) return
								event.preventDefault()
								event.dataTransfer.dropEffect = 'move'
								setDropTargetId(module.id)
							}}
							onDragLeave={() => {
								if (!isEditing) return
								setDropTargetId(currentId => (currentId === module.id ? '' : currentId))
							}}
							onDrop={event => {
								if (!isEditing) return
								event.preventDefault()
								const sourceId = draggedModuleId || event.dataTransfer.getData('text/plain')
								if (!sourceId || sourceId === module.id) return

								setDraftOrder(currentOrder => moveModuleToTarget(modules, currentOrder, sourceId, module.id))
								setDropTargetId('')
							}}>
							<div className="dashboard-home-card__top">
								<p>{module.kicker}</p>
								<span className={`status-pill status-pill--${module.state}`}>
									{migrationLabelByState[module.state]}
								</span>
							</div>
							<h3>{module.title}</h3>
							<p>{module.description}</p>
							<div className="dashboard-home-card__summary">
								<strong>{moduleInsights[module.id].summary}</strong>
								<span>{moduleInsights[module.id].detail}</span>
							</div>

							{isEditing ? (
								<div className="dashboard-module-card__editor">
									<span className="dashboard-module-card__hint">
										Przeciagnij kafelek albo uzyj przyciskow, aby ustawic kolejnosc.
									</span>
									<div className="dashboard-module-card__editor-actions">
										<button
											type="button"
											className="dashboard-module-card__move-btn"
											disabled={index === 0}
											onClick={() => {
												setDraftOrder(currentOrder => moveModuleByStep(modules, currentOrder, module.id, -1))
											}}>
											Wyzej
										</button>
										<button
											type="button"
											className="dashboard-module-card__move-btn"
											disabled={index === visibleModules.length - 1}
											onClick={() => {
												setDraftOrder(currentOrder => moveModuleByStep(modules, currentOrder, module.id, 1))
											}}>
											Nizej
										</button>
									</div>
								</div>
							) : (
								<Link className="dashboard-home-card__link" to={module.path}>
									Otworz modul
								</Link>
							)}
						</article>
					)
				})}
			</div>
		</section>
	)
}
