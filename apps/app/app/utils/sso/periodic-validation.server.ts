import { ssoAuditLogger, SSOAuditEventType } from './audit-logging.server.ts'
import { ssoConfigurationService } from './configuration.server.ts'
import { ssoHealthChecker } from './health-check.server.ts'

/**
 * Periodic validation service for SSO configurations
 * Runs background checks to ensure configurations remain valid
 */
export class SSOPeriodicValidator {
	private validationInterval: NodeJS.Timeout | null = null
	private readonly intervalMs = 30 * 60 * 1000 // 30 minutes
	private isRunning = false

	/**
	 * Start periodic validation
	 */
	start(): void {
		if (this.isRunning) {
			console.warn('SSO periodic validation is already running')
			return
		}

		this.isRunning = true
		console.log('Starting SSO periodic validation service')

		// Run initial validation
		this.runValidation().catch((error) => {
			console.error('Initial SSO validation failed:', error)
		})

		// Schedule periodic validations
		this.validationInterval = setInterval(() => {
			this.runValidation().catch((error) => {
				console.error('Periodic SSO validation failed:', error)
			})
		}, this.intervalMs)
	}

	/**
	 * Stop periodic validation
	 */
	stop(): void {
		if (!this.isRunning) {
			return
		}

		this.isRunning = false
		console.log('Stopping SSO periodic validation service')

		if (this.validationInterval) {
			clearInterval(this.validationInterval)
			this.validationInterval = null
		}
	}

