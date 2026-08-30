import { invariant } from '@epic-web/invariant'
import { requireUserId } from '@repo/auth'
import { brand } from '@repo/config/brand'
import { and, db, eq, Organization, UserOrganization } from '@repo/database'
import { SignJWT } from 'jose'
import { ENV } from 'varlock/env'

export type TenantApiUrlEnv = {
	TENANT_API_URL?: string
	TENANT_API_URL_KSA?: string
	PUBLIC_TENANT_API_URL?: string
	PUBLIC_TENANT_API_URL_KSA?: string
}

export interface OperatorTenantClient {
	orgId: string
	orgSlug: string
	dataRegion: string
	jwt: string
	/** Server-to-server origin (may be http://localhost in local npm run dev). */
	tenantApiUrl: string
	/** Browser-facing origin. HTTPS via the dev proxy so App pages are not mixed content. */
	publicTenantApiUrl: string
	fetchTenant: (path: string, init?: RequestInit) => Promise<Response>
}

function stripTrailingSlash(value: string) {
	return value.replace(/\/$/, '')
}

function firstConfiguredUrl(
	...values: Array<string | undefined>
): string | undefined {
	for (const value of values) {
		if (value) return stripTrailingSlash(value)
	}
}

function envUrl(name: keyof TenantApiUrlEnv) {
	const fromProcess = process.env[name]
	if (fromProcess) return fromProcess
	try {
		const fromEnv = (ENV as TenantApiUrlEnv)[name]
		if (typeof fromEnv === 'string' && fromEnv) return fromEnv
	} catch {
		// varlock ENV is unavailable in some unit-test contexts
	}
}

/**
 * Internal URL for App/Admin Node fetch, plus the public URL the browser must
 * use. Local `npm run dev` serves the App on HTTPS (`app.{brand}:2999`); the
 * browser cannot call `http://localhost:3007` (mixed content / private network).
 */
export function resolveRegionalTenantApiUrls(
	dataRegion: string,
	env: TenantApiUrlEnv = {
		TENANT_API_URL: envUrl('TENANT_API_URL'),
		TENANT_API_URL_KSA: envUrl('TENANT_API_URL_KSA'),
		PUBLIC_TENANT_API_URL: envUrl('PUBLIC_TENANT_API_URL'),
		PUBLIC_TENANT_API_URL_KSA: envUrl('PUBLIC_TENANT_API_URL_KSA'),
	},
) {
	const isKsa = dataRegion === 'ksa'
	const tenantApiUrl =
		firstConfiguredUrl(isKsa ? env.TENANT_API_URL_KSA : env.TENANT_API_URL) ||
		(isKsa ? 'http://localhost:3009' : 'http://localhost:3007')
	const publicTenantApiUrl =
		firstConfiguredUrl(
			isKsa ? env.PUBLIC_TENANT_API_URL_KSA : env.PUBLIC_TENANT_API_URL,
			tenantApiUrl,
		) || tenantApiUrl

	return { tenantApiUrl, publicTenantApiUrl }
}

/**
 * Resolves operator authorization context and regional tenant-api client.
 */
export async function getOperatorTenantClient(
	request: Request,
	orgSlug: string,
): Promise<OperatorTenantClient> {
	const userId = await requireUserId(request)
	invariant(orgSlug, 'orgSlug is required')

	const [organization] = await db
		.select({
			id: Organization.id,
			slug: Organization.slug,
			dataRegion: Organization.dataRegion,
		})
		.from(Organization)
		.innerJoin(
			UserOrganization,
			and(
				eq(UserOrganization.organizationId, Organization.id),
				eq(UserOrganization.userId, userId),
				eq(UserOrganization.active, true),
			),
		)
		.where(and(eq(Organization.slug, orgSlug), eq(Organization.active, true)))

	if (!organization) {
		throw new Response('Organization not found or access denied', {
			status: 404,
		})
	}

	const operatorToken =
		process.env.TENANT_OPERATOR_TOKEN ||
		(typeof ENV !== 'undefined' && (ENV as any).TENANT_OPERATOR_TOKEN) ||
		''

	if (!operatorToken || operatorToken.length < 16) {
		throw new Response(
			'TENANT_OPERATOR_TOKEN must be configured with >= 16 chars',
			{
				status: 500,
			},
		)
	}

	const secret = new TextEncoder().encode(operatorToken)
	const jwt = await new SignJWT({
		orgId: organization.id,
		role: 'operator',
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setAudience('tenant-api-operator')
		.setIssuer(brand.shortName)
		.setExpirationTime('15m')
		.sign(secret)

	const { tenantApiUrl, publicTenantApiUrl } = resolveRegionalTenantApiUrls(
		organization.dataRegion,
	)

	const fetchTenant = async (path: string, init: RequestInit = {}) => {
		const headers = new Headers(init.headers || {})
		headers.set('Authorization', `Bearer ${jwt}`)
		headers.set('Content-Type', 'application/json')

		const url = `${tenantApiUrl}${path.startsWith('/') ? path : `/${path}`}`
		return fetch(url, {
			...init,
			headers,
		})
	}

	return {
		orgId: organization.id,
		orgSlug: organization.slug,
		dataRegion: organization.dataRegion,
		jwt,
		tenantApiUrl,
		publicTenantApiUrl,
		fetchTenant,
	}
}
