import { SSOConfiguration } from '@repo/prisma'
import { prisma } from './db.server.ts'
import { encrypt, decrypt, getSSOMasterKey } from '@repo/security'
import {
	discoverOIDCEndpoints,
	testEndpointConnectivity,
	type DiscoveryResult as OIDCDiscoveryResult,
	type EndpointConfiguration,
} from './oidc-discovery.server.ts'
import { ssoCache } from './sso-cache.server.ts'
import {
	SSOConfigurationSchema,
	SSOConfigurationUpdateSchema,
	type SSOConfigurationInput,
} from '@repo/validation'
import { sanitizeSSOConfigInput } from './sso-sanitization.server.ts'
import { trackSuspiciousActivity } from './sso-rate-limit.server.ts'
import {
	auditSSOConfigCreated,
	auditSSOConfigUpdated,
	ssoAuditLogger,
	SSOAuditEventType,
} from './sso-audit-logging.server.ts'

export interface ConnectionTestResult {
	success: boolean
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
		config: SSOConfigurationInput,
		createdById?: string,
		request?: Request,
	): Promise<SSOConfiguration> {
		// Sanitize input first (outside try block so it's available in catch)
		const sanitizedConfig = sanitizeSSOConfigInput(config)

		try {
			// Validate with Zod schema
			const validatedConfig = SSOConfigurationSchema.parse(sanitizedConfig)

			const masterKey = getSSOMasterKey()
			const encryptedSecret = encrypt(validatedConfig.clientSecret, masterKey)

			const ssoConfig = await (prisma as any).sSOConfiguration.create({
				data: {
					organizationId,
					providerName: validatedConfig.providerName,
					issuerUrl: validatedConfig.issuerUrl,
					clientId: validatedConfig.clientId,
					clientSecret: encryptedSecret,
					scopes: validatedConfig.scopes,
					autoDiscovery: validatedConfig.autoDiscovery,
					pkceEnabled: validatedConfig.pkceEnabled,
					autoProvision: validatedConfig.autoProvision,
					defaultRole: validatedConfig.defaultRole,
					attributeMapping: validatedConfig.attributeMapping,
					authorizationUrl: validatedConfig.authorizationUrl || null,
					tokenUrl: validatedConfig.tokenUrl || null,
					userinfoUrl: validatedConfig.userinfoUrl || null,
					revocationUrl: validatedConfig.revocationUrl || null,
					createdById,
				},
			})

			// Audit log the configuration creation
			if (createdById) {
				await auditSSOConfigCreated(
					organizationId,
					createdById,
					ssoConfig.id,
					request,
				)
			}

			// Cache the new configuration
			ssoCache.setConfiguration(organizationId, ssoConfig)

			return ssoConfig
		} catch (error) {
			// Track suspicious activity for invalid configurations
			if (createdById) {
				trackSuspiciousActivity(createdById, 'invalid_config')

				// Audit log the failed attempt
				await ssoAuditLogger.logSecurityEvent(
					SSOAuditEventType.INVALID_REQUEST,
					organizationId,
					`Failed to create SSO configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
					{ config: sanitizedConfig },
					request,
					'warning',
				)
			}

			if (error instanceof Error) {
				throw new Error(`Configuration validation failed: ${error.message}`)
			}
			throw error
		}
	}

	/**
	 * Update an existing SSO configuration
	 */
	async updateConfiguration(
		id: string,
		config: Partial<SSOConfigurationInput>,
		updatedById?: string,
		request?: Request,
	): Promise<SSOConfiguration> {
		try {
			// Get existing configuration for audit logging
			const existingConfig = await this.getConfigurationById(id)
			if (!existingConfig) {
				throw new Error('Configuration not found')
			}

			// Sanitize input first
			const sanitizedConfig = sanitizeSSOConfigInput(config)

			// Validate with update schema (only provided fields)
			const validatedConfig = SSOConfigurationUpdateSchema.parse({
				id: 'temp-id', // Will be ignored
				...sanitizedConfig,
			})

			const updateData: any = {}
			const changes: Record<string, any> = {}

			// Only update provided fields and track changes
			if (validatedConfig.providerName !== undefined) {
				updateData.providerName = validatedConfig.providerName
				changes.providerName = {
					from: existingConfig.providerName,
					to: validatedConfig.providerName,
				}
			}
			if (validatedConfig.issuerUrl !== undefined) {
				updateData.issuerUrl = validatedConfig.issuerUrl
				changes.issuerUrl = {
					from: existingConfig.issuerUrl,
					to: validatedConfig.issuerUrl,
				}
			}
			if (validatedConfig.clientId !== undefined) {
				updateData.clientId = validatedConfig.clientId
				changes.clientId = {
					from: existingConfig.clientId,
					to: validatedConfig.clientId,
				}
			}
			if (validatedConfig.clientSecret !== undefined) {
				const masterKey = getSSOMasterKey()
				updateData.clientSecret = encrypt(
					validatedConfig.clientSecret,
					masterKey,
				)
				changes.clientSecret = { from: '[REDACTED]', to: '[REDACTED]' }
			}
			if (validatedConfig.scopes !== undefined) {
				updateData.scopes = validatedConfig.scopes
				changes.scopes = {
					from: existingConfig.scopes,
					to: validatedConfig.scopes,
				}
			}
			if (validatedConfig.autoDiscovery !== undefined) {
				updateData.autoDiscovery = validatedConfig.autoDiscovery
				changes.autoDiscovery = {
					from: existingConfig.autoDiscovery,
					to: validatedConfig.autoDiscovery,
				}
			}
			if (validatedConfig.pkceEnabled !== undefined) {
				updateData.pkceEnabled = validatedConfig.pkceEnabled
				changes.pkceEnabled = {
					from: existingConfig.pkceEnabled,
					to: validatedConfig.pkceEnabled,
				}
			}
			if (validatedConfig.autoProvision !== undefined) {
				updateData.autoProvision = validatedConfig.autoProvision
				changes.autoProvision = {
					from: existingConfig.autoProvision,
					to: validatedConfig.autoProvision,
				}
			}
			if (validatedConfig.defaultRole !== undefined) {
				updateData.defaultRole = validatedConfig.defaultRole
				changes.defaultRole = {
					from: existingConfig.defaultRole,
					to: validatedConfig.defaultRole,
				}
			}
			if (validatedConfig.attributeMapping !== undefined) {
				updateData.attributeMapping = validatedConfig.attributeMapping
				changes.attributeMapping = {
					from: existingConfig.attributeMapping,
					to: validatedConfig.attributeMapping,
				}
			}
			if (validatedConfig.authorizationUrl !== undefined) {
				updateData.authorizationUrl = validatedConfig.authorizationUrl
				changes.authorizationUrl = {
					from: existingConfig.authorizationUrl,
					to: validatedConfig.authorizationUrl,
				}
			}
			if (validatedConfig.tokenUrl !== undefined) {
				updateData.tokenUrl = validatedConfig.tokenUrl
				changes.tokenUrl = {
					from: existingConfig.tokenUrl,
					to: validatedConfig.tokenUrl,
				}
			}
			if (validatedConfig.userinfoUrl !== undefined) {
				updateData.userinfoUrl = validatedConfig.userinfoUrl
				changes.userinfoUrl = {
					from: existingConfig.userinfoUrl,
					to: validatedConfig.userinfoUrl,
				}
			}
			if (validatedConfig.revocationUrl !== undefined) {
				updateData.revocationUrl = validatedConfig.revocationUrl
				changes.revocationUrl = {
					from: existingConfig.revocationUrl,
					to: validatedConfig.revocationUrl,
				}
			}

			const updatedConfig = await (prisma as any).sSOConfiguration.update({
				where: { id },
				data: updateData,
			})

			// Audit log the configuration update
			if (updatedById) {
				await auditSSOConfigUpdated(
					existingConfig.organizationId,
					updatedById,
					id,
					changes,
					request,
				)
			}

			// Invalidate cache for this organization
			ssoCache.invalidateConfiguration(existingConfig.organizationId)

			return updatedConfig
		} catch (error) {
			// Track suspicious activity for invalid configurations
			if (updatedById) {
				trackSuspiciousActivity(updatedById, 'invalid_config')

				// Audit log the failed attempt
				await ssoAuditLogger.logSecurityEvent(
					SSOAuditEventType.INVALID_REQUEST,
					'unknown', // We don't have organizationId in error case
					`Failed to update SSO configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
					{ configId: id, config },
					request,
					'warning',
				)
			}

			if (error instanceof Error) {
				throw new Error(`Configuration validation failed: ${error.message}`)
			}
			throw error
		}
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
		// Get the configuration to find the organization ID
		const config = await this.getConfigurationById(id)

		await (prisma as any).sSOConfiguration.delete({
			where: { id },
		})

		// Invalidate cache if configuration existed
		if (config) {
			ssoCache.invalidateConfiguration(config.organizationId)
		}
	}

	/**
	 * Enable or disable SSO for an organization
	 */
	async toggleConfiguration(
		id: string,
		isEnabled: boolean,
		userId?: string,
		request?: Request,
	): Promise<void> {
		const config = await this.getConfigurationById(id)
		if (!config) {
			throw new Error('Configuration not found')
		}

		await (prisma as any).sSOConfiguration.update({
			where: { id },
			data: { isEnabled },
		})

		// Invalidate cache for this organization
		ssoCache.invalidateConfiguration(config.organizationId)

		// Audit log the configuration toggle
		if (userId) {
			await ssoAuditLogger.logConfigurationChange(
				isEnabled
					? SSOAuditEventType.CONFIG_ENABLED
					: SSOAuditEventType.CONFIG_DISABLED,
				config.organizationId,
				userId,
				id,
				`SSO configuration ${isEnabled ? 'enabled' : 'disabled'}`,
				{ previousState: config.isEnabled, newState: isEnabled },
				request,
			)
		}
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
		userId?: string,
		request?: Request,
	): Promise<ConnectionTestResult> {
		const startTime = Date.now()

		try {
			let endpoints: EndpointConfiguration

			if (config.autoDiscovery) {
				// Try OIDC discovery first
				const discoveryResult = await discoverOIDCEndpoints(config.issuerUrl)
				if (!discoveryResult.success || !discoveryResult.endpoints) {
					const error = `OIDC Discovery failed: ${discoveryResult.error}`

					// Audit log the failed test
					if (userId) {
						await ssoAuditLogger.logConfigurationChange(
							SSOAuditEventType.CONFIG_TESTED,
							config.organizationId,
							userId,
							config.id,
							`SSO configuration test failed: ${error}`,
							{
								success: false,
								error,
								duration: Date.now() - startTime,
								testType: 'oidc_discovery',
							},
							request,
						)
					}

					return {
						success: false,
						error,
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
			const connectivityTest = await testEndpointConnectivity(endpoints)

			if (
				!connectivityTest.authorizationEndpoint ||
				!connectivityTest.tokenEndpoint
			) {
				const error = `Endpoint connectivity test failed: ${connectivityTest.errors.join(', ')}`

				// Audit log the failed test
				if (userId) {
					await ssoAuditLogger.logConfigurationChange(
						SSOAuditEventType.CONFIG_TESTED,
						config.organizationId,
						userId,
						config.id,
						`SSO configuration test failed: ${error}`,
						{
							success: false,
							error,
							duration: Date.now() - startTime,
							testType: 'endpoint_connectivity',
							endpoints: connectivityTest,
						},
						request,
					)
				}

				return {
					success: false,
					error,
				}
			}

			// Update last tested timestamp
			await (prisma as any).sSOConfiguration.update({
				where: { id: config.id },
				data: { lastTested: new Date() },
			})

			// Audit log the successful test
			if (userId) {
				await ssoAuditLogger.logConfigurationChange(
					SSOAuditEventType.CONFIG_TESTED,
					config.organizationId,
					userId,
					config.id,
					'SSO configuration test successful',
					{
						success: true,
						duration: Date.now() - startTime,
						testType: config.autoDiscovery
							? 'oidc_discovery'
							: 'manual_endpoints',
						endpoints: {
							authorizationUrl: endpoints.authorizationUrl,
							tokenUrl: endpoints.tokenUrl,
							userinfoUrl: endpoints.userinfoUrl,
							revocationUrl: endpoints.revocationUrl,
						},
					},
					request,
				)
			}

			return {
				success: true,
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

			// Audit log the failed test
			if (userId) {
				await ssoAuditLogger.logConfigurationChange(
					SSOAuditEventType.CONFIG_TESTED,
					config.organizationId,
					userId,
					config.id,
					`SSO configuration test failed: ${errorMessage}`,
					{
						success: false,
						error: errorMessage,
						duration: Date.now() - startTime,
						testType: 'exception',
					},
					request,
				)
			}

			return {
				success: false,
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
