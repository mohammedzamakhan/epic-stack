import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { Hono, type Context } from 'hono'
import { SignJWT, jwtVerify } from 'jose'
import { sendSms } from '@repo/sms'
import { customers, getTenantDb, TENANT_ORG_ID_PATTERN } from '@repo/tenant-db'
import { ENV } from 'varlock/env'
import { z } from 'zod'
import {
	findActiveOrganizationById,
	resolveOrganizationForBrowserAuth,
	resolvePublishedOrganization,
	type PublishedOrganization,
} from '../lib/origin.ts'
import {
	checkGlobalSendCap,
	rateLimit,
	rateLimitByKey,
} from '../lib/rate-limit.ts'
import { orgMatchesNodeRegion, getNodeRegion } from '../lib/region.ts'
import { getBearerToken, hmacHash } from '../lib/secrets.ts'

export const authRoutes = new Hono()

const sendCodeSchema = z.object({
	slug: z.string().optional(),
	host: z.string().optional(),
	phone: z.string().min(5, 'Phone number is required'),
})

const verifyCodeSchema = z.object({
	slug: z.string().optional(),
	host: z.string().optional(),
	phone: z.string().min(5, 'Phone number is required'),
	code: z.string().length(6, 'Verification code must be 6 digits'),
})

const refreshSchema = z.object({
	refreshToken: z.string().min(1, 'refreshToken is required'),
	orgId: z.string().regex(TENANT_ORG_ID_PATTERN, 'Invalid orgId format'),
})

const logoutSchema = z.object({
	refreshToken: z.string().min(1).optional(),
	orgId: z.string().regex(TENANT_ORG_ID_PATTERN).optional(),
})

const profileSchema = z.object({
	name: z.string().min(2, 'Name is required'),
	email: z.string().email('Invalid email address').or(z.literal('')).optional(),
})

const JWT_SECRET = ENV.JWT_SECRET

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY_DAYS = 30
const REFRESH_TOKEN_EXPIRY_MS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000

function normalizePhone(phone: string) {
	return phone.replace(/[\s\-()]/g, '')
}

function customerNeedsName(name: string | null | undefined) {
	return !name || name.trim().length < 2
}

type TenantDb = Awaited<ReturnType<typeof getTenantDb>>

async function openTenantDb(orgId: string): Promise<TenantDb | null> {
	try {
		return await getTenantDb(orgId)
	} catch (error) {
		console.error('Tenant DB connection error:', error)
		return null
	}
}

async function loadProvisionedOrgDb(
	c: Context,
	body: { slug?: string; host?: string },
) {
	const organization = await resolveOrganizationForBrowserAuth(
		c.req.header('Origin'),
		body,
	)

	if (
		!organization ||
		!organization.hasProvisionedDb ||
		!orgMatchesNodeRegion(organization.dataRegion)
	) {
		return {
			error: c.json(
				{ error: 'Organization not found or DB not provisioned' },
				404,
			),
		}
	}

	const db = await openTenantDb(organization.id)
	if (!db) {
		return { error: c.json({ error: 'Tenant Database unavailable' }, 500) }
	}

	return { organization, db }
}

async function issueSessionTokens(
	db: TenantDb,
	customer: { id: string; name: string },
	organization: PublishedOrganization,
) {
	const accessToken = await issueAccessToken({
		customerId: customer.id,
		orgId: organization.id,
		name: customer.name,
		orgSlug: organization.slug,
		customDomain: organization.customDomain,
	})
	const refreshToken = await issueRefreshToken(db, customer.id)
	return { accessToken, refreshToken }
}

/**
 * Issue a short-lived access token (15 minutes).
 */
