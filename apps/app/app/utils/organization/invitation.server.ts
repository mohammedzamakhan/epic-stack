import { webcrypto as crypto } from 'node:crypto'
import { invariantResponse } from '@epic-web/invariant'
import { markStepCompleted } from '@repo/common/onboarding'
import {
	and,
	db,
	desc,
	eq,
	gte,
	Organization,
	OrganizationInvitation,
	OrganizationInviteLink,
	OrganizationRole,
	User,
	UserOrganization,
} from '@repo/database'
import { OrganizationInviteEmail, sendEmail } from '@repo/email'
import { updateSeatQuantity } from '#app/utils/payments.server.ts'
import { type OrganizationRoleName } from './organizations.server'

async function getOrganizationRoleId(roleName: OrganizationRoleName) {
	const [role] = await db
		.select({ id: OrganizationRole.id })
		.from(OrganizationRole)
		.where(eq(OrganizationRole.name, roleName))
		.limit(1)
	if (!role) throw new Error(`Organization role '${roleName}' not found`)
	return role.id
}

export async function createOrganizationInvitation({
	organizationId,
	email,
	role = 'member',
	inviterId,
}: {
	organizationId: string
	email: string
	role?: OrganizationRoleName
	inviterId: string
}) {
	const token = crypto.randomUUID()
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
	const organizationRoleId = await getOrganizationRoleId(role)
	const [existing] = await db
		.select({ id: OrganizationInvitation.id })
		.from(OrganizationInvitation)
		.where(
			and(
				eq(OrganizationInvitation.email, email),
				eq(OrganizationInvitation.organizationId, organizationId),
			),
		)
		.limit(1)
	await db
		.insert(OrganizationInvitation)
		.values({
			email,
			organizationId,
			token,
			organizationRoleId,
			expiresAt,
			inviterId,
		})
		.onConflictDoUpdate({
			target: [
				OrganizationInvitation.email,
				OrganizationInvitation.organizationId,
			],
			set: { token, organizationRoleId, expiresAt, inviterId },
		})
	const invitation = await getInvitationByToken(token)
	if (!invitation) throw new Error('Failed to create invitation')
	if (!existing) {
		await markStepCompleted(inviterId, organizationId, 'invite_members', {
			completedVia: 'member_invitation',
			invitedEmail: email,
			role: invitation.organizationRole.name,
		})
	}
	return { invitation, isNewInvitation: !existing }
}

export async function sendOrganizationInvitationEmail({
	invitation,
	organizationName,
	inviterName,
}: {
	invitation: { token: string; email: string }
	organizationName: string
	inviterName: string
}) {
	const baseUrl = process.env.BASE_URL
	if (!baseUrl) throw new Error('BASE_URL environment variable is required')
	return sendEmail({
		to: invitation.email,
		subject: `You're invited to join ${organizationName}`,
		react: OrganizationInviteEmail({
			inviteUrl: `${baseUrl}/join/${invitation.token}`,
			organizationName,
			inviterName,
		}),
	})
}

export async function getOrganizationInvitations(organizationId: string) {
	const rows = await db
		.select({
			invitation: OrganizationInvitation,
			organizationRole: OrganizationRole,
			inviter: User,
		})
		.from(OrganizationInvitation)
		.innerJoin(
			OrganizationRole,
			eq(OrganizationInvitation.organizationRoleId, OrganizationRole.id),
		)
		.leftJoin(User, eq(OrganizationInvitation.inviterId, User.id))
		.where(
			and(
				eq(OrganizationInvitation.organizationId, organizationId),
				gte(OrganizationInvitation.expiresAt, new Date()),
			),
		)
		.orderBy(desc(OrganizationInvitation.createdAt))
	return rows.map((row) => ({
		...row.invitation,
		organizationRole: row.organizationRole,
		inviter: row.inviter,
	}))
}

export async function deleteOrganizationInvitation(
	invitationId: string,
	organizationId: string,
) {
	return db
		.delete(OrganizationInvitation)
		.where(
			and(
				eq(OrganizationInvitation.id, invitationId),
				eq(OrganizationInvitation.organizationId, organizationId),
			),
		)
}

