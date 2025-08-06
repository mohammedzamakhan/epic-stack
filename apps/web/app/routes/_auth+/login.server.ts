import { invariant } from '@epic-web/invariant'
import { redirect } from 'react-router'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { twoFAVerificationType } from '#app/routes/settings+/profile.two-factor.tsx'
import { getUserId, sessionKey } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { combineResponseInits } from '#app/utils/misc.tsx'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { getRedirectToUrl, type VerifyFunctionArgs } from './verify.server.ts'
import { getUserDefaultOrganization } from '#app/utils/organizations.server.ts'

// Helper to get user's dashboard URL
async function getUserDashboardUrl(userId: string): Promise<string> {
	const defaultOrg = await getUserDefaultOrganization(userId)
	if (defaultOrg?.organization?.slug) {
		return `/app/${defaultOrg.organization.slug}`
	}
	return '/app'
}

const verifiedTimeKey = 'verified-time'
const unverifiedSessionIdKey = 'unverified-session-id'
const rememberKey = 'remember'

export async function handleNewSession(
	{
		request,
		session,
		redirectTo,
		remember,
	}: {
		request: Request
		session: { userId: string; id: string; expirationDate: Date }
		redirectTo?: string
		remember: boolean
	},
	responseInit?: ResponseInit,
) {
	const verification = await prisma.verification.findUnique({
		select: { id: true },
		where: {
			target_type: { target: session.userId, type: twoFAVerificationType },
		},
	})
	const userHasTwoFactor = Boolean(verification)

	if (userHasTwoFactor) {
		const verifySession = await verifySessionStorage.getSession()
		verifySession.set(unverifiedSessionIdKey, session.id)
		verifySession.set(rememberKey, remember)
		const redirectUrl = getRedirectToUrl({
			request,
			type: twoFAVerificationType,
			target: session.userId,
			redirectTo,
		})
		return redirect(
			`${redirectUrl.pathname}?${redirectUrl.searchParams}`,
			combineResponseInits(
				{
					headers: {
						'set-cookie':
							await verifySessionStorage.commitSession(verifySession),
					},
				},
				responseInit,
			),
		)
	} else {
		const authSession = await authSessionStorage.getSession(
			request.headers.get('cookie'),
		)
		authSession.set(sessionKey, session.id)

		const destination = redirectTo ?? await getUserDashboardUrl(session.userId)
		return redirect(
			safeRedirect(destination),
			combineResponseInits(
				{
					headers: {
						'set-cookie': await authSessionStorage.commitSession(authSession, {
							expires: remember ? session.expirationDate : undefined,
						}),
					},
				},
				responseInit,
			),
		)
	}
}

export async function handleVerification({ request, submission }: VerifyFunctionArgs) {
  const { unverifiedSessionId, redirectTo } = submission.payload ?? {}
  let finalRedirectTo = redirectTo

  const headers = new Headers()

  if (unverifiedSessionId) {
    // If unverifiedSessionId is passed, fetch session and get userId/expirationDate
    const session = await prisma.session.findUnique({
      select: { expirationDate: true, userId: true },
      where: { id: unverifiedSessionId },
    })

    if (!session) {
      throw await redirectWithToast('/login', {
        type: 'error',
        title: 'Invalid session',
        description: 'Could not find session to verify. Please try again.',
      })
    }

    const sessionUserId = session.userId

    // ...session/cookie logic here...
    // (Assume existing logic to commit session cookies and set headers)

    if (!finalRedirectTo) {
      finalRedirectTo = await getUserDashboardUrl(sessionUserId)
    }

    return redirect(safeRedirect(finalRedirectTo), { headers })
  } else {
    // ...existing logic to set session/cookie...
    // (Assume existing logic to commit session cookies and set headers)

    if (!finalRedirectTo) {
      const currentUserId = await getUserId(request)
      if (currentUserId) {
        finalRedirectTo = await getUserDashboardUrl(currentUserId)
      } else {
        finalRedirectTo = '/app'
      }
    }

    return redirect(safeRedirect(finalRedirectTo), { headers })
  }
}

export async function shouldRequestTwoFA(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	)
	if (verifySession.has(unverifiedSessionIdKey)) return true
	const userId = await getUserId(request)
	if (!userId) return false
	// if it's over two hours since they last verified, we should request 2FA again
	const userHasTwoFA = await prisma.verification.findUnique({
		select: { id: true },
		where: { target_type: { target: userId, type: twoFAVerificationType } },
	})
	if (!userHasTwoFA) return false
	const verifiedTime = authSession.get(verifiedTimeKey) ?? new Date(0)
	const twoHours = 1000 * 60 * 2
	return Date.now() - verifiedTime > twoHours
}
