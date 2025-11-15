/**
 * OIDC Discovery and endpoint resolution utilities
 * Implements OpenID Connect Discovery 1.0 specification
 */

import { ssoCache } from './sso-cache.server.ts'
import { ssoConnectionPool } from './sso-connection-pool.server.ts'

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
	[key: string]: any
}

export interface EndpointConfiguration {
	authorizationUrl: string
	tokenUrl: string
	userinfoUrl?: string
	revocationUrl?: string
	jwksUrl?: string
}

export interface DiscoveryResult {
	success: boolean
	endpoints?: EndpointConfiguration
	discoveryDocument?: OIDCDiscoveryDocument
	error?: string
}

export interface EndpointValidationResult {
	valid: boolean
	errors: string[]
	warnings: string[]
}

/**
 * Discover OIDC endpoints from .well-known/openid-configuration
 */
export async function discoverOIDCEndpoints(
	issuerUrl: string,
): Promise<DiscoveryResult> {
	console.log('=== OIDC DISCOVERY START (Main App) ===')
	console.log('Starting OIDC discovery for:', issuerUrl)
	console.log('NODE_ENV:', process.env.NODE_ENV)

	try {
		// Normalize issuer URL (remove trailing slash)
		const normalizedIssuer = issuerUrl.replace(/\/$/, '')
		console.log('Normalized issuer URL:', normalizedIssuer)

		// Check cache first
		console.log('Checking cache for endpoints...')
		const cachedEndpoints = ssoCache.getEndpoints(normalizedIssuer)
		if (cachedEndpoints) {
			console.log('Using cached endpoints:', cachedEndpoints)
			return {
				success: true,
				endpoints: cachedEndpoints,
			}
		}
		console.log('No cached endpoints found, proceeding with discovery...')

		// IMMEDIATE FALLBACK FOR DEVELOPMENT
		if (process.env.NODE_ENV === 'development') {
			console.log('=== DEVELOPMENT MODE DETECTED - USING FALLBACK ===')

			if (normalizedIssuer.includes('okta.com')) {
				console.log('Using fallback Okta OIDC configuration for development')
				const fallbackEndpoints: EndpointConfiguration = {
					authorizationUrl: `${normalizedIssuer}/v1/authorize`,
					tokenUrl: `${normalizedIssuer}/v1/token`,
					userinfoUrl: `${normalizedIssuer}/v1/userinfo`,
					revocationUrl: `${normalizedIssuer}/v1/revoke`,
					jwksUrl: `${normalizedIssuer}/v1/keys`,
				}

				console.log('Fallback endpoints:', fallbackEndpoints)

				return {
					success: true,
					endpoints: fallbackEndpoints,
					discoveryDocument: {
						issuer: normalizedIssuer,
						authorization_endpoint: fallbackEndpoints.authorizationUrl,
						token_endpoint: fallbackEndpoints.tokenUrl,
						userinfo_endpoint: fallbackEndpoints.userinfoUrl,
						revocation_endpoint: fallbackEndpoints.revocationUrl,
						jwks_uri: fallbackEndpoints.jwksUrl,
					} as OIDCDiscoveryDocument,
				}
			}

			if (normalizedIssuer === 'https://accounts.google.com') {
				console.log('Using fallback Google OIDC configuration for development')
				const fallbackEndpoints: EndpointConfiguration = {
					authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
					tokenUrl: 'https://oauth2.googleapis.com/token',
					userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
					revocationUrl: 'https://oauth2.googleapis.com/revoke',
					jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
				}

				return {
					success: true,
					endpoints: fallbackEndpoints,
					discoveryDocument: {
						issuer: 'https://accounts.google.com',
						authorization_endpoint: fallbackEndpoints.authorizationUrl,
						token_endpoint: fallbackEndpoints.tokenUrl,
						userinfo_endpoint: fallbackEndpoints.userinfoUrl,
						revocation_endpoint: fallbackEndpoints.revocationUrl,
						jwks_uri: fallbackEndpoints.jwksUrl,
					} as OIDCDiscoveryDocument,
				}
			}
		}

		// Continue with network discovery if no fallback was used
		// (normalizedIssuer is already declared above in the fallback section)

		const discoveryUrl = `${normalizedIssuer}/.well-known/openid-configuration`

		const response = await ssoConnectionPool.request(discoveryUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'User-Agent': 'Epic-Notes-SSO/1.0',
			},
		})

		if (!response.ok) {
			return {
				success: false,
				error: `HTTP ${response.status}: ${response.statusText}`,
			}
		}

		const contentType = response.headers.get('content-type')
		if (!contentType?.includes('application/json')) {
			return {
				success: false,
				error: `Invalid content type: expected application/json, got ${contentType}`,
			}
		}

		const discoveryDoc = (await response.json()) as OIDCDiscoveryDocument

		// Validate the discovery document
		const validation = validateDiscoveryDocument(discoveryDoc, normalizedIssuer)
		if (!validation.valid) {
			return {
				success: false,
				error: `Invalid OIDC discovery document: ${validation.errors.join(', ')}`,
			}
		}

		const endpoints: EndpointConfiguration = {
			authorizationUrl: discoveryDoc.authorization_endpoint,
			tokenUrl: discoveryDoc.token_endpoint,
			userinfoUrl: discoveryDoc.userinfo_endpoint,
			revocationUrl: discoveryDoc.revocation_endpoint,
			jwksUrl: discoveryDoc.jwks_uri,
		}

		// Cache the discovered endpoints
		ssoCache.setEndpoints(normalizedIssuer, endpoints)

		return {
			success: true,
			endpoints,
			discoveryDocument: discoveryDoc,
		}
	} catch (error) {
		if (error instanceof Error) {
			if (error.name === 'AbortError') {
				return {
					success: false,
					error: 'Request timeout: OIDC discovery took too long',
				}
			}
			return {
				success: false,
				error: `Network error: ${error.message}`,
			}
		}
		return {
			success: false,
			error: 'Unknown error occurred during OIDC discovery',
		}
	}
}

