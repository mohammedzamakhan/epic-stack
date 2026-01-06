/**
 * MCP Utils - App-specific MCP OAuth utilities
 *
 * This module contains app-specific MCP logic that uses Prisma and app context.
 * For reusable MCP utilities, see @repo/mcp package.
 */

// App-specific MCP OAuth (uses Prisma for persistence)
export {
	ACCESS_TOKEN_EXPIRATION,
	REFRESH_TOKEN_EXPIRATION,
	AUTHORIZATION_CODE_EXPIRATION,
	generateToken,
	hashToken,
	createAuthorizationWithTokens,
	validateAccessToken,
	revokeAuthorization,
	createAuthorizationCode,
	exchangeAuthorizationCode,
	refreshAccessToken,
} from './oauth.server.ts'

// Re-export all from other MCP files
export * from './server.server.ts'
export * from './tools.server.ts'
export * from './audit.server.ts'
