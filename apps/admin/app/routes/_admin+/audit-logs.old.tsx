import { useLoaderData } from 'react-router'
import { Badge } from '@repo/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'

import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'

export async function loader({ request }: { request: Request }) {
	await requireUserWithRole(request, 'admin')

	// Get admin audit logs from the admin system organization
	const adminOrg = await prisma.organization.findFirst({
		where: { slug: 'admin-system' },
		select: { id: true },
	})

	if (!adminOrg) {
		return Response.json({ auditLogs: [] })
	}

	const auditLogs = await prisma.noteActivityLog.findMany({
		where: {
			note: {
				organizationId: adminOrg.id,
			},
			action: {
				in: ['ADMIN_IMPERSONATION_START', 'ADMIN_IMPERSONATION_END'],
			},
		},
		select: {
			id: true,
			action: true,
			metadata: true,
			createdAt: true,
			user: {
				select: {
					id: true,
					name: true,
					username: true,
				},
			},
			targetUser: {
				select: {
					id: true,
					name: true,
					username: true,
					email: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
		take: 100, // Limit to last 100 audit logs
	})

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
							<p className="text-muted-foreground">No audit logs found</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