export async function getPendingInvitationsByEmail(email: string) {
	const rows = await db
		.select({
			invitation: OrganizationInvitation,
			organizationRole: OrganizationRole,
			organization: Organization,
		})
		.from(OrganizationInvitation)
		.innerJoin(
			OrganizationRole,
			eq(OrganizationInvitation.organizationRoleId, OrganizationRole.id),
		)
		.innerJoin(
			Organization,
			eq(OrganizationInvitation.organizationId, Organization.id),
		)
		.where(
			and(
				eq(OrganizationInvitation.email, email.toLowerCase()),
				gte(OrganizationInvitation.expiresAt, new Date()),
			),
		)
		.orderBy(desc(OrganizationInvitation.createdAt))
	return rows.map((row) => ({
		...row.invitation,
		organizationRole: row.organizationRole,
		organization: row.organization,
	}))
}

async function acceptInvitation(
	invitation: Awaited<ReturnType<typeof getPendingInvitationsByEmail>>[number],
	userId: string,
) {
	const [member] = await db
		.select({ userId: UserOrganization.userId })
		.from(UserOrganization)
		.where(
			and(
				eq(UserOrganization.userId, userId),
				eq(UserOrganization.organizationId, invitation.organizationId),
			),
		)
		.limit(1)
	if (!member)
		await db
			.insert(UserOrganization)
			.values({
				userId,
				organizationId: invitation.organizationId,
				organizationRoleId: invitation.organizationRoleId,
				active: true,
			})
			.onConflictDoNothing()
	await db
		.delete(OrganizationInvitation)
		.where(eq(OrganizationInvitation.id, invitation.id))
	if (!member)
		await updateSeatQuantity(invitation.organizationId).catch(() => {})
	return { organization: invitation.organization, alreadyMember: !!member }
}

export async function acceptInvitationByEmail(email: string, userId: string) {
	const invitations = await getPendingInvitationsByEmail(email)
	const results = []
	for (const invitation of invitations)
		results.push(await acceptInvitation(invitation, userId))
	return results
}

export async function validateAndAcceptInvitation(
	token: string,
	userId: string,
) {
	const invitation = await getInvitationByToken(token)
	invariantResponse(invitation, 'Invitation not found')
	if (invitation.expiresAt && invitation.expiresAt < new Date())
		throw new Error('Invitation has expired')
	return acceptInvitation(invitation, userId)
}

export async function createOrganizationInviteLink({
	organizationId,
	role = 'member',
	createdById,
}: {
	organizationId: string
	role?: OrganizationRoleName
	createdById: string
}) {
	const token = crypto.randomUUID()
	const organizationRoleId = await getOrganizationRoleId(role)
	await db
		.insert(OrganizationInviteLink)
		.values({ organizationId, token, organizationRoleId, createdById })
		.onConflictDoUpdate({
			target: [
				OrganizationInviteLink.organizationId,
				OrganizationInviteLink.createdById,
			],
			set: { token, organizationRoleId, isActive: true },
		})
	const [link] = await db
		.select({
			link: OrganizationInviteLink,
			organizationRole: OrganizationRole,
		})
		.from(OrganizationInviteLink)
		.innerJoin(
			OrganizationRole,
			eq(OrganizationInviteLink.organizationRoleId, OrganizationRole.id),
		)
		.where(eq(OrganizationInviteLink.token, token))
		.limit(1)
	return link ? { ...link.link, organizationRole: link.organizationRole } : null
}

export async function getOrganizationInviteLink(
	organizationId: string,
	createdById: string,
) {
	const [link] = await db
		.select({
			link: OrganizationInviteLink,
			organizationRole: OrganizationRole,
		})
		.from(OrganizationInviteLink)
		.innerJoin(
			OrganizationRole,
			eq(OrganizationInviteLink.organizationRoleId, OrganizationRole.id),
		)
		.where(
			and(
				eq(OrganizationInviteLink.organizationId, organizationId),
				eq(OrganizationInviteLink.createdById, createdById),
			),
		)
		.limit(1)
	return link ? { ...link.link, organizationRole: link.organizationRole } : null
}

