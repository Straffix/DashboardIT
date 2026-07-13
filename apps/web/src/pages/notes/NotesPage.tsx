import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { PageIntro } from '../../components/PageIntro'
import { NotesMessageList } from '../../features/notes/NotesMessageList'
import { NotesPinnedList } from '../../features/notes/NotesPinnedList'
import {
	useCreateNotesMessageMutation,
	useDeleteNotesMessageMutation,
	useNotesMessagesQuery,
	useSetNotesMessagePinnedMutation,
	useUpdateNotesMessageMutation,
} from '../../features/notes/hooks'
import { useNotesActiveViewers } from '../../features/notes/presence'
import type { NotesMessage } from '../../features/notes/types'
import { getLatestNotesUpdateLabel, getPinnedNotesMessages } from '../../features/notes/utils'
import { useAppSession } from '../../features/session/AppSessionProvider'

export function NotesPage() {
	const { activeUser, activeUserId, clearActiveUser, setActiveUserId, users } = useAppSession()
	const { data: messages = [], isLoading } = useNotesMessagesQuery()
	const createMutation = useCreateNotesMessageMutation()
	const updateMutation = useUpdateNotesMessageMutation()
	const deleteMutation = useDeleteNotesMessageMutation()
	const pinMutation = useSetNotesMessagePinnedMutation()
	const activeViewers = useNotesActiveViewers(activeUser)

	const [draftContent, setDraftContent] = useState('')
	const [editingMessageId, setEditingMessageId] = useState('')
	const [feedback, setFeedback] = useState('')

	const textareaRef = useRef<HTMLTextAreaElement | null>(null)
	const chatWindowRef = useRef<HTMLDivElement | null>(null)

	const pinnedMessages = useMemo(() => getPinnedNotesMessages(messages), [messages])
	const myMessagesCount = useMemo(() => {
		if (!activeUser) return 0
		return messages.filter(message => String(message.authorId) === String(activeUser.id)).length
	}, [activeUser, messages])

	const latestUpdateLabel = getLatestNotesUpdateLabel(messages)
	const editingMessage = messages.find(message => message.id === editingMessageId) || null
	const isBusy =
		createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || pinMutation.isPending

	useEffect(() => {
		if (!editingMessage) return
		setDraftContent(editingMessage.content)
		textareaRef.current?.focus()
	}, [editingMessage])

	useEffect(() => {
		if (!chatWindowRef.current || !activeUser) return
		chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight
	}, [activeUser, messages.length])

	const summaryText = !activeUser
		? 'Wybierz osobe robocza, aby wejsc w czat zespolu i zarzadzac wpisami.'
		: messages.length === 0
			? 'Nie ma jeszcze zadnych wiadomosci. Ten ekran jest gotowy na pierwszy wpis zespolowy.'
			: `${messages.length} wiadomosci, ${pinnedMessages.length} przypietych. Ostatnia zmiana: ${latestUpdateLabel}.`

	const resetComposer = () => {
		setEditingMessageId('')
		setDraftContent('')
	}

	const handleRequireUser = () => {
		setFeedback('Wybierz osobe robocza, aby korzystac z czatu i przypiec.')
	}

	const handleDelete = async (message: NotesMessage) => {
		if (!activeUser) {
			handleRequireUser()
			return
		}

		const shouldDelete = window.confirm('Usunac te wiadomosc z czatu i z panelu przypiec?')
		if (!shouldDelete) return

		try {
			setFeedback('')
			await deleteMutation.mutateAsync({ actor: activeUser, messageId: message.id })
			if (editingMessageId === message.id) {
				resetComposer()
			}
		} catch (error) {
			setFeedback(error instanceof Error ? error.message : 'Nie udalo sie usunac wiadomosci.')
		}
	}

	const handleTogglePinned = async (message: NotesMessage) => {
		if (!activeUser) {
			handleRequireUser()
			return
		}

		try {
			setFeedback('')
			await pinMutation.mutateAsync({
				actor: activeUser,
				isPinned: !message.isPinned,
				messageId: message.id,
			})
		} catch (error) {
			setFeedback(error instanceof Error ? error.message : 'Nie udalo sie zmienic przypiecia wiadomosci.')
		}
	}

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!activeUser) {
			handleRequireUser()
			return
		}

		try {
			setFeedback('')

			if (editingMessageId) {
				await updateMutation.mutateAsync({
					actor: activeUser,
					content: draftContent,
					messageId: editingMessageId,
				})
			} else {
				await createMutation.mutateAsync({
					actor: activeUser,
					content: draftContent,
				})
			}

			resetComposer()
		} catch (error) {
			setFeedback(error instanceof Error ? error.message : 'Nie udalo sie zapisac wiadomosci.')
		}
	}

	return (
		<div className="page-stack">
			<PageIntro
				eyebrow="Wspolpraca zespolu"
				title="Notatnik i chat"
				description="Reactowa wersja notatnika daje prawdziwy chat, przypiecia, edycje wpisow i aktywne obecnosci miedzy kartami."
				actions={
					<div className="page-actions">
						<label className="search-input">
							<span>Sesja robocza</span>
							<select
								value={activeUserId}
								onChange={event => {
									const nextUserId = event.target.value
									if (nextUserId) {
										setActiveUserId(nextUserId)
									} else {
										clearActiveUser()
									}
									setFeedback('')
									resetComposer()
								}}>
								<option value="">Bez aktywnej osoby</option>
								{users.map(user => (
									<option key={user.id} value={user.id}>
										{user.fullName}
									</option>
								))}
							</select>
						</label>
					</div>
				}
			/>

			<section className="stats-grid">
				<article className="stat-card">
					<p>Wiadomosci</p>
					<strong>{messages.length}</strong>
				</article>
				<article className="stat-card stat-card--warning">
					<p>Przypiete</p>
					<strong>{pinnedMessages.length}</strong>
				</article>
				<article className="stat-card stat-card--active">
					<p>Aktywni teraz</p>
					<strong>{activeViewers.length}</strong>
				</article>
				<article className="stat-card">
					<p>Moje wpisy</p>
					<strong>{myMessagesCount}</strong>
				</article>
			</section>

			<section className="data-card month-summary-card">
				<p className="month-summary-card__label">Status modulu</p>
				<strong>{activeUser ? `Aktywna sesja: ${activeUser.fullName}` : 'Brak aktywnej osoby roboczej'}</strong>
				<span>{summaryText}</span>
				{feedback ? <p className="helper-note is-warning">{feedback}</p> : null}
			</section>

			<section className="notes-chat-shell" aria-label="Chat zespolowy i przypiete wiadomosci">
				<div className="notes-chat-panel">
					<div className={`notes-auth-callout${activeUser ? ' is-active-user' : ''}`}>
						<div className="notes-auth-callout__copy">
							<strong>{activeUser ? 'Czat zespolu jest aktywny' : 'Wybierz osobe, aby wejsc do czatu'}</strong>
							<p className="notes-chat-summary">{summaryText}</p>
						</div>

						{activeUser ? (
							<button
								type="button"
								className="button-secondary"
								onClick={() => {
									clearActiveUser()
									setFeedback('')
									resetComposer()
								}}>
								Wyczysc sesje
							</button>
						) : null}
					</div>

					<div ref={chatWindowRef} className="notes-chat-window">
						<NotesMessageList
							currentUser={activeUser}
							isBusy={isBusy}
							isLoading={isLoading}
							messages={messages}
							onDelete={handleDelete}
							onEdit={message => {
								setFeedback('')
								setEditingMessageId(message.id)
							}}
							onTogglePinned={handleTogglePinned}
							users={users}
						/>
					</div>

					<form className={`notes-chat-composer${activeUser ? '' : ' is-disabled'}`} onSubmit={handleSubmit}>
						<label className="sr-only" htmlFor="notes-chat-input">
							Tresc wiadomosci
						</label>
						<textarea
							id="notes-chat-input"
							ref={textareaRef}
							disabled={!activeUser || isBusy}
							maxLength={1600}
							placeholder="Napisz wiadomosc do zespolu..."
							rows={3}
							value={draftContent}
							onChange={event => {
								setDraftContent(event.target.value)
							}}
							onKeyDown={event => {
								if (event.key !== 'Enter' || event.shiftKey) return
								event.preventDefault()
								event.currentTarget.form?.requestSubmit()
							}}
						/>

						<div className="notes-chat-composer-actions">
							{editingMessageId ? <span className="notes-edit-indicator">Edytujesz wiadomosc</span> : null}
							{editingMessageId ? (
								<button type="button" className="button-secondary" onClick={resetComposer}>
									Anuluj
								</button>
							) : null}
							<button type="submit" className="button-primary" disabled={!activeUser || isBusy}>
								{editingMessageId ? 'Zapisz zmiany' : 'Wyslij wiadomosc'}
							</button>
						</div>
					</form>

					<div className="notes-viewer-bar">
						<span className="notes-viewer-label">Aktywni teraz</span>
						<div className="notes-viewer-list">
							{activeViewers.length > 0 ? (
								activeViewers.map(viewer => (
									<span key={viewer.userId} className="notes-viewer-chip">
										<span className="notes-viewer-dot" aria-hidden="true" />
										{viewer.fullName}
									</span>
								))
							) : (
								<span className="notes-viewer-chip is-idle">Brak aktywnych osob</span>
							)}
						</div>
					</div>
				</div>

				<aside className="notes-pinned-panel">
					<div className="notes-pinned-head">
						<div>
							<p className="notes-pinned-kicker">Przypiete</p>
							<h3>Wazne wiadomosci</h3>
						</div>
						<span className="notes-pinned-count">{pinnedMessages.length}</span>
					</div>

					<NotesPinnedList
						currentUser={activeUser}
						isBusy={isBusy}
						messages={pinnedMessages}
						onDelete={handleDelete}
						onEdit={message => {
							setFeedback('')
							setEditingMessageId(message.id)
						}}
						onTogglePinned={handleTogglePinned}
						users={users}
					/>
				</aside>
			</section>
		</div>
	)
}