/**
 * Validate OIDC discovery document according to specification
 */
export function validateDiscoveryDocument(
	doc: any,
	expectedIssuer: string,
): EndpointValidationResult {
	const errors: string[] = []
	const warnings: string[] = []

	// Required fields according to OIDC Discovery spec
	if (!doc.issuer) {
		errors.push('Missing required field: issuer')
	} else if (doc.issuer !== expectedIssuer) {
		errors.push(
			`Issuer mismatch: expected ${expectedIssuer}, got ${doc.issuer}`,
		)
	}

	if (!doc.authorization_endpoint) {
		errors.push('Missing required field: authorization_endpoint')
	} else if (!isValidUrl(doc.authorization_endpoint)) {
		errors.push('Invalid authorization_endpoint URL')
	}

	if (!doc.token_endpoint) {
		errors.push('Missing required field: token_endpoint')
	} else if (!isValidUrl(doc.token_endpoint)) {
		errors.push('Invalid token_endpoint URL')
	}

	if (!doc.jwks_uri) {
		warnings.push('Missing jwks_uri (recommended for token validation)')
	} else if (!isValidUrl(doc.jwks_uri)) {
		errors.push('Invalid jwks_uri URL')
	}

	// Optional but commonly used fields
	if (doc.userinfo_endpoint && !isValidUrl(doc.userinfo_endpoint)) {
		errors.push('Invalid userinfo_endpoint URL')
	}

	if (doc.revocation_endpoint && !isValidUrl(doc.revocation_endpoint)) {
		errors.push('Invalid revocation_endpoint URL')
	}

	// Validate supported features
	if (
		doc.response_types_supported &&
		!doc.response_types_supported.includes('code')
	) {
		warnings.push('Authorization code flow not explicitly supported')
	}

	if (
		doc.grant_types_supported &&
		!doc.grant_types_supported.includes('authorization_code')
	) {
		warnings.push('Authorization code grant type not explicitly supported')
	}

	if (
		doc.code_challenge_methods_supported &&
		!doc.code_challenge_methods_supported.includes('S256')
	) {
		warnings.push('PKCE with S256 not supported (security recommendation)')
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	}
}

/**
 * Validate manually configured endpoints
 */
export function validateManualEndpoints(
	endpoints: Partial<EndpointConfiguration>,
): EndpointValidationResult {
	const errors: string[] = []
	const warnings: string[] = []

	// Required endpoints
	if (!endpoints.authorizationUrl) {
		errors.push('Authorization URL is required')
	} else if (!isValidUrl(endpoints.authorizationUrl)) {
		errors.push('Invalid authorization URL')
	}

	if (!endpoints.tokenUrl) {
		errors.push('Token URL is required')
	} else if (!isValidUrl(endpoints.tokenUrl)) {
		errors.push('Invalid token URL')
	}

	// Optional endpoints
	if (endpoints.userinfoUrl && !isValidUrl(endpoints.userinfoUrl)) {
		errors.push('Invalid userinfo URL')
	}

	if (endpoints.revocationUrl && !isValidUrl(endpoints.revocationUrl)) {
		errors.push('Invalid revocation URL')
	}

	if (endpoints.jwksUrl && !isValidUrl(endpoints.jwksUrl)) {
		errors.push('Invalid JWKS URL')
	}

	// Warnings for missing optional but recommended endpoints
	if (!endpoints.userinfoUrl) {
		warnings.push(
			'UserInfo endpoint not configured (may limit user attribute retrieval)',
		)
	}

	if (!endpoints.revocationUrl) {
		warnings.push(
			'Token revocation endpoint not configured (may impact logout security)',
		)
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	}
}

/**
 * Resolve endpoints with fallback from auto-discovery to manual configuration
 */
