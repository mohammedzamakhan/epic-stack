import { Img } from 'openimg/react'
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	PageTitle,
	Icon,
} from '@repo/ui'
import { useState } from 'react'
import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	Link,
	useLoaderData,
	Form,
} from 'react-router'

import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { updateSeatQuantity } from '#app/utils/payments.server'
import {
	type UserOrganizationWithRole,
	getUserOrganizations,
} from '#app/utils/organizations.server'
import { shouldBeOnWaitlist } from '#app/utils/waitlist.server'
import { redirect } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	// Check if user should be on waitlist
	const onWaitlist = await shouldBeOnWaitlist(userId)
	if (onWaitlist) {
		throw redirect('/waitlist')
	}

	const [organizations, user] = await Promise.all([
		getUserOrganizations(userId),
		prisma.user.findUnique({
			where: { id: userId },
			select: { email: true },
		}),
	])

	// Get pending invitations for this user's email
	const pendingInvitations = user?.email
		? await prisma.organizationInvitation.findMany({
				where: {
					email: user.email.toLowerCase(),
					expiresAt: {
						gte: new Date(),
					},
				},
				include: {
					organization: {
						select: {
							id: true,
							name: true,
							slug: true,
							image: {
								select: {
									objectKey: true,
								},
							},
						},
					},
					organizationRole: {
						select: {
							id: true,
							name: true,
						},
					},
					inviter: {
						select: {
							name: true,
							email: true,
						},
					},
				},
				orderBy: {
					createdAt: 'desc',
				},
			})
		: []

	return { organizations, pendingInvitations }
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	const invitationId = formData.get('invitationId') as string

	if (intent === 'accept-invitation') {
		try {
			const invitation = await prisma.organizationInvitation.findUnique({
				where: { id: invitationId },
				include: {
					organization: true,
					organizationRole: true,
				},
			})

			if (!invitation) {
				return Response.json({ error: 'Invitation not found' }, { status: 404 })
			}

			// Check if user is already a member
			const existingMember = await prisma.userOrganization.findUnique({
				where: {
					userId_organizationId: {
						userId,
						organizationId: invitation.organizationId,
					},
				},
			})

			if (!existingMember) {
				// Add user to organization with the correct role
				await prisma.userOrganization.create({
					data: {
						userId,
						organizationId: invitation.organizationId,
						organizationRoleId: invitation.organizationRoleId,
						active: true,
					},
				})

				// Update seat quantity for billing
				try {
					await updateSeatQuantity(invitation.organizationId)
				} catch (error) {
					console.error(
						'Failed to update seat quantity after accepting invitation:',
						error,
					)
				}
			}

			// Delete the invitation
			await prisma.organizationInvitation.delete({
				where: { id: invitationId },
			})

			return Response.json({ success: true })
		} catch (error) {
			console.error('Error accepting invitation:', error)
			return Response.json(
				{ error: 'Failed to accept invitation' },
				{ status: 500 },
			)
		}
	}

	if (intent === 'decline-invitation') {
		try {
			await prisma.organizationInvitation.delete({
				where: { id: invitationId },
			})
			return Response.json({ success: true })
		} catch (error) {
			console.error('Error declining invitation:', error)
			return Response.json(
				{ error: 'Failed to decline invitation' },
				{ status: 500 },
			)
		}
	}

	return Response.json({ error: 'Invalid intent' }, { status: 400 })
}