export async function getAllOrganizationInviteLinks(organizationId: string) {
	const rows = await db
		.select({
			link: OrganizationInviteLink,
			organizationRole: OrganizationRole,
			createdBy: User,
		})
		.from(OrganizationInviteLink)
		.innerJoin(
			OrganizationRole,
			eq(OrganizationInviteLink.organizationRoleId, OrganizationRole.id),
		)
		.leftJoin(User, eq(OrganizationInviteLink.createdById, User.id))
		.where(
			and(
				eq(OrganizationInviteLink.organizationId, organizationId),
				eq(OrganizationInviteLink.isActive, true),
			),
		)
	return rows.map((row) => ({
		...row.link,
		organizationRole: row.organizationRole,
		createdBy: row.createdBy,
	}))
}

export async function deactivateOrganizationInviteLink(
	organizationId: string,
	createdById: string,
) {
	return db
		.update(OrganizationInviteLink)
		.set({ isActive: false })
		.where(
			and(
				eq(OrganizationInviteLink.organizationId, organizationId),
				eq(OrganizationInviteLink.createdById, createdById),
			),
		)
}

export async function validateInviteLink(token: string) {
	const [row] = await db
		.select({
			link: OrganizationInviteLink,
			organizationRole: OrganizationRole,
			organization: Organization,
		})
		.from(OrganizationInviteLink)
		.innerJoin(
			OrganizationRole,
			eq(OrganizationInviteLink.organizationRoleId, OrganizationRole.id),
		)
		.innerJoin(
			Organization,
			eq(OrganizationInviteLink.organizationId, Organization.id),
		)
		.where(eq(OrganizationInviteLink.token, token))
		.limit(1)
	if (!row) throw new Error('Invite link not found')
	if (!row.link.isActive) throw new Error('Invite link is no longer active')
	return {
		...row.link,
		organizationRole: row.organizationRole,
		organization: row.organization,
	}
}

export async function createInvitationFromLink(
	token: string,
	userEmail: string,
) {
	const link = await validateInviteLink(token)
	const invitationToken = crypto.randomUUID()
	await db
		.insert(OrganizationInvitation)
		.values({
			email: userEmail.toLowerCase(),
			organizationId: link.organizationId,
			organizationRoleId: link.organizationRoleId,
			token: invitationToken,
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
			inviterId: link.createdById,
		})
		.onConflictDoUpdate({
			target: [
				OrganizationInvitation.email,
				OrganizationInvitation.organizationId,
			],
			set: {
				organizationRoleId: link.organizationRoleId,
				token: invitationToken,
				expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
				inviterId: link.createdById,
			},
		})
	return getInvitationByToken(invitationToken)
}

export async function validateAndAcceptInviteLink(
	token: string,
	userId: string,
) {
	const link = await validateInviteLink(token)
	const [member] = await db
		.select({ userId: UserOrganization.userId })
		.from(UserOrganization)
		.where(
			and(
				eq(UserOrganization.userId, userId),
				eq(UserOrganization.organizationId, link.organizationId),
			),
		)
		.limit(1)
	if (!member) {
		await db
			.insert(UserOrganization)
			.values({
				userId,
				organizationId: link.organizationId,
				organizationRoleId: link.organizationRoleId,
				active: true,
			})
			.onConflictDoNothing()
		await updateSeatQuantity(link.organizationId).catch(() => {})
	}
	return { organization: link.organization, alreadyMember: !!member }
}

async function getInvitationByToken(token: string) {
	const [row] = await db
		.select({
			invitation: OrganizationInvitation,
			organizationRole: OrganizationRole,
			organization: Organization,
			inviter: User,
		})
		.from(OrganizationInvitation)
		.innerJoin(
			OrganizationRole,
			eq(OrganizationInvitation.organizationRoleId, OrganizationRole.id),
		)
		.innerJoin(
			Organization,
			eq(OrganizationInvitation.organizationId, Organization.id),
		)
		.leftJoin(User, eq(OrganizationInvitation.inviterId, User.id))
		.where(eq(OrganizationInvitation.token, token))
		.limit(1)
	return row
		? {
				...row.invitation,
				organizationRole: row.organizationRole,
				organization: row.organization,
				inviter: row.inviter,
			}
		: null
}
