import { prisma } from '@repo/prisma'
import { Link, useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { Badge } from '#app/components/ui/badge'
import { Button } from '#app/components/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table'
import { getUsersByIpAddress } from '#app/utils/ip-tracking.server'
import { requireUserWithRole } from '#app/utils/permissions.server'

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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						IP Address Details
					</h1>
					<p className="text-muted-foreground">
						Detailed information for IP {ipAddress.ip}
					</p>
				</div>
				<Button asChild variant="outline">
					<Link to="/admin/ip-addresses">← Back to IP Addresses</Link>
				</Button>
			</div>

			{/* IP Address Information */}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>IP Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<label className="text-muted-foreground text-sm font-medium">
								IP Address
							</label>
							<p className="font-mono text-lg">{ipAddress.ip}</p>
						</div>

						<div>
							<label className="text-muted-foreground text-sm font-medium">
								Location
							</label>
							<p>
								{ipAddress.country && ipAddress.city ? (
									`${ipAddress.city}, ${ipAddress.region}, ${ipAddress.country}`
								) : ipAddress.country ? (
									ipAddress.country
								) : (
									<span className="text-muted-foreground">Unknown</span>
								)}
							</p>
						</div>

						<div>
							<label className="text-muted-foreground text-sm font-medium">
								Status
							</label>
							<div className="mt-1">
								{ipAddress.isBlacklisted ? (
									<Badge variant="destructive">Blacklisted</Badge>
								) : ipAddress.suspiciousScore > 0 ? (
									<Badge variant="secondary">Suspicious</Badge>
								) : (
									<Badge variant="outline">Active</Badge>
								)}
							</div>
						</div>

						<div>
							<label className="text-muted-foreground text-sm font-medium">
								Total Requests
							</label>
							<p className="text-2xl font-bold">{ipAddress.requestCount}</p>
						</div>

						<div>
							<label className="text-muted-foreground text-sm font-medium">
								Suspicious Score
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
						<CardTitle>Activity Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<label className="text-muted-foreground text-sm font-medium">
								First Seen
							</label>
							<p>{formatDate(ipAddress.createdAt)}</p>
						</div>

						<div>
							<label className="text-muted-foreground text-sm font-medium">
								Last Request
							</label>
							<p>{formatDate(ipAddress.lastRequestAt)}</p>
						</div>

						<div>
							<label className="text-muted-foreground text-sm font-medium">
								Last User Agent
							</label>
							<p className="text-sm break-all">
								{ipAddress.lastUserAgent || 'Unknown'}
							</p>
						</div>

						{ipAddress.isBlacklisted && (
							<>
								<div>
									<label className="text-muted-foreground text-sm font-medium">
										Blacklisted At
									</label>
									<p>{formatDate(ipAddress.blacklistedAt)}</p>
								</div>

								<div>
									<label className="text-muted-foreground text-sm font-medium">
										Blacklist Reason
									</label>
									<p>{ipAddress.blacklistReason}</p>
								</div>

								{ipAddress.blacklistedBy && (
									<div>
										<label className="text-muted-foreground text-sm font-medium">
											Blacklisted By
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
						Users Associated with this IP ({userConnections.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					{userConnections.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>User</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>First Seen</TableHead>
									<TableHead>Last Seen</TableHead>
									<TableHead>Requests</TableHead>
									<TableHead>Actions</TableHead>
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
												<Badge variant="destructive">Banned</Badge>
											) : (
												<Badge variant="outline">Active</Badge>
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
											<Button asChild variant="outline" size="sm">
												<Link to={`/admin/users/${connection.user.id}`}>
													View User
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
								No users have been tracked for this IP address
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
