import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
	customerRefreshTokens,
	customers,
	destroyTenantDb,
	getTenantDb,
	provisionTenantDb,
} from '@repo/tenant-db'
import { authRoutes } from './auth.ts'
import { hmacHash } from '../lib/secrets.ts'

const orgId = 'clw9x0a12000008l00test06'

vi.mock('../lib/origin.ts', () => ({
	findActiveOrganizationById: vi.fn().mockResolvedValue({
		id: 'clw9x0a12000008l00test06',
		slug: 'refresh-test',
		customDomain: null,
		hasProvisionedDb: true,
		dataRegion: 'us',
	}),
	resolveOrganizationForBrowserAuth: vi.fn(),
	resolvePublishedOrganization: vi.fn(),
}))

describe('refresh token rotation', () => {
	let app: Hono
	let tempDir: string
	let legacyRefreshToken: string

	beforeEach(async () => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenant-api-refresh-test-'))
		process.env.TENANT_DB_DIR = tempDir
		process.env.DATA_REGION = 'us'
		process.env.JWT_SECRET = 'test-jwt-secret-123456789'
		process.env.AUTH_HMAC_SECRET = 'test-hmac-secret-123456789'

		await provisionTenantDb(orgId)
		legacyRefreshToken = 'legacy-refresh-token'
		const db = await getTenantDb(orgId)
		await db.insert(customers).values({
			name: 'Refresh Customer',
			phone: '+15555550106',
			phoneVerified: true,
			refreshTokenHash: hmacHash(legacyRefreshToken),
			refreshTokenExpiresAt: new Date(Date.now() + 60_000),
		})

		app = new Hono()
		app.route('/auth', authRoutes)
	})

	afterEach(async () => {
		await destroyTenantDb(orgId).catch(() => {})
		fs.rmSync(tempDir, { recursive: true, force: true })
		delete process.env.TENANT_DB_DIR
	})

	it('revokes the current session when a rotated refresh token is reused', async () => {
		const legacyRefresh = await app.request('/auth/refresh', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken: legacyRefreshToken, orgId }),
		})
		expect(legacyRefresh.status).toBe(200)
		const firstToken = (await legacyRefresh.json()).refreshToken as string

		const firstRotation = await app.request('/auth/refresh', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken: firstToken, orgId }),
		})
		expect(firstRotation.status).toBe(200)
		const currentToken = (await firstRotation.json()).refreshToken as string

		const replay = await app.request('/auth/refresh', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken: firstToken, orgId }),
		})
		expect(replay.status).toBe(401)

		const currentSession = await app.request('/auth/refresh', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken: currentToken, orgId }),
		})
		expect(currentSession.status).toBe(401)

		const db = await getTenantDb(orgId)
		const tokens = await db.select().from(customerRefreshTokens).all()
		expect(tokens).toHaveLength(2)
		expect(tokens.every((token) => token.revokedAt)).toBe(true)
		const customer = await db
			.select()
			.from(customers)
			.where(eq(customers.phone, '+15555550106'))
			.get()
		expect(customer?.refreshTokenHash).toBeNull()
	})

	it('does not leave a valid token behind when concurrent rotation detects reuse', async () => {
		const legacyRefresh = await app.request('/auth/refresh', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken: legacyRefreshToken, orgId }),
		})
		expect(legacyRefresh.status).toBe(200)
		const firstToken = (await legacyRefresh.json()).refreshToken as string

		const [firstAttempt, replayAttempt] = await Promise.all([
			app.request('/auth/refresh', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken: firstToken, orgId }),
			}),
			app.request('/auth/refresh', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken: firstToken, orgId }),
			}),
		])
		expect([firstAttempt.status, replayAttempt.status].sort()).toEqual([
			200, 401,
		])

		const successfulRotation =
			firstAttempt.status === 200 ? firstAttempt : replayAttempt
		const currentToken = (await successfulRotation.json())
			.refreshToken as string
		const currentSession = await app.request('/auth/refresh', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken: currentToken, orgId }),
		})
		expect(currentSession.status).toBe(401)
	})
})
