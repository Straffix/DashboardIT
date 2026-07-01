import { getAppDataSourceMode } from '../../config/dataSource'

import * as apiExchangeStorage from './storage.api'
import * as localExchangeStorage from './storage.local'

type ExchangeStorageModule = Pick<
	typeof localExchangeStorage,
	| 'completeExchangeRecord'
	| 'createExchangeRecord'
	| 'deleteExchangeRecord'
	| 'readExchangeRecords'
	| 'replaceExchangeRecords'
	| 'updateExchangeRecord'
>

const replaceExchangeRecordsUnsupported: ExchangeStorageModule['replaceExchangeRecords'] = async () => {
	throw new Error('Import Excel dla wymian jest obecnie dostepny tylko w trybie local demo.')
}

const exchangeStorage: ExchangeStorageModule =
	getAppDataSourceMode() === 'api'
		? { ...apiExchangeStorage, replaceExchangeRecords: replaceExchangeRecordsUnsupported }
		: localExchangeStorage

export const readExchangeRecords = () => exchangeStorage.readExchangeRecords()

export const replaceExchangeRecords = (records: Parameters<ExchangeStorageModule['replaceExchangeRecords']>[0]) =>
	exchangeStorage.replaceExchangeRecords(records)

export const createExchangeRecord = (draft: Parameters<ExchangeStorageModule['createExchangeRecord']>[0]) =>
	exchangeStorage.createExchangeRecord(draft)

export const updateExchangeRecord = (
	recordId: Parameters<ExchangeStorageModule['updateExchangeRecord']>[0],
	draft: Parameters<ExchangeStorageModule['updateExchangeRecord']>[1]
) => exchangeStorage.updateExchangeRecord(recordId, draft)

export const completeExchangeRecord = (recordId: Parameters<ExchangeStorageModule['completeExchangeRecord']>[0]) =>
	exchangeStorage.completeExchangeRecord(recordId)

export const deleteExchangeRecord = (recordId: Parameters<ExchangeStorageModule['deleteExchangeRecord']>[0]) =>
	exchangeStorage.deleteExchangeRecord(recordId)
