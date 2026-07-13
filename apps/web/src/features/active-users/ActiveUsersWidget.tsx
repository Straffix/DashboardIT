import { startTransition, useEffect, useMemo, useState } from 'react'

import type { AppSessionUser } from '../session/types'

import { useDashboardActiveUsers } from './useDashboardActiveUsers'
import { formatPresenceTimeLabel, getRoleLabel, getUserInitials } from './utils'

type ActiveUsersWidgetProps = {
	activeUser: AppSessionUser | null
	users: AppSessionUser[]
}

export function ActiveUsersWidget({ activeUser, users }: ActiveUsersWidgetProps) {
	const activeUsers = useDashboardActiveUsers(activeUser)
	const [previewUserId, setPreviewUserId] = useState('')

	const previewUser = useMemo(() => activeUsers.find(user => user.userId === previewUserId) || null, [activeUsers, previewUserId])

	useEffect(() => {
		if (!previewUser) return

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return
			setPreviewUserId('')
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [previewUser])

	return (
		<>
			<section className="data-card active-users-widget" aria-labelledby="dashboard-active-users-title">
				<div className="active-users-widget__head">
					<div className="dashboard-home-section-head">
						<p className="month-summary-card__label">Obecnosc</p>
						<strong id="dashboard-active-users-title">Aktywni uzytkownicy</strong>
						<span>Licznik obecnosci miedzy kartami i szybki podglad profilu aktywnych osob dzialaja juz w aplikacji.</span>
					</div>

					<div className="active-users-widget__stats" aria-label="Statystyki obecnosci">
						<div className="active-users-widget__stat">
							<span>Zarejestrowani</span>
							<strong>{users.length}</strong>
						</div>
						<div className="active-users-widget__stat">
							<span>Aktywni teraz</span>
							<strong>{activeUsers.length}</strong>
						</div>
					</div>
				</div>

				{activeUsers.length > 0 ? (
					<div className="active-users-widget__list">
						{activeUsers.map(user => {
							const isCurrentCard = Boolean(activeUser && activeUser.id === user.userId)
							return (
								<button
									key={user.userId}
									type="button"
									className={`active-user-card${isCurrentCard ? ' is-current' : ''}`}
									onClick={() => {
										startTransition(() => {
											setPreviewUserId(user.userId)
										})
									}}>
									<span
										className="active-user-card__avatar"
										style={
											user.avatarImage
												? {
														backgroundImage: `url(${user.avatarImage})`,
														backgroundSize: 'cover',
														backgroundPosition: 'center',
													}
												: { backgroundColor: user.profileAccentColor }
										}
										aria-hidden="true">
										{user.avatarImage ? '' : getUserInitials(user.fullName)}
									</span>
									<span className="active-user-card__copy">
										<strong>{user.fullName}</strong>
										<span>
											{getRoleLabel(user.role)} | @{user.login || 'konto'}
										</span>
										<small>Ostatnia obecnosc {formatPresenceTimeLabel(user.lastSeenAt)}</small>
									</span>
									{isCurrentCard ? <span className="active-user-card__badge">Ta karta</span> : null}
								</button>
							)
						})}
					</div>
				) : (
					<p className="dashboard-home-empty">
						Brak aktywnych kart z wybrana sesja. Po wskazaniu osoby roboczej ten widget zacznie pokazywac obecnosci.
					</p>
				)}
			</section>

			{previewUser ? (
				<div className="dashboard-user-preview-shell" role="presentation">
					<button
						type="button"
						className="dashboard-user-preview-backdrop"
						aria-label="Zamknij podglad profilu"
						onClick={() => {
							setPreviewUserId('')
						}}
					/>
					<section className="dashboard-user-preview-card" role="dialog" aria-modal="true" aria-labelledby="dashboard-user-preview-title">
						<div
							className="dashboard-user-preview-cover"
							style={
								previewUser.profileCoverImage
									? {
											backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.18), rgba(15, 23, 42, 0.5)), url(${previewUser.profileCoverImage})`,
										}
									: {
											background: `linear-gradient(135deg, ${previewUser.profileAccentColor}22 0%, rgba(255, 255, 255, 0) 60%)`,
										}
							}
							aria-hidden="true"
						/>
						<button
							type="button"
							className="dashboard-user-preview-close"
							aria-label="Zamknij profil"
							onClick={() => {
								setPreviewUserId('')
							}}>
							Zamknij
						</button>

						<div className="dashboard-user-preview-body">
							<div className="dashboard-user-preview-head">
								<span
									className="dashboard-user-preview-avatar"
									style={
										previewUser.avatarImage
											? {
													backgroundImage: `url(${previewUser.avatarImage})`,
													backgroundSize: 'cover',
													backgroundPosition: 'center',
												}
											: { backgroundColor: previewUser.profileAccentColor }
									}
									aria-hidden="true">
									{previewUser.avatarImage ? '' : getUserInitials(previewUser.fullName)}
								</span>

								<div className="dashboard-user-preview-copy">
									<p className="month-summary-card__label">Profil uzytkownika</p>
									<h3 id="dashboard-user-preview-title">{previewUser.fullName}</h3>
									<span>{previewUser.profileTitle || getRoleLabel(previewUser.role)}</span>
								</div>
							</div>

							<div className="dashboard-user-preview-grid">
								<span>Login</span>
								<strong>@{previewUser.login || 'konto'}</strong>
								<span>Rola</span>
								<strong>{getRoleLabel(previewUser.role)}</strong>
								<span>Status</span>
								<strong>Aktywny teraz</strong>
								<span>Ostatnia aktywnosc</span>
								<strong>{formatPresenceTimeLabel(previewUser.lastSeenAt)}</strong>
							</div>
						</div>
					</section>
				</div>
			) : null}
		</>
	)
}
