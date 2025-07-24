/**
 * Tests for AsanaProvider utility methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AsanaProvider } from '../../../src/providers/asana/provider'
import { OAuthStateManager } from '../../../src/oauth-manager'

describe('AsanaProvider - Utility Methods', () => {
    let provider: AsanaProvider

    beforeEach(() => {
        // Set required environment variables
        process.env.ASANA_CLIENT_ID = 'test-client-id'
        process.env.ASANA_CLIENT_SECRET = 'test-client-secret'
        process.env.INTEGRATIONS_OAUTH_STATE_SECRET = 'test-secret-key-for-oauth-state-validation-12345678'

        provider = new AsanaProvider()
    })

    describe('Provider Properties', () => {
        it('should have correct provider properties', () => {
            expect(provider.name).toBe('asana')
            expect(provider.type).toBe('productivity')
            expect(provider.displayName).toBe('Asana')
            expect(provider.description).toContain('Asana')
            expect(provider.logoPath).toBe('/icons/asana.svg')
        })
    })

    describe('Error Handling', () => {
        it('should handle missing client ID', async () => {
            delete process.env.ASANA_CLIENT_ID

            await expect(
                provider.getAuthUrl('org-123', 'http://localhost:3000/callback')
            ).rejects.toThrow('ASANA_CLIENT_ID environment variable is required')
        })

        it('should handle missing client secret', async () => {
            delete process.env.ASANA_CLIENT_SECRET

            const validState = OAuthStateManager.generateState('org-123', 'asana')
            await expect(
                provider.handleCallback({ code: 'test-code', state: validState, organizationId: 'org-id' })
            ).rejects.toThrow('ASANA_CLIENT_SECRET environment variable is required')
        })
    })
})