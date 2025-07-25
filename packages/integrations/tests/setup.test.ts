/**
 * Test to verify the test setup is working correctly
 */

import { describe, it, expect } from 'vitest'
import { server } from './setup'

describe('Test Setup', () => {
	it('should have MSW server configured', () => {
		expect(server).toBeDefined()
	})

	it('should have test environment variables set', () => {
		expect(process.env.NODE_ENV).toBe('test')
		expect(process.env.ENCRYPTION_KEY).toBe('test-encryption-key-32-characters')
		expect(process.env.INTEGRATIONS_OAUTH_STATE_SECRET).toBe(
			'test-oauth-state-secret-32-chars',
		)
	})

	it('should have global test config available', () => {
		expect(globalThis.__TEST_CONFIG__).toBeDefined()
		expect(globalThis.__TEST_CONFIG__.mockApiResponses).toBe(true)
		expect(globalThis.__TEST_CONFIG__.useInMemoryDb).toBe(true)
		expect(globalThis.__TEST_CONFIG__.logLevel).toBe('error')
	})
})
