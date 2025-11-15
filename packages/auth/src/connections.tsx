import { Form } from 'react-router'
import { z } from 'zod'
import { useIsPending } from './misc.tsx'
import { Icon, StatusButton } from '@repo/ui'
import { saveLastLoginMethod, type LoginMethod } from './last-login-method.ts'

export const GITHUB_PROVIDER_NAME = 'github'
export const GOOGLE_PROVIDER_NAME = 'google'
// to add another provider, set their name here and add it to the providerNames below

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

export const providerIcons: Record<ProviderName, React.ReactNode> = {
	[GITHUB_PROVIDER_NAME]: <Icon name="github" />,
	[GOOGLE_PROVIDER_NAME]: <Icon name="google" />,
} as const

export function ProviderConnectionForm({
	redirectTo,
	type,
	providerName,
}: {
	redirectTo?: string | null
	type: 'Connect' | 'Login' | 'Signup'
	providerName: ProviderName
}) {
	const label = providerLabels[providerName]
	const formAction = `/auth/${providerName}`
	const isPending = useIsPending({ formAction })
	return (
		<Form
			className="flex items-center justify-center gap-2"
			action={formAction}
			method="POST"
			onSubmit={() => {
				// Save the login method when form is submitted
				if (type === 'Login' && (providerName === 'github' || providerName === 'google')) {
					saveLastLoginMethod(providerName as LoginMethod)
				}
			}}
		>
			{redirectTo ? (
				<input type="hidden" name="redirectTo" value={redirectTo} />
			) : null}
			<StatusButton
				type="submit"
				className="w-full"
				status={isPending ? 'pending' : 'idle'}
			>
				<span className="inline-flex items-center gap-1.5">
					{providerIcons[providerName]}
					<span>
						{type} with {label}
					</span>
				</span>
			</StatusButton>
		</Form>
	)
}
