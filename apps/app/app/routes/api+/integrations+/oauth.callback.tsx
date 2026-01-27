import { requireUserId } from '@repo/auth'
import { redirectWithToast as _redirectWithToast } from '@repo/common/toast'
import { handleOAuthCallback, OAuthStateManager } from '@repo/integrations'
import { type LoaderFunctionArgs } from 'react-router'
import { userHasOrgAccess } from '#app/utils/organization/organizations.server.ts'

export async function loader(args: LoaderFunctionArgs) {
	const url = new URL(args.request.url)
	const state = url.searchParams.get('state')

	// OAuth 2.0 flows use 'state' parameter - validate organization access
	// Note: OAuth 1.0a (Trello) doesn't use 'state', so this check only applies to OAuth 2.0
	if (state) {
		try {
			const stateData = OAuthStateManager.validateState(state)
			await userHasOrgAccess(args.request, stateData.organizationId)
		} catch (error) {
			return _redirectWithToast('/', {
				title: 'Integration failed',
				description:
					error instanceof Error ? error.message : 'Authorization failed',
				type: 'error',
			})
		}
	}

	return handleOAuthCallback(args, {
		requireUserId,
		redirectWithToast: async (
			url: string,
			options: { title: string; description: string; type: string },
		) => {
			return await _redirectWithToast(url, {
				title: options.title,
				description: options.description,
				type: options.type as 'message' | 'success' | 'error',
			})
		},
	})
}
