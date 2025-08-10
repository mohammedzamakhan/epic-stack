import { useLoaderData, Form } from 'react-router'
import { type Route } from './+types/ip-addresses.ts'
import { requireUserWithRole } from '#app/utils/permissions.server'
import { prisma } from '#app/utils/db.server'
import { blacklistIp, unblacklistIp } from '#app/utils/ip-tracking.server'
import { getUserId } from '#app/utils/auth.server'
import { Button } from '#app/components/ui/button'
import { Badge } from '#app/components/ui/badge'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog'
import { Label } from '#app/components/ui/label'
import { Textarea } from '#app/components/ui/textarea'

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')

	const url = new URL(request.url)
	const page = parseInt(url.searchParams.get('page') || '1', 10)
	const pageSize = 20

	// Get IP addresses with request counts
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
			blacklistedBy: {
				select: {
					name: true,
					username: true,
				},
			},
			_count: {
				select: {
					requests: true,
				},
			},
			requests: {
				select: {
					createdAt: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
				take: 1,
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

	return {
		ipAddresses: ipAddresses.map(ip => ({
			...ip,
			requestCount: ip._count.requests,
			lastRequest: ip.requests[0]?.createdAt || null,
		})),
		stats: {
			totalIps: totalCount,
			blacklistedIps: blacklistedCount,
		},
	}
}

export async function action({ request }: Route.ActionArgs) {
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
			return { success: true, message: `IP ${ip} has been removed from blacklist` }
		}
	} catch (error) {
		console.error('Error processing IP action:', error)
		throw new Response('Failed to process request', { status: 500 })
	}

	throw new Response('Invalid action', { status: 400 })
}

export default function AdminIpAddressesPage() {
	const data = useLoaderData<typeof loader>()

	const formatDate = (date: string) => {
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
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-card p-4 rounded-lg border">
					<h3 className="text-sm font-medium text-muted-foreground">Total IPs</h3>
					<p className="text-2xl font-bold">{data.stats.totalIps}</p>
				</div>
				<div className="bg-card p-4 rounded-lg border">
					<h3 className="text-sm font-medium text-muted-foreground">Blacklisted IPs</h3>
					<p className="text-2xl font-bold text-red-600">{data.stats.blacklistedIps}</p>
				</div>
			</div>

			{/* IP Addresses Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>IP Address</TableHead>
							<TableHead>Location</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Requests</TableHead>
							<TableHead>Last Request</TableHead>
							<TableHead>First Seen</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.ipAddresses.map((ip) => (
							<TableRow key={ip.id}>
								<TableCell className="font-mono">{ip.ip}</TableCell>
								<TableCell>
									{ip.country && ip.city ? (
										<span>{ip.city}, {ip.country}</span>
									) : ip.country ? (
										<span>{ip.country}</span>
									) : (
										<span className="text-muted-foreground">Unknown</span>
									)}
								</TableCell>
								<TableCell>
									{ip.isBlacklisted ? (
										<Badge variant="destructive">Blacklisted</Badge>
									) : (
										<Badge variant="secondary">Active</Badge>
									)}
								</TableCell>
								<TableCell>{ip.requestCount}</TableCell>
								<TableCell>
									{ip.lastRequest ? (
										<span className="text-sm">{formatDate(ip.lastRequest)}</span>
									) : (
										<span className="text-muted-foreground">-</span>
									)}
								</TableCell>
								<TableCell>
									<span className="text-sm">{formatDate(ip.createdAt)}</span>
								</TableCell>
								<TableCell>
									<div className="flex gap-2">
										{ip.isBlacklisted ? (
											<Form method="post">
												<input type="hidden" name="intent" value="unblacklist" />
												<input type="hidden" name="ip" value={ip.ip} />
												<Button variant="outline" size="sm" type="submit">
													Unblacklist
												</Button>
											</Form>
										) : (
											<Dialog>
												<DialogTrigger asChild>
													<Button variant="destructive" size="sm">
														Blacklist
													</Button>
												</DialogTrigger>
												<DialogContent>
													<DialogHeader>
														<DialogTitle>Blacklist IP Address</DialogTitle>
														<DialogDescription>
															Are you sure you want to blacklist {ip.ip}? This will prevent all future requests from this IP address.
														</DialogDescription>
													</DialogHeader>
													<Form method="post">
														<div className="space-y-4">
															<div>
																<Label htmlFor="reason">Reason for blacklisting</Label>
																<Textarea
																	id="reason"
																	name="reason"
																	placeholder="Enter reason for blacklisting this IP address..."
																	required
																/>
															</div>
														</div>
														<input type="hidden" name="intent" value="blacklist" />
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
				<div className="text-center py-8">
					<p className="text-muted-foreground">No IP addresses found</p>
				</div>
			)}
		</div>
	)
}
