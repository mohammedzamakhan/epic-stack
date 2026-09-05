import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getGlobalSendMax } from './rate-limit.ts'

describe('rate-limit getGlobalSendMax', () => {
	const original = process.env.GLOBAL_SMS_CAP

	beforeEach(() => {
		delete process.env.GLOBAL_SMS_CAP
	})

	afterEach(() => {
		if (original !== undefined) {
			process.env.GLOBAL_SMS_CAP = original
		} else {
			delete process.env.GLOBAL_SMS_CAP
		}
	})

	it('returns default 500 when unset', () => {
		expect(getGlobalSendMax()).toBe(500)
	})

	it('returns parsed integer when valid positive integer', () => {
		process.env.GLOBAL_SMS_CAP = '250'
		expect(getGlobalSendMax()).toBe(250)
	})

	it('falls back to 500 when invalid or non-positive', () => {
		process.env.GLOBAL_SMS_CAP = 'invalid-number'
		expect(getGlobalSendMax()).toBe(500)

		process.env.GLOBAL_SMS_CAP = '-10'
		expect(getGlobalSendMax()).toBe(500)

		process.env.GLOBAL_SMS_CAP = '0'
		expect(getGlobalSendMax()).toBe(500)
	})
})
