import type * as DatabaseModule from '@repo/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockDb, queryChain, resetMockDb } from '#tests/setup/drizzle-mock.ts'

vi.mock('@repo/common/onboarding', () => ({
	markStepCompleted: vi.fn(),
}))

vi.mock('@repo/email', () => ({
	OrganizationInviteEmail: vi.fn(),
	sendEmail: vi.fn(),
}))

vi.mock('#app/utils/payments.server.ts', () => ({
	updateSeatQuantity: vi.fn().mockResolvedValue(null),
}))

vi.mock('@repo/database', async (importOriginal) => {
	const actual = await importOriginal<typeof DatabaseModule>()
	const { mockDb, drizzleTable, drizzleOperator } =
		await import('#tests/setup/drizzle-mock.ts')
	return {
		...actual,
		db: mockDb,
		Organization: drizzleTable,
		OrganizationInvitation: drizzleTable,
		OrganizationInviteLink: drizzleTable,
		OrganizationRole: drizzleTable,
		User: drizzleTable,
		UserOrganization: drizzleTable,
		and: drizzleOperator,
		desc: drizzleOperator,
		eq: drizzleOperator,
		gte: drizzleOperator,
		isNull: drizzleOperator,
		lt: drizzleOperator,
		or: drizzleOperator,
	}
})

const linkRow = {
	link: {
		id: 'link-1',
		token: 'link-token',
		organizationId: 'org-1',
		organizationRoleId: 'org_role_member',
		isActive: true,
		createdById: 'admin-1',
	},
	organizationRole: { id: 'org_role_member', name: 'member', level: 3 },
	organization: { id: 'org-1', name: 'Acme', slug: 'acme' },
}

const guestInvitation = {
	invitation: {
		id: 'inv-1',
		email: 'attacker@example.com',
		organizationId: 'org-1',
		organizationRoleId: 'org_role_guest',
		token: 'guest-token',
		expiresAt: new Date(Date.now() + 86_400_000),
	},
	organizationRole: { id: 'org_role_guest', name: 'guest', level: 1 },
	organization: { id: 'org-1', name: 'Acme', slug: 'acme' },
	inviter: { id: 'admin-1', name: 'Admin', email: 'admin@example.com' },
}

describe('createInvitationFromLink', () => {
	beforeEach(() => {
		resetMockDb()
	})

	it('does not overwrite a still-valid pending invitation on conflict', async () => {
		type ConflictUpdate = {
			where?: unknown
			set?: Record<string, unknown>
		}
		const captured: { conflict: ConflictUpdate | null } = { conflict: null }
		let selectCalls = 0
		mockDb.select.mockImplementation(() => {
			selectCalls += 1
			return queryChain(selectCalls === 1 ? [linkRow] : [guestInvitation])
		})
		mockDb.insert.mockImplementation(() => {
			const chain = queryChain([])
			chain.onConflictDoUpdate = (opts: ConflictUpdate) => {
				captured.conflict = opts
				return chain
			}
			return chain
		})

		const { createInvitationFromLink } = await import('./invitation.server.ts')
		const invitation = await createInvitationFromLink(
			'link-token',
			'attacker@example.com',
		)

		expect(captured.conflict?.where).toBeDefined()
		expect(captured.conflict?.set?.organizationRoleId).toBe('org_role_member')
		expect(invitation?.organizationRoleId).toBe('org_role_guest')
	})
})

describe('validateAndAcceptInvitation', () => {
	beforeEach(() => {
		resetMockDb()
	})

	it('rejects accepting an invitation for a different email', async () => {
		let selectCalls = 0
		mockDb.select.mockImplementation(() => {
			selectCalls += 1
			if (selectCalls === 1) {
				return queryChain([guestInvitation])
			}
			return queryChain([{ email: 'not-the-invitee@example.com' }])
		})

		const { validateAndAcceptInvitation } =
			await import('./invitation.server.ts')

		await expect(
			validateAndAcceptInvitation('guest-token', 'user-attacker'),
		).rejects.toMatchObject({ status: 403 })
	})
})
