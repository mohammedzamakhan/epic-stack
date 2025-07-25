import { parseWithZod } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
	useActionData,
} from 'react-router'
import { z } from 'zod'

import { InvitationsCard } from '#app/components/settings/cards/organization/invitations-card'
import { MembersCard } from '#app/components/settings/cards/organization/members-card'
import {
	AnnotatedLayout,
	AnnotatedSection,
} from '#app/components/ui/annotated-layout'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import {
	createOrganizationInvitation,
	sendOrganizationInvitationEmail,
	getOrganizationInvitations,
	deleteOrganizationInvitation,
} from '#app/utils/organization-invitation.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	invariant(params.orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: {
			slug: params.orgSlug,
			users: {
				some: {
					userId,
				},
			},
		},
		select: {
			id: true,
			name: true,
			slug: true,
		},
	})

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	const [pendingInvitations, members] = await Promise.all([
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
			},
			orderBy: {
				createdAt: 'asc',
			},
		}),
	])

	return {
		organization,
		pendingInvitations,
		members,
		currentUserId: userId,
	}
}

const InviteSchema = z.object({
	invites: z
		.array(
			z.object({
				email: z.string().email('Invalid email address'),
				role: z.enum(['admin', 'member']),
			}),
		)
		.min(1, 'At least one invite is required'),
})

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	invariant(params.orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: {
			slug: params.orgSlug,
			users: {
				some: {
					userId,
				},
			},
		},
		select: { id: true, name: true, slug: true },
	})

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'invite') {
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
			return Response.json({ success: true })
		} catch (error) {
			console.error('Error removing member:', error)
			return Response.json(
				{ error: 'Failed to remove member' },
				{ status: 500 },
			)
		}
	}

	return Response.json({ error: `Invalid intent: ${intent}` }, { status: 400 })
}

export default function MembersSettings() {
	const { pendingInvitations, members, currentUserId } =
		useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	return (
		<AnnotatedLayout>
			<AnnotatedSection
				title="Members"
				description="Manage the members of your organization."
			>
				<MembersCard members={members} currentUserId={currentUserId} />
			</AnnotatedSection>

			<AnnotatedSection
				title="Invitations"
				description="Invite new members to your organization."
			>
				<InvitationsCard
					pendingInvitations={pendingInvitations}
					actionData={actionData}
				/>
			</AnnotatedSection>
		</AnnotatedLayout>
	)
}
