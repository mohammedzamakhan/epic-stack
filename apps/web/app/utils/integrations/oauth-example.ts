/**
 * Example usage of the OAuth flow management system
 * 
 * This file demonstrates how to use the OAuth utilities for third-party integrations
 */

import {
  OAuthFlowManager,
  OAuthStateManager,
  TokenRefreshManager,
} from './oauth-manager'
import type { TokenData, OAuthCallbackParams } from './types'

/**
 * Example: Starting an OAuth flow
 */
export async function startSlackOAuth(organizationId: string): Promise<{
  authUrl: string
  state: string
}> {
  const redirectUri = 'https://yourapp.com/api/oauth/slack/callback'
  
  // Start OAuth flow - this generates a secure state and auth URL
  const result = await OAuthFlowManager.startOAuthFlow(
    organizationId,
    'slack',
    redirectUri,
    {
      // Optional additional parameters
      customData: 'example-value',
      userId: 'user-123',
    }
  )
  
  console.log('OAuth flow started:')
  console.log('- Auth URL:', result.authUrl)
  console.log('- State:', result.state.substring(0, 50) + '...')
  
  return result
}

/**
 * Example: Handling OAuth callback
 */
export async function handleSlackOAuthCallback(
  code: string,
  state: string,
  organizationId?: string
): Promise<{
  tokenData: TokenData
  organizationId: string
  customData?: any
}> {
  const params: OAuthCallbackParams = {
    code,
    state,
    organizationId: organizationId || '', // Will be validated from state
  }
  
  // Complete OAuth flow - this validates state and exchanges code for tokens
  const result = await OAuthFlowManager.completeOAuthFlow('slack', params)
  
  console.log('OAuth callback handled:')
  console.log('- Access token received:', !!result.tokenData.accessToken)
  console.log('- Organization ID:', result.stateData.organizationId)
  console.log('- Custom data:', result.stateData.customData)
  
  return {
    tokenData: result.tokenData,
    organizationId: result.stateData.organizationId,
    customData: result.stateData.customData,
  }
}

/**
 * Example: Managing token refresh
 */
export async function ensureValidSlackToken(
  currentToken: TokenData
): Promise<TokenData> {
  // Check if token needs refresh
  if (TokenRefreshManager.shouldRefreshToken(currentToken)) {
    console.log('Token needs refresh, refreshing...')
    
    try {
      // Refresh token with retry logic
      const newToken = await OAuthFlowManager.ensureValidToken('slack', currentToken)
      
      console.log('Token refreshed successfully')
      return newToken
    } catch (error) {
      console.error('Token refresh failed:', error)
      throw new Error('Token refresh failed - user needs to re-authenticate')
    }
  }
  
  console.log('Token is still valid')
  return currentToken
}

/**
 * Example: Manual state validation (for custom flows)
 */
export function validateCustomOAuthState(state: string): {
  organizationId: string
  providerName: string
  customData?: any
} {
  try {
    const stateData = OAuthStateManager.validateState(state)
    
    console.log('State validation successful:')
    console.log('- Organization:', stateData.organizationId)
    console.log('- Provider:', stateData.providerName)
    console.log('- Timestamp:', new Date(stateData.timestamp).toISOString())
    
    return {
      organizationId: stateData.organizationId,
      providerName: stateData.providerName,
      customData: stateData.customData,
    }
  } catch (error) {
    console.error('State validation failed:', error)
    throw new Error('Invalid OAuth state - possible security issue')
  }
}

/**
 * Example: Token status checking
 */
export function checkTokenStatus(token: TokenData): {
  isValid: boolean
  needsRefresh: boolean
  isExpired: boolean
  expiresIn?: number
} {
  const needsRefresh = TokenRefreshManager.shouldRefreshToken(token)
  const isExpired = TokenRefreshManager.isTokenExpired(token)
  const isValid = !isExpired
  
  let expiresIn: number | undefined
  if (token.expiresAt) {
    expiresIn = Math.max(0, token.expiresAt.getTime() - Date.now())
  }
  
  console.log('Token status:')
  console.log('- Valid:', isValid)
  console.log('- Needs refresh:', needsRefresh)
  console.log('- Expired:', isExpired)
  if (expiresIn !== undefined) {
    console.log('- Expires in:', Math.round(expiresIn / 1000 / 60), 'minutes')
  }
  
  return {
    isValid,
    needsRefresh,
    isExpired,
    expiresIn,
  }
}

/**
 * Example: Complete OAuth integration flow
 */
export class OAuthIntegrationExample {
  private organizationId: string
  
  constructor(organizationId: string) {
    this.organizationId = organizationId
  }
  
  /**
   * Step 1: Initiate OAuth flow
   */
  async initiateOAuth(providerName: string): Promise<string> {
    const redirectUri = `https://yourapp.com/api/oauth/${providerName}/callback`
    
    const result = await OAuthFlowManager.startOAuthFlow(
      this.organizationId,
      providerName,
      redirectUri,
      {
        initiatedBy: 'user',
        timestamp: Date.now(),
      }
    )
    
    // Store state temporarily (in practice, you might store this in a session or cache)
    console.log('Store this state for callback validation:', result.state)
    
    return result.authUrl
  }
  
  /**
   * Step 2: Handle OAuth callback
   */
  async handleCallback(
    providerName: string,
    code: string,
    state: string
  ): Promise<TokenData> {
    const params: OAuthCallbackParams = {
      organizationId: this.organizationId,
      code,
      state,
    }
    
    const result = await OAuthFlowManager.completeOAuthFlow(providerName, params)
    
    // In practice, you would store these tokens securely in your database
    console.log('Integration successful! Store these tokens securely:')
    console.log('- Access token:', result.tokenData.accessToken.substring(0, 20) + '...')
    if (result.tokenData.refreshToken) {
      console.log('- Refresh token:', result.tokenData.refreshToken.substring(0, 20) + '...')
    }
    
    return result.tokenData
  }
  
  /**
   * Step 3: Use tokens for API calls (with automatic refresh)
   */
  async makeApiCall(
    providerName: string,
    currentToken: TokenData,
    apiCall: (token: string) => Promise<any>
  ): Promise<any> {
    // Ensure token is valid (refresh if needed)
    const validToken = await OAuthFlowManager.ensureValidToken(providerName, currentToken)
    
    try {
      // Make API call with valid token
      return await apiCall(validToken.accessToken)
    } catch (error) {
      // Handle API errors (might need re-authentication)
      console.error('API call failed:', error)
      throw error
    }
  }
}

// Example usage:
/*
const integration = new OAuthIntegrationExample('org-123')

// Step 1: Start OAuth
const authUrl = await integration.initiateOAuth('slack')
console.log('Redirect user to:', authUrl)

// Step 2: Handle callback (when user returns from OAuth provider)
const tokens = await integration.handleCallback('slack', 'auth-code', 'oauth-state')

// Step 3: Use tokens for API calls
const channels = await integration.makeApiCall('slack', tokens, async (token) => {
  // Your Slack API call here
  return fetch('https://slack.com/api/conversations.list', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json())
})
*/