import { invariant } from '@epic-web/invariant'
import { requireUserId } from '@repo/auth'
import { and, db, eq, Organization, UserOrganization } from '@repo/database'
import { SignJWT } from 'jose'
import { ENV } from 'varlock/env'

export interface OperatorTenantClient {
	orgId: string
	orgSlug: string
	dataRegion: string
	jwt: string
	tenantApiUrl: string
	fetchTenant: (path: string, init?: RequestInit) => Promise<Response>
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
		.setExpirationTime('15m')
		.sign(secret)

	const tenantApiUrl =
		organization.dataRegion === 'ksa'
			? process.env.TENANT_API_URL_KSA || 'http://localhost:3009'
			: process.env.TENANT_API_URL || 'http://localhost:3007'

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
		fetchTenant,
	}
}
