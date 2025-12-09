import { Button } from '@repo/ui/button'
import { Card, CardHeader, CardContent, CardTitle } from '@repo/ui/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@repo/ui/dialog'
import { Input } from '@repo/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui/select'
import { Switch } from '@repo/ui/switch'
import {
	Table,
	TableHeader,
	TableRow,
	TableHead,
	TableBody,
	TableCell,
} from '@repo/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs'
import { useState, useEffect } from 'react'
import { useFetcher, useLoaderData, Form } from 'react-router'
import { type loader } from '#app/routes/_admin+/feature-flags.tsx'

type ConfigFlag = {
	id: string
	key: string
	value: any
	level: 'system' | 'organization' | 'user'
	organizationId?: string | null
	userId?: string | null
	createdAt: Date
	updatedAt: Date
}

function FeatureFlagDialog({
	flag,
	level = 'system',
	organizationId,
	userId,
	children,
}: {
	flag?: ConfigFlag
	level?: 'system' | 'organization' | 'user'
	organizationId?: string
	userId?: string
	children: React.ReactNode
}) {
	const fetcher = useFetcher()
	const [open, setOpen] = useState(false)
	const [type, setType] = useState(
		typeof flag?.value === 'number'
			? 'number'
			: typeof flag?.value === 'boolean'
				? 'boolean'
				: 'string',
	)

	useEffect(() => {
		if (fetcher.state === 'idle' && fetcher.data?.ok) {
			setOpen(false)
		}
	}, [fetcher.state, fetcher.data])

	useEffect(() => {
		if (!open) {
			setType(
				typeof flag?.value === 'number'
					? 'number'
					: typeof flag?.value === 'boolean'
						? 'boolean'
						: 'string',
			)
		}
	}, [open, flag])

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{flag ? 'Edit Flag' : 'Add Flag'}</DialogTitle>
					<DialogDescription>
						{flag
							? 'Edit the details of the feature flag.'
							: 'Create a new feature flag at system level.'}
					</DialogDescription>
				</DialogHeader>
				{fetcher.data?.error && (
					<p className="text-destructive text-sm">{fetcher.data.error}</p>
				)}
				<fetcher.Form method="post" action="/feature-flags">
					<input
						type="hidden"
						name="_action"
						value={flag ? 'update' : 'create'}
					/>
					{flag && <input type="hidden" name="id" value={flag.id} />}
					<input type="hidden" name="level" value={level} />
					{organizationId && (
						<input type="hidden" name="organizationId" value={organizationId} />
					)}
					{userId && <input type="hidden" name="userId" value={userId} />}
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Input
							name="key"
							placeholder="Flag Key"
							required
							defaultValue={flag?.key}
							disabled={!!flag}
						/>
						<Select name="type" defaultValue={type} onValueChange={setType}>
							<SelectTrigger>
								<SelectValue placeholder="Type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="string">String</SelectItem>
								<SelectItem value="number">Number</SelectItem>
								<SelectItem value="boolean">Boolean</SelectItem>
								<SelectItem value="date">Date</SelectItem>
							</SelectContent>
						</Select>
						{type === 'string' && (
							<Input
								name="value"
								placeholder="Flag Value"
								required
								defaultValue={(flag?.value as string) ?? ''}
							/>
						)}
						{type === 'number' && (
							<Input
								name="value"
								type="number"
								placeholder="Flag Value"
								required
								defaultValue={(flag?.value as number) ?? 0}
							/>
						)}
						{type === 'boolean' && (
							<Switch
								name="value"
								defaultChecked={(flag?.value as boolean) ?? false}
							/>
						)}
						{type === 'date' && (
							<input
								type="date"
								name="value"
								defaultValue={
									flag?.value
										? new Date(flag.value as string).toISOString().slice(0, 10)
										: new Date().toISOString().slice(0, 10)
								}
							/>
						)}
					</div>
					<div className="mt-4 flex justify-end">
						<Button type="submit">
							{flag ? 'Update Flag' : 'Create Flag'}
						</Button>
					</div>
				</fetcher.Form>
			</DialogContent>
		</Dialog>
	)
}

