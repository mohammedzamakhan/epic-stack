import { prisma } from '@repo/database'
import {
	type User,
	type SSOConfiguration,
	type SSOSession,
} from '@repo/database/types'

import { encrypt, decrypt, getSSOMasterKey } from '@repo/security'
import { OAuth2Strategy, CodeChallengeMethod } from 'remix-auth-oauth2'
import {
	discoverOIDCEndpoints,
	type EndpointConfiguration,
} from './oidc-discovery.server.ts'
import { type ProviderUser } from './providers/provider.ts'
import { ssoCache } from './sso-cache.server.ts'
import { ssoConfigurationService } from './sso-configuration.server.ts'
import { ssoConnectionPool } from './sso-connection-pool.server.ts'
import { ssoRetryManager } from './sso-retry-logic.server.ts'

export interface OIDCUserInfo {
	sub: string
	email?: string
	name?: string
	preferred_username?: string
	given_name?: string
	family_name?: string
	picture?: string
	groups?: string[]
	[key: string]: any
}

export interface TokenSet {
	accessToken: string
	refreshToken?: string
	idToken?: string
	expiresAt: Date
	scope: string[]
}

/**
 * Service for managing SSO authentication flows
 */
export class SSOAuthService {
	// Remove in-memory strategies map - now using cache
	// private strategies = new Map<string, OAuth2Strategy<ProviderUser>>()

	/**
	 * Create an OAuth2 strategy for the given SSO configuration
	 */
	async createStrategy(
		config: SSOConfiguration,
	): Promise<OAuth2Strategy<ProviderUser>> {
		const endpoints = await this.resolveEndpoints(config)
		const clientSecret =
			await ssoConfigurationService.getDecryptedClientSecret(config)

		const strategyOptions = {
			clientId: config.clientId,
			clientSecret,
			authorizationEndpoint: endpoints.authorizationUrl,
			tokenEndpoint: endpoints.tokenUrl,
			redirectURI: await this.buildRedirectURI(config.organizationId),
			scopes: config.scopes.split(' '),
			codeChallengeMethod: config.pkceEnabled
				? CodeChallengeMethod.S256
				: undefined,
		}

		// Security: Never log strategy options as they contain sensitive client secrets
		return new OAuth2Strategy(strategyOptions, async ({ tokens, request }) => {
			return this.handleUserInfo(tokens, config, request)
		})
	}

	/**
	 * Get or create a cached strategy for an organization
	 */
	async getStrategy(
		organizationId: string,
	): Promise<OAuth2Strategy<ProviderUser> | null> {
		// Check cache first
		const cachedStrategy = ssoCache.getStrategy(organizationId)
		if (cachedStrategy) {
			return cachedStrategy
		}

		// Load configuration from cache or database
		let config = ssoCache.getConfiguration(organizationId)
		if (!config) {
			config = await ssoConfigurationService.getConfiguration(organizationId)
			if (config) {
				ssoCache.setConfiguration(organizationId, config)
			}
		}

		if (!config || !config.isEnabled) {
			return null
		}

		// Create and cache strategy
		const strategy = await this.createStrategy(config)
		ssoCache.setStrategy(organizationId, strategy)

		return strategy
	}

	/**
	 * Refresh a cached strategy (call when configuration changes)
	 */
	async refreshStrategy(organizationId: string): Promise<void> {
		ssoCache.invalidateConfiguration(organizationId)
		await this.getStrategy(organizationId) // This will recreate it
	}

	/**
	 * Initiate SSO authentication flow
	 */
	async initiateAuth(
		organizationId: string,
		request: Request,
	): Promise<Response> {
		const strategy = await this.getStrategy(organizationId)
		if (!strategy) {
			throw new Error('SSO not configured or enabled for this organization')
		}

		// Use the strategy's authenticate method which returns a Response for redirects
		try {
			await strategy.authenticate(request)
			// If we get here, it means authentication failed or there's an issue
			throw new Error('Unexpected authentication result')
		} catch (error) {
			if (error instanceof Response) {
				return error
			}
			throw error
		}
	}

