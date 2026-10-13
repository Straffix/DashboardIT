import { useState } from 'react'
import type { FormEvent } from 'react'

import { useAppSession } from './AppSessionProvider'

export function TestAccountLogin() {
	const { activeUser, clearActiveUser, loginTestAccount } = useAppSession()
	const [login, setLogin] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		try {
			loginTestAccount(login, password)
			setPassword('')
			setError('')
		} catch (failure) {
			setError(failure instanceof Error ? failure.message : 'Nie udało się zalogować.')
		}
	}

	if (activeUser) {
		return <button type="button" className="button-secondary" onClick={clearActiveUser}>Wyloguj się</button>
	}

	return (
		<details className="test-account-login">
			<summary>Zaloguj się</summary>
			<form onSubmit={handleSubmit}>
				<label className="search-input">
					<span>Login</span>
					<input value={login} onChange={event => setLogin(event.target.value)} autoComplete="username" required />
				</label>
				<label className="search-input">
					<span>Hasło</span>
					<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
				</label>
				{error && <p role="alert">{error}</p>}
				<button type="submit" className="button-primary">Zaloguj się</button>
			</form>
		</details>
	)
}
