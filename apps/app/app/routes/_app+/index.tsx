import { LoaderFunctionArgs, redirect } from 'react-router'
import { getUserId } from '#app/utils/auth.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { shouldBeOnWaitlist } from '#app/utils/waitlist.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await getUserId(request)

	if (!userId) {
		return redirect('/signup')
	}

	try {
		const { getUserDefaultOrganization } = await import('#app/utils/organizations.server.ts')
		const defaultOrg = await getUserDefaultOrganization(userId)

		if (defaultOrg?.organization?.slug) {
			return redirect(`/${defaultOrg.organization.slug}`)
		}
	} catch (error) {
		// Error getting default organization
	}

	const onWaitlist = await shouldBeOnWaitlist(userId)
	if (onWaitlist) {
		throw redirect('/waitlist')
	}

	// If no organization found, redirect to create one
	return redirectWithToast('/organizations/create', {
		title: 'Create an organization',
		description: 'Organizations are used to group your projects.',
		type: 'message',
	})
}
