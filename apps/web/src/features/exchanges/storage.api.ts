import { apiRequest } from '../../lib/http'

import type { ExchangeDraft, ExchangeRecord } from './types'

export function readExchangeRecords() {
	return apiRequest<ExchangeRecord[]>('/exchanges/records')
}

export function createExchangeRecord(draft: ExchangeDraft) {
	return apiRequest<ExchangeRecord[]>('/exchanges/records', {
		body: draft,
		method: 'POST',
	})
}

export function updateExchangeRecord(recordId: string, draft: ExchangeDraft) {
	return apiRequest<ExchangeRecord[]>(`/exchanges/records/${recordId}`, {
		body: draft,
		method: 'PATCH',
	})
}

export function completeExchangeRecord(recordId: string) {
	return apiRequest<ExchangeRecord[]>(`/exchanges/records/${recordId}/complete`, {
		method: 'POST',
	})
}

export function deleteExchangeRecord(recordId: string) {
	return apiRequest<ExchangeRecord[]>(`/exchanges/records/${recordId}`, {
		method: 'DELETE',
	})
}
