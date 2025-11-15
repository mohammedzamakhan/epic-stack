import { invariant } from '@epic-web/invariant'
import { parseWithZod } from '@conform-to/zod'
import { useLoaderData, useActionData } from 'react-router'
import { z } from 'zod'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { ssoConfigurationService } from '#app/utils/sso-configuration.server.ts'
import { auditLogService } from '#app/utils/audit-log.server.ts'
import { SSOUserManagement } from '#app/components/sso-user-management.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/$organizationId.sso.users.ts'

const SSOUserActionSchema = z.object({
	intent: z.enum(['change_role', 'toggle_status']),
	userId: z.string(),
	roleId: z.string().optional(),
	active: z.boolean().optional(),
})

export async function loader({ request, params }: Route['LoaderArgs']) {
	await requireUserWithRole(request, 'admin')

	invariant(params.organizationId, 'Organization ID is required')

	// Get organization
	const organization = await prisma.organization.findUnique({
		where: { id: params.organizationId },
		select: {
			id: true,
			name: true,
			slug: true,
		},
	})

	if (!organization) {
		throw new Response('Organization not found', { status: 404 })
	}

	// Get SSO configuration
	const ssoConfig = await ssoConfigurationService.getConfiguration(
		organization.id,
	)

	if (!ssoConfig) {
		throw new Response('SSO not configured for this organization', {
			status: 404,
		})
	}

	// Get users who have authenticated through SSO
	const ssoUsers = await prisma.user.findMany({
		where: {
			organizations: {
				some: {
					organizationId: organization.id,
				},
			},
			sessions: {
				some: {
					ssoSession: {
						ssoConfigId: ssoConfig.id,
					},
				},
			},
		},
		select: {
			id: true,
			name: true,
			email: true,
			username: true,
			image: {
				select: {
					id: true,
					altText: true,
				},
			},
			organizations: {
				where: {
					organizationId: organization.id,
				},
				select: {
					organizationRole: {
						select: {
							id: true,
							name: true,
							level: true,
						},
					},
					active: true,
					isDefault: true,
					department: true,
					createdAt: true,
					updatedAt: true,
				},
			},
			sessions: {
				where: {
					ssoSession: {
						ssoConfigId: ssoConfig.id,
					},
				},
				select: {
					ssoSession: {
						select: {
							id: true,
							providerUserId: true,
							createdAt: true,
							updatedAt: true,
							ssoConfig: {
								select: {
									providerName: true,
								},
							},
						},
					},
				},
				orderBy: {
					updatedAt: 'desc',
				},
			},
		},
	})

	// Transform the data to match the expected interface
	const transformedSSOUsers = ssoUsers.map((user) => {
		const orgMembership = user.organizations[0] // Should only be one for this organization
		if (!orgMembership) {
			throw new Error(`User ${user.id} has no organization membership`)
		}
		return {
			id: user.id,
			name: user.name,
			email: user.email,
			username: user.username,
			image: user.image,
			organizationRole: orgMembership.organizationRole,
			active: orgMembership.active,
			isDefault: orgMembership.isDefault,
			department: orgMembership.department,
			createdAt: orgMembership.createdAt,
			updatedAt: orgMembership.updatedAt,
			ssoSessions: user.sessions.map((session) => ({
				id: session.ssoSession!.id,
				providerUserId: session.ssoSession!.providerUserId,
				createdAt: session.ssoSession!.createdAt,
				updatedAt: session.ssoSession!.updatedAt,
				ssoConfig: {
					providerName: session.ssoSession!.ssoConfig.providerName,
				},
			})),
		}
	})

	// Get available roles
	const availableRoles = await prisma.organizationRole.findMany({
		select: {
			id: true,
			name: true,
			level: true,
		},
		orderBy: {
			level: 'desc',
		},
	})

	// Get SSO audit logs
	const auditLogs = await prisma.auditLog.findMany({
		where: {
			organizationId: organization.id,
			action: {
				startsWith: 'sso_',
			},
		},
		select: {
			id: true,
			action: true,
			createdAt: true,
			metadata: true,
			details: true,
			user: {
				select: {
					id: true,
					name: true,
					username: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
		take: 50, // Limit to recent 50 logs
	})

	return Response.json({
		organization,
		ssoConfig,
		ssoUsers: transformedSSOUsers,
		availableRoles,
		auditLogs: auditLogs.map((log) => ({
			...log,
			metadata: log.metadata ? JSON.parse(log.metadata) : null,
		})),
	})
}

export async function action({ request, params }: Route['ActionArgs']) {
	const adminUserId = await requireUserWithRole(request, 'admin')

	invariant(params.organizationId, 'Organization ID is required')

	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: SSOUserActionSchema,
	})

	if (submission.status !== 'success') {
		return Response.json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { intent, userId, roleId, active } = submission.value

	try {
		switch (intent) {
			case 'change_role': {
				if (!roleId) {
					return Response.json(
						{
							result: submission.reply({
								formErrors: ['Role ID is required'],
							}),
						},
						{ status: 400 },
					)
				}

				await prisma.userOrganization.update({
					where: {
						userId_organizationId: {
							userId,
							organizationId: params.organizationId,
						},
					},
					data: {
						organizationRoleId: roleId,
					},
				})

				// Log the role change
				await auditLogService.logSSOUserManagement(
					params.organizationId,
					adminUserId, // admin user making the change
					userId, // target user
					'role_changed',
					{ newRoleId: roleId },
				)

				return redirectWithToast(
					`/organizations/${params.organizationId}/sso/users`,
					{
						type: 'success',
						title: 'User Role Updated',
						description: 'The user role has been successfully updated.',
					},
				)
			}

			case 'toggle_status': {
				if (active === undefined) {
					return Response.json(
						{
							result: submission.reply({
								formErrors: ['Active status is required'],
							}),
						},
						{ status: 400 },
					)
				}

				await prisma.userOrganization.update({
					where: {
						userId_organizationId: {
							userId,
							organizationId: params.organizationId,
						},
					},
					data: {
						active,
					},
				})

				// Log the status change
				await auditLogService.logSSOUserManagement(
					params.organizationId,
					adminUserId, // admin user making the change
					userId, // target user
					active ? 'activated' : 'deactivated',
					{ active },
				)

				return redirectWithToast(
					`/organizations/${params.organizationId}/sso/users`,
					{
						type: 'success',
						title: `User ${active ? 'Activated' : 'Deactivated'}`,
						description: `The user has been successfully ${active ? 'activated' : 'deactivated'}.`,
					},
				)
			}

			default:
				return Response.json(
					{
						result: submission.reply({
							formErrors: ['Invalid action'],
						}),
					},
					{ status: 400 },
				)
		}
	} catch (error) {
		console.error('SSO user management error:', error)
		return Response.json(
			{
				result: submission.reply({
					formErrors: ['An error occurred while processing the request'],
				}),
			},
			{ status: 500 },
		)
	}
}

export default function AdminOrganizationSSOUsersPage() {
	const data = useLoaderData<typeof loader>()
	const {
		organization: org,
		ssoConfig,
		ssoUsers,
		availableRoles,
		auditLogs,
	} = data

	if (!org) {
		throw new Error('Organization not found')
	}

	const organization = org as { id: string; name: string; slug: string }

	const handleRoleChange = (userId: string, roleId: string) => {
		const form = document.createElement('form')
		form.method = 'POST'
		form.style.display = 'none'

		const intentInput = document.createElement('input')
		intentInput.name = 'intent'
		intentInput.value = 'change_role'
		form.appendChild(intentInput)

		const userIdInput = document.createElement('input')
		userIdInput.name = 'userId'
		userIdInput.value = userId
		form.appendChild(userIdInput)

		const roleIdInput = document.createElement('input')
		roleIdInput.name = 'roleId'
		roleIdInput.value = roleId
		form.appendChild(roleIdInput)

		document.body.appendChild(form)
		form.submit()
	}

	const handleUserStatusChange = (userId: string, active: boolean) => {
		const form = document.createElement('form')
		form.method = 'POST'
		form.style.display = 'none'

		const intentInput = document.createElement('input')
		intentInput.name = 'intent'
		intentInput.value = 'toggle_status'
		form.appendChild(intentInput)

		const userIdInput = document.createElement('input')
		userIdInput.name = 'userId'
		userIdInput.value = userId
		form.appendChild(userIdInput)

		const activeInput = document.createElement('input')
		activeInput.name = 'active'
		activeInput.value = active.toString()
		form.appendChild(activeInput)

		document.body.appendChild(form)
		form.submit()
	}

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">SSO Users</h1>
					<p className="text-muted-foreground">
						Manage users who authenticate through SSO for {organization.name}
					</p>
				</div>
			</div>

			{/* SSO User Management */}
			<SSOUserManagement
				organizationId={organization.id}
				ssoUsers={ssoUsers}
				auditLogs={auditLogs}
				availableRoles={availableRoles}
				onRoleChange={handleRoleChange}
				onUserStatusChange={handleUserStatusChange}
			/>
		</div>
	)
}
