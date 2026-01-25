import { z } from 'zod'

export const MOCK_CODE_GITHUB = 'MOCK_CODE_GITHUB_KODY'
export const MOCK_CODE_GOOGLE = 'MOCK_CODE_GOOGLE_KODY'

export const MOCK_CODE_GITHUB_HEADER = 'x-mock-code-github'
export const MOCK_CODE_GOOGLE_HEADER = 'x-mock-code-google'

export const GITHUB_PROVIDER_NAME = 'github'
export const GOOGLE_PROVIDER_NAME = 'google'

export const providerNames = [
	GITHUB_PROVIDER_NAME,
	GOOGLE_PROVIDER_NAME,
] as const

export const ProviderNameSchema = z.enum(providerNames)
export type ProviderName = z.infer<typeof ProviderNameSchema>

export const providerLabels: Record<ProviderName, string> = {
	[GITHUB_PROVIDER_NAME]: 'GitHub',
	[GOOGLE_PROVIDER_NAME]: 'Google',
} as const
