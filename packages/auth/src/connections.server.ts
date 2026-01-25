import { type Timings } from '@repo/common'
import { type AuthProvider } from './provider.js'
import { GitHubProvider } from './providers/github.server.js'
import { GoogleProvider } from './providers/google.server.js'
import { type ProviderName } from './constants.js'

export const providers: Record<ProviderName, AuthProvider> = {
	github: new GitHubProvider(),
	google: new GoogleProvider(),
}

export function handleMockAction(providerName: ProviderName, request: Request) {
	return providers[providerName].handleMockAction(request)
}

export function resolveConnectionData(
	providerName: ProviderName,
	providerId: string,
	options?: { timings?: Timings },
) {
	return providers[providerName].resolveConnectionData(providerId, options)
}
