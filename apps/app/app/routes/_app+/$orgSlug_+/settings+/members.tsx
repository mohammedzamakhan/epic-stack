import { parseWithZod } from '@conform-to/zod'
import { AnnotatedLayout, AnnotatedSection } from '@repo/ui/annotated-layout'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
	useActionData,
} from 'react-router'
import { z } from 'zod'

import { InvitationsCard } from '#app/components/settings/cards/organization/invitations-card.tsx'
import { MembersCard } from '#app/components/settings/cards/organization/members-card.tsx'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	createOrganizationInvitation,
	sendOrganizationInvitationEmail,
	getOrganizationInvitations,
	deleteOrganizationInvitation,
	createOrganizationInviteLink,
	getOrganizationInviteLink,
	deactivateOrganizationInviteLink,
} from '#app/utils/organization-invitation.server.ts'
import { requireUserOrganization } from '#app/utils/organization-loader.server.ts'
import {
	requireUserWithOrganizationPermission,
	ORG_PERMISSIONS,
	getUserOrganizationPermissionsForClient,
} from '#app/utils/organization-permissions.server.ts'
import { type OrganizationRoleName } from '#app/utils/organizations.server.ts'
import { updateSeatQuantity } from '#app/utils/payments.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		name: true,
		slug: true,
	})

	// Check if user has permission to view members
	await requireUserWithOrganizationPermission(
		request,
		organization.id,
		ORG_PERMISSIONS.READ_MEMBER_ANY,
	)

	const [
		pendingInvitations,
		members,
		inviteLink,
		availableRoles,
		userPermissions,
	] = await Promise.all([
		getOrganizationInvitations(organization.id),
		prisma.userOrganization.findMany({
			where: {
				organizationId: organization.id,
				active: true,
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: {
							select: {
								id: true,
								altText: true,
							},
						},
					},
				},
				organizationRole: {
					select: {
						id: true,
						name: true,
						level: true,
					},
				},
			},
			orderBy: {
				createdAt: 'asc',
			},
		}),
		getOrganizationInviteLink(organization.id, userId),
		getAvailableRoles(),
		getUserOrganizationPermissionsForClient(userId, organization.id),
	])

	return {
		organization,
		pendingInvitations,
		members,
		inviteLink,
		availableRoles,
		currentUserId: userId,
		userPermissions,
	}
}

// Get available roles from the database
async function getAvailableRoles() {
	const roles = await prisma.organizationRole.findMany({
		select: { name: true },
		orderBy: { level: 'desc' },
	})
	return roles.map((r) => r.name) as OrganizationRoleName[]
}

