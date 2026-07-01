import xlsxScriptUrl from '../../../../js/vendor/xlsx.full.min.js?url'

import type { SpreadsheetRow } from './spreadsheet'

type XlsxWorksheet = unknown
type XlsxWorkbook = {
	SheetNames: string[]
	Sheets: Record<string, XlsxWorksheet>
}

type XlsxLibrary = {
	read: (data: Uint8Array, options: { type: 'array' }) => XlsxWorkbook
	writeFile: (workbook: unknown, filename: string) => void
	utils: {
		book_append_sheet: (workbook: unknown, worksheet: XlsxWorksheet, name: string) => void
		book_new: () => unknown
		json_to_sheet: (rows: SpreadsheetRow[]) => XlsxWorksheet
		sheet_to_json: <TRow extends SpreadsheetRow>(worksheet: XlsxWorksheet) => TRow[]
	}
}

declare global {
	interface Window {
		XLSX?: XlsxLibrary
	}
}

let xlsxLoaderPromise: Promise<XlsxLibrary> | null = null

function loadXlsxScript() {
	return new Promise<XlsxLibrary>((resolve, reject) => {
		if (typeof window === 'undefined') {
			reject(new Error('Biblioteka Excel nie jest dostepna poza przegladarka.'))
			return
		}

		if (window.XLSX) {
			resolve(window.XLSX)
			return
		}

		const existingScript = document.querySelector<HTMLScriptElement>('script[data-dashboardit-xlsx="true"]')
		if (existingScript) {
			existingScript.addEventListener('load', () => {
				if (window.XLSX) {
					resolve(window.XLSX)
					return
				}

				reject(new Error('Biblioteka Excel zaladowala sie niepoprawnie.'))
			})
			existingScript.addEventListener('error', () => {
				reject(new Error('Nie udalo sie zaladowac biblioteki Excel.'))
			})
			return
		}

		const script = document.createElement('script')
		script.async = true
		script.dataset.dashboarditXlsx = 'true'
		script.src = xlsxScriptUrl
		script.onload = () => {
			if (!window.XLSX) {
				reject(new Error('Biblioteka Excel zaladowala sie niepoprawnie.'))
				return
			}

			resolve(window.XLSX)
		}
		script.onerror = () => {
			reject(new Error('Nie udalo sie zaladowac biblioteki Excel.'))
		}

		document.head.appendChild(script)
	})
}

export async function ensureXlsxLoaded() {
	if (typeof window !== 'undefined' && window.XLSX) {
		return window.XLSX
	}

	if (!xlsxLoaderPromise) {
		xlsxLoaderPromise = loadXlsxScript().catch(error => {
			xlsxLoaderPromise = null
			throw error
		})
	}

	return xlsxLoaderPromise
}

export async function exportRowsToExcelFile(rows: SpreadsheetRow[], { filename, sheetName }: { filename: string; sheetName: string }) {
	const xlsx = await ensureXlsxLoaded()
	const worksheet = xlsx.utils.json_to_sheet(rows)
	const workbook = xlsx.utils.book_new()

	xlsx.utils.book_append_sheet(workbook, worksheet, sheetName)
	xlsx.writeFile(workbook, filename)
}

export async function readFirstSheetRows(file: File) {
	const xlsx = await ensureXlsxLoaded()
	const fileBuffer = await file.arrayBuffer()
	const workbook = xlsx.read(new Uint8Array(fileBuffer), { type: 'array' })
	const firstSheetName = workbook.SheetNames[0]

	if (!firstSheetName) {
		return [] as SpreadsheetRow[]
	}

	return xlsx.utils.sheet_to_json<SpreadsheetRow>(workbook.Sheets[firstSheetName])
}
