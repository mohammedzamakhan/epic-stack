import { type LoaderFunctionArgs, redirect } from 'react-router'
import { onboardingInviteTokenSessionKey } from '#app/routes/_auth+/onboarding'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import {
	validateInviteLink,
	createInvitationFromLink,
} from '#app/utils/organization-invitation.server'
import { redirectWithToast } from '#app/utils/toast.server'
import { verifySessionStorage } from '#app/utils/verification.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const token = params.token
	if (!token) {
		throw new Response('Not Found', { status: 404 })
	}

	try {
		const userId = await requireUserId(request)

		// Get user's email
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { email: true },
		})

		if (!user) {
			throw new Error('User not found')
		}

		// Validate the invite link
		const inviteLink = await validateInviteLink(token)

		// Check if user is already a member
		const existingMember = await prisma.userOrganization.findUnique({
			where: {
				userId_organizationId: {
					userId,
					organizationId: inviteLink.organizationId,
				},
			},
		})

		if (existingMember) {
			return redirectWithToast(`/app/${inviteLink.organization.slug}`, {
				title: 'Already a member',
				description: `You're already a member of ${inviteLink.organization.name}`,
			})
		}

		// Create a pending invitation for this user
		const invitation = await createInvitationFromLink(token, user.email)

		// Redirect to settings/organizations where they can accept/decline
		const inviterName =
			invitation.inviter?.name || invitation.inviter?.email || 'Someone'
		return redirectWithToast('/app/organizations', {
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
