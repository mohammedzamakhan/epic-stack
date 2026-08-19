import {
	parseLocalizedString,
	serializeLocalizedString,
	type LocalizedString,
} from '@repo/common/site-locales'
import { LOCALIZED_FIELDS } from './block-types.ts'

export const BULK_UPDATE_SECTIONS_INTENT = 'bulk-update-sections'

export function resolvePaths(
	obj: unknown,
	pathDef: string,
	currentPath: string = '',
): string[] {
	if (obj == null) return []

	const parts = pathDef.split('.')
	if (parts.length === 0) return []

	const first = parts[0]!
	const rest = parts.slice(1).join('.')

	if (first === '[]') {
		if (Array.isArray(obj)) {
			return obj.flatMap((item, idx) => {
				if (item == null) return []
				if (rest && typeof item !== 'object') return []
				return resolvePaths(
					item,
					rest,
					currentPath ? `${currentPath}.[${idx}]` : `[${idx}]`,
				)
			})
		}
		return []
	}

	const nextPath = currentPath ? `${currentPath}.${first}` : first
	if (parts.length === 1) {
		return [nextPath]
	}

	if (typeof obj !== 'object') return []
	return resolvePaths((obj as Record<string, unknown>)[first], rest, nextPath)
}

export function getNestedValue(obj: unknown, path: string): string | undefined {
	const parts = path.split('.')
	let current: unknown = obj
	for (const part of parts) {
		if (current == null || typeof current !== 'object') return undefined

		if (part.startsWith('[') && part.endsWith(']')) {
			const idx = Number.parseInt(part.slice(1, -1), 10)
			current = (current as unknown[])[idx]
		} else {
			current = (current as Record<string, unknown>)[part]
		}
	}
	return typeof current === 'string' ? current : undefined
}

export function setNestedValue(
	obj: Record<string, unknown>,
	path: string,
	value: string,
) {
	const parts = path.split('.')
	let current: Record<string, unknown> | unknown[] = obj
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i]!
		const key: string | number =
			part.startsWith('[') && part.endsWith(']')
				? Number.parseInt(part.slice(1, -1), 10)
				: part
		const nextPart = parts[i + 1]!
		const shouldBeArray = nextPart.startsWith('[') && nextPart.endsWith(']')
		const existing = (current as Record<string, unknown>)[key as string]
		if (existing == null) {
			const created: Record<string, unknown> | unknown[] = shouldBeArray
				? []
				: {}
			;(current as Record<string, unknown>)[key as string] = created
			current = created
		} else {
			current = existing as Record<string, unknown>
		}
	}

	const lastPart = parts[parts.length - 1]!
	if (lastPart.startsWith('[') && lastPart.endsWith(']')) {
		;(current as unknown[])[Number.parseInt(lastPart.slice(1, -1), 10)] = value
	} else {
		;(current as Record<string, unknown>)[lastPart] = value
	}
}

export function pickDefaultString(
	currentStr: string,
	defaultLocale: string,
): string {
	const map = parseLocalizedString(currentStr, defaultLocale)
	return map[defaultLocale]?.trim() || ''
}

export type TranslateItem = {
	id: string
	defaultText: string
	existingTarget: string
	hasCustomTranslation: boolean
	allowHtml: boolean
}

export type TranslationField = TranslateItem & {
	sectionId: string
	type: string
	path: string
}

function isHtmlField(path: string): boolean {
	return path.endsWith('.body') || path === 'body'
}

export function describeLocalizedValue(
	raw: LocalizedString | string | null | undefined,
	defaultLocale: string,
	activeLocale: string,
): Omit<TranslateItem, 'id' | 'allowHtml'> | null {
	const map =
		raw && typeof raw === 'object'
			? raw
			: parseLocalizedString(typeof raw === 'string' ? raw : '', defaultLocale)
	const defaultText = map[defaultLocale]?.trim() || ''
	if (!defaultText) return null
	const existingTarget = map[activeLocale]?.trim() || ''
	return {
		defaultText,
		existingTarget,
		hasCustomTranslation:
			existingTarget.length > 0 && existingTarget !== defaultText,
	}
}

export function toTranslateItem(
	id: string,
	raw: LocalizedString | string | null | undefined,
	defaultLocale: string,
	activeLocale: string,
	allowHtml: boolean = false,
): TranslateItem | null {
	const described = describeLocalizedValue(raw, defaultLocale, activeLocale)
	if (!described) return null
	return { id, ...described, allowHtml }
}

export function collectTranslationFields(
	sections: Array<{
		id: string
		type: string
		config: Record<string, unknown>
	}>,
	defaultLocale: string,
	activeLocale: string,
): TranslationField[] {
	const fields: TranslationField[] = []

	for (const section of sections) {
		const pathsToTranslate = LOCALIZED_FIELDS[section.type] ?? []
		for (const rawPath of pathsToTranslate) {
			const resolvedPaths = resolvePaths(section.config, rawPath)
			for (const path of resolvedPaths) {
				const rawValue = getNestedValue(section.config, path)
				if (!rawValue) continue
				const described = describeLocalizedValue(
					rawValue,
					defaultLocale,
					activeLocale,
				)
				if (!described) continue
				fields.push({
					id: `${section.id}\u0000${path}`,
					sectionId: section.id,
					type: section.type,
					path,
					allowHtml: isHtmlField(path),
					...described,
				})
			}
		}
	}

	return fields
}

export function getTranslatedConfig(
	config: Record<string, unknown>,
	blockType: string,
	translationsMap: Record<string, string>,
	activeLocale: string,
	defaultLocale: string,
): Record<string, unknown> {
	const newConfig = JSON.parse(JSON.stringify(config)) as Record<
		string,
		unknown
	>

	const allowedPaths = LOCALIZED_FIELDS[blockType]
	if (!allowedPaths) return newConfig

	const allowedResolved = new Set(
		allowedPaths.flatMap((pathDef) => resolvePaths(newConfig, pathDef)),
	)

	for (const [path, translatedText] of Object.entries(translationsMap)) {
		if (!allowedResolved.has(path)) continue
		const prevValue = getNestedValue(newConfig, path) ?? ''
		const map = parseLocalizedString(prevValue, defaultLocale)
		map[activeLocale] = translatedText
		setNestedValue(newConfig, path, serializeLocalizedString(map))
	}

	return newConfig
}
