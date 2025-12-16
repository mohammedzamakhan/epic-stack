import { type WaitlistEntry, type User, type UserImage } from '@prisma/client'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@repo/ui/table'
import { Img } from 'openimg/react'
import { useCallback, useEffect, useState } from 'react'
import {
	useLoaderData,
	Form,
	useNavigation,
	useSearchParams,
} from 'react-router'
import { prisma } from '@repo/database'
import { getLaunchStatus } from '#app/utils/env.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import {
	grantEarlyAccess,
	revokeEarlyAccess,
} from '#app/utils/waitlist.server.ts'
import { type Route } from './+types/waitlist.ts'

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')

	const launchStatus = getLaunchStatus()

	const url = new URL(request.url)
	const searchQuery = url.searchParams.get('search') || ''
	const filterStatus = url.searchParams.get('status') || 'all' // 'all', 'granted', 'pending'
	const page = parseInt(url.searchParams.get('page') || '1', 10)
	const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10)
	const sortBy = url.searchParams.get('sortBy') || 'rank' // 'rank', 'date', 'points'

	// Build where clause
	const where: any = {}

	if (searchQuery) {
		where.user = {
			OR: [
				{ name: { contains: searchQuery, mode: 'insensitive' } },
				{ email: { contains: searchQuery, mode: 'insensitive' } },
				{ username: { contains: searchQuery, mode: 'insensitive' } },
			],
		}
	}

	if (filterStatus === 'granted') {
		where.hasEarlyAccess = true
	} else if (filterStatus === 'pending') {
		where.hasEarlyAccess = false
	}

	// Determine ordering
	let orderBy: any = {}
	if (sortBy === 'points') {
		orderBy = [{ points: 'desc' }, { createdAt: 'asc' }]
	} else if (sortBy === 'date') {
		orderBy = { createdAt: 'desc' }
	} else {
		// Default: rank order (points DESC, createdAt ASC)
		orderBy = [{ points: 'desc' }, { createdAt: 'asc' }]
	}

	// Get all entries for rank calculation (we need to calculate ranks across ALL entries, not just the current page)
	// Then we'll slice for pagination
	const [allEntries, totalCount] = await Promise.all([
		prisma.waitlistEntry.findMany({
			where,
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						username: true,
						image: {
							select: {
								id: true,
								altText: true,
								objectKey: true,
							},
						},
					},
				},
				referrals: {
					select: {
						id: true,
					},
				},
			},
			orderBy,
		}),
		prisma.waitlistEntry.count({ where }),
	])

	// Calculate ranks for ALL entries in memory (more efficient than N queries)
	// Sort by points DESC, then createdAt ASC for ranking
	const sortedEntries = [...allEntries].sort((a, b) => {
		if (b.points !== a.points) {
			return b.points - a.points
		}
		return a.createdAt.getTime() - b.createdAt.getTime()
	})

	// Assign ranks
	const entriesWithRanks = sortedEntries.map((entry, index) => ({
		...entry,
		rank: index + 1,
		referralCount: entry.referrals.length,
	}))

	// Apply pagination to the ranked entries
	const paginatedEntries = entriesWithRanks.slice(
		(page - 1) * pageSize,
		page * pageSize,
	)

	const totalPages = Math.ceil(totalCount / pageSize)

	return Response.json({
		entries: paginatedEntries,
		pagination: {
			page,
			pageSize,
			totalCount,
			totalPages,
		},
		filters: {
			search: searchQuery,
			status: filterStatus,
			sortBy,
		},
		launchStatus,
	})
}

export async function action({ request }: Route.ActionArgs) {
	const adminUserId = await requireUserWithRole(request, 'admin')

	const formData = await request.formData()
	const intent = formData.get('intent')
	const userId = formData.get('userId') as string

	if (!userId) {
		return Response.json({ error: 'User ID is required' }, { status: 400 })
	}

	try {
		if (intent === 'grant-access') {
			await grantEarlyAccess(userId, adminUserId)
			return Response.json({ success: true, message: 'Access granted' })
		} else if (intent === 'revoke-access') {
			await revokeEarlyAccess(userId)
			return Response.json({ success: true, message: 'Access revoked' })
		}

		return Response.json({ error: 'Invalid intent' }, { status: 400 })
	} catch (error) {
		console.error('Waitlist action error:', error)
		return Response.json(
			{ error: 'Failed to process request' },
			{ status: 500 },
		)
	}
}

type LoaderData = {
	entries: (WaitlistEntry & {
		user: Pick<User, 'id' | 'name' | 'email' | 'username'> & {
			image: Pick<UserImage, 'id' | 'altText' | 'objectKey'> | null
		}
		referrals: { id: string }[]
		rank: number
		referralCount: number
	})[]
	pagination: {
		page: number
		pageSize: number
		totalCount: number
		totalPages: number
	}
	filters: {
		search: string
		status: string
		sortBy: string
	}
	launchStatus: 'CLOSED_BETA' | 'PUBLIC_BETA' | 'LAUNCHED'
}

