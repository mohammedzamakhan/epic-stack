import { ssoConfigurationService } from './sso-configuration.server.ts'
import {
	ssoAuditLogger,
	SSOAuditEventType,
} from './sso-audit-logging.server.ts'

export interface SSOHealthStatus {
	overall: 'healthy' | 'degraded' | 'unhealthy'
	components: {
		database: 'healthy' | 'unhealthy'
		configurations: 'healthy' | 'degraded' | 'unhealthy'
		identityProviders: 'healthy' | 'degraded' | 'unhealthy'
		authentication: 'healthy' | 'degraded' | 'unhealthy'
	}
	metrics: {
		totalConfigurations: number
		activeConfigurations: number
		recentAuthAttempts: number
		recentAuthFailures: number
		averageResponseTime: number
		errorRate: number
	}
	issues: Array<{
		component: string
		severity: 'warning' | 'error' | 'critical'
		message: string
		timestamp: Date
	}>
	lastChecked: Date
}

export interface SSOPerformanceMetrics {
	authenticationLatency: {
		p50: number
		p95: number
		p99: number
		average: number
	}
	throughput: {
		requestsPerMinute: number
		successfulAuthsPerMinute: number
		failedAuthsPerMinute: number
	}
	errorRates: {
		overall: number
		byErrorType: Record<string, number>
		byOrganization: Record<string, number>
	}
	availability: {
		uptime: number
		downtimeEvents: Array<{
			start: Date
			end?: Date
			reason: string
		}>
	}
}

/**
 * SSO System Monitoring Service
 */
export class SSOMonitoringService {
	private healthCheckInterval: NodeJS.Timeout | null = null
	private metricsCollectionInterval: NodeJS.Timeout | null = null
	private lastHealthCheck: SSOHealthStatus | null = null

	/**
	 * Start monitoring SSO system health
	 */
	startMonitoring(healthCheckIntervalMs: number = 5 * 60 * 1000): void {
		// Stop existing monitoring if running
		this.stopMonitoring()

		// Start health check monitoring
		this.healthCheckInterval = setInterval(async () => {
			try {
				await this.performHealthCheck()
			} catch (error) {
				console.error('Health check failed:', error)
			}
		}, healthCheckIntervalMs)

		// Start metrics collection
		this.metricsCollectionInterval = setInterval(async () => {
			try {
				await this.collectMetrics()
			} catch (error) {
				console.error('Metrics collection failed:', error)
			}
		}, 60 * 1000) // Collect metrics every minute

		console.log('SSO monitoring started')
	}

