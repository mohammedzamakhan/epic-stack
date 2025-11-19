import { handleOnboardingCompleteStep } from '@repo/common'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { markStepCompleted } from '@repo/common'

export async function action(args: ActionFunctionArgs) {
	return handleOnboardingCompleteStep(args, {
		requireUserId,
		markStepCompleted,
	})
}
