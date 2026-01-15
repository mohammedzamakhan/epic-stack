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
	SelectValue,
} from '@repo/ui/select'
import { useState } from 'react'
import { useLoaderData, useSearchParams } from 'react-router'
import { auditService } from '#app/utils/audit.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'

export async function loader({ request }: { request: Request }) {
	await requireUserWithRole(request, 'admin')

	const url = new URL(request.url)
	const page = Number(url.searchParams.get('page')) || 1
	const limit = 50
	const offset = (page - 1) * limit

	// Get filter parameters
	const organizationId = url.searchParams.get('organizationId') || undefined
	const userId = url.searchParams.get('userId') || undefined
	const search = url.searchParams.get('search') || undefined
	const startDateStr = url.searchParams.get('startDate')
	const endDateStr = url.searchParams.get('endDate')
	const severityFilter = url.searchParams.get('severity') || undefined

	const startDate = startDateStr ? new Date(startDateStr) : undefined
	const endDate = endDateStr ? new Date(endDateStr) : undefined

	// Query audit logs
	const result = await auditService.query({
		organizationId,
		userId,
		search,
		startDate,
		endDate,
		limit,
		offset,
	})

	// Get statistics
	const statistics = await auditService.getStatistics({
		organizationId,
		startDate,
		endDate,
	})

	return {
		...result,
		statistics,
		filters: {
			organizationId,
			userId,
			search,
			startDate: startDateStr,
			endDate: endDateStr,
			severity: severityFilter,
		},
	}
}

