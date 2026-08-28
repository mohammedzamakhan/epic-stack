/**
 * Link fields for marketing block CTAs — Webflow-style link settings in the
 * admin, flattened to URL strings (+ optional target) for Astro components.
 */

import { type PluginContext, type PortableTextBlockField } from 'emdash'

export const LINK_PICK_SUFFIX = '__pick'
export const LINK_TARGET_SUFFIX = 'Target'

export type MarketingLinkType =
	'url' | 'page' | 'post' | 'email' | 'tel' | 'file'

export interface MarketingLinkValue {
	type: MarketingLinkType
	url?: string
	page?: string
	post?: string
	email?: string
	emailSubject?: string
	tel?: string
	file?: string
	target?: '_self' | '_blank'
}

const STATIC_URL_SHORTCUTS = [
	{ label: '#features (on-page anchor)', value: '#features' },
	{ label: '#pricing (on-page anchor)', value: '#pricing' },
	{ label: '/signup', value: '/signup' },
	{ label: '/demo', value: '/demo' },
	{ label: '/contact', value: '/contact' },
]

export function isMarketingLinkValue(
	value: unknown,
): value is MarketingLinkValue {
	if (!value || typeof value !== 'object') return false
	const record = value as Record<string, unknown>
	return typeof record.type === 'string'
}

/** Block Kit field: Webflow-style link settings widget. */
export function linkSettingsField(
	actionId: string,
	label: string,
): PortableTextBlockField {
	return {
		type: 'link_settings' as any,
		action_id: actionId,
		label,
	}
}

/** @deprecated Use linkSettingsField */
export function contentLinkFields(
	actionId: string,
	label: string,
): PortableTextBlockField[] {
	return [linkSettingsField(actionId, label)]
}

export function buildHrefFromLink(link: MarketingLinkValue): string {
	switch (link.type) {
		case 'url':
			return (link.url ?? '').trim() || '#'
		case 'page':
			return (link.page ?? '').trim() || '/'
		case 'post':
			return (link.post ?? '').trim() || '/'
		case 'email': {
			const addr = (link.email ?? '').trim()
			if (!addr) return '#'
			const subject = (link.emailSubject ?? '').trim()
			const query = subject ? `?subject=${encodeURIComponent(subject)}` : ''
			return `mailto:${addr}${query}`
		}
		case 'tel': {
			const tel = (link.tel ?? '').trim().replace(/\s/g, '')
			return tel ? `tel:${tel}` : '#'
		}
		case 'file':
			return (link.file ?? '').trim() || '#'
		default:
			return '#'
	}
}

export function parseLinkValue(value: unknown): MarketingLinkValue {
	const defaults: MarketingLinkValue = { type: 'url', url: '', target: '_self' }

	if (isMarketingLinkValue(value)) {
		return { ...defaults, ...value }
	}

	if (typeof value === 'string') {
		const trimmed = value.trim()
		if (!trimmed) return defaults

		if (trimmed.startsWith('mailto:')) {
			const body = trimmed.slice(7)
			const [addr, query = ''] = body.split('?')
			const subjectMatch = query.match(/(?:^|&)subject=([^&]*)/)
			const subject = subjectMatch?.[1]
				? decodeURIComponent(subjectMatch[1])
				: ''
			return {
				type: 'email',
				email: decodeURIComponent(addr),
				emailSubject: subject,
				target: '_self',
			}
		}

		if (trimmed.startsWith('tel:')) {
			return {
				type: 'tel',
				tel: trimmed.slice(4),
				target: '_self',
			}
		}

		if (trimmed.startsWith('/posts/')) {
			return { type: 'post', post: trimmed, target: '_self' }
		}

		if (trimmed === '/' || trimmed.startsWith('/pages/')) {
			return { type: 'page', page: trimmed, target: '_self' }
		}

		return { type: 'url', url: trimmed, target: '_self' }
	}

	return defaults
}

function flattenLinkField(record: Record<string, unknown>, key: string) {
	const fieldValue = record[key]

	if (isMarketingLinkValue(fieldValue)) {
		record[key] = buildHrefFromLink(fieldValue)
		const targetKey = `${key}${LINK_TARGET_SUFFIX}`
		if (fieldValue.target === '_blank') {
			record[targetKey] = '_blank'
		} else {
			delete record[targetKey]
		}
		return
	}

	if (key.endsWith(LINK_PICK_SUFFIX)) {
		const baseKey = key.slice(0, -LINK_PICK_SUFFIX.length)
		const pick = fieldValue
		const custom = record[baseKey]
		if (typeof pick === 'string' && pick.trim()) {
			if (typeof custom !== 'string' || !custom.trim()) {
				if (!isMarketingLinkValue(custom)) {
					record[baseKey] = pick.trim()
				}
			}
		}
		delete record[key]
	}
}

