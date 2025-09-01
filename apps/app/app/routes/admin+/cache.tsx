import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { useState } from 'react'
import {
	redirect,
	Form,
	Link,
	useFetcher,
	useSearchParams,
	useSubmit,
	useLoaderData,
} from 'react-router'
import { CacheConfirmationDialog } from '#app/components/admin-cache-confirmation-dialog.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary'
import { useToast } from '#app/components/toaster.tsx'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Icon,
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui'

import {
	cache,
	lruCache,
	getAllCacheKeysWithDetails,
	searchCacheKeysWithDetails,
	getCacheStats,
	clearCacheByType,
	deleteCacheKeys,
	type CacheKeyInfo,
} from '#app/utils/cache.server.ts'
import {
	ensureInstance,
	getAllInstances,
	getInstanceInfo,
} from '#app/utils/litefs.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { getToast, redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/cache.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')
	const searchParams = new URL(request.url).searchParams
	const query = searchParams.get('query')
	if (query === '') {
		searchParams.delete('query')
		return redirect(`/admin/cache?${searchParams.toString()}`)
	}
	const limit = Number(searchParams.get('limit') ?? 100)
	const cacheType = searchParams.get('type') || 'all'

	const currentInstanceInfo = await getInstanceInfo()
	const instance =
		searchParams.get('instance') ?? currentInstanceInfo.currentInstance
	const instances = await getAllInstances()
	await ensureInstance(instance)

	// Get toast message
	const { toast } = await getToast(request)

	// Get cache statistics
	const stats = await getCacheStats()

	// Get cache keys with details
	let cacheData: { sqlite: CacheKeyInfo[]; lru: CacheKeyInfo[] }
	if (typeof query === 'string') {
		cacheData = await searchCacheKeysWithDetails(query, limit)
	} else {
		cacheData = await getAllCacheKeysWithDetails(limit)
	}

	// Filter by cache type if specified
	if (cacheType === 'sqlite') {
		cacheData.lru = []
	} else if (cacheType === 'lru') {
		cacheData.sqlite = []
	}

	return {
		cacheData,
		stats,
		instance,
		instances,
		currentInstanceInfo,
		toast,
		filters: {
			query: query || '',
			type: cacheType,
			limit,
		},
	}
}

export async function action({ request }: Route.ActionArgs) {
	await requireUserWithRole(request, 'admin')
	const formData = await request.formData()
	const actionType = formData.get('actionType')
	const { currentInstance } = await getInstanceInfo()
	const instance = formData.get('instance') ?? currentInstance

	invariantResponse(
		typeof actionType === 'string',
		'actionType must be a string',
	)
	invariantResponse(typeof instance === 'string', 'instance must be a string')
	await ensureInstance(instance)

	const url = new URL(request.url)

	try {
		switch (actionType) {
			case 'deleteKey': {
				const key = formData.get('cacheKey')
				const type = formData.get('type')
				invariantResponse(typeof key === 'string', 'cacheKey must be a string')
				invariantResponse(typeof type === 'string', 'type must be a string')

				if (type === 'sqlite') {
					await cache.delete(key)
				} else if (type === 'lru') {
					lruCache.delete(key)
				}

				return redirectWithToast(url.pathname + url.search, {
					type: 'success',
					title: 'Cache Key Deleted',
					description: `Successfully deleted cache key "${key}" from ${type.toUpperCase()} cache`,
				})
			}
			case 'clearCache': {
				const type = formData.get('type')
				invariantResponse(typeof type === 'string', 'type must be a string')
				invariantResponse(
					type === 'sqlite' || type === 'lru',
					'Invalid cache type',
				)

				const deletedCount = await clearCacheByType(type)
				return redirectWithToast(url.pathname + url.search, {
					type: 'success',
					title: 'Cache Cleared',
					description: `Successfully cleared ${deletedCount} keys from ${type.toUpperCase()} cache`,
				})
			}
			case 'bulkDelete': {
				const keys = formData.get('keys')
				const type = formData.get('type')
				invariantResponse(typeof keys === 'string', 'keys must be a string')
				invariantResponse(typeof type === 'string', 'type must be a string')

				const keyArray = JSON.parse(keys) as string[]
				const deletedCount = await deleteCacheKeys(
					keyArray,
					type as 'sqlite' | 'lru',
				)
				return redirectWithToast(url.pathname + url.search, {
					type: 'success',
					title: 'Bulk Delete Complete',
					description: `Successfully deleted ${deletedCount} cache keys from ${type.toUpperCase()} cache`,
				})
			}
			default: {
				throw new Error(`Unknown action type: ${actionType}`)
			}
		}
	} catch (error) {
		console.error('Cache action error:', error)
		return redirectWithToast(url.pathname + url.search, {
			type: 'error',
			title: 'Cache Operation Failed',
			description:
				error instanceof Error ? error.message : 'An unexpected error occurred',
		})
	}
}

