import { ENV } from 'varlock/env'

export function resolveMediaUrl(src: string | null | undefined): string | null {
	if (!src) return null
	if (
		src.startsWith('http://') ||
		src.startsWith('https://') ||
		src.startsWith('data:')
	) {
		return src
	}
	const origin = (ENV.PUBLIC_APP_URL || 'http://localhost:3001').replace(
		/\/$/,
		'',
	)
	if (src.startsWith('/')) return `${origin}${src}`
	return `${origin}/${src}`
}

export function isVideoMediaUrl(src: string | null | undefined): boolean {
	if (!src) return false
	let value = src
	try {
		value = decodeURIComponent(src)
	} catch {
		value = src
	}
	return /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(value)
}

export type SiteLocaleLink = {
	code: string
	label: string
	href: string
	active: boolean
}

export type SiteOrgChrome = {
	name: string
	siteIcon?: { original: string } | null
}

export const siteBtnPrimary =
	'inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export const siteBtnGhost =
	'inline-flex items-center justify-center rounded-[var(--radius)] border border-border bg-background/80 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function siteButtonClass(
	variant: 'primary' | 'secondary' | string | undefined,
	fallback: 'primary' | 'secondary' = 'primary',
) {
	const look =
		variant === 'secondary'
			? 'secondary'
			: variant === 'primary'
				? 'primary'
				: fallback
	return look === 'secondary' ? siteBtnGhost : siteBtnPrimary
}

export const siteContainer = 'mx-auto w-full max-w-6xl px-5 sm:px-8'
export const siteSection = 'py-16 sm:py-24'

export type SiteSectionBackground = 'none' | 'muted' | 'inverted'

export function siteSectionBackground(background?: string): string {
	return background === 'muted'
		? 'bg-muted/50'
		: background === 'inverted'
			? 'bg-foreground text-background'
			: ''
}

export function siteSectionHeadingClass(background?: string): string {
	return background === 'inverted' ? 'text-background' : 'text-foreground'
}

export function siteSectionBodyClass(background?: string): string {
	return background === 'inverted'
		? 'text-background/75'
		: 'text-muted-foreground'
}

export function siteSectionBorderClass(background?: string): string {
	return background === 'inverted' ? 'border-background/25' : 'border-border'
}

export function siteSectionDividerClass(background?: string): string {
	return background === 'inverted' ? 'divide-background/25' : 'divide-border'
}
