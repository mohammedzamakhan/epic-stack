import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@repo/ui/dialog'
import { Label } from '@repo/ui/label'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@repo/ui/table'
import { Textarea } from '@repo/ui/textarea'
import {
	useLoaderData,
	Form,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	Link,
} from 'react-router'

import { getUserId } from '#app/utils/auth.server.ts'
import { prisma } from '@repo/database'
import { blacklistIp, unblacklistIp } from '@repo/common/ip-tracking'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	const url = new URL(request.url)
	const page = parseInt(url.searchParams.get('page') || '1', 10)
	const pageSize = 20

	// Get IP addresses with request counts and associated users
	const ipAddresses = await prisma.ipAddress.findMany({
		select: {
			id: true,
			ip: true,
			country: true,
			region: true,
			city: true,
			isBlacklisted: true,
			blacklistReason: true,
			blacklistedAt: true,
			createdAt: true,
			requestCount: true,
			lastRequestAt: true,
			lastUserAgent: true,
			suspiciousScore: true,
			blacklistedBy: {
				select: {
					name: true,
					username: true,
				},
			},
			ipAddressUsers: {
				select: {
					user: {
						select: {
							id: true,
							name: true,
							username: true,
							email: true,
						},
					},
					firstSeenAt: true,
					lastSeenAt: true,
					requestCount: true,
				},
				orderBy: {
					lastSeenAt: 'desc',
				},
				take: 5, // Limit to 5 most recent users per IP
			},
		},
		orderBy: { createdAt: 'desc' },
		skip: (page - 1) * pageSize,
		take: pageSize,
	})

	const totalCount = await prisma.ipAddress.count()
	const blacklistedCount = await prisma.ipAddress.count({
		where: { isBlacklisted: true },
	})
	const suspiciousCount = await prisma.ipAddress.count({
		where: {
			suspiciousScore: { gt: 0 },
			isBlacklisted: false,
		},
	})

	return {
		ipAddresses,
		stats: {
			totalIps: totalCount,
			blacklistedIps: blacklistedCount,
			suspiciousIps: suspiciousCount,
		},
	}
}

export async function action({ request }: ActionFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	const userId = await getUserId(request)

	if (!userId) {
		throw new Response('Unauthorized', { status: 401 })
	}

	const formData = await request.formData()
	const intent = formData.get('intent')
	const ip = formData.get('ip')

	if (typeof ip !== 'string') {
		throw new Response('Invalid IP address', { status: 400 })
	}

	try {
		if (intent === 'blacklist') {
			const reason = formData.get('reason')
			if (typeof reason !== 'string') {
				throw new Response('Blacklist reason is required', { status: 400 })
			}
			await blacklistIp(ip, reason, userId)
			return { success: true, message: `IP ${ip} has been blacklisted` }
		} else if (intent === 'unblacklist') {
			await unblacklistIp(ip)
			return {
				success: true,
				message: `IP ${ip} has been removed from blacklist`,
			}
		}
	} catch (error) {
		console.error('Error processing IP action:', error)
		throw new Response('Failed to process request', { status: 500 })
	}

	throw new Response('Invalid action', { status: 400 })
}

