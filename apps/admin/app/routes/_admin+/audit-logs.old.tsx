import { Trans } from '@lingui/react/macro'
import { requireUserWithRole } from '@repo/auth'
import {
	AuditLog,
	Organization,
	User,
	alias,
	and,
	db,
	desc,
	eq,
	inArray,
} from '@repo/database'
import { Badge } from '@repo/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { useLoaderData } from 'react-router'

export async function loader({ request }: { request: Request }) {
	await requireUserWithRole(request, 'admin')

	// Get admin audit logs from the admin system organization
	const [adminOrg] = await db
		.select({ id: Organization.id })
		.from(Organization)
		.where(eq(Organization.slug, 'admin-system'))
		.limit(1)

	if (!adminOrg) {
		return Response.json({ auditLogs: [] })
	}

	const targetUser = alias(User, 'audit_target_user')
	const auditLogs = await db
		.select({
			id: AuditLog.id,
			action: AuditLog.action,
			metadata: AuditLog.metadata,
			createdAt: AuditLog.createdAt,
			user: { id: User.id, name: User.name, username: User.username },
			targetUser: {
				id: targetUser.id,
				name: targetUser.name,
				username: targetUser.username,
				email: targetUser.email,
			},
		})
		.from(AuditLog)
		.innerJoin(User, eq(AuditLog.userId, User.id))
		.leftJoin(targetUser, eq(AuditLog.targetUserId, targetUser.id))
		.where(
			and(
				eq(AuditLog.organizationId, adminOrg.id),
				inArray(AuditLog.action, [
					'ADMIN_IMPERSONATION_START',
					'ADMIN_IMPERSONATION_END',
				]),
			),
		)
		.orderBy(desc(AuditLog.createdAt))
		.limit(100)

	return { auditLogs }
}

export default function AdminAuditLogsPage() {
	const { auditLogs } = useLoaderData<typeof loader>()

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Admin Audit Logs</h1>
					<p className="text-muted-foreground">
						Track admin actions and impersonation activities
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Icon name="lock" className="h-5 w-5" />
						Impersonation Logs
					</CardTitle>
					<CardDescription>
						Recent admin impersonation activities
					</CardDescription>
				</CardHeader>
				<CardContent>
					{auditLogs?.length > 0 ? (
						<div className="space-y-4">
							{auditLogs.map((log) => {
								const metadata = log.metadata
									? JSON.parse(log.metadata)
									: ({} as any)
								const isStart = log.action === 'ADMIN_IMPERSONATION_START'

								return (
									<div
										key={log.id}
										className="flex items-center justify-between rounded-lg border p-4"
									>
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<Badge variant={isStart ? 'default' : 'secondary'}>
													{isStart ? 'Started' : 'Ended'}
												</Badge>
												<span className="font-medium">
													{log.user.name || log.user.username}
												</span>
												<span className="text-muted-foreground">
													{isStart
														? 'started impersonating'
														: 'stopped impersonating'}
												</span>
												<span className="font-medium">
													{log.targetUser?.name || log.targetUser?.username}
												</span>
											</div>
											{log.targetUser?.email && (
												<p className="text-muted-foreground text-sm">
													Target: {log.targetUser.email}
												</p>
											)}
											{!isStart && metadata.duration && (
												<p className="text-muted-foreground text-sm">
													Duration: {Math.floor(metadata.duration / 1000 / 60)}{' '}
													minutes
												</p>
											)}
										</div>
										<div className="text-muted-foreground flex items-center gap-2 text-sm">
											<Icon name="clock" className="h-4 w-4" />
											<span>{new Date(log.createdAt).toLocaleString()}</span>
										</div>
									</div>
								)
							})}
						</div>
					) : (
						<div className="py-8 text-center">
							<Icon
								name="user"
								className="text-muted-foreground mx-auto mb-4 h-12 w-12"
							/>
							<p className="text-muted-foreground">
								<Trans>No audit logs found</Trans>
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