export function normalizeLinkPickFields(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => normalizeLinkPickFields(entry))
	}

	if (!value || typeof value !== 'object') return value

	const record = { ...value } as Record<string, unknown>

	for (const key of Object.keys(record)) {
		flattenLinkField(record, key)
		record[key] = normalizeLinkPickFields(record[key])
	}

	return record
}

/** Resolve href from canonical field, structured link, or legacy quick-pick. */
export function resolveContentLink(
	props: Record<string, unknown> | undefined,
	fieldKey: string,
): string | undefined {
	if (!props) return undefined

	const custom = props[fieldKey]
	if (isMarketingLinkValue(custom)) {
		const href = buildHrefFromLink(custom)
		return href === '#' ? undefined : href
	}
	if (typeof custom === 'string' && custom.trim()) return custom.trim()

	const pick = props[`${fieldKey}${LINK_PICK_SUFFIX}`]
	if (typeof pick === 'string' && pick.trim()) return pick.trim()

	return undefined
}

export function resolveLinkTarget(
	props: Record<string, unknown> | undefined,
	fieldKey: string,
): '_blank' | undefined {
	if (!props) return undefined

	const targetKey = `${fieldKey}${LINK_TARGET_SUFFIX}`
	if (props[targetKey] === '_blank') return '_blank'

	const custom = props[fieldKey]
	if (isMarketingLinkValue(custom) && custom.target === '_blank') {
		return '_blank'
	}

	return undefined
}

export interface ResolvedMarketingLink {
	href: string
	target?: '_blank'
	rel?: string
}

/** Resolved href + new-tab attributes for buttons and anchors. */
export function resolveMarketingLink(
	props: Record<string, unknown> | undefined,
	fieldKey: string,
	fallback?: string,
): ResolvedMarketingLink {
	const href = resolveContentLink(props, fieldKey) ?? fallback ?? '#'
	const target = resolveLinkTarget(props, fieldKey)
	return {
		href,
		target,
		rel: target === '_blank' ? 'noopener noreferrer' : undefined,
	}
}

function entryTitle(
	item: { slug: string | null; data: Record<string, unknown> },
	fallback: string,
): string {
	const title = item.data?.title
	if (typeof title === 'string' && title.trim()) return title.trim()
	return item.slug ?? fallback
}

function pagePath(slug: string): string {
	return slug === 'home' ? '/' : `/pages/${slug}`
}

type LinkCollectionKind = 'pages' | 'posts' | 'all'

export async function buildContentLinkOptions(
	ctx: PluginContext,
	kind: LinkCollectionKind = 'all',
): Promise<Array<{ id: string; name: string }>> {
	const items: Array<{ id: string; name: string }> = []

	if (kind === 'all') {
		items.push(
			{ id: '', name: '— Select a page or post —' },
			...STATIC_URL_SHORTCUTS.map((option) => ({
				id: option.value,
				name: option.label,
			})),
		)
	}

	if (kind === 'pages') {
		items.push({ id: '', name: 'Choose a page…' })
	}

	if (kind === 'posts') {
		items.push({ id: '', name: 'Choose a post…' })
	}

	if (!ctx.content?.list) return items

	const collections =
		kind === 'pages'
			? [{ slug: 'pages', label: 'Page', toPath: pagePath }]
			: kind === 'posts'
				? [
						{
							slug: 'posts',
							label: 'Post',
							toPath: (slug: string) => `/posts/${slug}`,
						},
					]
				: [
						{ slug: 'pages', label: 'Page', toPath: pagePath },
						{
							slug: 'posts',
							label: 'Post',
							toPath: (slug: string) => `/posts/${slug}`,
						},
					]

	for (const collection of collections) {
		let cursor: string | undefined
		let hasMore = true

		while (hasMore) {
			const result = await ctx.content.list(collection.slug, {
				limit: 100,
				cursor,
				where: { status: 'published' },
			})

			for (const entry of result.items) {
				if (!entry.slug) continue
				items.push({
					id: collection.toPath(entry.slug),
					name: `${collection.label}: ${entryTitle(entry, entry.slug)}`,
				})
			}

			hasMore = result.hasMore
			cursor = result.cursor
			if (!cursor) break
		}
	}

	return items
}
