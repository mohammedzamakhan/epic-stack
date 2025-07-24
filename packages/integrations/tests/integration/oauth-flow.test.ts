/**
 * Simplified OAuth flow integration test
 */

// Mock Prisma first
vi.mock('@repo/prisma', () => ({
  prisma: {
    integration: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn()
    },
    integrationLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn()
    }
  }
}))

// Mock encryption
vi.mock('../../src/encryption', () => ({
  encryptToken: vi.fn().mockImplementation((token: string) => `encrypted_${token}`),
  decryptToken: vi.fn().mockImplementation((token: string) => token.replace('encrypted_', ''))
}))

// Mock OAuth state manager
vi.mock('../../src/oauth-manager', () => ({
  OAuthStateManager: {
    generateState: vi.fn().mockReturnValue('test-state-123'),
    validateState: vi.fn().mockReturnValue({
      organizationId: 'org-123',
      providerName: 'slack',
      timestamp: Date.now()
    })
  },
  TokenRefreshManager: {
    shouldRefreshToken: vi.fn().mockReturnValue(false),
    isTokenExpired: vi.fn().mockReturnValue(false)
  }
}))

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { integrationService } from '../../src/service'
import { integrationManager } from '../../src/integration-manager'

describe('OAuth Flow Integration Tests (Simplified)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Set up environment variables
    process.env.SLACK_CLIENT_ID = 'test-slack-client-id'
    process.env.SLACK_CLIENT_SECRET = 'test-slack-client-secret'
    process.env.JIRA_CLIENT_ID = 'test-jira-client-id'
    process.env.JIRA_CLIENT_SECRET = 'test-jira-client-secret'
    
    // Register providers dynamically
    const { SlackProvider } = await import('../../src/providers/slack/provider')
    const { JiraProvider } = await import('../../src/providers/jira/provider')
    integrationManager.registerProvider(new SlackProvider())
    integrationManager.registerProvider(new JiraProvider())
    
    // Setup mock responses
    const { prisma } = await import('@repo/prisma')
    
    vi.mocked(prisma.integration.create).mockResolvedValue({
      id: 'integration-123',
      organizationId: 'org-123',
      providerName: 'slack',
      providerType: 'productivity',
      accessToken: 'encrypted_test-access-token',
      refreshToken: 'encrypted_test-refresh-token',
      tokenExpiresAt: new Date(Date.now() + 3600000),
      config: JSON.stringify({ scope: 'channels:read,chat:write' }),
      isActive: true,
      lastSyncAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    vi.mocked(prisma.integrationLog.create).mockResolvedValue({
      id: 'log-123',
      integrationId: 'integration-123',
      action: 'oauth_complete',
      status: 'success',
      requestData: null,
      responseData: null,
      errorMessage: null,
      createdAt: new Date()
    })
  })

  it('should initiate OAuth flow for Slack', async () => {
    const organizationId = 'org-123'
    const redirectUri = 'https://example.com/callback'
    
    const { authUrl, state } = await integrationService.initiateOAuth(
      organizationId,
      'slack',
      redirectUri
    )
    
    expect(authUrl).toContain('slack.com')
    expect(authUrl).toContain('client_id=')
    expect(authUrl).toContain('scope=')
    expect(authUrl).toContain('state=')
    expect(state).toBeTruthy()
  })

  it('should handle OAuth callback for Slack', async () => {
    const organizationId = 'org-123'
    const redirectUri = 'https://example.com/callback'
    
    // Step 1: Initiate OAuth
    const { state } = await integrationService.initiateOAuth(organizationId, 'slack', redirectUri)
    
    // Step 2: Handle OAuth callback
    const callbackParams = {
      organizationId,
      code: 'test-auth-code',
      state
    }
    
    const integration = await integrationService.handleOAuthCallback('slack', callbackParams)
    
    // Verify integration was created
    expect(integration).toBeDefined()
    expect(integration.organizationId).toBe(organizationId)
    expect(integration.providerName).toBe('slack')
    expect(integration.isActive).toBe(true)
    
    // Verify database calls
    const { prisma } = await import('@repo/prisma')
    expect(prisma.integration.create).toHaveBeenCalled()
    expect(prisma.integrationLog.create).toHaveBeenCalled()
  })

  it('should initiate OAuth flow for Jira', async () => {
    const organizationId = 'org-123'
    const redirectUri = 'https://example.com/callback'
    
    const { authUrl, state } = await integrationService.initiateOAuth(
      organizationId,
      'jira',
      redirectUri
    )
    
    expect(authUrl).toContain('atlassian.com')
    expect(authUrl).toContain('client_id=')
    expect(authUrl).toContain('scope=')
    expect(authUrl).toContain('state=')
    expect(state).toBeTruthy()
  })

  it('should handle OAuth errors gracefully', async () => {
    const organizationId = 'org-123'
    
    // Mock OAuth state validation to throw error
    const { OAuthStateManager } = await import('../../src/oauth-manager')
    vi.mocked(OAuthStateManager.validateState).mockImplementationOnce(() => {
      throw new Error('Invalid state')
    })
    
    // Try to handle callback with invalid state
    const callbackParams = {
      organizationId,
      code: 'test-auth-code',
      state: 'invalid-state'
    }
    
    await expect(
      integrationService.handleOAuthCallback('slack', callbackParams)
    ).rejects.toThrow('Invalid OAuth state')
  })

  it('should prevent provider name mismatch in OAuth state', async () => {
    const organizationId = 'org-123'
    const redirectUri = 'https://example.com/callback'
    
    // Mock OAuth state validation to return different provider
    const { OAuthStateManager } = await import('../../src/oauth-manager')
    vi.mocked(OAuthStateManager.validateState).mockReturnValueOnce({
      organizationId: 'org-123',
      providerName: 'slack', // Different from jira
      timestamp: Date.now()
    })
    
    // Initiate OAuth for Slack
    const { state } = await integrationService.initiateOAuth(
      organizationId,
      'slack',
      redirectUri
    )
    
    // Try to complete OAuth for Jira with Slack state
    const callbackParams = {
      organizationId,
      code: 'test-auth-code',
      state
    }
    
    await expect(
      integrationService.handleOAuthCallback('jira', callbackParams)
    ).rejects.toThrow('Provider name mismatch in OAuth state')
  })
})