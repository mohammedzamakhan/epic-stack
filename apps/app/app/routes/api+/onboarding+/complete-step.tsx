import {
	handleOnboardingCompleteStep,
	markStepCompleted,
} from '@repo/common/onboarding'
import { type ActionFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'

export async function action(args: ActionFunctionArgs) {
	return handleOnboardingCompleteStep(args, {
		requireUserId,
		markStepCompleted,
	})
}
