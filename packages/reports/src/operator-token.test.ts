import { describe, expect, it } from 'vitest'
import {
	mintOperatorAnalyticsToken,
	verifyOperatorAnalyticsToken,
} from './operator-token.ts'

const secret = 'dev-internal-command-token-do-not-use-in-prod'

describe('operator analytics token', () => {
	it('round-trips claims', async () => {
		const { token } = await mintOperatorAnalyticsToken({
			internalCommandToken: secret,
			userId: 'user_1',
			orgId: 'org_1',
			role: 'operator',
		})
		const claims = await verifyOperatorAnalyticsToken({
			internalCommandToken: secret,
			token,
		})
		expect(claims).toEqual({
			userId: 'user_1',
			orgId: 'org_1',
			role: 'operator',
			scope: 'analytics',
		})
	})

	it('rejects a token signed with a different secret', async () => {
		const { token } = await mintOperatorAnalyticsToken({
			internalCommandToken: secret,
			userId: 'user_1',
			orgId: 'org_1',
			role: 'operator',
		})
		const claims = await verifyOperatorAnalyticsToken({
			internalCommandToken: `${secret}-other`,
			token,
		})
		expect(claims).toBeNull()
	})
})
