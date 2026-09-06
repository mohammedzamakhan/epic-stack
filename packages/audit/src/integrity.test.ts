import { describe, expect, it, vi } from 'vitest'
import {
	computeIntegrityHash,
	verifyLogIntegrity,
	type IntegrityFields,
} from './integrity.ts'

const fields: IntegrityFields = {
	id: 'audit-1',
	action: 'USER_LOGIN',
	userId: 'user-1',
	organizationId: 'org-1',
	details: 'User signed in',
	metadata: '{"source":"test"}',
	ipAddress: '203.0.113.2',
	userAgent: 'Vitest',
	resourceType: 'session',
	resourceId: 'session-1',
	targetUserId: null,
	severity: 'info',
	createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

async function withAuditEnv<T>(
	env: Record<string, string>,
	callback: () => T | Promise<T>,
) {
	vi.unstubAllEnvs()
	for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
	try {
		return await callback()
	} finally {
		vi.unstubAllEnvs()
	}
}

describe('audit log integrity', () => {
	it('verifies an untampered, versioned hash', () =>
		withAuditEnv({ AUDIT_LOG_SECRET_KEY: 'primary-secret' }, () => {
			const integrityHash = computeIntegrityHash(fields)

			expect(integrityHash).toMatch(/^v1:[a-f0-9]{64}$/)
			expect(verifyLogIntegrity({ ...fields, integrityHash })).toBe(true)
		}))

	it('detects changes to integrity-protected fields', () =>
		withAuditEnv({ AUDIT_LOG_SECRET_KEY: 'primary-secret' }, () => {
			const integrityHash = computeIntegrityHash(fields)

			expect(
				verifyLogIntegrity({
					...fields,
					details: 'Tampered detail',
					integrityHash,
				}),
			).toBe(false)
		}))

	it('accepts hashes generated with a rotated secret', () =>
		withAuditEnv({ AUDIT_LOG_SECRET_KEY: 'current-secret' }, () => {
			const integrityHash = computeIntegrityHash(fields, 'previous-secret')
			vi.stubEnv('AUDIT_LOG_OLD_SECRET_KEY', 'previous-secret')

			expect(verifyLogIntegrity({ ...fields, integrityHash })).toBe(true)
		}))
})
