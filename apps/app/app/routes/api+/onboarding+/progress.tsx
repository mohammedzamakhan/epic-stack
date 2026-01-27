import { requireUserId } from '@repo/auth'
import {
	autoDetectCompletedSteps,
	getOnboardingProgress,
	handleOnboardingProgress,
} from '@repo/common/onboarding'
import { type LoaderFunctionArgs } from 'react-router'
import { checkUserOrganizationAccess } from '#app/utils/organization/organizations.server.ts'

export async function loader(args: LoaderFunctionArgs) {
	return handleOnboardingProgress(args, {
		requireUserId,
		checkUserOrganizationAccess,
		getOnboardingProgress,
		autoDetectCompletedSteps,
	})
}