async function issueAccessToken(payload: {
	customerId: string
	orgId: string
	name: string
	orgSlug: string
	customDomain?: string | null
}): Promise<string> {
	const secret = new TextEncoder().encode(JWT_SECRET)
	return new SignJWT({
		...payload,
		type: 'access',
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuer('epic-startup')
		.setAudience('tenant-api')
		.setExpirationTime(ACCESS_TOKEN_EXPIRY)
		.sign(secret)
}

/**
 * Generate a cryptographically random refresh token and store its HMAC hash in the DB.
 * Returns the raw token to the caller (browser JS on the tenant site).
 */
async function issueRefreshToken(
	db: Awaited<ReturnType<typeof getTenantDb>>,
	customerId: string,
): Promise<string> {
	const rawToken = crypto.randomBytes(32).toString('hex')
	const tokenHash = hmacHash(rawToken)
	const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS)

	await db
		.update(customers)
		.set({
			refreshTokenHash: tokenHash,
			refreshTokenExpiresAt: expiresAt,
			updatedAt: new Date(),
		})
		.where(eq(customers.id, customerId))
		.run()

	return rawToken
}

/**
 * Authenticate a customer from a Bearer access token.
 */
async function authenticateCustomer(c: Context) {
	const token = getBearerToken(c.req.header('Authorization')) || null

	if (!token) {
		throw c.json({ error: 'Unauthorized' }, 401)
	}
	let decoded: {
		customerId: string
		orgId: string
		orgSlug: string
		customDomain?: string | null
		type?: string
	}

	try {
		const secret = new TextEncoder().encode(JWT_SECRET)
		const { payload } = await jwtVerify(token, secret, {
			issuer: 'epic-startup',
			audience: 'tenant-api',
		})
		decoded = payload as typeof decoded
	} catch {
		throw c.json({ error: 'Invalid or expired token' }, 401)
	}

	if (decoded.type !== 'access') {
		throw c.json({ error: 'Invalid token type. Please re-authenticate.' }, 401)
	}

	const { customerId, orgId } = decoded
	if (!customerId || !orgId) {
		throw c.json({ error: 'Invalid token payload' }, 401)
	}

	let organization = await findActiveOrganizationById(orgId)
	if (!organization && typeof decoded.orgSlug === 'string' && decoded.orgSlug) {
		organization = await resolvePublishedOrganization({ slug: decoded.orgSlug })
		if (organization && organization.id !== orgId) {
			organization = null
		}
	}

	if (!organization || !orgMatchesNodeRegion(organization.dataRegion)) {
		const db = await openTenantDb(orgId)
		if (db && typeof decoded.orgSlug === 'string' && decoded.orgSlug) {
			return {
				decoded,
				db,
				customerId,
				orgId,
				organization: {
					id: orgId,
					slug: decoded.orgSlug,
					customDomain: decoded.customDomain ?? null,
					hasProvisionedDb: true,
					dataRegion: getNodeRegion(),
				},
			}
		}
		throw c.json({ error: 'Organization is no longer active' }, 403)
	}

	const db = await openTenantDb(orgId)
	if (!db) {
		throw c.json({ error: 'Tenant Database unavailable' }, 500)
	}

	return { decoded, db, customerId, orgId, organization }
}

authRoutes.post(
	'/send-code',
	rateLimit('send-code', { maxRequests: 5, windowMs: 10 * 60 * 1000 }),
	async (c) => {
		const body = await c.req.json().catch(() => ({}))
		const parsed = sendCodeSchema.safeParse(body)

		if (!parsed.success) {
			return c.json(
				{ error: parsed.error.errors[0]?.message || 'Invalid payload' },
				400,
			)
		}

		let { phone } = parsed.data
		phone = normalizePhone(phone)
		if (!phone) {
			return c.json({ error: 'Invalid phone number' }, 400)
		}

		const loaded = await loadProvisionedOrgDb(c, parsed.data)
		if ('error' in loaded) return loaded.error
		const { organization, db } = loaded

		const phoneLimit = rateLimitByKey('send-code-phone', phone, {
			maxRequests: 3,
			windowMs: 10 * 60 * 1000,
		})
		if (phoneLimit.limited) {
			return c.json(
				{
					error: 'rate_limit_exceeded',
					error_description:
						'Too many verification attempts for this phone number.',
					retry_after: phoneLimit.retryAfter,
				},
				429,
			)
		}

		const globalLimit = checkGlobalSendCap()
		if (globalLimit.limited) {
			return c.json(
				{
					error: 'rate_limit_exceeded',
					error_description:
						'Service is temporarily unavailable. Please try again later.',
					retry_after: globalLimit.retryAfter,
				},
				429,
			)
		}

		const existing = await db
			.select()
			.from(customers)
			.where(eq(customers.phone, phone))
			.get()

		const code = crypto.randomInt(100000, 999999).toString()
		const hashedCode = hmacHash(code)
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

		if (existing) {
			await db
				.update(customers)
				.set({
					phoneVerificationCode: hashedCode,
					phoneVerificationExpiresAt: expiresAt,
				})
				.where(eq(customers.id, existing.id))
				.run()
		} else {
			await db
				.insert(customers)
				.values({
					name: '',
					phone,
					phoneVerificationCode: hashedCode,
					phoneVerificationExpiresAt: expiresAt,
				})
				.run()
		}

		try {
			await sendSms({
				to: phone,
				message: `Your verification code is: ${code}`,
			})
		} catch (error) {
			console.error('SMS sending error:', error)
			return c.json({ error: 'Failed to send SMS' }, 500)
		}

		return c.json({ success: true })
	},
)

authRoutes.post(
	'/verify',
	rateLimit('verify', { maxRequests: 5, windowMs: 60 * 1000 }),
	async (c) => {
		const body = await c.req.json().catch(() => ({}))
		const parsed = verifyCodeSchema.safeParse(body)

		if (!parsed.success) {
			return c.json(
				{ error: parsed.error.errors[0]?.message || 'Invalid payload' },
				400,
			)
		}

		let { phone, code } = parsed.data
		phone = normalizePhone(phone)

		const loaded = await loadProvisionedOrgDb(c, parsed.data)
		if ('error' in loaded) return loaded.error
		const { organization, db } = loaded

		const customer = await db
			.select()
			.from(customers)
			.where(eq(customers.phone, phone))
			.get()

		if (!customer) {
			return c.json({ error: 'Invalid or expired code' }, 400)
		}

		const hashedIncomingCode = hmacHash(code)

		if (
			!customer.phoneVerificationCode ||
			customer.phoneVerificationCode.length !== hashedIncomingCode.length ||
			!crypto.timingSafeEqual(
				Buffer.from(customer.phoneVerificationCode),
				Buffer.from(hashedIncomingCode),
			) ||
			!customer.phoneVerificationExpiresAt ||
			new Date() > customer.phoneVerificationExpiresAt
		) {
			return c.json({ error: 'Invalid or expired code' }, 400)
		}

		await db
			.update(customers)
			.set({
				phoneVerified: true,
				phoneVerificationCode: null,
				phoneVerificationExpiresAt: null,
			})
			.where(eq(customers.id, customer.id))
			.run()

		const { accessToken, refreshToken } = await issueSessionTokens(
			db,
			customer,
			organization,
		)

		return c.json({
			success: true,
			accessToken,
			refreshToken,
			needsName: customerNeedsName(customer.name),
		})
	},
)

authRoutes.post(
	'/refresh',
	rateLimit('refresh', { maxRequests: 10, windowMs: 60 * 1000 }),
	async (c) => {
		const body = await c.req.json().catch(() => ({}))
		const parsed = refreshSchema.safeParse(body)

		if (!parsed.success) {
			return c.json({ error: 'Missing refreshToken or orgId' }, 400)
		}

		const { refreshToken, orgId } = parsed.data

		const organization = await findActiveOrganizationById(orgId)

		if (!organization || !orgMatchesNodeRegion(organization.dataRegion)) {
			return c.json({ error: 'Organization is no longer active' }, 403)
		}

		const db = await openTenantDb(orgId)
		if (!db) {
			return c.json({ error: 'Tenant Database unavailable' }, 500)
		}

		const tokenHash = hmacHash(refreshToken)

		const customer = await db
			.select()
			.from(customers)
			.where(eq(customers.refreshTokenHash, tokenHash))
			.get()

		if (!customer) {
			return c.json({ error: 'Invalid refresh token' }, 401)
		}

		if (
			!customer.refreshTokenExpiresAt ||
			new Date() > customer.refreshTokenExpiresAt
		) {
			await db
				.update(customers)
				.set({ refreshTokenHash: null, refreshTokenExpiresAt: null })
				.where(eq(customers.id, customer.id))
				.run()
			return c.json(
				{ error: 'Refresh token expired. Please re-authenticate.' },
				401,
			)
		}

		const { accessToken, refreshToken: newRefreshToken } =
			await issueSessionTokens(db, customer, organization)

		return c.json({
			success: true,
			accessToken,
			refreshToken: newRefreshToken,
		})
	},
)

authRoutes.post('/logout', async (c) => {
	const body = await c.req.json().catch(() => ({}))
	const parsed = logoutSchema.safeParse(body)

	if (parsed.success && parsed.data.refreshToken && parsed.data.orgId) {
		try {
			const db = await openTenantDb(parsed.data.orgId)
			if (!db) {
				return c.json({ success: true })
			}
			const tokenHash = hmacHash(parsed.data.refreshToken)

			await db
				.update(customers)
				.set({
					refreshTokenHash: null,
					refreshTokenExpiresAt: null,
					updatedAt: new Date(),
				})
				.where(eq(customers.refreshTokenHash, tokenHash))
				.run()
		} catch (error) {
			console.error('Error invalidating refresh token:', error)
		}
	}

	return c.json({ success: true })
})

authRoutes.post('/profile', async (c) => {
	let auth
	try {
		auth = await authenticateCustomer(c)
	} catch (response) {
		return response as Response
	}

	const { db, customerId } = auth
	const body = await c.req.json().catch(() => ({}))
	const parsed = profileSchema.safeParse(body)

	if (!parsed.success) {
		return c.json(
			{ error: parsed.error.errors[0]?.message || 'Invalid payload' },
			400,
		)
	}

	const { name, email } = parsed.data

	try {
		const existing = await db
			.select()
			.from(customers)
			.where(eq(customers.id, customerId))
			.get()

		if (!existing) {
			return c.json({ error: 'Customer not found' }, 404)
		}

		await db
			.update(customers)
			.set({
				name,
				...(email !== undefined ? { email: email || null } : {}),
				updatedAt: new Date(),
			})
			.where(eq(customers.id, customerId))
			.run()

		const { accessToken, refreshToken } = await issueSessionTokens(
			db,
			{ id: customerId, name },
			auth.organization,
		)

		return c.json({ success: true, accessToken, refreshToken })
	} catch (error) {
		console.error('Error updating customer profile:', error)
		return c.json({ error: 'Internal Server Error' }, 500)
	}
})

authRoutes.get('/me', async (c) => {
	let auth
	try {
		auth = await authenticateCustomer(c)
	} catch (response) {
		return response as Response
	}

	const { db, customerId } = auth

	const customer = await db
		.select()
		.from(customers)
		.where(eq(customers.id, customerId))
		.get()

	if (!customer) {
		return c.json({ error: 'Customer not found' }, 404)
	}

	return c.json({
		customer: {
			id: customer.id,
			name: customer.name,
			email: customer.email,
			phone: customer.phone,
			needsName: customerNeedsName(customer.name),
		},
	})
})
