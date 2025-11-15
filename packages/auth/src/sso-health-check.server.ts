import { prisma } from './db.server.ts'
import { ssoConfigurationService } from './sso-configuration.server.ts'
import { ssoCache } from './sso-cache.server.ts'
import { ssoConnectionPool } from './sso-connection-pool.server.ts'
import {
	discoverOIDCEndpoints,
	testEndpointConnectivity,
} from './oidc-discovery.server.ts'

export interface SSOHealthStatus {
	overall: 'healthy' | 'degraded' | 'unhealthy'
	timestamp: string
	checks: {
		database: HealthCheck
		cache: HealthCheck
		connectionPool: HealthCheck
		configurations: HealthCheck
		identityProviders: HealthCheck
	}
	metrics: {
		totalConfigurations: number
		enabledConfigurations: number
		activeSessions: number
		cacheHitRate: number
		averageResponseTime: number
	}
}

export interface HealthCheck {
	status: 'pass' | 'warn' | 'fail'
	message: string
	duration?: number
	details?: Record<string, any>
}

export interface ConfigurationValidationResult {
	configurationId: string
	organizationId: string
	status: 'valid' | 'warning' | 'error'
	issues: ValidationIssue[]
	lastValidated: string
}

export interface ValidationIssue {
	type: 'error' | 'warning' | 'info'
	code: string
	message: string
	field?: string
	suggestion?: string
}

/**
 * Comprehensive SSO system health check
 */
export class SSOHealthChecker {
	/**
	 * Perform complete system health check
	 */
	async checkSystemHealth(): Promise<SSOHealthStatus> {
		const startTime = Date.now()
		const timestamp = new Date().toISOString()

		// Run all health checks in parallel
		const [
			databaseCheck,
			cacheCheck,
			connectionPoolCheck,
			configurationsCheck,
			identityProvidersCheck,
		] = await Promise.allSettled([
			this.checkDatabase(),
			this.checkCache(),
			this.checkConnectionPool(),
			this.checkConfigurations(),
			this.checkIdentityProviders(),
		])

		// Extract results from settled promises
		const checks = {
			database: this.extractResult(databaseCheck),
			cache: this.extractResult(cacheCheck),
			connectionPool: this.extractResult(connectionPoolCheck),
			configurations: this.extractResult(configurationsCheck),
			identityProviders: this.extractResult(identityProvidersCheck),
		}

		// Calculate metrics
		const metrics = await this.calculateMetrics()

		// Determine overall health
		const overall = this.determineOverallHealth(checks)

		return {
			overall,
			timestamp,
			checks,
			metrics,
		}
	}

	/**
	 * Check database connectivity and SSO-related tables
	 */
	private async checkDatabase(): Promise<HealthCheck> {
		const startTime = Date.now()

		try {
			// Test basic database connectivity
			await prisma.$queryRaw`SELECT 1`

			// Test SSO-specific tables
			const configCount = await (prisma as any).sSOConfiguration.count()
			const sessionCount = await (prisma as any).sSOSession.count()

			const duration = Date.now() - startTime

			return {
				status: 'pass',
				message: 'Database connectivity and SSO tables are healthy',
				duration,
				details: {
					configurations: configCount,
					sessions: sessionCount,
				},
			}
		} catch (error) {
			return {
				status: 'fail',
				message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				duration: Date.now() - startTime,
			}
		}
	}

