/**
 * MCP OAuth Types
 * Reusable types for MCP (Model Context Protocol) OAuth implementations
 */

/**
 * Token expiration constants (in milliseconds)
 */
export const TOKEN_EXPIRATION = {
	ACCESS_TOKEN: 60 * 60 * 1000, // 1 hour
	REFRESH_TOKEN: 30 * 24 * 60 * 60 * 1000, // 30 days
	AUTHORIZATION_CODE: 10 * 60 * 1000, // 10 minutes
} as const

/**
 * OAuth2 token response
 */
export interface TokenResponse {
	access_token: string
	refresh_token?: string
	token_type: 'Bearer'
	expires_in: number
}

/**
 * Authorization code cache entry
 */
export interface AuthorizationCodeEntry {
	userId: string
	organizationId: string
	clientName: string
	expiresAt: number
	codeChallenge?: string
	codeChallengeMethod?: 'S256' | 'plain'
}

/**
 * PKCE code challenge methods
 */
export type CodeChallengeMethod = 'S256' | 'plain'
