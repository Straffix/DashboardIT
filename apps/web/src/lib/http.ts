import { getApiBaseUrl } from '../config/dataSource'

type ApiSearchParamValue = string | number | boolean | null | undefined

type ApiRequestOptions = {
	body?: unknown
	method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
	searchParams?: Record<string, ApiSearchParamValue>
}

function createApiUrl(path: string, searchParams?: Record<string, ApiSearchParamValue>) {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`
	const url = new URL(`${getApiBaseUrl()}${normalizedPath}`, window.location.origin)

	if (searchParams) {
		for (const [key, value] of Object.entries(searchParams)) {
			if (value === undefined || value === null || value === '') continue
			url.searchParams.set(key, String(value))
		}
	}

	return url.toString()
}

async function readResponseBody(response: Response) {
	if (response.status === 204) return undefined

	const contentType = response.headers.get('content-type') || ''
	if (contentType.includes('application/json')) {
		return response.json()
	}

	const text = await response.text()
	return text.trim() ? text : undefined
}

function getApiErrorMessage(status: number, responseBody: unknown) {
	if (typeof responseBody === 'string') {
		return responseBody
	}

	if (responseBody && typeof responseBody === 'object') {
		const maybeMessage = (responseBody as { message?: unknown }).message
		if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
			return maybeMessage
		}
	}

	return `Request failed with status ${status}.`
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
	const { body, method = body === undefined ? 'GET' : 'POST', searchParams } = options
	const url = createApiUrl(path, searchParams)

	let response: Response
	try {
		response = await fetch(url, {
			method,
			headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body),
		})
	} catch (error) {
		throw new Error(`Nie udalo sie polaczyc z API pod ${getApiBaseUrl()}.`)
	}

	const responseBody = await readResponseBody(response)
	if (!response.ok) {
		throw new Error(getApiErrorMessage(response.status, responseBody))
	}

	return responseBody as T
}
