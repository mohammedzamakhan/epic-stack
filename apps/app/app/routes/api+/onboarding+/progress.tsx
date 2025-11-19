import {
	getOnboardingProgress,
	autoDetectCompletedSteps,
	handleOnboardingProgress,
} from '@repo/common/onboarding'
import { type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'

export async function loader(args: LoaderFunctionArgs) {
	return handleOnboardingProgress(args, {
		requireUserId,
		getOnboardingProgress,
		autoDetectCompletedSteps,
	})
}
