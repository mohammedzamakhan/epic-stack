import { SSOHealthChecker } from '@repo/sso'
import { ssoConfigurationService } from './sso-configuration.server.ts'

export const ssoHealthChecker = new SSOHealthChecker({
	ssoConfigurationService,
})
