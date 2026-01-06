import { prisma } from '@repo/database'
import { ssoConfigurationService } from './configuration.server.ts'
import { SSOHealthChecker } from '@repo/sso'

export {
	type SSOHealthStatus,
	type HealthCheck,
	type ConfigurationValidationResult,
	type ValidationIssue,
	SSOHealthChecker,
} from '@repo/sso'

export const ssoHealthChecker = new SSOHealthChecker(prisma, {
	ssoConfigurationService,
})