export default function AdminIpAddressesPage() {
	const data = useLoaderData<typeof loader>()

	const formatDate = (date: string | Date | null) => {
		if (!date) return '-'
		return new Date(date).toLocaleString()
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">IP Addresses</h1>
				<p className="text-muted-foreground">
					Monitor and manage IP addresses accessing your website
				</p>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<div className="bg-card rounded-lg border p-4">
					<h3 className="text-muted-foreground text-sm font-medium">
						Total IPs
					</h3>
					<p className="text-2xl font-bold">{data.stats.totalIps}</p>
				</div>
				<div className="bg-card rounded-lg border p-4">
					<h3 className="text-muted-foreground text-sm font-medium">
						Blacklisted IPs
					</h3>
					<p className="text-2xl font-bold text-red-600">
						{data.stats.blacklistedIps}
					</p>
				</div>
				<div className="bg-card rounded-lg border p-4">
					<h3 className="text-muted-foreground text-sm font-medium">
						Suspicious IPs
					</h3>
					<p className="text-2xl font-bold text-yellow-600">
						{data.stats.suspiciousIps}
					</p>
				</div>
			</div>

			{/* IP Addresses Table */}
			<div>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>IP Address</TableHead>
							<TableHead>Location</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Requests</TableHead>
							<TableHead>Last Request</TableHead>
							<TableHead>Suspicious Score</TableHead>
							<TableHead>Users</TableHead>
							<TableHead>First Seen</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.ipAddresses.map((ip) => (
							<TableRow key={ip.id}>
								<TableCell className="font-mono">
									<Link
										to={`/ip-addresses/${ip.ip}`}
										className="text-blue-600 hover:text-blue-800 hover:underline"
									>
										{ip.ip}
									</Link>
								</TableCell>
								<TableCell>
									{ip.country && ip.city ? (
										<span>
											{ip.city}, {ip.country}
										</span>
									) : ip.country ? (
										<span>{ip.country}</span>
									) : (
										<span className="text-muted-foreground">Unknown</span>
									)}
								</TableCell>
								<TableCell>
									{ip.isBlacklisted ? (
										<Badge variant="destructive">Blacklisted</Badge>
									) : ip.suspiciousScore > 0 ? (
										<Badge variant="secondary">Suspicious</Badge>
									) : (
										<Badge variant="outline">Active</Badge>
									)}
								</TableCell>
								<TableCell>{ip.requestCount}</TableCell>
								<TableCell>
									{ip.lastRequestAt ? (
										<span className="text-sm">
											{formatDate(ip.lastRequestAt)}
										</span>
									) : (
										<span className="text-muted-foreground">-</span>
									)}
								</TableCell>
								<TableCell>
									{ip.suspiciousScore > 0 ? (
										<Badge variant="destructive">{ip.suspiciousScore}</Badge>
									) : (
										<span className="text-muted-foreground">0</span>
									)}
								</TableCell>
								<TableCell>
									{ip.ipAddressUsers && ip.ipAddressUsers.length > 0 ? (
										<div className="space-y-1">
											{ip.ipAddressUsers.slice(0, 3).map((userConnection) => (
												<div key={userConnection.user.id} className="text-sm">
													<span className="font-medium">
														{userConnection.user.name ||
															userConnection.user.username}
													</span>
													<div className="text-muted-foreground text-xs">
														{userConnection.requestCount} requests
													</div>
												</div>
											))}
											{ip.ipAddressUsers.length > 3 && (
												<div className="text-muted-foreground text-xs">
													+{ip.ipAddressUsers.length - 3} more users
												</div>
											)}
										</div>
									) : (
										<span className="text-muted-foreground text-sm">
											No users
										</span>
									)}
								</TableCell>
								<TableCell>
									<span className="text-sm">{formatDate(ip.createdAt)}</span>
								</TableCell>
								<TableCell>
									<div className="flex gap-2">
										{ip.isBlacklisted ? (
											<Form method="post">
												<input
													type="hidden"
													name="intent"
													value="unblacklist"
												/>
												<input type="hidden" name="ip" value={ip.ip} />
												<Button variant="outline" size="sm" type="submit">
													Unblacklist
												</Button>
											</Form>
										) : (
											<Dialog>
												<DialogTrigger>
													<Button variant="destructive" size="sm">
														Blacklist
													</Button>
												</DialogTrigger>
												<DialogContent>
													<DialogHeader>
														<DialogTitle>Blacklist IP Address</DialogTitle>
														<DialogDescription>
															Are you sure you want to blacklist {ip.ip}? This
															will prevent all future requests from this IP
															address.
														</DialogDescription>
													</DialogHeader>
													<Form method="post">
														<div className="space-y-4">
															<div>
																<Label htmlFor="reason">
																	Reason for blacklisting
																</Label>
																<Textarea
																	id="reason"
																	name="reason"
																	placeholder="Enter reason for blacklisting this IP address..."
																	required
																/>
															</div>
														</div>
														<input
															type="hidden"
															name="intent"
															value="blacklist"
														/>
														<input type="hidden" name="ip" value={ip.ip} />
														<DialogFooter className="mt-4">
															<Button type="submit" variant="destructive">
																Blacklist IP
															</Button>
														</DialogFooter>
													</Form>
												</DialogContent>
											</Dialog>
										)}
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{data.ipAddresses.length === 0 && (
				<div className="py-8 text-center">
					<p className="text-muted-foreground">No IP addresses found</p>
				</div>
			)}
		</div>
	)
}
