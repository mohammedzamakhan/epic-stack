import { handleOnboardingCompleteStep } from '@repo/common'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { markStepCompleted } from '#app/utils/onboarding.ts'

export async function action(args: ActionFunctionArgs) {
	return handleOnboardingCompleteStep(args, {
		requireUserId,
		markStepCompleted,
	})
}
