import { redirect } from 'react-router'
import { authenticator } from '@repo/auth'
import { handleMockAction } from '@repo/auth'
import { ProviderNameSchema } from '#app/utils/connections.tsx'
import { getReferrerRoute } from '@repo/client-utils'
import { getRedirectCookieHeader } from '@repo/server-utils'
import { type Route } from './+types/auth_.$provider.ts'

export async function loader() {
	return redirect('/login')
}

export async function action({ request, params }: Route.ActionArgs) {
	const providerName = ProviderNameSchema.parse(params.provider)

	try {
		await handleMockAction(providerName, request)
		return await authenticator.authenticate(providerName, request)
	} catch (error: unknown) {
		if (error instanceof Response) {
			const formData = await request.formData()
			const rawRedirectTo = formData.get('redirectTo')
			const redirectTo =
				typeof rawRedirectTo === 'string'
					? rawRedirectTo
					: getReferrerRoute(request)
			const redirectToCookie = getRedirectCookieHeader(redirectTo)
			if (redirectToCookie) {
				error.headers.append('set-cookie', redirectToCookie)
			}
		}
		throw error
	}
}
