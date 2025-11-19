import { redirect } from 'react-router'
import { getUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
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
	const referrerEntry = await prisma.waitlistEntry.findUnique({
		where: { referralCode },
		include: {
			user: {
				select: { name: true, username: true },
			},
		},
	})

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
		const userEntry = await prisma.waitlistEntry.findUnique({
			where: { userId },
		})

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

		const referrerName = referrerEntry.user.name || referrerEntry.user.username

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