const InviteSchema = z.object({
	invites: z
		.array(
			z.object({
				email: z.string().email('Invalid email address'),
				role: z.enum(['admin', 'member', 'viewer', 'guest'] as const),
			}),
		)
		.min(1, 'At least one invite is required'),
})

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		name: true,
		slug: true,
	})

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'send-invitations') {
		// Check if user has permission to invite members
		await requireUserWithOrganizationPermission(
			request,
			organization.id,
			ORG_PERMISSIONS.CREATE_MEMBER_ANY,
		)

		const submission = parseWithZod(formData, { schema: InviteSchema })

		if (submission.status !== 'success') {
			return Response.json({ result: submission.reply() }, { status: 400 })
		}

		const { invites } = submission.value

		try {
			const currentUser = await prisma.user.findUnique({
				where: { id: userId },
				select: { name: true, email: true },
			})

			await Promise.all(
				invites.map(async (invite) => {
					const { invitation } = await createOrganizationInvitation({
						organizationId: organization.id,
						email: invite.email,
						role: invite.role,
						inviterId: userId,
					})

					await sendOrganizationInvitationEmail({
						invitation,
						organizationName: organization.name,
						inviterName: currentUser?.name || currentUser?.email || 'Someone',
					})
				}),
			)

			return Response.json({ result: submission.reply({ resetForm: true }) })
		} catch (error) {
			console.error('Error sending invitations:', error)
			return Response.json(
				{
					result: submission.reply({
						formErrors: ['An error occurred while sending the invitations.'],
					}),
				},
				{ status: 500 },
			)
		}
	}

	if (intent === 'remove-invitation') {
		// Check if user has permission to manage members
		await requireUserWithOrganizationPermission(
			request,
			organization.id,
			ORG_PERMISSIONS.DELETE_MEMBER_ANY,
		)

		const invitationId = formData.get('invitationId') as string

		try {
			await deleteOrganizationInvitation(invitationId)
			return Response.json({ success: true })
		} catch (error) {
			console.error('Error removing invitation:', error)
			return Response.json(
				{ error: 'Failed to remove invitation' },
				{ status: 500 },
			)
		}
	}

	if (intent === 'remove-member') {
		// Check if user has permission to remove members
		await requireUserWithOrganizationPermission(
			request,
			organization.id,
			ORG_PERMISSIONS.DELETE_MEMBER_ANY,
		)

		const memberUserId = formData.get('userId') as string

		if (memberUserId === userId) {
			return Response.json(
				{ error: 'You cannot remove yourself' },
				{ status: 400 },
			)
		}

		try {
			await prisma.userOrganization.update({
				where: {
					userId_organizationId: {
						userId: memberUserId,
						organizationId: organization.id,
					},
				},
				data: {
					active: false,
				},
			})

			// Update seat quantity for billing
			try {
				await updateSeatQuantity(organization.id)
			} catch (error) {
				console.error(
					'Failed to update seat quantity after removing user:',
					error,
				)
			}

			return Response.json({ success: true })
		} catch (error) {
			console.error('Error removing member:', error)
			return Response.json(
				{ error: 'Failed to remove member' },
				{ status: 500 },
			)
		}
	}

	// --- update-member-role intent ---
	if (intent === 'update-member-role') {
		const memberUserId = formData.get('userId') as string
		const newRole = formData.get('role') as string

		if (!memberUserId || typeof memberUserId !== 'string') {
			return Response.json({ error: 'Missing userId' }, { status: 400 })
		}
		if (!['admin', 'member'].includes(newRole)) {
			return Response.json({ error: 'Invalid role' }, { status: 400 })
		}

		// Only allow admins to change roles
		const requester = await prisma.userOrganization.findUnique({
			where: {
				userId_organizationId: {
					userId,
					organizationId: organization.id,
				},
			},
			include: {
				organizationRole: {
					select: { name: true },
				},
			},
		})
		if (
			!requester ||
			requester.organizationRole.name !== 'admin' ||
			!requester.active
		) {
			return Response.json(
				{ error: 'Only admins can change member roles' },
				{ status: 403 },
			)
		}

		// Prevent demoting the last admin
		const memberToUpdate = await prisma.userOrganization.findUnique({
			where: {
				userId_organizationId: {
					userId: memberUserId,
					organizationId: organization.id,
				},
			},
			include: {
				organizationRole: {
					select: { name: true },
				},
			},
		})
		if (
			memberToUpdate &&
			memberToUpdate.organizationRole.name === 'admin' &&
			memberToUpdate.active &&
			newRole === 'member'
		) {
			const activeAdminCount = await prisma.userOrganization.count({
				where: {
					organizationId: organization.id,
					organizationRole: {
						name: 'admin',
					},
					active: true,
				},
			})
			if (activeAdminCount === 1) {
				return Response.json(
					{ error: 'Cannot demote the last admin of the organization' },
					{ status: 400 },
				)
			}
		}

		// Get the organization role ID for the new role name
		const organizationRole = await prisma.organizationRole.findUnique({
			where: { name: newRole },
			select: { id: true },
		})

		if (!organizationRole) {
			return Response.json({ error: 'Role not found' }, { status: 400 })
		}

		try {
			await prisma.userOrganization.update({
				where: {
					userId_organizationId: {
						userId: memberUserId,
						organizationId: organization.id,
					},
				},
				data: {
					organizationRoleId: organizationRole.id,
				},
			})
			return Response.json({ success: true })
		} catch (error) {
			console.error('Error updating member role:', error)
			return Response.json(
				{ error: 'Failed to update member role' },
				{ status: 500 },
			)
		}
	}

	if (intent === 'create-invite-link') {
		try {
			const inviteLink = await createOrganizationInviteLink({
				organizationId: organization.id,
				role: 'member',
				createdById: userId,
			})
			return Response.json({ success: true, inviteLink })
		} catch (error) {
			console.error('Error creating invite link:', error)
			return Response.json(
				{ error: 'Failed to create invite link' },
				{ status: 500 },
			)
		}
	}

	if (intent === 'reset-invite-link') {
		try {
			const inviteLink = await createOrganizationInviteLink({
				organizationId: organization.id,
				role: 'member',
				createdById: userId,
			})
			return Response.json({ success: true, inviteLink })
		} catch (error) {
			console.error('Error resetting invite link:', error)
			return Response.json(
				{ error: 'Failed to reset invite link' },
				{ status: 500 },
			)
		}
	}

	if (intent === 'deactivate-invite-link') {
		try {
			await deactivateOrganizationInviteLink(organization.id, userId)
			return Response.json({ success: true })
		} catch (error) {
			console.error('Error deactivating invite link:', error)
			return Response.json(
				{ error: 'Failed to deactivate invite link' },
				{ status: 500 },
			)
		}
	}

	return Response.json({ error: `Invalid intent: ${intent}` }, { status: 400 })
}

export default function MembersSettings() {
	const {
		pendingInvitations,
		members,
		inviteLink,
		availableRoles,
		currentUserId,
	} = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	return (
		<AnnotatedLayout>
			<AnnotatedSection>
				<MembersCard members={members} currentUserId={currentUserId} />
			</AnnotatedSection>

			<AnnotatedSection>
				<InvitationsCard
					pendingInvitations={pendingInvitations}
					inviteLink={inviteLink}
					actionData={actionData}
					availableRoles={availableRoles}
				/>
			</AnnotatedSection>
		</AnnotatedLayout>
	)
}