function OverrideDialog({
	systemFlag,
	existingOverride,
	level,
	organizationId,
	userId,
	children,
}: {
	systemFlag: ConfigFlag
	existingOverride?: ConfigFlag
	level: 'organization' | 'user'
	organizationId?: string
	userId?: string
	children: React.ReactNode
}) {
	const fetcher = useFetcher()
	const [open, setOpen] = useState(false)
	const [type, setType] = useState(
		typeof systemFlag.value === 'number'
			? 'number'
			: typeof systemFlag.value === 'boolean'
				? 'boolean'
				: 'string',
	)

	useEffect(() => {
		if (fetcher.state === 'idle' && fetcher.data?.ok) {
			setOpen(false)
		}
	}, [fetcher.state, fetcher.data])

	const currentValue = existingOverride?.value ?? systemFlag.value

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{existingOverride ? 'Edit Override' : 'Create Override'} for "
						{systemFlag.key}"
					</DialogTitle>
					<DialogDescription>
						{existingOverride
							? 'Modify the override value.'
							: `Create an override at ${level} level.`}
					</DialogDescription>
				</DialogHeader>
				{fetcher.data?.error && (
					<p className="text-destructive text-sm">{fetcher.data.error}</p>
				)}
				<fetcher.Form method="post" action="/feature-flags">
					<input
						type="hidden"
						name="_action"
						value={existingOverride ? 'update' : 'create'}
					/>
					{existingOverride && (
						<input type="hidden" name="id" value={existingOverride.id} />
					)}
					<input type="hidden" name="key" value={systemFlag.key} />
					<input type="hidden" name="level" value={level} />
					{organizationId && (
						<input type="hidden" name="organizationId" value={organizationId} />
					)}
					{userId && <input type="hidden" name="userId" value={userId} />}
					<input type="hidden" name="type" value={type} />
					<div className="space-y-4">
						<div className="text-muted-foreground text-sm">
							System value:{' '}
							<span className="font-mono">
								{JSON.stringify(systemFlag.value)}
							</span>
						</div>
						{type === 'string' && (
							<Input
								name="value"
								placeholder="Override Value"
								required
								defaultValue={(currentValue as string) ?? ''}
							/>
						)}
						{type === 'number' && (
							<Input
								name="value"
								type="number"
								placeholder="Override Value"
								required
								defaultValue={(currentValue as number) ?? 0}
							/>
						)}
						{type === 'boolean' && (
							<div className="flex items-center gap-2">
								<Switch
									name="value"
									defaultChecked={(currentValue as boolean) ?? false}
								/>
								<span className="text-sm">Enabled</span>
							</div>
						)}
						{type === 'date' && (
							<input
								type="date"
								name="value"
								className="rounded border px-3 py-2"
								defaultValue={
									currentValue
										? new Date(currentValue as string)
												.toISOString()
												.slice(0, 10)
										: new Date().toISOString().slice(0, 10)
								}
							/>
						)}
					</div>
					<div className="mt-4 flex justify-end gap-2">
						{existingOverride && (
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									const formData = new FormData()
									formData.append('_action', 'delete')
									formData.append('id', existingOverride.id)
									void fetcher.submit(formData, {
										method: 'post',
										action: '/feature-flags',
									})
								}}
							>
								Remove Override
							</Button>
						)}
						<Button type="submit">
							{existingOverride ? 'Update' : 'Create'} Override
						</Button>
					</div>
				</fetcher.Form>
			</DialogContent>
		</Dialog>
	)
}

