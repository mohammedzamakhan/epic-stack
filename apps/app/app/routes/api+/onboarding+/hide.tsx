import { handleOnboardingHide, hideOnboarding } from '@repo/common/onboarding'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { checkUserOrganizationAccess } from '#app/utils/organization/organizations.server.ts'

export async function action(args: ActionFunctionArgs) {
	return handleOnboardingHide(args, {
		requireUserId,
		checkUserOrganizationAccess,
		hideOnboarding,
	})
}