	/**
	 * Handle OAuth callback and return authenticated user
	 */
	async handleCallback(
		organizationId: string,
		request: Request,
	): Promise<ProviderUser> {
		const strategy = await this.getStrategy(organizationId)
		if (!strategy) {
			throw new Error('SSO not configured or enabled for this organization')
		}

		// Use the strategy's authenticate method which returns user info on callback
		const result = await strategy.authenticate(request)

		// If it's a Response (redirect), throw it to be handled by the framework
		if (result instanceof Response) {
			throw result
		}

		return result as ProviderUser
	}

	/**
	 * Provision or update user from SSO authentication
	 */
	async provisionUser(
		userInfo: OIDCUserInfo,
		config: SSOConfiguration,
	): Promise<User> {
		const attributeMapping = ssoConfigurationService.getAttributeMapping(config)

		// Extract user attributes using mapping
		const email = this.extractAttribute(userInfo, attributeMapping.email!)
		const name = this.extractAttribute(userInfo, attributeMapping.name!)
		const username =
			this.extractAttribute(userInfo, attributeMapping.username!) ||
			email?.split('@')[0] ||
			userInfo.sub

		if (!email) {
			throw new Error('Email is required for user provisioning')
		}

		if (!username) {
			throw new Error('Username is required for user provisioning')
		}

		// Check if user already exists
		const existingUser = await prisma.user.findUnique({
			where: { email: email.toLowerCase() },
		})

		if (existingUser) {
			// Update existing user with SSO attributes
			return this.updateUserFromSSO(existingUser.id, userInfo, config)
		}

		if (!config.autoProvision) {
			throw new Error('User does not exist and auto-provisioning is disabled')
		}

		// Create new user
		const user = await prisma.user.create({
			data: {
				email: email.toLowerCase(),
				username: username.toLowerCase(),
				name: name || email,
				roles: { connect: { name: 'user' } },
			},
		})

		// Add user to organization if not already a member
		await this.ensureOrganizationMembership(
			user.id,
			config.organizationId,
			config.defaultRole,
		)

		return user
	}

	/**
	 * Update existing user with SSO attributes
	 */
	async updateUserFromSSO(
		userId: string,
		userInfo: OIDCUserInfo,
		config: SSOConfiguration,
	): Promise<User> {
		const attributeMapping = ssoConfigurationService.getAttributeMapping(config)

		const name = this.extractAttribute(userInfo, attributeMapping.name!)

		const user = await prisma.user.update({
			where: { id: userId },
			data: {
				...(name && { name }),
				// Update other attributes as needed
			},
		})

		// Ensure user is member of the organization
		await this.ensureOrganizationMembership(
			userId,
			config.organizationId,
			config.defaultRole,
		)

		return user
	}

	/**
	 * Create SSO session with encrypted tokens
	 */
	async createSSOSession(
		sessionId: string,
		ssoConfigId: string,
		providerUserId: string,
		tokens: TokenSet,
	): Promise<SSOSession> {
		const masterKey = getSSOMasterKey()

		return (prisma as any).sSOSession.create({
			data: {
				sessionId,
				ssoConfigId,
				providerUserId,
				accessToken: tokens.accessToken
					? encrypt(tokens.accessToken, masterKey)
					: null,
				refreshToken: tokens.refreshToken
					? encrypt(tokens.refreshToken, masterKey)
					: null,
				tokenExpiresAt: tokens.expiresAt,
			},
		})
	}

