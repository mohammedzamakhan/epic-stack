import { invariant } from '@epic-web/invariant'
import { verifySessionStorage } from '@repo/auth'
import { redirect } from 'react-router'
import { onboardingEmailSessionKey } from './onboarding.tsx'
import { type VerifyFunctionArgs } from './verify.server.tsx'

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
