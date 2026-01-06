import { http, HttpResponse } from 'msw'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { server } from '#tests/mocks/index.ts'
import { consoleError, consoleWarn } from '#tests/setup/setup-test-env.ts'
import {
	discoverOIDCEndpoints,
	validateDiscoveryDocument,
	validateManualEndpoints,
	normalizeIssuerUrl,
	type OIDCDiscoveryDocument,
	type EndpointConfiguration,
} from '@repo/sso'
import { ssoCache } from '@repo/sso'

describe('OIDC Discovery (Admin)', () => {
	beforeEach(() => {
		consoleError.mockImplementation(() => {})
		consoleWarn.mockImplementation(() => {})
		// Clear cache before each test to ensure fresh discovery attempts
		ssoCache.clearAll()
	})

	afterEach(() => {
		server.resetHandlers()
	})

	describe('SSRF Protection', () => {
		it('should block private IP addresses (127.0.0.1)', async () => {
			const result = await discoverOIDCEndpoints('https://127.0.0.1')

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid issuer URL')
		})

		it('should block private IP addresses (10.x.x.x)', async () => {
			const result = await discoverOIDCEndpoints('https://10.0.0.1')

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid issuer URL')
		})

		it('should block private IP addresses (192.168.x.x)', async () => {
			const result = await discoverOIDCEndpoints('https://192.168.1.1')

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid issuer URL')
		})

		it('should block private IP addresses (172.16.x.x)', async () => {
			const result = await discoverOIDCEndpoints('https://172.16.0.1')

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid issuer URL')
		})

		it('should block localhost', async () => {
			const result = await discoverOIDCEndpoints('https://localhost')

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid issuer URL')
		})

		it('should block cloud metadata endpoints (AWS)', async () => {
			const result = await discoverOIDCEndpoints('http://169.254.169.254')

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid issuer URL')
		})

		it('should block file:// protocol', async () => {
			const result = await discoverOIDCEndpoints('file:///etc/passwd')

			expect(result.success).toBe(false)
			expect(result.error).toContain('Protocol file is not allowed')
		})

		it('should block internal domains (.local)', async () => {
			const result = await discoverOIDCEndpoints('https://internal.local')

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid issuer URL')
		})

		it('should block internal domains (.internal)', async () => {
			const result = await discoverOIDCEndpoints('https://auth.internal')

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid issuer URL')
		})

		it('should allow valid public HTTPS URLs', async () => {
			const issuerUrl = 'https://auth.example.com'
			const mockDiscoveryDoc: OIDCDiscoveryDocument = {
				issuer: issuerUrl,
				authorization_endpoint: 'https://auth.example.com/oauth2/authorize',
				token_endpoint: 'https://auth.example.com/oauth2/token',
				jwks_uri: 'https://auth.example.com/oauth2/jwks',
			}

			server.use(
				http.get(
					'https://auth.example.com/.well-known/openid-configuration',
					() => {
						return HttpResponse.json(mockDiscoveryDoc, {
							headers: { 'Content-Type': 'application/json' },
						})
					},
				),
			)

			const result = await discoverOIDCEndpoints(issuerUrl)

			expect(result.success).toBe(true)
			expect(result.endpoints).toBeDefined()
		})
	})

	describe('discoverOIDCEndpoints', () => {
		it('should successfully discover OIDC endpoints', async () => {
			const issuerUrl = 'https://auth.example.com'
			const mockDiscoveryDoc: OIDCDiscoveryDocument = {
				issuer: issuerUrl,
				authorization_endpoint: 'https://auth.example.com/oauth2/authorize',
				token_endpoint: 'https://auth.example.com/oauth2/token',
				userinfo_endpoint: 'https://auth.example.com/oauth2/userinfo',
				revocation_endpoint: 'https://auth.example.com/oauth2/revoke',
				jwks_uri: 'https://auth.example.com/oauth2/jwks',
				scopes_supported: ['openid', 'email', 'profile'],
				response_types_supported: ['code'],
				grant_types_supported: ['authorization_code'],
				code_challenge_methods_supported: ['S256'],
			}

			server.use(
				http.get(
					'https://auth.example.com/.well-known/openid-configuration',
					() => {
						return HttpResponse.json(mockDiscoveryDoc, {
							headers: { 'Content-Type': 'application/json' },
						})
					},
				),
			)

			const result = await discoverOIDCEndpoints(issuerUrl)

			expect(result.success).toBe(true)
			expect(result.endpoints).toEqual({
				authorizationUrl: mockDiscoveryDoc.authorization_endpoint,
				tokenUrl: mockDiscoveryDoc.token_endpoint,
				userinfoUrl: mockDiscoveryDoc.userinfo_endpoint,
				revocationUrl: mockDiscoveryDoc.revocation_endpoint,
				jwksUrl: mockDiscoveryDoc.jwks_uri,
			})
			expect(result.discoveryDocument).toEqual(mockDiscoveryDoc)
		})

		it('should handle HTTP error responses', async () => {
			const issuerUrl = 'https://auth.example.com'

			server.use(
				http.get(
					'https://auth.example.com/.well-known/openid-configuration',
					() => {
						return new HttpResponse(null, { status: 404 })
					},
				),
			)

			const result = await discoverOIDCEndpoints(issuerUrl)

			expect(result.success).toBe(false)
			expect(result.error).toBe('HTTP 404: Not Found')
		})

		it('should handle invalid content type', async () => {
			const issuerUrl = 'https://auth.example.com'

			server.use(
				http.get(
					'https://auth.example.com/.well-known/openid-configuration',
					() => {
						return new HttpResponse('Not JSON', {
							headers: { 'Content-Type': 'text/plain' },
						})
					},
				),
			)

			const result = await discoverOIDCEndpoints(issuerUrl)

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid content type')
		})

		it('should handle invalid discovery document', async () => {
			const issuerUrl = 'https://auth.example.com'
			const invalidDoc = {
				issuer: 'https://different.example.com', // Mismatched issuer
				// Missing required endpoints
			}

			server.use(
				http.get(
					'https://auth.example.com/.well-known/openid-configuration',
					() => {
						return HttpResponse.json(invalidDoc, {
							headers: { 'Content-Type': 'application/json' },
						})
					},
				),
			)

			const result = await discoverOIDCEndpoints(issuerUrl)

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid OIDC discovery document')
		})

		it('should normalize issuer URL by removing trailing slash', async () => {
			const issuerUrl = 'https://auth.example.com/'
			const mockDiscoveryDoc: OIDCDiscoveryDocument = {
				issuer: 'https://auth.example.com', // Without trailing slash
				authorization_endpoint: 'https://auth.example.com/oauth2/authorize',
				token_endpoint: 'https://auth.example.com/oauth2/token',
				jwks_uri: 'https://auth.example.com/oauth2/jwks',
			}

			server.use(
				http.get(
					'https://auth.example.com/.well-known/openid-configuration',
					() => {
						return HttpResponse.json(mockDiscoveryDoc, {
							headers: { 'Content-Type': 'application/json' },
						})
					},
				),
			)

			const result = await discoverOIDCEndpoints(issuerUrl)

			expect(result.success).toBe(true)
		})
	})

	describe('validateDiscoveryDocument', () => {
		it('should validate a correct discovery document', () => {
			const doc: OIDCDiscoveryDocument = {
				issuer: 'https://auth.example.com',
				authorization_endpoint: 'https://auth.example.com/oauth2/authorize',
				token_endpoint: 'https://auth.example.com/oauth2/token',
				jwks_uri: 'https://auth.example.com/oauth2/jwks',
				userinfo_endpoint: 'https://auth.example.com/oauth2/userinfo',
				response_types_supported: ['code'],
				grant_types_supported: ['authorization_code'],
				code_challenge_methods_supported: ['S256'],
			}

			const result = validateDiscoveryDocument(doc, 'https://auth.example.com')

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it('should detect missing required fields', () => {
			const doc = {
				issuer: 'https://auth.example.com',
				// Missing authorization_endpoint and token_endpoint
			}

			const result = validateDiscoveryDocument(doc, 'https://auth.example.com')

			expect(result.valid).toBe(false)
			expect(result.errors).toContain(
				'Missing required field: authorization_endpoint',
			)
			expect(result.errors).toContain('Missing required field: token_endpoint')
		})

		it('should detect issuer mismatch', () => {
			const doc = {
				issuer: 'https://different.example.com',
				authorization_endpoint: 'https://auth.example.com/oauth2/authorize',
				token_endpoint: 'https://auth.example.com/oauth2/token',
			}

			const result = validateDiscoveryDocument(doc, 'https://auth.example.com')

			expect(result.valid).toBe(false)
			expect(result.errors).toContain(
				'Issuer mismatch: expected https://auth.example.com, got https://different.example.com',
			)
		})

		it('should detect SSRF-vulnerable URLs in authorization_endpoint', () => {
			const doc = {
				issuer: 'https://auth.example.com',
				authorization_endpoint: 'http://127.0.0.1/authorize', // SSRF attempt
				token_endpoint: 'https://auth.example.com/oauth2/token',
			}

			const result = validateDiscoveryDocument(doc, 'https://auth.example.com')

			expect(result.valid).toBe(false)
			expect(
				result.errors.some((e) => e.includes('authorization_endpoint')),
			).toBe(true)
		})

		it('should detect SSRF-vulnerable URLs in token_endpoint', () => {
			const doc = {
				issuer: 'https://auth.example.com',
				authorization_endpoint: 'https://auth.example.com/oauth2/authorize',
				token_endpoint: 'http://169.254.169.254/token', // AWS metadata SSRF
			}

			const result = validateDiscoveryDocument(doc, 'https://auth.example.com')

			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.includes('token_endpoint'))).toBe(true)
		})

		it('should generate warnings for missing optional fields', () => {
			const doc = {
				issuer: 'https://auth.example.com',
				authorization_endpoint: 'https://auth.example.com/oauth2/authorize',
				token_endpoint: 'https://auth.example.com/oauth2/token',
				// Missing jwks_uri, response_types_supported, etc.
			}

			const result = validateDiscoveryDocument(doc, 'https://auth.example.com')

			expect(result.valid).toBe(true)
			expect(result.warnings).toContain(
				'Missing jwks_uri (recommended for token validation)',
			)
		})
	})

	describe('validateManualEndpoints', () => {
		it('should validate correct manual endpoints', () => {
			const endpoints: EndpointConfiguration = {
				authorizationUrl: 'https://auth.example.com/oauth2/authorize',
				tokenUrl: 'https://auth.example.com/oauth2/token',
				userinfoUrl: 'https://auth.example.com/oauth2/userinfo',
				revocationUrl: 'https://auth.example.com/oauth2/revoke',
				jwksUrl: 'https://auth.example.com/oauth2/jwks',
			}

			const result = validateManualEndpoints(endpoints)

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it('should detect missing required endpoints', () => {
			const endpoints = {
				// Missing authorizationUrl and tokenUrl
				userinfoUrl: 'https://auth.example.com/oauth2/userinfo',
			}

			const result = validateManualEndpoints(endpoints)

			expect(result.valid).toBe(false)
			expect(result.errors).toContain('Authorization URL is required')
			expect(result.errors).toContain('Token URL is required')
		})

		it('should detect SSRF-vulnerable authorization URL', () => {
			const endpoints = {
				authorizationUrl: 'http://10.0.0.1/authorize', // Private IP
				tokenUrl: 'https://auth.example.com/oauth2/token',
			}

			const result = validateManualEndpoints(endpoints)

			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.includes('authorization'))).toBe(true)
		})

		it('should detect SSRF-vulnerable token URL', () => {
			const endpoints = {
				authorizationUrl: 'https://auth.example.com/oauth2/authorize',
				tokenUrl: 'http://localhost:8080/token', // Localhost
			}

			const result = validateManualEndpoints(endpoints)

			expect(result.valid).toBe(false)
			expect(result.errors.some((e) => e.includes('token'))).toBe(true)
		})

		it('should generate warnings for missing optional endpoints', () => {
			const endpoints = {
				authorizationUrl: 'https://auth.example.com/oauth2/authorize',
				tokenUrl: 'https://auth.example.com/oauth2/token',
				// Missing optional endpoints
			}

			const result = validateManualEndpoints(endpoints)

			expect(result.valid).toBe(true)
			expect(result.warnings).toContain(
				'UserInfo endpoint not configured (may limit user attribute retrieval)',
			)
			expect(result.warnings).toContain(
				'Token revocation endpoint not configured (may impact logout security)',
			)
		})
	})

	describe('normalizeIssuerUrl', () => {
		it('should add https:// protocol when missing', () => {
			const result = normalizeIssuerUrl('auth.example.com')
			expect(result).toBe('https://auth.example.com')
		})

		it('should remove trailing slash', () => {
			const result = normalizeIssuerUrl('https://auth.example.com/')
			expect(result).toBe('https://auth.example.com')
		})

		it('should preserve http:// protocol', () => {
			const result = normalizeIssuerUrl('http://auth.example.com/')
			expect(result).toBe('http://auth.example.com')
		})

		it('should handle already normalized URLs', () => {
			const result = normalizeIssuerUrl('https://auth.example.com')
			expect(result).toBe('https://auth.example.com')
		})

		it('should throw error for empty URLs', () => {
			expect(() => normalizeIssuerUrl('')).toThrow('Invalid issuer URL format')
		})

		it('should handle URLs with paths', () => {
			const result = normalizeIssuerUrl(
				'https://auth.example.com/path/to/issuer/',
			)
			expect(result).toBe('https://auth.example.com/path/to/issuer')
		})
	})
})
