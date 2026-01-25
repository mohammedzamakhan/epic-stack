import { handleOnboardingHide, hideOnboarding } from '@repo/common/onboarding'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '@repo/auth'
import { checkUserOrganizationAccess } from '#app/utils/organization/organizations.server.ts'

export async function action(args: ActionFunctionArgs) {
	return handleOnboardingHide(args, {
		requireUserId,
		checkUserOrganizationAccess,
		hideOnboarding,
	})
}