	/**
	 * Check cache system health
	 */
	private async checkCache(): Promise<HealthCheck> {
		const startTime = Date.now()

		try {
			const stats = ssoCache.getStats()

			// Check if cache is functioning
			const testKey = 'health-check-test'
			const testValue = { test: true, timestamp: Date.now() }

			ssoCache.setEndpoints(testKey, testValue)
			const retrieved = ssoCache.getEndpoints(testKey)

			if (!retrieved || retrieved.timestamp !== testValue.timestamp) {
				return {
					status: 'fail',
					message: 'Cache read/write test failed',
					duration: Date.now() - startTime,
				}
			}

			// Clean up test data
			ssoCache.invalidateEndpoints(testKey)

			const duration = Date.now() - startTime

			// Check cache utilization
			const configUtilization = stats.configs.size / stats.configs.maxSize
			const strategyUtilization =
				stats.strategies.size / stats.strategies.maxSize
			const endpointUtilization = stats.endpoints.size / stats.endpoints.maxSize

			let status: 'pass' | 'warn' | 'fail' = 'pass'
			let message = 'Cache system is healthy'

			if (
				configUtilization > 0.8 ||
				strategyUtilization > 0.8 ||
				endpointUtilization > 0.8
			) {
				status = 'warn'
				message = 'Cache utilization is high'
			}

			return {
				status,
				message,
				duration,
				details: {
					stats,
					utilization: {
						configs: Math.round(configUtilization * 100),
						strategies: Math.round(strategyUtilization * 100),
						endpoints: Math.round(endpointUtilization * 100),
					},
				},
			}
		} catch (error) {
			return {
				status: 'fail',
				message: `Cache check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				duration: Date.now() - startTime,
			}
		}
	}

	/**
	 * Check connection pool health
	 */
	private async checkConnectionPool(): Promise<HealthCheck> {
		const startTime = Date.now()

		try {
			const poolStats = ssoConnectionPool.getPoolStats()
			const duration = Date.now() - startTime

			// Calculate error rates
			const pools = Object.values(poolStats)
			const totalRequests = pools.reduce(
				(sum, pool) => sum + pool.totalRequests,
				0,
			)
			const totalErrors = pools.reduce((sum, pool) => sum + pool.errorCount, 0)
			const errorRate =
				totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0

			let status: 'pass' | 'warn' | 'fail' = 'pass'
			let message = 'Connection pool is healthy'

			if (errorRate > 10) {
				status = 'fail'
				message = `High error rate in connection pool: ${errorRate.toFixed(2)}%`
			} else if (errorRate > 5) {
				status = 'warn'
				message = `Elevated error rate in connection pool: ${errorRate.toFixed(2)}%`
			}

			return {
				status,
				message,
				duration,
				details: {
					poolCount: pools.length,
					totalRequests,
					totalErrors,
					errorRate: Math.round(errorRate * 100) / 100,
					pools: poolStats,
				},
			}
		} catch (error) {
			return {
				status: 'fail',
				message: `Connection pool check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				duration: Date.now() - startTime,
			}
		}
	}

	/**
	 * Check SSO configurations validity
	 */
	private async checkConfigurations(): Promise<HealthCheck> {
		const startTime = Date.now()

		try {
			const configurations = await ssoConfigurationService.listConfigurations()
			const enabledConfigs = configurations.filter((config) => config.isEnabled)

			let validConfigs = 0
			let configsWithWarnings = 0
			let invalidConfigs = 0

			// Validate each enabled configuration
			for (const config of enabledConfigs) {
				try {
					const testResult =
						await ssoConfigurationService.testConnection(config)
					if (testResult.success) {
						validConfigs++
					} else {
						invalidConfigs++
					}
				} catch {
					invalidConfigs++
				}
			}

			const duration = Date.now() - startTime

			let status: 'pass' | 'warn' | 'fail' = 'pass'
			let message = `${validConfigs}/${enabledConfigs.length} enabled configurations are valid`

			if (invalidConfigs > 0) {
				if (invalidConfigs === enabledConfigs.length) {
					status = 'fail'
					message = 'All enabled SSO configurations are invalid'
				} else {
					status = 'warn'
					message = `${invalidConfigs} of ${enabledConfigs.length} enabled configurations are invalid`
				}
			}

			return {
				status,
				message,
				duration,
				details: {
					total: configurations.length,
					enabled: enabledConfigs.length,
					valid: validConfigs,
					invalid: invalidConfigs,
					warnings: configsWithWarnings,
				},
			}
		} catch (error) {
			return {
				status: 'fail',
				message: `Configuration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				duration: Date.now() - startTime,
			}
		}
	}

	/**
	 * Check identity provider connectivity
	 */
	private async checkIdentityProviders(): Promise<HealthCheck> {
		const startTime = Date.now()

		try {
			const configurations = await ssoConfigurationService.listConfigurations()
			const enabledConfigs = configurations.filter((config) => config.isEnabled)

			const providerChecks = await Promise.allSettled(
				enabledConfigs.map(async (config) => {
					try {
						// Test OIDC discovery
						const discoveryResult = await discoverOIDCEndpoints(
							config.issuerUrl,
						)
						if (!discoveryResult.success) {
							return {
								config: config.id,
								status: 'fail',
								error: discoveryResult.error,
							}
						}

						// Test endpoint connectivity
						const connectivityResult = await testEndpointConnectivity(
							discoveryResult.endpoints!,
						)
						const hasErrors = connectivityResult.errors.length > 0

						return {
							config: config.id,
							status: hasErrors ? 'warn' : 'pass',
							error: hasErrors
								? connectivityResult.errors.join(', ')
								: undefined,
						}
					} catch (error) {
						return {
							config: config.id,
							status: 'fail',
							error: error instanceof Error ? error.message : 'Unknown error',
						}
					}
				}),
			)

			const results = providerChecks.map((result) =>
				result.status === 'fulfilled'
					? result.value
					: { status: 'fail', error: 'Check failed' },
			)

			const passCount = results.filter((r) => r.status === 'pass').length
			const warnCount = results.filter((r) => r.status === 'warn').length
			const failCount = results.filter((r) => r.status === 'fail').length

			const duration = Date.now() - startTime

			let status: 'pass' | 'warn' | 'fail' = 'pass'
			let message = `${passCount}/${enabledConfigs.length} identity providers are fully accessible`

			if (failCount > 0) {
				if (failCount === enabledConfigs.length) {
					status = 'fail'
					message = 'All identity providers are unreachable'
				} else {
					status = 'warn'
					message = `${failCount} identity providers are unreachable`
				}
			} else if (warnCount > 0) {
				status = 'warn'
				message = `${warnCount} identity providers have connectivity issues`
			}

			return {
				status,
				message,
				duration,
				details: {
					total: enabledConfigs.length,
					pass: passCount,
					warn: warnCount,
					fail: failCount,
					results,
				},
			}
		} catch (error) {
			return {
				status: 'fail',
				message: `Identity provider check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				duration: Date.now() - startTime,
			}
		}
	}

