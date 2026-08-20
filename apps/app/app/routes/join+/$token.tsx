import { verifySessionStorage, requireUserId } from '@repo/auth'
import { redirectWithToast } from '@repo/common/toast'
import { and, db, eq, User, UserOrganization } from '@repo/database'
import { type LoaderFunctionArgs, redirect } from 'react-router'
import { onboardingInviteTokenSessionKey } from '#app/routes/_auth+/onboarding.tsx'
import {
	validateInviteLink,
	createInvitationFromLink,
} from '#app/utils/organization/invitation.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const token = params.token
	if (!token) {
		throw new Response('Not Found', { status: 404 })
	}

	try {
		const userId = await requireUserId(request)

		// Get user's email
		const [user] = await db
			.select({ email: User.email })
			.from(User)
			.where(eq(User.id, userId))
			.limit(1)

		if (!user) {
			throw new Error('User not found')
		}

		// Validate the invite link
		const inviteLink = await validateInviteLink(token)

		// Check if user is already a member
		const [existingMember] = await db
			.select({ userId: UserOrganization.userId })
			.from(UserOrganization)
			.where(
				and(
					eq(UserOrganization.userId, userId),
					eq(UserOrganization.organizationId, inviteLink.organizationId),
				),
			)
			.limit(1)

		if (existingMember) {
			return redirectWithToast(`/${inviteLink.organization.slug}`, {
				title: 'Already a member',
				description: `You're already a member of ${inviteLink.organization.name}`,
			})
		}

		// Create a pending invitation for this user
		const invitation = await createInvitationFromLink(token, user.email)
		if (!invitation) {
			throw new Error('Failed to create invitation')
		}

		// Redirect to settings/organizations where they can accept/decline
		const inviterName =
			invitation.inviter?.name || invitation.inviter?.email || 'Someone'
		return redirectWithToast('/organizations', {
			title: 'Organization Invitation',
			description: `${inviterName} has invited you to join ${inviteLink.organization.name}. Review the invitation below.`,
		})
	} catch (error) {
		// Check if it's an authentication error (redirect response)
		if (
			error instanceof Response &&
			(error.status === 302 || error.status === 301)
		) {
			// User is not authenticated, store the invite token in session and redirect to signup
			const verifySession = await verifySessionStorage.getSession(
				request.headers.get('cookie'),
			)
			verifySession.set(onboardingInviteTokenSessionKey, token)

			return redirect('/signup', {
				headers: {
					'set-cookie': await verifySessionStorage.commitSession(verifySession),
				},
			})
		}

		console.error('Error processing invite link:', error)
		throw new Response('Invalid or expired invite link', { status: 400 })
	}
}
