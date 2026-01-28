import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { auditService, AuditAction } from '@repo/audit'
import { requireUserWithRole } from '@repo/auth'
import { prisma } from '@repo/database'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemHeader,
	ItemTitle,
} from '@repo/ui/item'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from '@repo/ui/select'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
	useSearchParams,
	useFetcher,
} from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
	const adminId = await requireUserWithRole(request, 'admin')

	const url = new URL(request.url)
	const page = Number(url.searchParams.get('page')) || 1
	const limit = 20
	const offset = (page - 1) * limit
	const typeFilter = url.searchParams.get('type') || undefined
	const statusFilter = url.searchParams.get('status') || undefined
	const search = url.searchParams.get('search') || undefined

	const where: Record<string, unknown> = {}
	if (typeFilter) where.type = typeFilter
	if (statusFilter) where.status = statusFilter
	if (search) {
		where.user = {
			OR: [
				{ email: { contains: search } },
				{ username: { contains: search } },
				{ name: { contains: search } },
			],
		}
	}

	const [requests, totalCount, statistics] = await Promise.all([
		prisma.dataSubjectRequest.findMany({
			where,
			include: {
				user: {
					select: {
						id: true,
						email: true,
						username: true,
						name: true,
					},
				},
			},
			orderBy: { requestedAt: 'desc' },
			skip: offset,
			take: limit,
		}),
		prisma.dataSubjectRequest.count({ where }),
		Promise.all([
			prisma.dataSubjectRequest.count({
				where: { type: 'export', status: 'completed' },
			}),
			prisma.dataSubjectRequest.count({
				where: { type: 'erasure', status: 'scheduled' },
			}),
			prisma.dataSubjectRequest.count({
				where: { type: 'erasure', status: 'completed' },
			}),
			prisma.dataSubjectRequest.count({
				where: { status: 'failed' },
			}),
		]),
	])

	const totalPages = Math.ceil(totalCount / limit)

	return {
		requests: requests.map((r) => ({
			...r,
			requestedAt: r.requestedAt.toISOString(),
			processedAt: r.processedAt?.toISOString() || null,
			completedAt: r.completedAt?.toISOString() || null,
			cancelledAt: r.cancelledAt?.toISOString() || null,
			scheduledFor: r.scheduledFor?.toISOString() || null,
			executedAt: r.executedAt?.toISOString() || null,
		})),
		pagination: {
			page,
			totalPages,
			totalCount,
		},
		statistics: {
			completedExports: statistics[0],
			pendingDeletions: statistics[1],
			completedDeletions: statistics[2],
			failedRequests: statistics[3],
		},
		filters: {
			type: typeFilter,
			status: statusFilter,
			search,
		},
		adminId,
	}
}

export async function action({ request }: ActionFunctionArgs) {
	const adminId = await requireUserWithRole(request, 'admin')
	const formData = await request.formData()
	const intent = formData.get('intent')
	const requestId = formData.get('requestId')

	if (typeof requestId !== 'string') {
		return Response.json({ error: 'Invalid request ID' }, { status: 400 })
	}

	const dsr = await prisma.dataSubjectRequest.findUnique({
		where: { id: requestId },
		include: { user: { select: { id: true, email: true } } },
	})

	if (!dsr) {
		return Response.json({ error: 'Request not found' }, { status: 404 })
	}

	switch (intent) {
		case 'cancel': {
			if (dsr.status !== 'scheduled') {
				return Response.json(
					{ error: 'Can only cancel scheduled requests' },
					{ status: 400 },
				)
			}

			await prisma.dataSubjectRequest.update({
				where: { id: requestId },
				data: {
					status: 'cancelled',
					cancelledAt: new Date(),
				},
			})

			await auditService.log({
				action: AuditAction.DATA_DELETION_CANCELLED,
				userId: adminId,
				targetUserId: dsr.userId!,
				details: `Admin cancelled deletion request for user ${dsr.user?.email}`,
				resourceType: 'data_subject_request',
				resourceId: requestId,
				request,
				metadata: { adminAction: true },
				severity: 'warning',
			})

			return Response.json({ success: true })
		}

		case 'expedite': {
			if (dsr.type !== 'erasure' || dsr.status !== 'scheduled') {
				return Response.json(
					{ error: 'Can only expedite scheduled erasure requests' },
					{ status: 400 },
				)
			}

			await prisma.dataSubjectRequest.update({
				where: { id: requestId },
				data: {
					status: 'processing',
					processedAt: new Date(),
				},
			})

			try {
				await prisma.user.delete({
					where: { id: dsr.userId! },
				})

				await prisma.dataSubjectRequest.update({
					where: { id: requestId },
					data: {
						status: 'completed',
						completedAt: new Date(),
						executedAt: new Date(),
					},
				})

				await auditService.log({
					action: AuditAction.DATA_DELETION_COMPLETED,
					userId: adminId,
					details: `Admin expedited deletion for user ${dsr.user?.email}`,
					resourceType: 'data_subject_request',
					resourceId: requestId,
					request,
					metadata: {
						adminAction: true,
						expedited: true,
						targetUserId: dsr.userId,
					},
					severity: 'warning',
				})

				return Response.json({ success: true })
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error'

				await prisma.dataSubjectRequest.update({
					where: { id: requestId },
					data: {
						status: 'failed',
						failureReason: errorMessage,
					},
				})

				await auditService.log({
					action: AuditAction.DATA_DELETION_FAILED,
					userId: adminId,
					details: `Admin expedited deletion failed: ${errorMessage}`,
					resourceType: 'data_subject_request',
					resourceId: requestId,
					request,
					metadata: { adminAction: true, error: errorMessage },
					severity: 'error',
				})

				return Response.json({ error: errorMessage }, { status: 500 })
			}
		}

		case 'export-for-user': {
			const userId = dsr.userId!

			const newDsr = await prisma.dataSubjectRequest.create({
				data: {
					userId,
					type: 'export',
					status: 'completed',
					processedAt: new Date(),
					completedAt: new Date(),
					metadata: JSON.stringify({ adminInitiated: true, adminId }),
				},
			})

			await auditService.log({
				action: AuditAction.DATA_EXPORT_COMPLETED,
				userId: adminId,
				targetUserId: userId,
				details: `Admin initiated data export for user ${dsr.user?.email}`,
				resourceType: 'data_subject_request',
				resourceId: newDsr.id,
				request,
				metadata: { adminAction: true },
				severity: 'info',
			})

			return Response.json({
				success: true,
				redirectUrl: `/gdpr-requests/export/${userId}`,
			})
		}

		default:
			return Response.json({ error: 'Invalid intent' }, { status: 400 })
	}
}

