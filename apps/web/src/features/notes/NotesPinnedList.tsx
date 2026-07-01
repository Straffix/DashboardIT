import type { AppSessionUser } from '../session/types'

import { NotesMessageActions } from './NotesMessageActions'
import type { NotesMessage } from './types'
import { formatNotesDateTimeLabel, getUserInitials, resolveNotesAuthor } from './utils'

type NotesPinnedListProps = {
	currentUser: AppSessionUser | null
	isBusy: boolean
	messages: NotesMessage[]
	onDelete: (message: NotesMessage) => void
	onEdit: (message: NotesMessage) => void
	onTogglePinned: (message: NotesMessage) => void
	users: AppSessionUser[]
}

export function NotesPinnedList({
	currentUser,
	isBusy,
	messages,
	onDelete,
	onEdit,
	onTogglePinned,
	users,
}: NotesPinnedListProps) {
	if (messages.length === 0) {
		return (
			<div className="notes-empty-state">
				<strong>Brak przypietych wiadomosci</strong>
				<p>Przypnij wazne ustalenia, aby byly zawsze widoczne po prawej stronie.</p>
			</div>
		)
	}

	return (
		<div className="notes-pinned-list" aria-live="polite">
			{messages.map(message => {
				const author = resolveNotesAuthor(message, users)

				return (
					<article key={message.id} className="notes-pinned-card">
						<div className="notes-pinned-card__head">
							<span className="notes-avatar" aria-hidden="true">
								{getUserInitials(author.fullName)}
							</span>
							<div>
								<strong>{author.fullName}</strong>
								<span>{formatNotesDateTimeLabel(message.pinnedAt || message.updatedAt)}</span>
							</div>
						</div>

						<p className="notes-pinned-card__content">{message.content}</p>

						<NotesMessageActions
							currentUser={currentUser}
							isBusy={isBusy}
							message={message}
							onDelete={onDelete}
							onEdit={onEdit}
							onTogglePinned={onTogglePinned}
						/>
					</article>
				)
			})}
		</div>
	)
}
