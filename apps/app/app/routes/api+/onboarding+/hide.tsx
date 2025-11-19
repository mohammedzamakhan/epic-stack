import { handleOnboardingHide } from '@repo/common'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { hideOnboarding } from '@repo/common'

export async function action(args: ActionFunctionArgs) {
	return handleOnboardingHide(args, {
		requireUserId,
		hideOnboarding,
	})
}
