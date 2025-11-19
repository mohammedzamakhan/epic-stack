import { handleOnboardingProgress } from '@repo/common'
import { type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import {
	getOnboardingProgress,
	autoDetectCompletedSteps,
} from '@repo/common'

export async function loader(args: LoaderFunctionArgs) {
	return handleOnboardingProgress(args, {
		requireUserId,
		getOnboardingProgress,
		autoDetectCompletedSteps,
	})
}