	/**
	 * Calculate system metrics
	 */
	private async calculateMetrics(): Promise<SSOHealthStatus['metrics']> {
		try {
			const [configCount, enabledConfigCount, sessionCount] = await Promise.all(
				[
					(prisma as any).sSOConfiguration.count(),
					(prisma as any).sSOConfiguration.count({
						where: { isEnabled: true },
					}),
					(prisma as any).sSOSession.count(),
				],
			)

			const cacheStats = ssoCache.getStats()
			const poolStats = ssoConnectionPool.getPoolStats()

			// Calculate cache hit rate (simplified estimation)
			const totalCacheSlots =
				cacheStats.configs.maxSize +
				cacheStats.strategies.maxSize +
				cacheStats.endpoints.maxSize
			const usedCacheSlots =
				cacheStats.configs.size +
				cacheStats.strategies.size +
				cacheStats.endpoints.size
			const cacheHitRate =
				totalCacheSlots > 0 ? (usedCacheSlots / totalCacheSlots) * 100 : 0

			// Calculate average response time from connection pool
			const pools = Object.values(poolStats)
			const totalRequests = pools.reduce(
				(sum, pool) => sum + pool.totalRequests,
				0,
			)
			const averageResponseTime =
				totalRequests > 0
					? pools.reduce((sum, pool) => sum + pool.totalRequests * 100, 0) /
						totalRequests
					: 0

			return {
				totalConfigurations: configCount,
				enabledConfigurations: enabledConfigCount,
				activeSessions: sessionCount,
				cacheHitRate: Math.round(cacheHitRate * 100) / 100,
				averageResponseTime: Math.round(averageResponseTime * 100) / 100,
			}
		} catch {
			return {
				totalConfigurations: 0,
				enabledConfigurations: 0,
				activeSessions: 0,
				cacheHitRate: 0,
				averageResponseTime: 0,
			}
		}
	}

	/**
	 * Determine overall system health from individual checks
	 */
	private determineOverallHealth(
		checks: SSOHealthStatus['checks'],
	): 'healthy' | 'degraded' | 'unhealthy' {
		const checkValues = Object.values(checks)

		const failCount = checkValues.filter(
			(check) => check.status === 'fail',
		).length
		const warnCount = checkValues.filter(
			(check) => check.status === 'warn',
		).length

		if (failCount > 0) {
			return failCount >= 2 ? 'unhealthy' : 'degraded'
		}

		if (warnCount > 0) {
			return warnCount >= 3 ? 'degraded' : 'healthy'
		}

		return 'healthy'
	}

	/**
	 * Extract result from Promise.allSettled
	 */
	private extractResult(
		settledResult: PromiseSettledResult<HealthCheck>,
	): HealthCheck {
		if (settledResult.status === 'fulfilled') {
			return settledResult.value
		} else {
			return {
				status: 'fail',
				message: `Health check failed: ${settledResult.reason}`,
			}
		}
	}

