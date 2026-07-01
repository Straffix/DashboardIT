export type ExchangeStatus = 'pending' | 'done'

export type ExchangeAccessoryId =
	| 'mouse'
	| 'vertical-mouse'
	| 'keyboard'
	| 'headset'
	| 'monitor'
	| 'bag'
	| 'backpack'
	| 'pointer'
	| 'printer'
	| 'laptop-pad'

export type ExchangeRecord = {
	id: string
	name: string
	plannedDate: string
	oldSn: string
	newSn: string
	notes: string
	accessories: ExchangeAccessoryId[]
	status: ExchangeStatus
	createdAt: string
	updatedAt: string
}

export type ExchangeDraft = {
	name: string
	plannedDate: string
	oldSn: string
	newSn: string
	notes: string
	accessories: ExchangeAccessoryId[]
}
