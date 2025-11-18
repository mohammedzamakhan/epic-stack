import { type ActionFunctionArgs } from 'react-router'
import { handleOnboardingHide } from '@repo/common'
import { requireUserId } from '#app/utils/auth.server.ts'
import { hideOnboarding } from '#app/utils/onboarding.ts'

export async function action(args: ActionFunctionArgs) {
	return handleOnboardingHide(args, {
		requireUserId,
		hideOnboarding,
	})
}