	/**
	 * Refresh access tokens using refresh token
	 */
	async refreshTokens(ssoSessionId: string): Promise<TokenSet> {
		const ssoSession = await (prisma as any).sSOSession.findUnique({
			where: { id: ssoSessionId },
			include: { ssoConfig: true },
		})

		if (!ssoSession || !ssoSession.refreshToken) {
			throw new Error('SSO session not found or no refresh token available')
		}

		const masterKey = getSSOMasterKey()
		const refreshToken = decrypt(ssoSession.refreshToken!, masterKey)
		const endpoints = await this.resolveEndpoints(ssoSession.ssoConfig)
		const clientSecret = await ssoConfigurationService.getDecryptedClientSecret(
			ssoSession.ssoConfig,
		)

		// Make token refresh request with retry logic
		const tokenResult = await ssoRetryManager.retryTokenExchange(async () => {
			const response = await ssoConnectionPool.request(endpoints.tokenUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json',
				},
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: refreshToken,
					client_id: ssoSession.ssoConfig.clientId,
					client_secret: clientSecret,
				}),
			})

			if (!response.ok) {
				throw new Error(
					`Token refresh failed: ${response.status} ${response.statusText}`,
				)
			}

			return response.json()
		}, ssoSession.ssoConfig.providerName)

		if (!tokenResult.success) {
			throw new Error(
				`Token refresh failed: ${tokenResult.error?.message || 'Unknown error'}`,
			)
		}

		const tokenData: any = tokenResult.result

		const newTokenSet: TokenSet = {
			accessToken: tokenData.access_token,
			refreshToken: tokenData.refresh_token || refreshToken, // Keep old refresh token if new one not provided
			idToken: tokenData.id_token,
			expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
			scope: tokenData.scope ? tokenData.scope.split(' ') : [],
		}

		// Update stored tokens
		await (prisma as any).sSOSession.update({
			where: { id: ssoSessionId },
			data: {
				accessToken: encrypt(newTokenSet.accessToken, masterKey),
				refreshToken: newTokenSet.refreshToken
					? encrypt(newTokenSet.refreshToken, masterKey)
					: null,
				tokenExpiresAt: newTokenSet.expiresAt,
			},
		})

		return newTokenSet
	}

	/**
	 * Revoke tokens at the identity provider
	 */
	async revokeTokens(ssoSessionId: string): Promise<void> {
		const ssoSession = await (prisma as any).sSOSession.findUnique({
			where: { id: ssoSessionId },
			include: { ssoConfig: true },
		})

		if (!ssoSession) {
			return // Session doesn't exist, nothing to revoke
		}

		const endpoints = await this.resolveEndpoints(ssoSession.ssoConfig)

		if (!endpoints.revocationUrl) {
			// Identity provider doesn't support token revocation
			return
		}

		const masterKey = getSSOMasterKey()
		const clientSecret = await ssoConfigurationService.getDecryptedClientSecret(
			ssoSession.ssoConfig,
		)

		// Revoke access token if available
		if (ssoSession.accessToken && endpoints.revocationUrl) {
			const accessToken = decrypt(ssoSession.accessToken!, masterKey)
			await this.revokeToken(
				endpoints.revocationUrl,
				accessToken,
				ssoSession.ssoConfig.clientId,
				clientSecret,
			)
		}

		// Revoke refresh token if available
		if (ssoSession.refreshToken && endpoints.revocationUrl) {
			const refreshToken = decrypt(ssoSession.refreshToken!, masterKey)
			await this.revokeToken(
				endpoints.revocationUrl,
				refreshToken,
				ssoSession.ssoConfig.clientId,
				clientSecret,
			)
		}

		// Delete the SSO session
		await (prisma as any).sSOSession.delete({
			where: { id: ssoSessionId },
		})
	}

	/**
	 * Handle user info from OAuth callback
	 */
	private async handleUserInfo(
		tokens: any,
		config: SSOConfiguration,
		_request: Request,
	): Promise<ProviderUser & { tokens?: TokenSet }> {
		// Get user info from the identity provider
		const userInfo = await this.fetchUserInfo(tokens.accessToken, config)

		// Provision or update user
		const user = await this.provisionUser(userInfo, config)

		// Prepare token set for session management
		const tokenSet: TokenSet = {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			idToken: tokens.idToken,
			expiresAt: tokens.expiresIn
				? new Date(Date.now() + tokens.expiresIn * 1000)
				: new Date(Date.now() + 3600000), // Default 1 hour
			scope: tokens.scope ? tokens.scope.split(' ') : config.scopes.split(' '),
		}

		return {
			id: user.id,
			email: user.email,
			username: user.username,
			name: user.name ?? undefined,
			tokens: tokenSet,
		}
	}

	/**
	 * Fetch user info from identity provider
	 */
	private async fetchUserInfo(
		accessToken: string,
		config: SSOConfiguration,
	): Promise<OIDCUserInfo> {
		const endpoints = await this.resolveEndpoints(config)

		if (!endpoints.userinfoUrl) {
			throw new Error('UserInfo endpoint not available')
		}

		const userInfoResult = await ssoRetryManager.retryUserInfoFetch(
			async () => {
				const response = await ssoConnectionPool.request(
					endpoints.userinfoUrl!,
					{
						headers: {
							Authorization: `Bearer ${accessToken}`,
							Accept: 'application/json',
						},
					},
				)

				if (!response.ok) {
					throw new Error(
						`Failed to fetch user info: ${response.status} ${response.statusText}`,
					)
				}

				return response.json()
			},
			config.providerName,
		)

		if (!userInfoResult.success) {
			throw new Error(
				`User info fetch failed: ${userInfoResult.error?.message || 'Unknown error'}`,
			)
		}

		return userInfoResult.result as OIDCUserInfo
	}

	/**
	 * Resolve OAuth2 endpoints for a configuration
	 */
	private async resolveEndpoints(
		config: SSOConfiguration,
	): Promise<EndpointConfiguration> {
		if (config.autoDiscovery) {
			const discoveryResult = await ssoRetryManager.retryOIDCDiscovery(
				() => discoverOIDCEndpoints(config.issuerUrl),
				config.issuerUrl,
			)

			if (!discoveryResult.success || !discoveryResult.result?.endpoints) {
				throw new Error(
					`OIDC discovery failed: ${discoveryResult.error?.message || 'Unknown error'}`,
				)
			}
			return discoveryResult.result.endpoints
		} else {
			return {
				authorizationUrl: config.authorizationUrl!,
				tokenUrl: config.tokenUrl!,
				userinfoUrl: config.userinfoUrl ?? undefined,
				revocationUrl: config.revocationUrl ?? undefined,
			}
		}
	}

	/**
	 * Build redirect URI for OAuth callback
	 */
	private async buildRedirectURI(organizationId: string): Promise<string> {
		// Get organization slug for the redirect URI
		const organization = await prisma.organization.findUnique({
			where: { id: organizationId },
			select: { slug: true },
		})

		if (!organization) {
			throw new Error(`Organization not found: ${organizationId}`)
		}

		const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
		return `${baseUrl}/auth/sso/${organization.slug}/callback`
	}

	/**
	 * Extract attribute value using mapping
	 */
	private extractAttribute(
		userInfo: OIDCUserInfo,
		attributePath: string,
	): string | undefined {
		if (!attributePath) return undefined

		// Support dot notation for nested attributes
		const parts = attributePath.split('.')
		let value: any = userInfo

		for (const part of parts) {
			if (value && typeof value === 'object') {
				value = value[part]
			} else {
				return undefined
			}
		}

		return typeof value === 'string' ? value : undefined
	}

	/**
	 * Ensure user is a member of the organization
	 */
	private async ensureOrganizationMembership(
		userId: string,
		organizationId: string,
		defaultRole: string,
	): Promise<void> {
		const existingMembership = await prisma.userOrganization.findUnique({
			where: {
				userId_organizationId: {
					userId,
					organizationId,
				},
			},
		})

		if (!existingMembership) {
			// Find the organization role by name
			const organizationRole = await prisma.organizationRole.findUnique({
				where: { name: defaultRole },
			})

			if (!organizationRole) {
				throw new Error(`Organization role '${defaultRole}' not found`)
			}

			await prisma.userOrganization.create({
				data: {
					userId,
					organizationId,
					organizationRoleId: organizationRole.id,
				},
			})
		}
	}

	/**
	 * Revoke a single token at the identity provider
	 */
	private async revokeToken(
		revocationUrl: string,
		token: string,
		clientId: string,
		clientSecret: string,
	): Promise<void> {
		try {
			await ssoConnectionPool.request(revocationUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json',
				},
				body: new URLSearchParams({
					token,
					client_id: clientId,
					client_secret: clientSecret,
				}),
			})
		} catch (error) {
			// Token revocation is best-effort, don't throw on failure
			console.warn('Token revocation failed:', error)
		}
	}
}

// Export singleton instance
export const ssoAuthService = new SSOAuthService()
