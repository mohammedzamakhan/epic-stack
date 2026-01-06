import { type SSOConfiguration } from '@repo/database/types'
import { encrypt, decrypt, getSSOMasterKey } from '@repo/security'
import { prisma } from '@repo/database'
import {
	discoverOIDCEndpoints,
	testEndpointConnectivity,
	type DiscoveryResult as OIDCDiscoveryResult,
	type EndpointConfiguration,
} from '@repo/sso'

export interface SSOConfigInput {
	providerName: string
	issuerUrl: string
	clientId: string
	clientSecret: string
	scopes?: string
	autoDiscovery?: boolean
	pkceEnabled?: boolean
	autoProvision?: boolean
	defaultRole?: string
	attributeMapping?: Record<string, string>
}

export interface ConnectionTestResult {
	success: boolean
	message: string
	error?: string
	discoveredEndpoints?: {
		authorizationUrl?: string
		tokenUrl?: string
		userinfoUrl?: string
		revocationUrl?: string
	}
}

/**
 * Service for managing SSO configurations
 */
export class SSOConfigurationService {
	/**
	 * Create a new SSO configuration for an organization
	 */
	async createConfiguration(
		organizationId: string,
		config: SSOConfigInput,
		createdById?: string,
	): Promise<SSOConfiguration> {
		const masterKey = getSSOMasterKey()
		const encryptedSecret = encrypt(config.clientSecret, masterKey)

		return (prisma as any).sSOConfiguration.create({
			data: {
				organizationId,
				providerName: config.providerName,
				issuerUrl: config.issuerUrl,
				clientId: config.clientId,
				clientSecret: encryptedSecret,
				scopes: config.scopes || 'openid email profile',
				autoDiscovery: config.autoDiscovery ?? true,
				pkceEnabled: config.pkceEnabled ?? true,
				autoProvision: config.autoProvision ?? true,
				defaultRole: config.defaultRole || 'member',
				attributeMapping: config.attributeMapping
					? JSON.stringify(config.attributeMapping)
					: null,
				createdById,
			},
		})
	}

	/**
	 * Update an existing SSO configuration
	 */
	async updateConfiguration(
		id: string,
		config: Partial<SSOConfigInput>,
	): Promise<SSOConfiguration> {
		const updateData: any = { ...config }

		// Encrypt client secret if provided
		if (config.clientSecret) {
			const masterKey = getSSOMasterKey()
			updateData.clientSecret = encrypt(config.clientSecret, masterKey)
		}

		// Handle attribute mapping
		if (config.attributeMapping) {
			updateData.attributeMapping = JSON.stringify(config.attributeMapping)
		}

		return (prisma as any).sSOConfiguration.update({
			where: { id },
			data: updateData,
		})
	}

