/**
 * @repo/mcp - MCP OAuth Utilities Package
 *
 * Reusable utilities for MCP (Model Context Protocol) OAuth implementations:
 * - Token generation and hashing
 * - PKCE (Proof Key for Code Exchange) support
 * - Type definitions for OAuth flows
 */

// Types
export {
	TOKEN_EXPIRATION,
	type TokenResponse,
	type AuthorizationCodeEntry,
	type CodeChallengeMethod,
} from './src/types.ts'

// Token Utilities
export {
	generateToken,
	hashToken,
	generateTokenPair,
	verifyToken,
	generateClientId,
} from './src/token-utils.ts'

// PKCE Utilities
export {
	generateCodeVerifier,
	generateCodeChallenge,
	verifyCodeChallenge,
	generatePKCEPair,
} from './src/pkce.ts'
