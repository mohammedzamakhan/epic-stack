import { verifySessionStorage, getUserId } from '@repo/auth'
import { redirectWithToast } from '@repo/common/toast'
import { db, eq, User, WaitlistEntry } from '@repo/database'
import { redirect } from 'react-router'
import { linkReferral } from '#app/utils/waitlist.server.ts'
import { type Route } from './+types/$code.ts'

export const REFERRAL_CODE_SESSION_KEY = 'referralCode'

export async function loader({ request, params }: Route.LoaderArgs) {
	const referralCode = params.code

	// Validate referral code parameter
	if (!referralCode || typeof referralCode !== 'string') {
		throw new Response('Not Found', { status: 404 })
	}

	// Enforce expected format (username-XXXX) and max length to prevent potential issues
	const referralCodeRegex = /^[\w-]{1,96}-\d{4}$/
	if (!referralCodeRegex.test(referralCode) || referralCode.length > 100) {
		return redirectWithToast('/signup', {
			title: 'Invalid referral link',
			description: 'The referral link format is invalid.',
			type: 'error',
		})
	}

	// Check if referral code exists
	const [referrerEntry] = await db
		.select({
			id: WaitlistEntry.id,
			userName: User.name,
			userUsername: User.username,
		})
		.from(WaitlistEntry)
		.leftJoin(User, eq(WaitlistEntry.userId, User.id))
		.where(eq(WaitlistEntry.referralCode, referralCode))
		.limit(1)

	if (!referrerEntry) {
		return redirectWithToast('/signup', {
			title: 'Invalid referral link',
			description: 'The referral link you used is invalid or expired.',
			type: 'error',
		})
	}

	try {
		const userId = await getUserId(request)

		if (!userId) {
			// User is not authenticated, store the referral code in session and redirect to signup
			const verifySession = await verifySessionStorage.getSession(
				request.headers.get('cookie'),
			)
			verifySession.set(REFERRAL_CODE_SESSION_KEY, referralCode)

			return redirect('/signup', {
				headers: {
					'set-cookie': await verifySessionStorage.commitSession(verifySession),
				},
			})
		}

		// User is authenticated, check if they already have a waitlist entry
		const [userEntry] = await db
			.select({ referredById: WaitlistEntry.referredById })
			.from(WaitlistEntry)
			.where(eq(WaitlistEntry.userId, userId))
			.limit(1)

		// If user already has a referrer, redirect to waitlist
		if (userEntry?.referredById) {
			return redirectWithToast('/waitlist', {
				title: 'Already referred',
				description:
					'You have already been referred by someone. You can only use one referral link.',
				type: 'error',
			})
		}

		// Link the referral
		const result = await linkReferral(userId, referralCode)

		if (!result.success) {
			return redirectWithToast('/waitlist', {
				title: 'Referral failed',
				description: result.message,
				type: 'error',
			})
		}

		const referrerName =
			referrerEntry.userName || referrerEntry.userUsername || 'Someone'

		return redirectWithToast('/waitlist', {
			title: 'Referral applied!',
			description: `You were referred by ${referrerName}. Welcome to the waitlist!`,
		})
	} catch (error) {
		console.error('Error processing referral link:', error)
		return redirectWithToast('/signup', {
			title: 'Error',
			description: 'An error occurred while processing your referral link.',
			type: 'error',
		})
	}
}