export default function OrganizationsPage() {
	const { organizations, pendingInvitations } = useLoaderData<typeof loader>()
	const [searchQuery, setSearchQuery] = useState('')

	const filteredOrganizations = organizations.filter(
		(org: UserOrganizationWithRole) =>
			org.organization.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			org.organization.slug.toLowerCase().includes(searchQuery.toLowerCase()),
	)

	function getOrgImgSrc(objectKey?: string | null) {
		return objectKey
			? `/resources/images?objectKey=${encodeURIComponent(objectKey)}`
			: '/img/user.png'
	}

	return (
		<div className="flex flex-1 flex-col gap-4 py-4 pt-0">
			<div className="py-8 md:container md:max-w-2xl">
				<div className="mb-8">
					<PageTitle
						title="Organizations"
						description="Jump into an existing organization, accept pending invitations, or add a new one."
					/>

					<div className="mt-4 flex items-center gap-3">
						<div className="relative flex-1">
							<Icon
								name="search"
								className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform"
							/>
							<Input
								type="text"
								placeholder="Search..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="bg-background pl-10"
							/>
						</div>
						<Button asChild>
							<Link to="/organizations/create">
								<span className="mr-1">+</span>
								Add organization
							</Link>
						</Button>
					</div>
				</div>

				{/* Pending Invitations */}
				{pendingInvitations.length > 0 && (
					<Card className="mb-6">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Icon name="mail" className="h-5 w-5" />
								Pending Invitations
							</CardTitle>
							<p className="text-muted-foreground text-sm">
								You have been invited to join the following organizations.
								Choose to accept or decline each invitation.
							</p>
						</CardHeader>
						<CardContent className="space-y-3">
							{pendingInvitations.map((invitation) => (
								<div
									key={invitation.id}
									className="flex items-center justify-between rounded-lg border p-4"
								>
									<div className="flex items-center gap-3">
										<div className="ring-muted bg-muted flex h-10 w-10 items-center justify-center overflow-hidden rounded-md text-sm font-medium ring-2 ring-offset-2">
											{invitation.organization.image?.objectKey ? (
												<Img
													src={getOrgImgSrc(
														invitation.organization.image.objectKey,
													)}
													alt={invitation.organization.name}
													className="h-full w-full object-cover"
													width={40}
													height={40}
												/>
											) : (
												<span>
													{invitation.organization.name.charAt(0).toUpperCase()}
												</span>
											)}
										</div>
										<div>
											<div className="font-medium">
												{invitation.organization.name}
											</div>
											<div className="text-muted-foreground flex items-center gap-2 text-sm">
												<Badge variant="secondary" className="text-xs">
													{invitation.organizationRole.name}
												</Badge>
												{invitation.inviter && (
													<span>
														Invited by{' '}
														{invitation.inviter.name ||
															invitation.inviter.email}
													</span>
												)}
											</div>
										</div>
									</div>
									<div className="flex gap-2">
										<Form method="POST">
											<input
												type="hidden"
												name="intent"
												value="accept-invitation"
											/>
											<input
												type="hidden"
												name="invitationId"
												value={invitation.id}
											/>
											<Button type="submit" size="sm">
												Accept
											</Button>
										</Form>
										<Form method="POST">
											<input
												type="hidden"
												name="intent"
												value="decline-invitation"
											/>
											<input
												type="hidden"
												name="invitationId"
												value={invitation.id}
											/>
											<Button type="submit" variant="outline" size="sm">
												Decline
											</Button>
										</Form>
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				)}

				<div className="space-y-2">
					{filteredOrganizations.map((org: UserOrganizationWithRole) => (
						<Link
							key={org.organization.id}
							to={`/${org.organization.slug}`}
							className="block"
						>
							<div className="bg-background flex items-center justify-between rounded-lg border p-4 transition-colors hover:shadow-sm">
								<div className="flex items-center gap-3">
									<div className="ring-muted bg-muted flex h-10 w-10 items-center justify-center overflow-hidden rounded-md text-sm font-medium ring-2 ring-offset-2">
										{org.organization.image?.objectKey ? (
											<Img
												src={getOrgImgSrc(org.organization.image.objectKey)}
												alt={org.organization.name}
												className="h-full w-full object-cover"
												width={40}
												height={40}
											/>
										) : (
											<span>
												{org.organization.name.charAt(0).toUpperCase()}
											</span>
										)}
									</div>
									<div>
										<div className="font-medium">{org.organization.name}</div>
										<div className="text-muted-foreground text-sm">
											/app/{org.organization.slug}
										</div>
									</div>
								</div>
								<div className="text-muted-foreground flex items-center gap-2">
									<span className="text-sm">1</span>
									<Icon name="chevron-right" className="h-4 w-4" />
								</div>
							</div>
						</Link>
					))}

					{(filteredOrganizations.length === 0 && searchQuery) ||
					organizations.length === 0 ? (
						<div className="border-border rounded-lg border p-12">
							<div className="flex flex-col items-center justify-center text-center">
								<div className="bg-muted mb-4 rounded-lg p-3">
									<Icon
										name="folder-open"
										className="text-muted-foreground h-8 w-8"
									/>
								</div>
								<div className="mb-2 text-lg font-medium">
									No organization found
								</div>
								<p className="text-muted-foreground text-sm">
									{searchQuery
										? 'Adjust your search query to show more.'
										: "You haven't joined any organizations yet."}
								</p>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	)
}
