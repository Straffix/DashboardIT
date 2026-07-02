export type BookmarkRecord = {
	id: string
	userId: string
	label: string
	url: string
	description: string
	colorHex: string
	iconName: string
	createdAt: string
	updatedAt: string
}

export type BookmarkDraft = {
	label: string
	url: string
	description: string
	colorHex: string
	iconName: string
}

export type BookmarkIconOption = {
	id: string
	label: string
	hint: string
	token: string
}