export async function resolveEndpoints(
	issuerUrl: string,
	manualEndpoints?: Partial<EndpointConfiguration>,
	preferAutoDiscovery: boolean = true,
): Promise<DiscoveryResult> {
	if (preferAutoDiscovery) {
		// Try auto-discovery first
		const discoveryResult = await discoverOIDCEndpoints(issuerUrl)
		if (discoveryResult.success) {
			return discoveryResult
		}

		// Fall back to manual configuration if discovery fails
		if (manualEndpoints) {
			const validation = validateManualEndpoints(manualEndpoints)
			if (validation.valid) {
				return {
					success: true,
					endpoints: manualEndpoints as EndpointConfiguration,
				}
			} else {
				return {
					success: false,
					error: `Manual endpoint validation failed: ${validation.errors.join(', ')}`,
				}
			}
		}

		return discoveryResult // Return original discovery error
	} else {
		// Use manual configuration first
		if (manualEndpoints) {
			const validation = validateManualEndpoints(manualEndpoints)
			if (validation.valid) {
				return {
					success: true,
					endpoints: manualEndpoints as EndpointConfiguration,
				}
			}
		}

		// Fall back to auto-discovery
		return discoverOIDCEndpoints(issuerUrl)
	}
}

/**
 * Test endpoint connectivity
 */
export async function testEndpointConnectivity(
	endpoints: EndpointConfiguration,
): Promise<{
	authorizationEndpoint: boolean
	tokenEndpoint: boolean
	userinfoEndpoint?: boolean
	revocationEndpoint?: boolean
	errors: string[]
}> {
	const results = {
		authorizationEndpoint: false,
		tokenEndpoint: false,
		userinfoEndpoint: undefined as boolean | undefined,
		revocationEndpoint: undefined as boolean | undefined,
		errors: [] as string[],
	}

	// Test authorization endpoint (should return 400 for missing parameters)
	try {
		const authResponse = await ssoConnectionPool.request(
			endpoints.authorizationUrl,
			{
				method: 'GET',
			},
		)
		// 400 is expected for missing OAuth parameters
		results.authorizationEndpoint =
			authResponse.status === 400 || authResponse.status === 302
		if (!results.authorizationEndpoint) {
			results.errors.push(
				`Authorization endpoint returned unexpected status: ${authResponse.status}`,
			)
		}
	} catch (error) {
		results.errors.push(
			`Authorization endpoint unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
		)
	}

	// Test token endpoint (should return 400 for missing parameters)
	try {
		const tokenResponse = await ssoConnectionPool.request(endpoints.tokenUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: '',
		})
		// 400 is expected for missing OAuth parameters
		results.tokenEndpoint = tokenResponse.status === 400
		if (!results.tokenEndpoint) {
			results.errors.push(
				`Token endpoint returned unexpected status: ${tokenResponse.status}`,
			)
		}
	} catch (error) {
		results.errors.push(
			`Token endpoint unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
		)
	}

	// Test userinfo endpoint if provided (should return 401 for missing token)
	if (endpoints.userinfoUrl) {
		try {
			const userinfoResponse = await ssoConnectionPool.request(
				endpoints.userinfoUrl,
				{
					method: 'GET',
				},
			)
			// 401 is expected for missing authorization header
			results.userinfoEndpoint = userinfoResponse.status === 401
			if (!results.userinfoEndpoint) {
				results.errors.push(
					`UserInfo endpoint returned unexpected status: ${userinfoResponse.status}`,
				)
			}
		} catch (error) {
			results.userinfoEndpoint = false
			results.errors.push(
				`UserInfo endpoint unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	}

	// Test revocation endpoint if provided (should return 400 for missing parameters)
	if (endpoints.revocationUrl) {
		try {
			const revocationResponse = await ssoConnectionPool.request(
				endpoints.revocationUrl,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: '',
				},
			)
			// 400 is expected for missing parameters
			results.revocationEndpoint = revocationResponse.status === 400
			if (!results.revocationEndpoint) {
				results.errors.push(
					`Revocation endpoint returned unexpected status: ${revocationResponse.status}`,
				)
			}
		} catch (error) {
			results.revocationEndpoint = false
			results.errors.push(
				`Revocation endpoint unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	}

	return results
}

/**
 * Extract issuer URL from various input formats
 */
export function normalizeIssuerUrl(input: string): string {
	try {
		// Handle common input formats
		let url = input.trim()

		// Add https:// if no protocol specified
		if (!url.startsWith('http://') && !url.startsWith('https://')) {
			url = `https://${url}`
		}

		// Remove trailing slash
		url = url.replace(/\/$/, '')

		// Validate URL format
		new URL(url) // This will throw if invalid

		return url
	} catch {
		throw new Error(`Invalid issuer URL format: ${input}`)
	}
}

/**
 * Simple URL validation
 */
function isValidUrl(urlString: string): boolean {
	try {
		const url = new URL(urlString)
		return url.protocol === 'http:' || url.protocol === 'https:'
	} catch {
		return false
	}
}

/**
 * Get well-known OIDC discovery URL for an issuer
 */
export function getDiscoveryUrl(issuerUrl: string): string {
	const normalizedIssuer = normalizeIssuerUrl(issuerUrl)
	return `${normalizedIssuer}/.well-known/openid-configuration`
}

/**
 * Common OIDC provider configurations for quick setup
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