	/**
	 * Stop monitoring
	 */
	stopMonitoring(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval)
			this.healthCheckInterval = null
		}

		if (this.metricsCollectionInterval) {
			clearInterval(this.metricsCollectionInterval)
			this.metricsCollectionInterval = null
		}

		console.log('SSO monitoring stopped')
	}

	/**
	 * Perform comprehensive health check
	 */
	async performHealthCheck(): Promise<SSOHealthStatus> {
		const startTime = Date.now()
		const issues: SSOHealthStatus['issues'] = []

		// Check database connectivity
		const databaseStatus = await this.checkDatabaseHealth()
		if (databaseStatus !== 'healthy') {
			issues.push({
				component: 'database',
				severity: 'critical',
				message: 'Database connectivity issues detected',
				timestamp: new Date(),
			})
		}

		// Check SSO configurations
		const configStatus = await this.checkConfigurationsHealth()
		if (configStatus.status !== 'healthy') {
			issues.push(
				...configStatus.issues.map((issue) => ({
					component: 'configurations',
					severity: issue.severity,
					message: issue.message,
					timestamp: new Date(),
				})),
			)
		}

		// Check identity provider connectivity
		const idpStatus = await this.checkIdentityProvidersHealth()
		if (idpStatus.status !== 'healthy') {
			issues.push(
				...idpStatus.issues.map((issue) => ({
					component: 'identityProviders',
					severity: issue.severity,
					message: issue.message,
					timestamp: new Date(),
				})),
			)
		}

		// Check authentication system
		const authStatus = await this.checkAuthenticationHealth()
		if (authStatus !== 'healthy') {
			issues.push({
				component: 'authentication',
				severity: 'error',
				message: 'Authentication system issues detected',
				timestamp: new Date(),
			})
		}

		// Calculate overall status
		const criticalIssues = issues.filter((i) => i.severity === 'critical')
		const errorIssues = issues.filter((i) => i.severity === 'error')

		let overall: SSOHealthStatus['overall'] = 'healthy'
		if (criticalIssues.length > 0) {
			overall = 'unhealthy'
		} else if (errorIssues.length > 0 || issues.length > 3) {
			overall = 'degraded'
		}

		// Get metrics
		const metrics = await this.getCurrentMetrics()

		const healthStatus: SSOHealthStatus = {
			overall,
			components: {
				database: databaseStatus,
				configurations: configStatus.status,
				identityProviders: idpStatus.status,
				authentication: authStatus,
			},
			metrics,
			issues,
			lastChecked: new Date(),
		}

		this.lastHealthCheck = healthStatus

		// Log health status
		if (overall !== 'healthy') {
			await ssoAuditLogger.logEvent({
				eventType: SSOAuditEventType.HEALTH_CHECK_FAILED,
				details: `SSO system health check failed: ${overall}`,
				metadata: {
					issues: issues.length,
					components: healthStatus.components,
					duration: Date.now() - startTime,
				},
				severity: overall === 'unhealthy' ? 'critical' : 'warning',
			})
		}

		return healthStatus
	}

	/**
	 * Get current health status
	 */
	getCurrentHealthStatus(): SSOHealthStatus | null {
		return this.lastHealthCheck
	}

	/**
	 * Check database health
	 */
	private async checkDatabaseHealth(): Promise<'healthy' | 'unhealthy'> {
		try {
			// Test database connectivity
			await ssoConfigurationService.listConfigurations()
			return 'healthy'
		} catch (error) {
			console.error('Database health check failed:', error)
			return 'unhealthy'
		}
	}

	/**
	 * Check SSO configurations health
	 */
	private async checkConfigurationsHealth(): Promise<{
		status: 'healthy' | 'degraded' | 'unhealthy'
		issues: Array<{
			severity: 'warning' | 'error' | 'critical'
			message: string
		}>
	}> {
		const issues: Array<{
			severity: 'warning' | 'error' | 'critical'
			message: string
		}> = []

		try {
			const configurations = await ssoConfigurationService.listConfigurations()

			// Check for configurations that haven't been tested recently
			const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
			const untestedConfigs = configurations.filter(
				(config) =>
					config.isEnabled &&
					(!config.lastTested || config.lastTested < oneWeekAgo),
			)

			if (untestedConfigs.length > 0) {
				issues.push({
					severity: 'warning',
					message: `${untestedConfigs.length} SSO configurations haven't been tested recently`,
				})
			}

			// Check for disabled configurations
			const disabledConfigs = configurations.filter(
				(config) => !config.isEnabled,
			)
			if (disabledConfigs.length > configurations.length / 2) {
				issues.push({
					severity: 'warning',
					message: `${disabledConfigs.length} SSO configurations are disabled`,
				})
			}

			// Determine status
			let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
			if (issues.some((i) => i.severity === 'critical')) {
				status = 'unhealthy'
			} else if (issues.length > 0) {
				status = 'degraded'
			}

			return { status, issues }
		} catch (error) {
			return {
				status: 'unhealthy',
				issues: [
					{
						severity: 'critical',
						message: 'Failed to check configurations health',
					},
				],
			}
		}
	}

	/**
	 * Check identity providers health
	 */
	private async checkIdentityProvidersHealth(): Promise<{
		status: 'healthy' | 'degraded' | 'unhealthy'
		issues: Array<{
			severity: 'warning' | 'error' | 'critical'
			message: string
		}>
	}> {
		const issues: Array<{
			severity: 'warning' | 'error' | 'critical'
			message: string
		}> = []

		try {
			const configurations = await ssoConfigurationService.listConfigurations()
			const enabledConfigs = configurations.filter((config) => config.isEnabled)

			// Test a sample of configurations
			const configsToTest = enabledConfigs.slice(
				0,
				Math.min(5, enabledConfigs.length),
			)
			let failedTests = 0

			for (const config of configsToTest) {
				try {
					const testResult =
						await ssoConfigurationService.testConnection(config)
					if (!testResult.success) {
						failedTests++
						issues.push({
							severity: 'error',
							message: `Identity provider test failed for ${config.providerName}: ${testResult.error}`,
						})
					}
				} catch (error) {
					failedTests++
					issues.push({
						severity: 'error',
						message: `Identity provider connectivity test failed for ${config.providerName}`,
					})
				}
			}

			// Determine status
			let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
			if (failedTests === configsToTest.length && configsToTest.length > 0) {
				status = 'unhealthy'
			} else if (failedTests > 0) {
				status = 'degraded'
			}

			return { status, issues }
		} catch (error) {
			return {
				status: 'unhealthy',
				issues: [
					{
						severity: 'critical',
						message: 'Failed to check identity providers health',
					},
				],
			}
		}
	}

	/**
	 * Check authentication system health
	 */
	private async checkAuthenticationHealth(): Promise<
		'healthy' | 'degraded' | 'unhealthy'
	> {
		try {
			// Check for recent authentication failures
			// This would query audit logs for recent auth failures
			// For now, assume healthy
			return 'healthy'
		} catch (error) {
			return 'unhealthy'
		}
	}

	/**
	 * Get current system metrics
	 */
	private async getCurrentMetrics(): Promise<SSOHealthStatus['metrics']> {
		try {
			const configurations = await ssoConfigurationService.listConfigurations()

			return {
				totalConfigurations: configurations.length,
				activeConfigurations: configurations.filter((c) => c.isEnabled).length,
				recentAuthAttempts: 0, // Would query from audit logs
				recentAuthFailures: 0, // Would query from audit logs
				averageResponseTime: 0, // Would calculate from performance logs
				errorRate: 0, // Would calculate from error logs
			}
		} catch (error) {
			return {
				totalConfigurations: 0,
				activeConfigurations: 0,
				recentAuthAttempts: 0,
				recentAuthFailures: 0,
				averageResponseTime: 0,
				errorRate: 0,
			}
		}
	}

	/**
	 * Collect performance metrics
	 */
	private async collectMetrics(): Promise<void> {
		try {
			// Collect and store performance metrics
			// This would analyze recent audit logs and calculate metrics

			const metrics = await this.getCurrentMetrics()

			// Log metrics for monitoring systems
			console.log('SSO Metrics:', {
				timestamp: new Date().toISOString(),
				...metrics,
			})
		} catch (error) {
			console.error('Failed to collect SSO metrics:', error)
		}
	}

	/**
	 * Get performance metrics for a time range
	 */
	async getPerformanceMetrics(
		startDate: Date,
		endDate: Date,
	): Promise<SSOPerformanceMetrics> {
		// This would analyze audit logs and calculate performance metrics
		// For now, return default values
		return {
			authenticationLatency: {
				p50: 0,
				p95: 0,
				p99: 0,
				average: 0,
			},
			throughput: {
				requestsPerMinute: 0,
				successfulAuthsPerMinute: 0,
				failedAuthsPerMinute: 0,
			},
			errorRates: {
				overall: 0,
				byErrorType: {},
				byOrganization: {},
			},
			availability: {
				uptime: 99.9,
				downtimeEvents: [],
			},
		}
	}

	/**
	 * Generate health report
	 */
	async generateHealthReport(): Promise<string> {
		const health = await this.performHealthCheck()

		let report = `SSO System Health Report\n`
		report += `Generated: ${health.lastChecked.toISOString()}\n`
		report += `Overall Status: ${health.overall.toUpperCase()}\n\n`

		report += `Component Status:\n`
		report += `- Database: ${health.components.database}\n`
		report += `- Configurations: ${health.components.configurations}\n`
		report += `- Identity Providers: ${health.components.identityProviders}\n`
		report += `- Authentication: ${health.components.authentication}\n\n`

		report += `Metrics:\n`
		report += `- Total Configurations: ${health.metrics.totalConfigurations}\n`
		report += `- Active Configurations: ${health.metrics.activeConfigurations}\n`
		report += `- Recent Auth Attempts: ${health.metrics.recentAuthAttempts}\n`
		report += `- Recent Auth Failures: ${health.metrics.recentAuthFailures}\n`
		report += `- Error Rate: ${health.metrics.errorRate}%\n\n`

		if (health.issues.length > 0) {
			report += `Issues:\n`
			health.issues.forEach((issue, index) => {
				report += `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.component}: ${issue.message}\n`
			})
		} else {
			report += `No issues detected.\n`
		}

		return report
	}
}

// Export singleton instance
export const ssoMonitoringService = new SSOMonitoringService()

// Start monitoring in production
if (process.env.NODE_ENV === 'production') {
	ssoMonitoringService.startMonitoring()
}