export default function CacheAdminRoute() {
	const data = useLoaderData<typeof loader>()
	const [searchParams, setSearchParams] = useSearchParams()
	useSubmit()
	const [searchQuery, setSearchQuery] = useState(data.filters.query)
	const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

	// Use toast notifications
	useToast(data.toast)

	const query = searchParams.get('query') ?? ''
	const limit = searchParams.get('limit') ?? '100'
	const cacheType = searchParams.get('type') ?? 'all'
	const instance = searchParams.get('instance') ?? data.instance

	const handleSearch = (value: string) => {
		setSearchQuery(value)
		const newSearchParams = new URLSearchParams(searchParams)
		if (value) {
			newSearchParams.set('query', value)
		} else {
			newSearchParams.delete('query')
		}
		setSearchParams(newSearchParams)
	}

	const handleTypeFilter = (value: string) => {
		const newSearchParams = new URLSearchParams(searchParams)
		if (value === 'all') {
			newSearchParams.delete('type')
		} else {
			newSearchParams.set('type', value)
		}
		setSearchParams(newSearchParams)
	}

	const clearFilters = () => {
		setSearchQuery('')
		setSelectedKeys(new Set())
		setSearchParams({})
	}

	const hasActiveFilters = query || cacheType !== 'all'
	const totalKeys = data.cacheData.sqlite.length + data.cacheData.lru.length

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Cache Management</h1>
				<p className="text-muted-foreground">
					Monitor and manage system cache performance
				</p>
			</div>

			{/* Cache Statistics */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">SQLite Cache</CardTitle>
						<Icon name="database" className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{data.stats.sqlite.totalKeys}
						</div>
						<p className="text-muted-foreground text-xs">
							{formatBytes(data.stats.sqlite.totalSize)} total
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">LRU Cache</CardTitle>
						<Icon name="database" className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{data.stats.lru.totalKeys}</div>
						<p className="text-muted-foreground text-xs">
							{data.stats.lru.currentSize} / {data.stats.lru.maxSize} max
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Average Size</CardTitle>
						<Icon name="database" className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{formatBytes(data.stats.sqlite.averageSize)}
						</div>
						<p className="text-muted-foreground text-xs">per SQLite entry</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Entries</CardTitle>
						<Icon name="database" className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{data.stats.sqlite.totalKeys + data.stats.lru.totalKeys}
						</div>
						<p className="text-muted-foreground text-xs">across all caches</p>
					</CardContent>
				</Card>
			</div>

			{/* Search and Filters */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-1 items-center gap-2">
					<div className="relative max-w-sm flex-1">
						<Icon
							name="search"
							className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
						/>
						<Input
							placeholder="Search cache keys..."
							value={searchQuery}
							onChange={(e) => handleSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Select value={cacheType} onValueChange={handleTypeFilter}>
						<SelectTrigger className="w-48">
							<SelectValue placeholder="Filter by cache type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All caches</SelectItem>
							<SelectItem value="sqlite">SQLite only</SelectItem>
							<SelectItem value="lru">LRU only</SelectItem>
						</SelectContent>
					</Select>
					<Select
						value={limit}
						onValueChange={(value) => {
							const newSearchParams = new URLSearchParams(searchParams)
							newSearchParams.set('limit', value)
							setSearchParams(newSearchParams)
						}}
					>
						<SelectTrigger className="w-24">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="50">50</SelectItem>
							<SelectItem value="100">100</SelectItem>
							<SelectItem value="200">200</SelectItem>
							<SelectItem value="500">500</SelectItem>
						</SelectContent>
					</Select>
					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={clearFilters}
							className="h-8 px-2 lg:px-3"
						>
							Reset
							<Icon name="x" className="ml-2 h-4 w-4" />
						</Button>
					)}
				</div>
				<div className="flex items-center gap-2">
					<CacheBulkActions
						selectedKeys={selectedKeys}
						onClearSelection={() => setSelectedKeys(new Set())}
					/>
				</div>
			</div>

			{/* Instance Selection */}
			<Form method="get" className="flex items-center gap-4">
				<input type="hidden" name="query" value={query} />
				<input type="hidden" name="type" value={cacheType} />
				<input type="hidden" name="limit" value={limit} />
				<div className="flex items-center gap-2">
					<label htmlFor="instance" className="text-sm font-medium">
						Instance:
					</label>
					<select
						name="instance"
						id="instance"
						defaultValue={instance}
						onChange={(e) => e.currentTarget.form?.submit()}
						className="border-input bg-background rounded-md border px-3 py-1 text-sm"
					>
						{Object.entries(data.instances).map(([inst, region]) => (
							<option key={inst} value={inst}>
								{[
									inst,
									`(${region})`,
									inst === data.currentInstanceInfo.currentInstance
										? '(current)'
										: '',
									inst === data.currentInstanceInfo.primaryInstance
										? ' (primary)'
										: '',
								]
									.filter(Boolean)
									.join(' ')}
							</option>
						))}
					</select>
				</div>
			</Form>

			{/* Results Summary */}
			<div className="text-muted-foreground flex items-center justify-between text-sm">
				<div>
					Showing {totalKeys} cache entries
					{query && ` matching "${query}"`}
					{cacheType !== 'all' && ` in ${cacheType.toUpperCase()} cache`}
				</div>
				{selectedKeys.size > 0 && <div>{selectedKeys.size} selected</div>}
			</div>

			{/* Cache Tables */}
			<div className="space-y-6">
				{data.cacheData.sqlite.length > 0 && (
					<CacheTable
						title="SQLite Cache"
						type="sqlite"
						keys={data.cacheData.sqlite}
						instance={instance}
						selectedKeys={selectedKeys}
						onSelectionChange={setSelectedKeys}
					/>
				)}

				{data.cacheData.lru.length > 0 && (
					<CacheTable
						title="LRU Cache"
						type="lru"
						keys={data.cacheData.lru}
						instance={instance}
						selectedKeys={selectedKeys}
						onSelectionChange={setSelectedKeys}
					/>
				)}

				{totalKeys === 0 && (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<Icon
								name="database"
								className="text-muted-foreground mb-4 h-12 w-12"
							/>
							<h3 className="mb-2 text-lg font-semibold">
								No cache entries found
							</h3>
							<p className="text-muted-foreground text-center">
								{query
									? `No cache keys match "${query}"`
									: 'The cache is empty'}
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	)
}

function CacheTable({
	title,
	type,
	keys,
	instance,
	selectedKeys,
	onSelectionChange,
}: {
	title: string
	type: 'sqlite' | 'lru'
	keys: CacheKeyInfo[]
	instance: string
	selectedKeys: Set<string>
	onSelectionChange: (keys: Set<string>) => void
}) {
	const handleSelectAll = (checked: boolean) => {
		const newSelection = new Set(selectedKeys)
		if (checked) {
			keys.forEach((key) => newSelection.add(`${type}:${key.key}`))
		} else {
			keys.forEach((key) => newSelection.delete(`${type}:${key.key}`))
		}
		onSelectionChange(newSelection)
	}

	const handleSelectKey = (key: string, checked: boolean) => {
		const newSelection = new Set(selectedKeys)
		const fullKey = `${type}:${key}`
		if (checked) {
			newSelection.add(fullKey)
		} else {
			newSelection.delete(fullKey)
		}
		onSelectionChange(newSelection)
	}

	const allSelected = keys.every((key) =>
		selectedKeys.has(`${type}:${key.key}`),
	)
	const someSelected = keys.some((key) =>
		selectedKeys.has(`${type}:${key.key}`),
	)

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							{title}
							<Badge variant="secondary">{keys.length}</Badge>
						</CardTitle>
						<CardDescription>
							{type === 'sqlite'
								? 'Persistent cache stored in SQLite database'
								: 'In-memory LRU cache'}
						</CardDescription>
					</div>
					<CacheClearButton type={type} />
				</div>
			</CardHeader>
			<CardContent className="p-0">
				<div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12">
									<input
										type="checkbox"
										checked={allSelected}
										ref={(el) => {
											if (el) el.indeterminate = someSelected && !allSelected
										}}
										onChange={(e) => handleSelectAll(e.target.checked)}
										className="rounded border-gray-300"
									/>
								</TableHead>
								<TableHead>Key</TableHead>
								<TableHead>Size</TableHead>
								<TableHead>Created</TableHead>
								<TableHead>TTL</TableHead>
								<TableHead className="w-24">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{keys.map((keyInfo) => (
								<CacheKeyRow
									key={keyInfo.key}
									keyInfo={keyInfo}
									type={type}
									instance={instance}
									isSelected={selectedKeys.has(`${type}:${keyInfo.key}`)}
									onSelect={(checked) => handleSelectKey(keyInfo.key, checked)}
								/>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	)
}

function CacheKeyRow({
	keyInfo,
	type,
	instance,
	isSelected,
	onSelect,
}: {
	keyInfo: CacheKeyInfo
	type: 'sqlite' | 'lru'
	instance: string
	isSelected: boolean
	onSelect: (checked: boolean) => void
}) {
	const fetcher = useFetcher<typeof action>()
	const [showConfirmDialog, setShowConfirmDialog] = useState(false)
	const encodedKey = encodeURIComponent(keyInfo.key)
	const valuePage = `/admin/cache/${type}/${encodedKey}?instance=${instance}`

	const isDeleting =
		fetcher.state !== 'idle' &&
		fetcher.formData?.get('cacheKey') === keyInfo.key

	const handleConfirm = () => {
		void fetcher.submit(
			{
				actionType: 'deleteKey',
				cacheKey: keyInfo.key,
				instance,
				type,
			},
			{ method: 'POST' },
		)
		setShowConfirmDialog(false)
	}

	return (
		<>
			<TableRow>
				<TableCell>
					<input
						type="checkbox"
						checked={isSelected}
						onChange={(e) => onSelect(e.target.checked)}
						className="rounded border-gray-300"
					/>
				</TableCell>
				<TableCell>
					<Link
						to={valuePage}
						className="font-mono text-sm hover:underline"
						reloadDocument
					>
						{keyInfo.key}
					</Link>
				</TableCell>
				<TableCell>
					{keyInfo.size > 0 ? formatBytes(keyInfo.size) : '-'}
				</TableCell>
				<TableCell>
					{keyInfo.createdAt ? (
						<span className="text-sm">
							{keyInfo.createdAt.toLocaleDateString()}{' '}
							{keyInfo.createdAt.toLocaleTimeString()}
						</span>
					) : (
						'-'
					)}
				</TableCell>
				<TableCell>
					{keyInfo.ttl ? <Badge variant="outline">{keyInfo.ttl}ms</Badge> : '-'}
				</TableCell>
				<TableCell>
					<Button
						size="sm"
						variant="ghost"
						disabled={isDeleting}
						onClick={() => setShowConfirmDialog(true)}
					>
						{isDeleting ? (
							<Icon name="loader" className="h-4 w-4 animate-spin" />
						) : (
							<Icon name="trash-2" className="h-4 w-4" />
						)}
					</Button>
				</TableCell>
			</TableRow>

			<CacheConfirmationDialog
				isOpen={showConfirmDialog}
				onClose={() => setShowConfirmDialog(false)}
				onConfirm={handleConfirm}
				title="Delete Cache Key"
				description={`This will permanently delete the cache key "${keyInfo.key}" from the ${type.toUpperCase()} cache. This action cannot be undone.`}
				confirmText="Delete Key"
				variant="destructive"
				isLoading={isDeleting}
				details={{
					type: type.toUpperCase(),
					keys: [keyInfo.key],
				}}
			/>
		</>
	)
}

function CacheClearButton({ type }: { type: 'sqlite' | 'lru' }) {
	const fetcher = useFetcher<typeof action>()
	const [showConfirmDialog, setShowConfirmDialog] = useState(false)
	const isClearing =
		fetcher.state !== 'idle' && fetcher.formData?.get('type') === type

	const handleConfirm = () => {
		void fetcher.submit(
			{
				actionType: 'clearCache',
				type,
			},
			{ method: 'POST' },
		)
		setShowConfirmDialog(false)
	}

	return (
		<>
			<Button
				size="sm"
				variant="destructive"
				disabled={isClearing}
				onClick={() => setShowConfirmDialog(true)}
			>
				{isClearing ? (
					<Icon name="loader" className="mr-2 h-4 w-4 animate-spin" />
				) : (
					<Icon name="trash-2" className="mr-2 h-4 w-4" />
				)}
				Clear {type.toUpperCase()}
			</Button>

			<CacheConfirmationDialog
				isOpen={showConfirmDialog}
				onClose={() => setShowConfirmDialog(false)}
				onConfirm={handleConfirm}
				title={`Clear ${type.toUpperCase()} Cache`}
				description={`This will permanently delete all entries in the ${type.toUpperCase()} cache. This action cannot be undone.`}
				confirmText={`Clear ${type.toUpperCase()} Cache`}
				variant="destructive"
				isLoading={isClearing}
				details={{
					type: type.toUpperCase(),
				}}
			/>
		</>
	)
}

function CacheBulkActions({
	selectedKeys,
	onClearSelection,
}: {
	selectedKeys: Set<string>
	onClearSelection: () => void
}) {
	const fetcher = useFetcher<typeof action>()
	const [showConfirmDialog, setShowConfirmDialog] = useState(false)
	const [pendingAction, setPendingAction] = useState<{
		type: 'sqlite' | 'lru'
		keys: string[]
	} | null>(null)

	if (selectedKeys.size === 0) return null

	const sqliteKeys = Array.from(selectedKeys)
		.filter((key) => key.startsWith('sqlite:'))
		.map((key) => key.replace('sqlite:', ''))

	const lruKeys = Array.from(selectedKeys)
		.filter((key) => key.startsWith('lru:'))
		.map((key) => key.replace('lru:', ''))

	const handleBulkDelete = (type: 'sqlite' | 'lru') => {
		const keys = type === 'sqlite' ? sqliteKeys : lruKeys
		if (keys.length === 0) return

		setPendingAction({ type, keys })
		setShowConfirmDialog(true)
	}

	const handleConfirm = () => {
		if (!pendingAction) return

		void fetcher.submit(
			{
				actionType: 'bulkDelete',
				type: pendingAction.type,
				keys: JSON.stringify(pendingAction.keys),
			},
			{ method: 'POST' },
		)
		setShowConfirmDialog(false)
		setPendingAction(null)
		onClearSelection()
	}

	const isDeleting = fetcher.state !== 'idle'

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" disabled={isDeleting}>
						Bulk Actions ({selectedKeys.size})
						<Icon name="chevron-down" className="ml-2 h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{sqliteKeys.length > 0 && (
						<DropdownMenuItem onClick={() => handleBulkDelete('sqlite')}>
							<Icon name="trash-2" className="h-4 w-4" />
							Delete {sqliteKeys.length} SQLite keys
						</DropdownMenuItem>
					)}
					{lruKeys.length > 0 && (
						<DropdownMenuItem onClick={() => handleBulkDelete('lru')}>
							<Icon name="trash-2" className="h-4 w-4" />
							Delete {lruKeys.length} LRU keys
						</DropdownMenuItem>
					)}
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={onClearSelection}>
						<Icon name="x" className="h-4 w-4" />
						Clear selection
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{pendingAction && (
				<CacheConfirmationDialog
					isOpen={showConfirmDialog}
					onClose={() => {
						setShowConfirmDialog(false)
						setPendingAction(null)
					}}
					onConfirm={handleConfirm}
					title={`Delete ${pendingAction.keys.length} Cache Keys`}
					description={`This will permanently delete ${pendingAction.keys.length} keys from the ${pendingAction.type.toUpperCase()} cache. This action cannot be undone.`}
					confirmText={`Delete ${pendingAction.keys.length} Keys`}
					variant="destructive"
					isLoading={isDeleting}
					details={{
						type: pendingAction.type.toUpperCase(),
						count: pendingAction.keys.length,
						keys: pendingAction.keys,
					}}
				/>
			)}
		</>
	)
}

// Utility function to format bytes
function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: ({ error }) => (
					<div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
						<div className="text-center">
							<h2 className="text-foreground mb-2 text-2xl font-bold">
								Access Denied
							</h2>
							<p className="text-muted-foreground mb-4">
								You don't have permission to access this admin area.
							</p>
							<p className="text-muted-foreground text-sm">
								{error?.data?.message || 'Admin role required'}
							</p>
						</div>
						<div className="text-center">
							<a
								href="/admin"
								className="bg-primary hover:bg-primary/90 focus:ring-primary inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-offset-2 focus:outline-none"
							>
								Return to Admin Dashboard
							</a>
						</div>
					</div>
				),
			}}
		/>
	)
}
