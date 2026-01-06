/**
 * SSO/OIDC Types
 * Reusable types for OAuth2/OIDC implementations
 */

/**
 * OIDC Discovery Document according to OpenID Connect Discovery 1.0 specification
 */
export interface OIDCDiscoveryDocument {
	issuer: string
	authorization_endpoint: string
	token_endpoint: string
	userinfo_endpoint?: string
	revocation_endpoint?: string
	jwks_uri?: string
	scopes_supported?: string[]
	response_types_supported?: string[]
	grant_types_supported?: string[]
	subject_types_supported?: string[]
	id_token_signing_alg_values_supported?: string[]
	code_challenge_methods_supported?: string[]
	[key: string]: unknown
}

/**
 * OAuth2/OIDC endpoint configuration
 */
export interface EndpointConfiguration {
	authorizationUrl: string
	tokenUrl: string
	userinfoUrl?: string
	revocationUrl?: string
	jwksUrl?: string
}

/**
 * Result of OIDC discovery operation
 */
export interface DiscoveryResult {
	success: boolean
	endpoints?: EndpointConfiguration
	discoveryDocument?: OIDCDiscoveryDocument
	error?: string
}

/**
 * Endpoint validation result
 */
export interface EndpointValidationResult {
	valid: boolean
	errors: string[]
	warnings: string[]
}

/**
 * OIDC UserInfo response
 */
export interface OIDCUserInfo {
	sub: string
	email?: string
	name?: string
	preferred_username?: string
	given_name?: string
	family_name?: string
	picture?: string
	groups?: string[]
	[key: string]: unknown
}

/**
 * OAuth2 Token Set
 */
export interface TokenSet {
	accessToken: string
	refreshToken?: string
	idToken?: string
	expiresAt: Date
	scope: string[]
}

/**
 * Retry operation options
 */
export interface RetryOptions {
	maxAttempts: number
	baseDelay: number
	maxDelay: number
	backoffMultiplier: number
	retryableErrors: string[]
}

/**
 * Result of a retried operation
 */
export interface RetryResult<T> {
	success: boolean
	result?: T
	error?: Error
	attempts: number
	totalDuration: number
}

/**
 * Connection pool statistics
 */
export interface ConnectionPoolStats {
	baseUrl: string
	totalRequests: number
	errorCount: number
	lastUsed: number
	createdAt: number
}

/**
 * Common OIDC provider configurations
 */
export const COMMON_PROVIDERS = {
	okta: {
		name: 'Okta',
		discoveryPath: '/.well-known/openid-configuration',
		scopes: 'openid email profile',
		supportsRefresh: true,
		supportsPKCE: true,
	},
	'azure-ad': {
		name: 'Azure Active Directory',
		discoveryPath: '/v2.0/.well-known/openid-configuration',
		scopes: 'openid email profile',
		supportsRefresh: true,
		supportsPKCE: true,
	},
	auth0: {
		name: 'Auth0',
		discoveryPath: '/.well-known/openid-configuration',
		scopes: 'openid email profile',
		supportsRefresh: true,
		supportsPKCE: true,
	},
	google: {
		name: 'Google',
		discoveryPath: '/.well-known/openid-configuration',
		scopes: 'openid email profile',
		supportsRefresh: true,
		supportsPKCE: true,
	},
} as const

export type CommonProvider = keyof typeof COMMON_PROVIDERS
