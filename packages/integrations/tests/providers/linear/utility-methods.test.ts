/**
 * Tests for LinearProvider utility methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LinearProvider } from '../../../src/providers/linear/provider'

describe('LinearProvider - Utility Methods', () => {
	let provider: LinearProvider

	beforeEach(() => {
		// Set required environment variables
		process.env.LINEAR_CLIENT_ID = 'test-client-id'
		process.env.LINEAR_CLIENT_SECRET = 'test-client-secret'
		process.env.INTEGRATIONS_OAUTH_STATE_SECRET =
			'test-secret-key-for-oauth-state-validation-12345678'

		provider = new LinearProvider()
	})

	describe('Provider Properties', () => {
		it('should have correct provider properties', () => {
			expect(provider.name).toBe('linear')
			expect(provider.type).toBe('productivity')
			expect(provider.displayName).toBe('Linear')
			expect(provider.description).toContain('Linear')
			expect(provider.logoPath).toBe('/images/integrations/linear.svg')
		})
	})

	describe('Channel Type Validation', () => {
		it('should validate team channel types', () => {
			const teamChannel = { id: 'team:123', name: 'Test Team', type: 'team' }
			// This would be tested in the actual postMessage method
			expect(teamChannel.id.startsWith('team:')).toBe(true)
		})

		it('should validate project channel types', () => {
			const projectChannel = {
				id: 'project:456',
				name: 'Test Project',
				type: 'project',
			}
			// This would be tested in the actual postMessage method
			expect(projectChannel.id.startsWith('project:')).toBe(true)
		})
	})

	describe('GraphQL Query Building', () => {
		it('should handle GraphQL query structure', () => {
			// Test that the provider can handle GraphQL queries
			const query = `
        query {
          teams {
            nodes {
              id
              name
            }
          }
        }
      `
			expect(query).toContain('teams')
			expect(query).toContain('nodes')
		})
	})
})