	/**
	 * Run validation for all enabled SSO configurations
	 */
	private async runValidation(): Promise<void> {
		try {
			console.log('Running periodic SSO configuration validation')
			const startTime = Date.now()

			// Get all enabled configurations
			const configurations = await ssoConfigurationService.listConfigurations()
			const enabledConfigs = configurations.filter((config) => config.isEnabled)

			if (enabledConfigs.length === 0) {
				console.log('No enabled SSO configurations to validate')
				return
			}

			console.log(
				`Validating ${enabledConfigs.length} enabled SSO configurations`,
			)

			// Validate each configuration
			const validationPromises = enabledConfigs.map((config) =>
				this.validateSingleConfiguration(config),
			)

			const results = await Promise.allSettled(validationPromises)

			// Process results
			let successCount = 0
			let warningCount = 0
			let errorCount = 0

			for (let i = 0; i < results.length; i++) {
				const result = results[i]
				const config = enabledConfigs[i]

				if (!result || !config) continue

				if (result.status === 'fulfilled') {
					const validation = (result as PromiseFulfilledResult<any>).value

					switch (validation.status) {
						case 'valid':
							successCount++
							break
						case 'warning':
							warningCount++
							await this.handleValidationWarning(config, validation)
							break
						case 'error':
							errorCount++
							await this.handleValidationError(config, validation)
							break
					}
				} else {
					errorCount++
					const reason = (result as PromiseRejectedResult).reason
					console.error(
						`Validation failed for configuration ${config.id}:`,
						reason,
					)

					// Log validation failure
					await ssoAuditLogger.logSecurityEvent(
						SSOAuditEventType.SECURITY_VIOLATION,
						config.organizationId,
						`Periodic validation failed for SSO configuration: ${reason}`,
						{ configurationId: config.id },
						undefined,
						'error',
					)
				}
			}

			const duration = Date.now() - startTime
			console.log(
				`SSO validation completed in ${duration}ms: ${successCount} valid, ${warningCount} warnings, ${errorCount} errors`,
			)

			// Log overall validation summary
			await ssoAuditLogger.logSystemEvent(
				SSOAuditEventType.PERIODIC_VALIDATION,
				`Periodic SSO validation completed: ${successCount} valid, ${warningCount} warnings, ${errorCount} errors`,
				{
					duration,
					totalConfigurations: enabledConfigs.length,
					successCount,
					warningCount,
					errorCount,
				},
			)
		} catch (error) {
			console.error('Periodic SSO validation failed:', error)

			// Log validation system failure
			await ssoAuditLogger.logSystemEvent(
				SSOAuditEventType.VALIDATION_FAILED,
				`Periodic SSO validation system failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{ error: error instanceof Error ? error.stack : String(error) },
			)
		}
	}

	/**
	 * Validate a single SSO configuration
	 */
	private async validateSingleConfiguration(config: any): Promise<any> {
		try {
			return await ssoHealthChecker.validateConfiguration(config.id)
		} catch (error) {
			console.error(`Failed to validate configuration ${config.id}:`, error)
			throw error
		}
	}

	/**
	 * Handle validation warnings
	 */
	private async handleValidationWarning(
		config: any,
		validation: any,
	): Promise<void> {
		const warningMessages = validation.issues
			.filter((issue: any) => issue.type === 'warning')
			.map((issue: any) => issue.message)

		console.warn(
			`SSO configuration ${config.id} has warnings:`,
			warningMessages,
		)

		// Log warning to audit system
		await ssoAuditLogger.logConfigurationChange(
			SSOAuditEventType.CONFIG_WARNING,
			config.organizationId,
			'system',
			config.id,
			`SSO configuration validation warnings: ${warningMessages.join(', ')}`,
			{
				validationResult: validation,
				warningCount: warningMessages.length,
			},
		)
	}

	/**
	 * Handle validation errors
	 */
	private async handleValidationError(
		config: any,
		validation: any,
	): Promise<void> {
		const errorMessages = validation.issues
			.filter((issue: any) => issue.type === 'error')
			.map((issue: any) => issue.message)

		console.error(`SSO configuration ${config.id} has errors:`, errorMessages)

		// Consider disabling configuration if it has critical errors
		const hasCriticalErrors = validation.issues.some(
			(issue: any) =>
				issue.type === 'error' &&
				[
					'CONNECTION_FAILED',
					'INVALID_ISSUER_URL',
					'MISSING_CLIENT_SECRET',
				].includes(issue.code),
		)

		if (hasCriticalErrors) {
			console.warn(
				`Considering disabling SSO configuration ${config.id} due to critical errors`,
			)

			// Log critical error
			await ssoAuditLogger.logSecurityEvent(
				SSOAuditEventType.CONFIG_ERROR,
				config.organizationId,
				`SSO configuration has critical errors and may need to be disabled: ${errorMessages.join(', ')}`,
				{
					configurationId: config.id,
					validationResult: validation,
					errorCount: errorMessages.length,
					criticalErrors: true,
				},
				undefined,
				'error',
			)

			// Optionally auto-disable configurations with critical errors
			// This is commented out for safety - should be a manual decision
			/*
			try {
				await ssoConfigurationService.toggleConfiguration(config.id, false, 'system')
				console.log(`Auto-disabled SSO configuration ${config.id} due to critical errors`)
			} catch (error) {
				console.error(`Failed to auto-disable configuration ${config.id}:`, error)
			}
			*/
		} else {
			// Log non-critical error
			await ssoAuditLogger.logConfigurationChange(
				SSOAuditEventType.CONFIG_ERROR,
				config.organizationId,
				'system',
				config.id,
				`SSO configuration validation errors: ${errorMessages.join(', ')}`,
				{
					validationResult: validation,
					errorCount: errorMessages.length,
					criticalErrors: false,
				},
			)
		}
	}

	/**
	 * Run validation on demand
	 */
	async validateNow(): Promise<void> {
		if (!this.isRunning) {
			console.log('Starting one-time SSO validation')
			await this.runValidation()
		} else {
			console.log('Triggering immediate SSO validation')
			await this.runValidation()
		}
	}

	/**
	 * Get validation status
	 */
	getStatus(): {
		isRunning: boolean
		intervalMs: number
		nextValidation?: string
	} {
		return {
			isRunning: this.isRunning,
			intervalMs: this.intervalMs,
			nextValidation: this.validationInterval
				? new Date(Date.now() + this.intervalMs).toISOString()
				: undefined,
		}
	}
}

// Export singleton instance
export const ssoPeriodicValidator = new SSOPeriodicValidator()

// Auto-start in production environments
if (process.env.NODE_ENV === 'production') {
	// Start with a delay to allow application to fully initialize
	setTimeout(() => {
		ssoPeriodicValidator.start()
	}, 30000) // 30 seconds delay
}
