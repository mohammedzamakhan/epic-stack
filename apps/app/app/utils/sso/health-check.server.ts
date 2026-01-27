import { SSOHealthChecker } from '@repo/sso'
import { ssoConfigurationService } from './configuration.server.ts'

export {
	type SSOHealthStatus,
	type HealthCheck,
	type ConfigurationValidationResult,
	type ValidationIssue,
	SSOHealthChecker,
} from '@repo/sso'

export const ssoHealthChecker = new SSOHealthChecker({
	ssoConfigurationService,
})