	/**
	 * Get SSO configuration for an organization
	 */
	async getConfiguration(
		organizationId: string,
	): Promise<SSOConfiguration | null> {
		return (prisma as any).sSOConfiguration.findUnique({
			where: { organizationId },
			include: {
				organization: true,
				createdBy: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		})
	}

	/**
	 * Get SSO configuration by ID
	 */
	async getConfigurationById(id: string): Promise<SSOConfiguration | null> {
		return (prisma as any).sSOConfiguration.findUnique({
			where: { id },
			include: {
				organization: true,
				createdBy: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		})
	}

	/**
	 * Delete an SSO configuration
	 */
	async deleteConfiguration(id: string): Promise<void> {
		await (prisma as any).sSOConfiguration.delete({
			where: { id },
		})
	}

	/**
	 * Enable or disable SSO for an organization
	 */
	async toggleConfiguration(id: string, isEnabled: boolean): Promise<void> {
		await (prisma as any).sSOConfiguration.update({
			where: { id },
			data: { isEnabled },
		})
	}

	/**
	 * Decrypt the client secret for a configuration
	 */
	async getDecryptedClientSecret(config: SSOConfiguration): Promise<string> {
		const masterKey = getSSOMasterKey()
		return decrypt(config.clientSecret, masterKey)
	}

	/**
	 * Test connection to the identity provider
	 */
	async testConnection(
		config: SSOConfiguration,
	): Promise<ConnectionTestResult> {
		console.log(
			'Starting SSO connection test for:',
			config.providerName,
			config.issuerUrl,
		)

		try {
			let endpoints: EndpointConfiguration

			if (config.autoDiscovery) {
				console.log('Using auto-discovery for endpoints')
				console.log(
					'About to call discoverOIDCEndpoints with:',
					config.issuerUrl,
				)
				console.log(
					'discoverOIDCEndpoints function:',
					typeof discoverOIDCEndpoints,
				)

				// Try OIDC discovery first
				const discoveryResult = await discoverOIDCEndpoints(config.issuerUrl)
				console.log('Discovery result:', discoveryResult)

				if (!discoveryResult.success || !discoveryResult.endpoints) {
					console.log('Discovery failed:', discoveryResult.error)
					return {
						success: false,
						message: `OIDC Discovery failed: ${discoveryResult.error}`,
						error: `OIDC Discovery failed: ${discoveryResult.error}`,
					}
				}
				endpoints = discoveryResult.endpoints
			} else {
				// Use manually configured endpoints
				endpoints = {
					authorizationUrl: config.authorizationUrl!,
					tokenUrl: config.tokenUrl!,
					userinfoUrl: config.userinfoUrl || undefined,
					revocationUrl: config.revocationUrl || undefined,
				}
			}

			// Test endpoint connectivity
			console.log('Testing endpoint connectivity for:', endpoints)
			const connectivityTest = await testEndpointConnectivity(endpoints)
			console.log('Connectivity test result:', connectivityTest)

			if (
				!connectivityTest.authorizationEndpoint ||
				!connectivityTest.tokenEndpoint
			) {
				console.log('Connectivity test failed:', connectivityTest.errors)
				return {
					success: false,
					message: `Connection test failed: ${connectivityTest.errors.join(', ')}`,
					error: `Endpoint connectivity test failed: ${connectivityTest.errors.join(', ')}`,
				}
			}

			// Update last tested timestamp (only if config exists in database)
			if (config.id !== 'temp-test-config') {
				try {
					await (prisma as any).sSOConfiguration.update({
						where: { id: config.id },
						data: { lastTested: new Date() },
					})
				} catch (updateError) {
					console.log('Could not update lastTested timestamp:', updateError)
					// Don't fail the test if we can't update the timestamp
				}
			}

			return {
				success: true,
				message: `Connection test successful! All endpoints are reachable.${config.autoDiscovery ? ' OIDC discovery completed successfully.' : ''}`,
				discoveredEndpoints: {
					authorizationUrl: endpoints.authorizationUrl,
					tokenUrl: endpoints.tokenUrl,
					userinfoUrl: endpoints.userinfoUrl,
					revocationUrl: endpoints.revocationUrl,
				},
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error occurred'
			return {
				success: false,
				message: `Connection test failed: ${errorMessage}`,
				error: errorMessage,
			}
		}
	}

	/**
	 * Discover OIDC endpoints from .well-known/openid-configuration
	 */
	async discoverEndpoints(issuerUrl: string): Promise<OIDCDiscoveryResult> {
		return discoverOIDCEndpoints(issuerUrl)
	}

	/**
	 * Get parsed attribute mapping for a configuration
	 */
	getAttributeMapping(config: SSOConfiguration): Record<string, string> {
		if (!config.attributeMapping) {
			return {
				email: 'email',
				name: 'name',
				username: 'preferred_username',
				firstName: 'given_name',
				lastName: 'family_name',
			}
		}

		try {
			return JSON.parse(config.attributeMapping) as Record<string, string>
		} catch {
			// Return default mapping if parsing fails
			return {
				email: 'email',
				name: 'name',
				username: 'preferred_username',
				firstName: 'given_name',
				lastName: 'family_name',
			}
		}
	}

	/**
	 * List all SSO configurations (for admin purposes)
	 */
	async listConfigurations(): Promise<SSOConfiguration[]> {
		return (prisma as any).sSOConfiguration.findMany({
			include: {
				organization: {
					select: {
						id: true,
						name: true,
						slug: true,
					},
				},
				createdBy: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})
	}
}

// Export singleton instance
export const ssoConfigurationService = new SSOConfigurationService()
