import { LRUCache } from 'lru-cache'
import { prisma } from '@repo/database'
import { TENANT_ORG_ID_PATTERN } from '@repo/tenant-db'
import { orgMatchesNodeRegion } from './region.ts'

const RESERVED_SUBDOMAINS = new Set([
	'app',
	'admin',
	'cms',
	'docs',
	'studio',
	'api',
	'www',
	'mail',
	'ftp',
	'sites',
	'status',
	'cdn',
	'static',
	'assets',
])

export const publishedOrgSelect = {
	id: true,
	slug: true,
	customDomain: true,
	hasProvisionedDb: true,
	dataRegion: true,
} as const

export type PublishedOrganization = {
	id: string
	slug: string
	customDomain: string | null
	hasProvisionedDb: boolean
	dataRegion: string
}

const corsCache = new LRUCache<string, boolean>({
	max: 500,
	ttl: 30_000,
})

function brandDomain() {
	return (process.env.ROOT_APP || 'epic-startup.me').toLowerCase()
}

function parseOrigin(origin: string): URL | null {
	try {
		return new URL(origin)
	} catch {
		return null
	}
}

function isLocalDevHost(hostname: string) {
	return (
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
		hostname.endsWith('.localhost')
	)
}

export type OriginBinding =
	| { kind: 'slug'; slug: string }
	| { kind: 'custom'; host: string }
	| { kind: 'local-unbound' }
	| { kind: 'none' }

export function resolveOriginBinding(
	origin: string | undefined,
): OriginBinding {
	if (!origin) return { kind: 'none' }
	const url = parseOrigin(origin)
	if (!url) return { kind: 'none' }

	const isProd = process.env.NODE_ENV === 'production'
	if (isProd && url.protocol !== 'https:') return { kind: 'none' }
	if (!isProd && url.protocol !== 'http:' && url.protocol !== 'https:') {
		return { kind: 'none' }
	}

	const hostname = url.hostname.toLowerCase()
	if (isLocalDevHost(hostname)) {
		return { kind: 'local-unbound' }
	}

	const suffix = `.${brandDomain()}`
	if (hostname === brandDomain()) return { kind: 'none' }
	if (hostname.endsWith(suffix)) {
		const subdomain = hostname.slice(0, -suffix.length)
		if (
			!subdomain ||
			subdomain.includes('.') ||
			RESERVED_SUBDOMAINS.has(subdomain)
		) {
			return { kind: 'none' }
		}
		return { kind: 'slug', slug: subdomain }
	}

	return { kind: 'custom', host: hostname }
}

export async function resolvePublishedOrganization(data: {
	slug?: string
	host?: string
}) {
	if (data.slug) {
		return prisma.organization.findFirst({
			where: {
				slug: data.slug.toLowerCase(),
				active: true,
				sitePublished: true,
			},
			select: publishedOrgSelect,
		})
	}

	if (data.host) {
		return prisma.organization.findFirst({
			where: {
				customDomain: data.host.toLowerCase(),
				active: true,
				sitePublished: true,
			},
			select: publishedOrgSelect,
		})
	}

	return null
}

export async function findActiveOrganizationById(orgId: string) {
	if (!TENANT_ORG_ID_PATTERN.test(orgId)) {
		return null
	}

	return prisma.organization.findFirst({
		where: { id: orgId, active: true },
		select: publishedOrgSelect,
	})
}

export async function resolveOrganizationFromBinding(binding: OriginBinding) {
	if (binding.kind === 'slug') {
		return resolvePublishedOrganization({ slug: binding.slug })
	}
	if (binding.kind === 'custom') {
		return resolvePublishedOrganization({ host: binding.host })
	}
	return null
}

export async function resolveOrganizationFromOrigin(
	origin: string | undefined,
) {
	return resolveOrganizationFromBinding(resolveOriginBinding(origin))
}

/**
 * Bind send-code / verify to the browser Origin so a client cannot pick
 * another org's slug. Localhost (no subdomain) may fall back to body slug/host.
 */
export async function resolveOrganizationForBrowserAuth(
	origin: string | undefined,
	body: { slug?: string; host?: string },
) {
	const fromOrigin = await resolveOrganizationFromOrigin(origin)
	if (fromOrigin) {
		if (body.slug && body.slug.toLowerCase() !== fromOrigin.slug) {
			return null
		}
		if (
			body.host &&
			fromOrigin.customDomain &&
			body.host.toLowerCase() !== fromOrigin.customDomain
		) {
			return null
		}
		return fromOrigin
	}

	const isProd = process.env.NODE_ENV === 'production'
	if (!isProd && (body.slug || body.host)) {
		return resolvePublishedOrganization(body)
	}

	return null
}

export async function isAllowedBrowserOrigin(origin: string): Promise<boolean> {
	const cached = corsCache.get(origin)
	if (cached !== undefined) return cached

	const binding = resolveOriginBinding(origin)
	let allowed = false

	if (binding.kind === 'local-unbound') {
		allowed = process.env.NODE_ENV !== 'production'
	} else if (binding.kind === 'slug' || binding.kind === 'custom') {
		const organization = await resolveOrganizationFromBinding(binding)
		allowed = Boolean(
			organization && orgMatchesNodeRegion(organization.dataRegion),
		)
	}

	corsCache.set(origin, allowed)
	return allowed
}
