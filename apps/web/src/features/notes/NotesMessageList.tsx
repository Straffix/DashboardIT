import type { AppSessionUser } from '../session/types'

import { NotesMessageActions } from './NotesMessageActions'
import type { NotesMessage } from './types'
import {
	canManageNotesMessage,
	formatNotesDateTimeLabel,
	getUserInitials,
	resolveNotesAuthor,
} from './utils'

type NotesMessageListProps = {
	currentUser: AppSessionUser | null
	isBusy: boolean
	isLoading: boolean
	messages: NotesMessage[]
	onDelete: (message: NotesMessage) => void
	onEdit: (message: NotesMessage) => void
	onTogglePinned: (message: NotesMessage) => void
	users: AppSessionUser[]
}

export function NotesMessageList({
	currentUser,
	isBusy,
	isLoading,
	messages,
	onDelete,
	onEdit,
	onTogglePinned,
	users,
}: NotesMessageListProps) {
	if (isLoading) {
		return (
			<div className="notes-empty-state">
				<strong>Ladowanie czatu</strong>
				<p>Pobieram wiadomosci i przypiecia dla zespolu.</p>
			</div>
		)
	}

	if (!currentUser) {
		return (
			<div className="notes-empty-state">
				<strong>Brak aktywnej osoby</strong>
				<p>Wybierz osobe robocza, aby zobaczyc historie czatu, pisac wiadomosci i zarzadzac przypieciami.</p>
			</div>
		)
	}

	if (messages.length === 0) {
		return (
			<div className="notes-empty-state">
				<strong>Brak wiadomosci</strong>
				<p>Napisz pierwszy wpis dla zespolu, a pojawi sie tutaj po lewej stronie.</p>
			</div>
		)
	}

	return (
		<div className="notes-chat-list" aria-live="polite">
			{messages.map(message => {
				const author = resolveNotesAuthor(message, users)
				const isMine = canManageNotesMessage(message, currentUser)
				const isEdited = message.updatedAt !== message.createdAt

				return (
					<article
						key={message.id}
						className={`notes-chat-message${isMine ? ' is-mine' : ''}${message.isPinned ? ' is-pinned' : ''}`}>
						<div className="notes-message-bubble">
							<div className="notes-message-meta">
								<span className="notes-avatar notes-avatar--sm" aria-hidden="true">
									{getUserInitials(author.fullName)}
								</span>
								<span className="notes-message-author">{author.fullName}</span>
								<time dateTime={message.createdAt}>{formatNotesDateTimeLabel(message.createdAt)}</time>
								{isEdited ? <span className="notes-message-flag">edytowano</span> : null}
								{message.isPinned ? <span className="notes-message-flag is-pinned">przypiete</span> : null}
							</div>
							<p className="notes-message-content">{message.content}</p>
						</div>

						<NotesMessageActions
							compact
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