export default function AdminWaitlistPage() {
	const data = useLoaderData() as LoaderData
	const navigation = useNavigation()
	const [searchParams, setSearchParams] = useSearchParams()
	const [searchValue, setSearchValue] = useState(data.filters.search)

	const isProcessing = navigation.state === 'submitting'

	const handleFilterChange = useCallback(
		(key: string, value: string) => {
			const newParams = new URLSearchParams(searchParams)
			if (value) {
				newParams.set(key, value)
			} else {
				newParams.delete(key)
			}
			newParams.set('page', '1') // Reset to first page when filtering
			setSearchParams(newParams)
		},
		[searchParams, setSearchParams],
	)

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(() => {
			if (searchValue !== data.filters.search) {
				handleFilterChange('search', searchValue)
			}
		}, 300)
		return () => clearTimeout(timer)
	}, [searchValue, data.filters.search, handleFilterChange])

	const handlePageChange = (newPage: number) => {
		const newParams = new URLSearchParams(searchParams)
		newParams.set('page', String(newPage))
		setSearchParams(newParams)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">
					Waitlist Management
				</h1>
				<p className="text-muted-foreground">
					Manage waitlist users and grant early access
				</p>
			</div>

			{data.launchStatus !== 'CLOSED_BETA' && (
				<Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
					<CardContent>
						<div className="flex items-start gap-2">
							<Icon
								name="help-circle"
								className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
							/>
							<div className="text-sm text-yellow-800 dark:text-yellow-200">
								Launch status is currently <strong>{data.launchStatus}</strong>.
								The waitlist is only active when LAUNCH_STATUS is set to
								CLOSED_BETA.
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Filters</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-4">
						<div className="min-w-[200px] flex-1">
							<Input
								type="search"
								placeholder="Search by name, email, or username..."
								value={searchValue}
								onChange={(e) => setSearchValue(e.target.value)}
							/>
						</div>

						<select
							className="rounded-md border px-3 py-2"
							value={data.filters.status}
							onChange={(e) => handleFilterChange('status', e.target.value)}
						>
							<option value="all">All Users</option>
							<option value="pending">Pending Access</option>
							<option value="granted">Access Granted</option>
						</select>

						<select
							className="rounded-md border px-3 py-2"
							value={data.filters.sortBy}
							onChange={(e) => handleFilterChange('sortBy', e.target.value)}
						>
							<option value="rank">Sort by Rank</option>
							<option value="points">Sort by Points</option>
							<option value="date">Sort by Date</option>
						</select>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Waitlist Entries ({data.pagination.totalCount})</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Rank</TableHead>
								<TableHead>User</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Points</TableHead>
								<TableHead>Referrals</TableHead>
								<TableHead>Discord</TableHead>
								<TableHead>Joined</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.entries.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={9}
										className="text-muted-foreground text-center"
									>
										No waitlist entries found
									</TableCell>
								</TableRow>
							) : (
								data.entries.map((entry) => (
									<TableRow key={entry.id}>
										<TableCell className="font-medium">#{entry.rank}</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												{entry.user.image && (
													<Img
														className="h-8 w-8 rounded-full object-cover"
														src={entry.user.image.objectKey}
														alt={
															entry.user.image.altText ??
															entry.user.name ??
															'User'
														}
														width={32}
														height={32}
													/>
												)}
												<div>
													<div className="font-medium">{entry.user.name}</div>
													<div className="text-muted-foreground text-sm">
														@{entry.user.username}
													</div>
												</div>
											</div>
										</TableCell>
										<TableCell>{entry.user.email}</TableCell>
										<TableCell>
											<Badge variant="secondary">{entry.points} pts</Badge>
										</TableCell>
										<TableCell>{entry.referralCount}</TableCell>
										<TableCell>
											{entry.hasJoinedDiscord ? (
												<Icon name="check" className="h-4 w-4 text-green-600" />
											) : (
												<Icon name="x" className="h-4 w-4 text-gray-400" />
											)}
										</TableCell>
										<TableCell>
											{new Date(entry.createdAt).toLocaleDateString()}
										</TableCell>
										<TableCell>
											{entry.hasEarlyAccess ? (
												<Badge variant="default">Access Granted</Badge>
											) : (
												<Badge variant="outline">Pending</Badge>
											)}
										</TableCell>
										<TableCell>
											<Form method="post">
												<input
													type="hidden"
													name="userId"
													value={entry.userId}
												/>
												{entry.hasEarlyAccess ? (
													<Button
														type="submit"
														name="intent"
														value="revoke-access"
														variant="outline"
														size="sm"
														disabled={isProcessing}
													>
														<Icon name="x" className="mr-1 h-3 w-3" />
														Revoke
													</Button>
												) : (
													<Button
														type="submit"
														name="intent"
														value="grant-access"
														variant="default"
														size="sm"
														disabled={isProcessing}
													>
														<Icon name="check" className="mr-1 h-3 w-3" />
														Grant Access
													</Button>
												)}
											</Form>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>

					{/* Pagination */}
					{data.pagination.totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<div className="text-muted-foreground text-sm">
								Showing{' '}
								{(data.pagination.page - 1) * data.pagination.pageSize + 1} to{' '}
								{Math.min(
									data.pagination.page * data.pagination.pageSize,
									data.pagination.totalCount,
								)}{' '}
								of {data.pagination.totalCount} entries
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={data.pagination.page === 1}
									onClick={() => handlePageChange(data.pagination.page - 1)}
								>
									Previous
								</Button>
								<div className="flex items-center gap-1">
									{Array.from(
										{ length: data.pagination.totalPages },
										(_, i) => i + 1,
									)
										.filter((page) => {
											const currentPage = data.pagination.page
											return (
												page === 1 ||
												page === data.pagination.totalPages ||
												(page >= currentPage - 1 && page <= currentPage + 1)
											)
										})
										.map((page, index, array) => {
											const prevPage = array[index - 1]
											if (index > 0 && prevPage && page - prevPage > 1) {
												return (
													<span key={`ellipsis-${page}`} className="px-2">
														...
													</span>
												)
											}
											return (
												<Button
													key={page}
													variant={
														page === data.pagination.page
															? 'default'
															: 'outline'
													}
													size="sm"
													onClick={() => handlePageChange(page)}
												>
													{page}
												</Button>
											)
										})}
								</div>
								<Button
									variant="outline"
									size="sm"
									disabled={data.pagination.page === data.pagination.totalPages}
									onClick={() => handlePageChange(data.pagination.page + 1)}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