	/**
	 * Validate a specific SSO configuration
	 */
	async validateConfiguration(
		configurationId: string,
	): Promise<ConfigurationValidationResult> {
		const startTime = Date.now()
		const issues: ValidationIssue[] = []

		try {
			const config =
				await ssoConfigurationService.getConfigurationById(configurationId)
			if (!config) {
				return {
					configurationId,
					organizationId: 'unknown',
					status: 'error',
					issues: [
						{
							type: 'error',
							code: 'CONFIG_NOT_FOUND',
							message: 'SSO configuration not found',
						},
					],
					lastValidated: new Date().toISOString(),
				}
			}

			// Validate basic configuration
			this.validateBasicConfig(config, issues)

			// Test connection if enabled
			if (config.isEnabled) {
				await this.validateConnection(config, issues)
			}

			// Validate attribute mapping
			this.validateAttributeMapping(config, issues)

			// Determine overall status
			const hasErrors = issues.some((issue) => issue.type === 'error')
			const hasWarnings = issues.some((issue) => issue.type === 'warning')

			const status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'valid'

			return {
				configurationId,
				organizationId: config.organizationId,
				status,
				issues,
				lastValidated: new Date().toISOString(),
			}
		} catch (error) {
			return {
				configurationId,
				organizationId: 'unknown',
				status: 'error',
				issues: [
					{
						type: 'error',
						code: 'VALIDATION_ERROR',
						message: `Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					},
				],
				lastValidated: new Date().toISOString(),
			}
		}
	}

	/**
	 * Validate basic configuration fields
	 */
	private validateBasicConfig(config: any, issues: ValidationIssue[]): void {
		// Required fields
		if (!config.issuerUrl) {
			issues.push({
				type: 'error',
				code: 'MISSING_ISSUER_URL',
				message: 'Issuer URL is required',
				field: 'issuerUrl',
			})
		} else {
			try {
				new URL(config.issuerUrl)
			} catch {
				issues.push({
					type: 'error',
					code: 'INVALID_ISSUER_URL',
					message: 'Issuer URL is not a valid URL',
					field: 'issuerUrl',
				})
			}
		}

		if (!config.clientId) {
			issues.push({
				type: 'error',
				code: 'MISSING_CLIENT_ID',
				message: 'Client ID is required',
				field: 'clientId',
			})
		}

		if (!config.clientSecret) {
			issues.push({
				type: 'error',
				code: 'MISSING_CLIENT_SECRET',
				message: 'Client secret is required',
				field: 'clientSecret',
			})
		}

		// Validate scopes
		if (!config.scopes || config.scopes.trim() === '') {
			issues.push({
				type: 'warning',
				code: 'EMPTY_SCOPES',
				message: 'No scopes configured, using default scopes',
				field: 'scopes',
				suggestion: 'Consider specifying explicit scopes for better security',
			})
		} else {
			const scopes = config.scopes.split(' ')
			if (!scopes.includes('openid')) {
				issues.push({
					type: 'warning',
					code: 'MISSING_OPENID_SCOPE',
					message: 'OpenID scope is recommended for OIDC compliance',
					field: 'scopes',
					suggestion: 'Add "openid" to the scopes list',
				})
			}
		}

		// Validate manual endpoints if auto-discovery is disabled
		if (!config.autoDiscovery) {
			if (!config.authorizationUrl) {
				issues.push({
					type: 'error',
					code: 'MISSING_AUTH_URL',
					message:
						'Authorization URL is required when auto-discovery is disabled',
					field: 'authorizationUrl',
				})
			}

			if (!config.tokenUrl) {
				issues.push({
					type: 'error',
					code: 'MISSING_TOKEN_URL',
					message: 'Token URL is required when auto-discovery is disabled',
					field: 'tokenUrl',
				})
			}
		}
	}

	/**
	 * Validate connection to identity provider
	 */
	private async validateConnection(
		config: any,
		issues: ValidationIssue[],
	): Promise<void> {
		try {
			const testResult = await ssoConfigurationService.testConnection(config)
			if (!testResult.success) {
				issues.push({
					type: 'error',
					code: 'CONNECTION_FAILED',
					message: `Connection test failed: ${testResult.error}`,
					suggestion:
						'Check identity provider configuration and network connectivity',
				})
			}
		} catch (error) {
			issues.push({
				type: 'error',
				code: 'CONNECTION_ERROR',
				message: `Connection test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			})
		}
	}

	/**
	 * Validate attribute mapping configuration
	 */
	private validateAttributeMapping(
		config: any,
		issues: ValidationIssue[],
	): void {
		if (config.attributeMapping) {
			try {
				const mapping = JSON.parse(config.attributeMapping) as Record<
					string,
					any
				>

				// Check for required mappings
				if (!mapping.email) {
					issues.push({
						type: 'warning',
						code: 'MISSING_EMAIL_MAPPING',
						message: 'Email attribute mapping is not configured',
						field: 'attributeMapping',
						suggestion:
							'Map the email field to ensure proper user identification',
					})
				}

				if (!mapping.name && !mapping.username) {
					issues.push({
						type: 'warning',
						code: 'MISSING_NAME_MAPPING',
						message:
							'Neither name nor username attribute mapping is configured',
						field: 'attributeMapping',
						suggestion: 'Map at least one of name or username fields',
					})
				}
			} catch {
				issues.push({
					type: 'error',
					code: 'INVALID_ATTRIBUTE_MAPPING',
					message: 'Attribute mapping is not valid JSON',
					field: 'attributeMapping',
				})
			}
		}
	}
}

// Export singleton instance
export const ssoHealthChecker = new SSOHealthChecker()
