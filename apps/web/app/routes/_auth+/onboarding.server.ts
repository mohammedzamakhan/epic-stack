import { invariant } from '@epic-web/invariant'
import { redirect } from 'react-router'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { onboardingEmailSessionKey } from './onboarding.tsx'
import { type VerifyFunctionArgs } from './verify.server.ts'

export async function handleVerification({
	request,
	submission,
}: VerifyFunctionArgs) {
	invariant(
		submission.status === 'success',
		'Submission should be successful by now',
	)
	// Get the existing session to preserve any invite token that was set
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	verifySession.set(onboardingEmailSessionKey, submission.value.target)

	return redirect('/onboarding', {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})
}
