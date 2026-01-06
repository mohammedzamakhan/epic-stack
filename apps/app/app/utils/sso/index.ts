/**
 * SSO Utils - App-specific SSO/OIDC utilities
 *
 * This module contains app-specific SSO logic that uses Prisma and app context.
 * For reusable SSO utilities, see @repo/sso package.
 */

// SSO Auth Service
export {
	ssoAuthService,
	SSOAuthService,
	type OIDCUserInfo,
	type TokenSet,
} from './auth.server.ts'

// SSO Configuration Service
export { ssoConfigurationService } from './configuration.server.ts'

// SSO Cache
export { ssoCache } from '@repo/sso'

// SSO Connection Pool
export { ssoConnectionPool, SSOConnectionPool } from '@repo/sso'

// SSO Retry Manager
export { ssoRetryManager, SSORetryManager } from './retry-logic.server.ts'

// OIDC Discovery
export {
	discoverOIDCEndpoints,
	validateDiscoveryDocument,
	validateManualEndpoints,
	resolveEndpoints,
	testEndpointConnectivity,
	normalizeIssuerUrl,
	getDiscoveryUrl,
	COMMON_PROVIDERS,
	type OIDCDiscoveryDocument,
	type EndpointConfiguration,
	type DiscoveryResult,
	type EndpointValidationResult,
	type CommonProvider,
} from '@repo/sso'

// Re-export everything from other SSO files
export * from './audit-logging.server.ts'
export * from './config.server.ts'
export * from './error-handling.server.ts'
// Note: health-check.server.ts has duplicate SSOHealthStatus with monitoring.server.ts
// export * from './health-check.server.ts'
export * from './monitoring.server.ts'
export * from './periodic-validation.server.ts'
export * from './rate-limit.server.ts'
export * from './sanitization.server.ts'
