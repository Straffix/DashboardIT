import type { AppSessionUser } from '../session/types'

import type { NotesMessage } from './types'
import { canManageNotesMessage } from './utils'

type NotesMessageActionsProps = {
	compact?: boolean
	currentUser: AppSessionUser | null
	isBusy: boolean
	message: NotesMessage
	onDelete: (message: NotesMessage) => void
	onEdit: (message: NotesMessage) => void
	onTogglePinned: (message: NotesMessage) => void
}

export function NotesMessageActions({
	compact = false,
	currentUser,
	isBusy,
	message,
	onDelete,
	onEdit,
	onTogglePinned,
}: NotesMessageActionsProps) {
	if (!currentUser) return null

	const canManage = canManageNotesMessage(message, currentUser)

	return (
		<div className={`notes-message-actions${compact ? ' is-compact' : ''}`}>
			<button
				type="button"
				className="notes-inline-action"
				disabled={isBusy}
				onClick={() => {
					onTogglePinned(message)
				}}>
				{message.isPinned ? 'Odepnij' : 'Przypnij'}
			</button>

			{canManage ? (
				<>
					<button
						type="button"
						className="notes-inline-action"
						disabled={isBusy}
						onClick={() => {
							onEdit(message)
						}}>
						Edytuj
					</button>
					<button
						type="button"
						className="notes-inline-action is-danger"
						disabled={isBusy}
						onClick={() => {
							onDelete(message)
						}}>
						Usun
					</button>
				</>
			) : null}
		</div>
	)
}