export default function EnhancedAuditLogsPage() {
	const { logs, total, page, totalPages, statistics, filters } =
		useLoaderData<typeof loader>()
	const [searchParams, setSearchParams] = useSearchParams()
	const [isExporting, setIsExporting] = useState(false)

	const handleExport = async (format: 'csv' | 'json') => {
		setIsExporting(true)
		try {
			const params = new URLSearchParams()
			params.set('format', format)
			if (filters.organizationId)
				params.set('organizationId', filters.organizationId)
			if (filters.userId) params.set('userId', filters.userId)
			if (filters.startDate) params.set('startDate', filters.startDate)
			if (filters.endDate) params.set('endDate', filters.endDate)

			const url = `/audit-logs/export?${params.toString()}`
			window.open(url, '_blank')
		} finally {
			setIsExporting(false)
		}
	}

	const updateFilter = (key: string, value: string) => {
		const newParams = new URLSearchParams(searchParams)
		if (value) {
			newParams.set(key, value)
		} else {
			newParams.delete(key)
		}
		newParams.delete('page') // Reset to first page when filtering
		setSearchParams(newParams)
	}

	const clearFilters = () => {
		setSearchParams(new URLSearchParams())
	}

	const getSeverityBadgeVariant = (severity: string) => {
		switch (severity) {
			case 'critical':
				return 'destructive'
			case 'error':
				return 'destructive'
			case 'warning':
				return 'default'
			default:
				return 'secondary'
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Audit Logs</h1>
					<p className="text-muted-foreground">
						Comprehensive activity tracking and compliance audit trail
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => handleExport('csv')}
						disabled={isExporting}
					>
						<Icon name="download" className="mr-2 h-4 w-4" />
						Export CSV
					</Button>
					<Button
						variant="outline"
						onClick={() => handleExport('json')}
						disabled={isExporting}
					>
						<Icon name="download" className="mr-2 h-4 w-4" />
						Export JSON
					</Button>
				</div>
			</div>

			{/* Statistics Cards */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Events</CardTitle>
						<Icon name="activity" className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{statistics.totalEvents.toLocaleString()}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Security Events
						</CardTitle>
						<Icon name="shield" className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{statistics.recentSecurityEvents.length}
						</div>
						<p className="text-muted-foreground text-xs">In last 100 events</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Top Action</CardTitle>
						<Icon
							name="trending-up"
							className="text-muted-foreground h-4 w-4"
						/>
					</CardHeader>
					<CardContent>
						<div className="text-sm font-medium">
							{statistics.topActions[0]?.action || 'N/A'}
						</div>
						<p className="text-muted-foreground text-xs">
							{statistics.topActions[0]?._count || 0} occurrences
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Icon name="search" className="h-5 w-5" />
						Filters
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<div>
							<label className="text-sm font-medium">Search</label>
							<Input
								type="text"
								placeholder="Search details or action..."
								defaultValue={filters.search || ''}
								onChange={(e) => updateFilter('search', e.target.value)}
							/>
						</div>
						<div>
							<label className="text-sm font-medium">Start Date</label>
							<Input
								type="date"
								defaultValue={filters.startDate || ''}
								onChange={(e) => updateFilter('startDate', e.target.value)}
							/>
						</div>
						<div>
							<label className="text-sm font-medium">End Date</label>
							<Input
								type="date"
								defaultValue={filters.endDate || ''}
								onChange={(e) => updateFilter('endDate', e.target.value)}
							/>
						</div>
						<div>
							<label className="text-sm font-medium">Severity</label>
							<Select
								value={filters.severity || 'all'}
								onValueChange={(value) =>
									updateFilter(
										'severity',
										value === 'all' ? '' : (value as string),
									)
								}
							>
								<SelectTrigger>All severities</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="info">Info</SelectItem>
									<SelectItem value="warning">Warning</SelectItem>
									<SelectItem value="error">Error</SelectItem>
									<SelectItem value="critical">Critical</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="mt-4 flex gap-2">
						<Button variant="outline" size="sm" onClick={clearFilters}>
							<Icon name="x" className="mr-2 h-4 w-4" />
							Clear Filters
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Audit Log List */}
			<Card>
				<CardHeader>
					<CardTitle>Audit Trail</CardTitle>
					<CardDescription>
						Showing {logs.length} of {total.toLocaleString()} events
					</CardDescription>
				</CardHeader>
				<CardContent>
					{logs.length > 0 ? (
						<ItemGroup>
							{logs.map((log) => {
								const metadata = log.metadata ? JSON.parse(log.metadata) : {}
								const metadataTyped = metadata as Record<string, any>
								return (
									<Item key={log.id} variant="outline">
										<ItemContent>
											<ItemHeader>
												<div className="flex items-center gap-2">
													<Badge
														variant={getSeverityBadgeVariant(
															metadataTyped.severity || 'info',
														)}
													>
														{metadataTyped.severity || 'info'}
													</Badge>
													<span className="text-muted-foreground font-mono text-sm">
														{log.action}
													</span>
												</div>
												<div className="text-muted-foreground flex items-center gap-1 text-sm">
													<Icon name="clock" className="h-4 w-4" />
													<span>
														{new Date(log.createdAt).toLocaleString()}
													</span>
												</div>
											</ItemHeader>
											<ItemTitle>{log.details}</ItemTitle>
											<ItemDescription className="flex flex-wrap gap-4">
												{log.user && (
													<span>
														<Icon name="user" className="mr-1 inline h-3 w-3" />
														{log.user.name || log.user.username}
													</span>
												)}
												{log.organization && (
													<span>
														<Icon
															name="building"
															className="mr-1 inline h-3 w-3"
														/>
														{log.organization.name}
													</span>
												)}
												{metadataTyped.ipAddress && (
													<span>
														<Icon
															name="external-link"
															className="mr-1 inline h-3 w-3"
														/>
														{metadataTyped.ipAddress}
													</span>
												)}
												{log.resourceType && (
													<span>
														<Icon
															name="folder"
															className="mr-1 inline h-3 w-3"
														/>
														{log.resourceType}:{' '}
														{log.resourceId?.substring(0, 8)}
													</span>
												)}
											</ItemDescription>
										</ItemContent>
									</Item>
								)
							})}
						</ItemGroup>
					) : (
						<div className="py-12 text-center">
							<Icon
								name="file-text"
								className="text-muted-foreground mx-auto mb-4 h-12 w-12"
							/>
							<p className="text-muted-foreground">No audit logs found</p>
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="mt-6 flex items-center justify-between">
							<p className="text-muted-foreground text-sm">
								Page {page} of {totalPages}
							</p>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page === 1}
									onClick={() => updateFilter('page', String(page - 1))}
								>
									<Icon name="chevron-left" className="h-4 w-4" />
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={page === totalPages}
									onClick={() => updateFilter('page', String(page + 1))}
								>
									Next
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