export default function GDPRRequestsPage() {
	const { _ } = useLingui()
	const { requests, pagination, statistics, filters } =
		useLoaderData<typeof loader>()
	const [searchParams, setSearchParams] = useSearchParams()
	const fetcher = useFetcher()

	const updateFilter = (key: string, value: string) => {
		const newParams = new URLSearchParams(searchParams)
		if (value && value !== 'all') {
			newParams.set(key, value)
		} else {
			newParams.delete(key)
		}
		newParams.delete('page')
		setSearchParams(newParams)
	}

	const clearFilters = () => {
		setSearchParams(new URLSearchParams())
	}

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case 'completed':
				return 'default'
			case 'scheduled':
				return 'secondary'
			case 'processing':
				return 'outline'
			case 'failed':
				return 'destructive'
			case 'cancelled':
				return 'outline'
			default:
				return 'secondary'
		}
	}

	const getTypeBadgeVariant = (type: string) => {
		return type === 'erasure' ? 'destructive' : 'default'
	}

	const formatDate = (dateStr: string | null) => {
		if (!dateStr) return '-'
		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(dateStr))
	}

	const showing = requests.length
	const totalRequests = pagination.totalCount.toLocaleString()

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">
						<Trans>GDPR Data Requests</Trans>
					</h1>
					<p className="text-muted-foreground">
						<Trans>
							Manage data export and deletion requests for compliance
						</Trans>
					</p>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							<Trans>Completed Exports</Trans>
						</CardTitle>
						<Icon name="download" className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{statistics.completedExports}
						</div>
						<p className="text-muted-foreground text-xs">
							<Trans>Article 20 requests</Trans>
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							<Trans>Pending Deletions</Trans>
						</CardTitle>
						<Icon name="clock" className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{statistics.pendingDeletions}
						</div>
						<p className="text-muted-foreground text-xs">
							<Trans>In grace period</Trans>
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							<Trans>Completed Deletions</Trans>
						</CardTitle>
						<Icon name="trash-2" className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{statistics.completedDeletions}
						</div>
						<p className="text-muted-foreground text-xs">
							<Trans>Article 17 fulfilled</Trans>
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							<Trans>Failed Requests</Trans>
						</CardTitle>
						<Icon name="alert-triangle" className="text-destructive h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-destructive text-2xl font-bold">
							{statistics.failedRequests}
						</div>
						<p className="text-muted-foreground text-xs">
							<Trans>Requires attention</Trans>
						</p>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Icon name="search" className="h-5 w-5" />
						<Trans>Filters</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-3">
						<div>
							<label className="text-sm font-medium">
								<Trans>Search User</Trans>
							</label>
							<Input
								type="text"
								placeholder={_(msg`Email, username, or name...`)}
								defaultValue={filters.search || ''}
								onChange={(e) => updateFilter('search', e.target.value)}
							/>
						</div>
						<div>
							<label className="text-sm font-medium">
								<Trans>Request Type</Trans>
							</label>
							<Select
								value={filters.type || 'all'}
								onValueChange={(value) => updateFilter('type', value as string)}
							>
								<SelectTrigger>
									<Trans>All types</Trans>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										<Trans>All</Trans>
									</SelectItem>
									<SelectItem value="export">
										<Trans>Export (Article 20)</Trans>
									</SelectItem>
									<SelectItem value="erasure">
										<Trans>Erasure (Article 17)</Trans>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<label className="text-sm font-medium">
								<Trans>Status</Trans>
							</label>
							<Select
								value={filters.status || 'all'}
								onValueChange={(value) =>
									updateFilter('status', value as string)
								}
							>
								<SelectTrigger>
									<Trans>All statuses</Trans>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										<Trans>All</Trans>
									</SelectItem>
									<SelectItem value="requested">
										<Trans>Requested</Trans>
									</SelectItem>
									<SelectItem value="processing">
										<Trans>Processing</Trans>
									</SelectItem>
									<SelectItem value="scheduled">
										<Trans>Scheduled</Trans>
									</SelectItem>
									<SelectItem value="completed">
										<Trans>Completed</Trans>
									</SelectItem>
									<SelectItem value="cancelled">
										<Trans>Cancelled</Trans>
									</SelectItem>
									<SelectItem value="failed">
										<Trans>Failed</Trans>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="mt-4">
						<Button variant="outline" size="sm" onClick={clearFilters}>
							<Icon name="x" className="mr-2 h-4 w-4" />
							<Trans>Clear Filters</Trans>
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Data Subject Requests</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>
							Showing {showing} of {totalRequests} requests
						</Trans>
					</CardDescription>
				</CardHeader>
				<CardContent>
					{requests.length > 0 ? (
						<ItemGroup>
							{requests.map((req) => (
								<Item key={req.id} variant="outline">
									<ItemContent>
										<ItemHeader>
											<div className="flex items-center gap-2">
												<Badge variant={getTypeBadgeVariant(req.type)}>
													{req.type === 'export' ? (
														<Trans>Export</Trans>
													) : (
														<Trans>Erasure</Trans>
													)}
												</Badge>
												<Badge variant={getStatusBadgeVariant(req.status)}>
													{req.status}
												</Badge>
											</div>
											<div className="text-muted-foreground text-sm">
												{formatDate(req.requestedAt)}
											</div>
										</ItemHeader>
										<ItemTitle>{req.user?.email || req.userId}</ItemTitle>
										<ItemDescription className="flex flex-wrap gap-4">
											{req.user?.name && <span>{req.user.name}</span>}
											{req.user?.username && (
												<span className="text-muted-foreground">
													@{req.user.username}
												</span>
											)}
											{req.scheduledFor && (
												<span className="text-destructive">
													<Icon name="clock" className="mr-1 inline h-3 w-3" />
													<Trans>
														Scheduled: {formatDate(req.scheduledFor)}
													</Trans>
												</span>
											)}
											{req.completedAt && (
												<span className="text-green-600">
													<Icon name="check" className="mr-1 inline h-3 w-3" />
													<Trans>
														Completed: {formatDate(req.completedAt)}
													</Trans>
												</span>
											)}
											{req.failureReason && (
												<span className="text-destructive">
													<Icon
														name="alert-triangle"
														className="mr-1 inline h-3 w-3"
													/>
													{req.failureReason}
												</span>
											)}
										</ItemDescription>
										{(req.status === 'scheduled' ||
											req.status === 'failed') && (
											<div className="mt-3 flex gap-2">
												{req.status === 'scheduled' && (
													<>
														<fetcher.Form method="POST">
															<input
																type="hidden"
																name="requestId"
																value={req.id}
															/>
															<Button
																type="submit"
																name="intent"
																value="cancel"
																variant="outline"
																size="sm"
																disabled={fetcher.state !== 'idle'}
															>
																<Icon name="x" className="mr-1 h-3 w-3" />
																<Trans>Cancel</Trans>
															</Button>
														</fetcher.Form>
														<fetcher.Form method="POST">
															<input
																type="hidden"
																name="requestId"
																value={req.id}
															/>
															<Button
																type="submit"
																name="intent"
																value="expedite"
																variant="destructive"
																size="sm"
																disabled={fetcher.state !== 'idle'}
															>
																<Icon name="play" className="mr-1 h-3 w-3" />
																<Trans>Expedite Now</Trans>
															</Button>
														</fetcher.Form>
													</>
												)}
											</div>
										)}
									</ItemContent>
								</Item>
							))}
						</ItemGroup>
					) : (
						<div className="py-12 text-center">
							<Icon
								name="file-text"
								className="text-muted-foreground mx-auto mb-4 h-12 w-12"
							/>
							<p className="text-muted-foreground">
								<Trans>No GDPR requests found</Trans>
							</p>
						</div>
					)}

					{pagination.totalPages > 1 && (
						<div className="mt-6 flex items-center justify-between">
							<p className="text-muted-foreground text-sm">
								<Trans>
									Page {pagination.page} of {pagination.totalPages}
								</Trans>
							</p>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={pagination.page === 1}
									onClick={() =>
										updateFilter('page', String(pagination.page - 1))
									}
								>
									<Icon name="chevron-left" className="h-4 w-4" />
									<Trans>Previous</Trans>
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={pagination.page === pagination.totalPages}
									onClick={() =>
										updateFilter('page', String(pagination.page + 1))
									}
								>
									<Trans>Next</Trans>
									<Icon name="chevron-right" className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
