import { Trans } from '@lingui/macro'
import { requireUserWithRole } from '@repo/auth'
import { getUsersByIpAddress } from '@repo/common/ip-tracking'
import { prisma } from '@repo/database'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@repo/ui/table'
import { Link, useLoaderData, type LoaderFunctionArgs } from 'react-router'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	const ip = params.ip
	if (!ip) {
		throw new Response('IP address is required', { status: 400 })
	}

	// Get IP address details
	const ipAddress = await prisma.ipAddress.findUnique({
		where: { ip },
		include: {
			blacklistedBy: {
				select: {
					name: true,
					username: true,
				},
			},
		},
	})

	if (!ipAddress) {
		throw new Response('IP address not found', { status: 404 })
	}

	// Get users who have used this IP
	const userConnections = await getUsersByIpAddress(ip)

	return {
		ipAddress,
		userConnections,
	}
}

export default function AdminIpDetailPage() {
	const { ipAddress, userConnections } = useLoaderData<typeof loader>()

	if (!ipAddress) {
		return null
	}

	const formatDate = (date: string | Date | null) => {
		if (!date) return '-'
		return new Date(date).toLocaleString()
	}

	const ip = ipAddress.ip
	const count = userConnections.length

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						<Trans>IP Address Details</Trans>
					</h1>
					<p className="text-muted-foreground">
						<Trans>Detailed information for IP {ip}</Trans>
					</p>
				</div>
				<Button variant="outline">
					<Link to="/ip-addresses">
						<Trans>← Back to IP Addresses</Trans>
					</Link>
				</Button>
			</div>

			{/* IP Address Information */}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>
							<Trans>IP Information</Trans>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<label className="text-muted-foreground text-sm font-medium">
								<Trans>IP Address</Trans>
							</label>
							<p className="font-mono text-lg">{ip}</p>
						</div>

						<div>
							<label className="text-muted-foreground text-sm font-medium">
								<Trans>Location</Trans>
							</label>
							<p>
								{ipAddress.country && ipAddress.city ? (
									`${ipAddress.city}, ${ipAddress.region}, ${ipAddress.country}`
								) : ipAddress.country ? (
									ipAddress.country
								) : (
									<span className="text-muted-foreground">
										<Trans>Unknown</Trans>
									</span>
								)}
							</p>
						</div>

						<div>
							<label className="text-muted-foreground text-sm font-medium">
								<Trans>Status</Trans>
							</label>
							<div className="mt-1">
								{ipAddress.isBlacklisted ? (
									<Badge variant="destructive">
										<Trans>Blacklisted</Trans>
									</Badge>
								) : ipAddress.suspiciousScore > 0 ? (
									<Badge variant="secondary">
										<Trans>Suspicious</Trans>
									</Badge>
								) : (
									<Badge variant="outline">
										<Trans>Active</Trans>
									</Badge>
								)}
							</div>
						</div>

						<div>
							<label className="text-muted-foreground text-sm font-medium">
								<Trans>Total Requests</Trans>
							</label>
							<p className="text-2xl font-bold">{ipAddress.requestCount}</p>
						</div>

						<div>
							<label className="text-muted-foreground text-sm font-medium">
								<Trans>Suspicious Score</Trans>
							</label>
							<p
								className={
									ipAddress.suspiciousScore > 0
										? 'font-semibold text-red-600'
										: ''
								}
							>
								{ipAddress.suspiciousScore}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>
							<Trans>Activity Information</Trans>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<label className="text-muted-foreground text-sm font-medium">
								<Trans>First Seen</Trans>
							</label>
							<p>{formatDate(ipAddress.createdAt)}</p>
						</div>

						<div>
							<label className="text-muted-foreground text-sm font-medium">
								<Trans>Last Request</Trans>
							</label>
							<p>{formatDate(ipAddress.lastRequestAt)}</p>
						</div>

						<div>
							<label className="text-muted-foreground text-sm font-medium">
								<Trans>Last User Agent</Trans>
							</label>
							<p className="text-sm break-all">
								{ipAddress.lastUserAgent || <Trans>Unknown</Trans>}
							</p>
						</div>

						{ipAddress.isBlacklisted && (
							<>
								<div>
									<label className="text-muted-foreground text-sm font-medium">
										<Trans>Blacklisted At</Trans>
									</label>
									<p>{formatDate(ipAddress.blacklistedAt)}</p>
								</div>

								<div>
									<label className="text-muted-foreground text-sm font-medium">
										<Trans>Blacklist Reason</Trans>
									</label>
									<p>{ipAddress.blacklistReason}</p>
								</div>

								{ipAddress.blacklistedBy && (
									<div>
										<label className="text-muted-foreground text-sm font-medium">
											<Trans>Blacklisted By</Trans>
										</label>
										<p>
											{ipAddress.blacklistedBy.name ||
												ipAddress.blacklistedBy.username}
										</p>
									</div>
								)}
							</>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Users Table */}
			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Users Associated with this IP ({count})</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{userConnections.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>
										<Trans>User</Trans>
									</TableHead>
									<TableHead>
										<Trans>Email</Trans>
									</TableHead>
									<TableHead>
										<Trans>Status</Trans>
									</TableHead>
									<TableHead>
										<Trans>First Seen</Trans>
									</TableHead>
									<TableHead>
										<Trans>Last Seen</Trans>
									</TableHead>
									<TableHead>
										<Trans>Requests</Trans>
									</TableHead>
									<TableHead>
										<Trans>Actions</Trans>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{userConnections.map((connection) => (
									<TableRow key={connection.user.id}>
										<TableCell>
											<div>
												<p className="font-medium">
													{connection.user.name || connection.user.username}
												</p>
												<p className="text-muted-foreground text-sm">
													@{connection.user.username}
												</p>
											</div>
										</TableCell>
										<TableCell className="text-sm">
											{connection.user.email}
										</TableCell>
										<TableCell>
											{connection.user.isBanned ? (
												<Badge variant="destructive">
													<Trans>Banned</Trans>
												</Badge>
											) : (
												<Badge variant="outline">
													<Trans>Active</Trans>
												</Badge>
											)}
										</TableCell>
										<TableCell className="text-sm">
											{formatDate(connection.firstSeenAt)}
										</TableCell>
										<TableCell className="text-sm">
											{formatDate(connection.lastSeenAt)}
										</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{connection.requestCount}
											</Badge>
										</TableCell>
										<TableCell>
											<Button variant="outline" size="sm">
												<Link to={`/users/${connection.user.id}`}>
													<Trans>View User</Trans>
												</Link>
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<div className="py-8 text-center">
							<p className="text-muted-foreground">
								<Trans>No users have been tracked for this IP address</Trans>
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