function SystemTab({ flags }: { flags: ConfigFlag[] }) {
	const systemFlags = flags.filter((f) => f.level === 'system')

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<FeatureFlagDialog>
					<Button>Add Flag</Button>
				</FeatureFlagDialog>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>System Flags</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Key</TableHead>
								<TableHead>Value</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{systemFlags.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={3}
										className="text-muted-foreground text-center"
									>
										No system flags configured
									</TableCell>
								</TableRow>
							) : (
								systemFlags.map((flag) => (
									<TableRow key={flag.id}>
										<TableCell className="font-mono">{flag.key}</TableCell>
										<TableCell className="font-mono">
											{JSON.stringify(flag.value)}
										</TableCell>
										<TableCell>
											<FeatureFlagDialog flag={flag}>
												<Button variant="outline" size="sm" className="mr-2">
													Edit
												</Button>
											</FeatureFlagDialog>
											<Form method="post" className="inline-block">
												<input type="hidden" name="_action" value="delete" />
												<input type="hidden" name="id" value={flag.id} />
												<Button type="submit" variant="destructive" size="sm">
													Delete
												</Button>
											</Form>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}

function OrganizationTab({ flags }: { flags: ConfigFlag[] }) {
	const [orgId, setOrgId] = useState('')
	const [searchedOrgId, setSearchedOrgId] = useState<string | null>(null)

	const systemFlags = flags.filter((f) => f.level === 'system')
	const orgOverrides = searchedOrgId
		? flags.filter(
				(f) => f.level === 'organization' && f.organizationId === searchedOrgId,
			)
		: []

	const handleSearch = () => {
		if (orgId.trim()) {
			setSearchedOrgId(orgId.trim())
		}
	}

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Search Organization</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2">
						<Input
							placeholder="Enter Organization ID"
							value={orgId}
							onChange={(e) => setOrgId(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
						/>
						<Button onClick={handleSearch}>Search</Button>
					</div>
				</CardContent>
			</Card>

			{searchedOrgId && (
				<Card>
					<CardHeader>
						<CardTitle>Flags for Organization: {searchedOrgId}</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Key</TableHead>
									<TableHead>Effective Value</TableHead>
									<TableHead>Source</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{systemFlags.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={4}
											className="text-muted-foreground text-center"
										>
											No flags configured
										</TableCell>
									</TableRow>
								) : (
									systemFlags.map((systemFlag) => {
										const override = orgOverrides.find(
											(o) => o.key === systemFlag.key,
										)
										const effectiveValue = override?.value ?? systemFlag.value
										const source = override
											? 'Organization Override'
											: 'System Default'

										return (
											<TableRow key={systemFlag.id}>
												<TableCell className="font-mono">
													{systemFlag.key}
												</TableCell>
												<TableCell className="font-mono">
													{JSON.stringify(effectiveValue)}
												</TableCell>
												<TableCell>
													<span
														className={
															override
																? 'text-blue-500'
																: 'text-muted-foreground'
														}
													>
														{source}
													</span>
												</TableCell>
												<TableCell>
													<OverrideDialog
														systemFlag={systemFlag}
														existingOverride={override}
														level="organization"
														organizationId={searchedOrgId}
													>
														<Button variant="outline" size="sm">
															{override ? 'Edit Override' : 'Add Override'}
														</Button>
													</OverrideDialog>
												</TableCell>
											</TableRow>
										)
									})
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	)
}

function UserTab({ flags }: { flags: ConfigFlag[] }) {
	const [userId, setUserId] = useState('')
	const [searchedUserId, setSearchedUserId] = useState<string | null>(null)
	const [orgId, setOrgId] = useState('')
	const [searchedOrgId, setSearchedOrgId] = useState<string | null>(null)

	const systemFlags = flags.filter((f) => f.level === 'system')
	const userOverrides = searchedUserId
		? flags.filter((f) => {
				if (f.level !== 'user' || f.userId !== searchedUserId) return false
				if (searchedOrgId) {
					return f.organizationId === searchedOrgId
				}
				return f.organizationId === null
			})
		: []

	const handleSearch = () => {
		if (userId.trim()) {
			setSearchedUserId(userId.trim())
			setSearchedOrgId(orgId.trim() || null)
		}
	}

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Search User</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-4">
						<div className="flex gap-2">
							<Input
								placeholder="Enter User ID (required)"
								value={userId}
								onChange={(e) => setUserId(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
							/>
						</div>
						<div className="flex gap-2">
							<Input
								placeholder="Enter Organization ID (optional - for per-org overrides)"
								value={orgId}
								onChange={(e) => setOrgId(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
							/>
						</div>
						<Button onClick={handleSearch} className="w-fit">
							Search
						</Button>
					</div>
					<p className="text-muted-foreground mt-2 text-xs">
						Leave Organization ID empty to view/set global user overrides. Enter
						an Organization ID to view/set overrides for that specific
						organization.
					</p>
				</CardContent>
			</Card>

			{searchedUserId && (
				<Card>
					<CardHeader>
						<CardTitle>
							Flags for User: {searchedUserId}
							{searchedOrgId ? ` (Org: ${searchedOrgId})` : ' (Global)'}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Key</TableHead>
									<TableHead>Effective Value</TableHead>
									<TableHead>Source</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{systemFlags.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={4}
											className="text-muted-foreground text-center"
										>
											No flags configured
										</TableCell>
									</TableRow>
								) : (
									systemFlags.map((systemFlag) => {
										const override = userOverrides.find(
											(o) => o.key === systemFlag.key,
										)
										const effectiveValue = override?.value ?? systemFlag.value
										const source = override
											? searchedOrgId
												? 'User+Org Override'
												: 'User Override'
											: 'System Default'

										return (
											<TableRow key={systemFlag.id}>
												<TableCell className="font-mono">
													{systemFlag.key}
												</TableCell>
												<TableCell className="font-mono">
													{JSON.stringify(effectiveValue)}
												</TableCell>
												<TableCell>
													<span
														className={
															override
																? 'text-green-500'
																: 'text-muted-foreground'
														}
													>
														{source}
													</span>
												</TableCell>
												<TableCell>
													<OverrideDialog
														systemFlag={systemFlag}
														existingOverride={override}
														level="user"
														userId={searchedUserId}
														organizationId={searchedOrgId ?? undefined}
													>
														<Button variant="outline" size="sm">
															{override ? 'Edit Override' : 'Add Override'}
														</Button>
													</OverrideDialog>
												</TableCell>
											</TableRow>
										)
									})
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	)
}

export function FeatureFlags() {
	const { flags } = useLoaderData<typeof loader>()

	return (
		<div className="space-y-6">
			<Tabs defaultValue="system" className="w-full">
				<TabsList>
					<TabsTrigger value="system">System</TabsTrigger>
					<TabsTrigger value="organization">Organization</TabsTrigger>
					<TabsTrigger value="user">User</TabsTrigger>
				</TabsList>

				<TabsContent value="system" className="mt-6">
					<SystemTab flags={flags} />
				</TabsContent>

				<TabsContent value="organization" className="mt-6">
					<OrganizationTab flags={flags} />
				</TabsContent>

				<TabsContent value="user" className="mt-6">
					<UserTab flags={flags} />
				</TabsContent>
			</Tabs>
		</div>
	)
}
