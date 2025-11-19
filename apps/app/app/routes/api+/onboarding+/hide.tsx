import { handleOnboardingHide, hideOnboarding } from '@repo/common/onboarding'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'

export async function action(args: ActionFunctionArgs) {
	return handleOnboardingHide(args, {
		requireUserId,
		hideOnboarding,
	})
}
