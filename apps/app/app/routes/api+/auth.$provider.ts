import { handleMockAction } from '@repo/auth'
import { ProviderNameSchema } from '@repo/auth/constants'
import { data } from 'react-router'
import { authenticator } from '#app/utils/auth.server.ts'
import { type Route } from './+types/auth.$provider.ts'

export async function action({ request, params }: Route.ActionArgs) {
	const providerName = ProviderNameSchema.parse(params.provider)

	try {
		await handleMockAction(providerName, request)

		// Store redirect info and initiate OAuth flow
		// This will redirect to the provider's OAuth page
		return await authenticator.authenticate(providerName, request)
	} catch (error: unknown) {
		if (error instanceof Response) {
			// If it's a redirect response (normal OAuth flow), let it through
			if (error.status === 302) {
				return error
			}
		}

		return data(
			{
				success: false,
				error: 'auth_failed',
				message: `Failed to authenticate with ${providerName}`,
			},
			{ status: 400 },
		)
	}
}

export async function loader({ params }: Route.LoaderArgs) {
	const providerName = ProviderNameSchema.parse(params.provider)

	return data(
		{
			success: false,
			error: 'method_not_allowed',
			message: `Use POST method to authenticate with ${providerName}`,
		},
		{ status: 405 },
	)
}
