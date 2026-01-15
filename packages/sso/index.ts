/**
 * @repo/sso - SSO/OIDC Utilities Package
 *
 * Reusable utilities for OAuth2/OIDC implementations:
 * - Type definitions for OIDC discovery and auth flows
 * - Connection pooling for identity provider requests
 * - Retry logic with exponential backoff and circuit breaker
 */

// Types
export {
	type OIDCDiscoveryDocument,
	type EndpointConfiguration,
	type DiscoveryResult,
	type EndpointValidationResult,
	type OIDCUserInfo,
	type TokenSet,
	type RetryOptions,
	type RetryResult,
	type ConnectionPoolStats,
	COMMON_PROVIDERS,
	type CommonProvider,
} from './src/types.ts'

// Connection Pool
export {
	SSOConnectionPool,
	createConnectionPool,
} from './src/connection-pool.ts'

// Retry Logic
export { SSORetryManager, createRetryManager } from './src/retry-logic.ts'
export * from './src/cache.server.ts'
export * from './src/connection-pool.server.ts'
export * from './src/oidc-discovery.server.ts'
export * from './src/health-check.server.ts'
export * from './src/id-token-validator.server.ts'
