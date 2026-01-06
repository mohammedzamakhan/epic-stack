import { prisma } from '@repo/database'
import { ssoConfigurationService } from './sso-configuration.server.ts'
import { SSOHealthChecker } from '@repo/sso'

export const ssoHealthChecker = new SSOHealthChecker(prisma, {
	ssoConfigurationService,
})
