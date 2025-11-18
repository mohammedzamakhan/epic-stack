import { Button } from '@repo/ui/button'
import { Input } from '@repo/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/select'
import { Card, CardHeader, CardContent, CardTitle } from '@repo/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@repo/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@repo/ui/dialog'
import { Switch } from '@repo/ui/switch'
import { useState } from 'react'
import { useFetcher, useLoaderData } from 'react-router'
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
	children,
}: {
	flag?: ConfigFlag
	children: React.ReactNode
}) {
	const fetcher = useFetcher()
	const [level, setLevel] = useState(flag?.level ?? 'system')
	const [type, setType] = useState(
		typeof flag?.value === 'number'
			? 'number'
			: typeof flag?.value === 'boolean'
				? 'boolean'
				: 'string',
	)

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{flag ? 'Edit Flag' : 'Add Flag'}</DialogTitle>
					<DialogDescription>
						{flag
							? 'Edit the details of the feature flag.'
							: 'Create a new feature flag.'}
					</DialogDescription>
				</DialogHeader>
				<fetcher.Form method="post" action="/feature-flags">
					<input
						type="hidden"
						name="_action"
						value={flag ? 'update' : 'create'}
					/>
					{flag && <input type="hidden" name="id" value={flag.id} />}
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Input
							name="key"
							placeholder="Flag Key"
							required
							defaultValue={flag?.key}
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

						<Select
							name="level"
							required
							defaultValue={flag?.level}
							onValueChange={(value) =>
								setLevel(value as 'system' | 'organization' | 'user')
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Level" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="system">System</SelectItem>
								<SelectItem value="organization">Organization</SelectItem>
								<SelectItem value="user">User</SelectItem>
							</SelectContent>
						</Select>
						{level === 'organization' && (
							<Input
								name="organizationId"
								placeholder="Organization ID"
								required
								defaultValue={flag?.organizationId ?? ''}
							/>
						)}
						{level === 'user' && (
							<Input
								name="userId"
								placeholder="User ID"
								required
								defaultValue={flag?.userId ?? ''}
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

export function FeatureFlags() {
	const { flags } = useLoaderData<typeof loader>()
	const fetcher = useFetcher()

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
					<p className="text-muted-foreground">
						Manage feature flags for the entire system, specific organizations,
						or individual users.
					</p>
				</div>
				<FeatureFlagDialog>
					<Button>Add Flag</Button>
				</FeatureFlagDialog>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Existing Flags</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Key</TableHead>
								<TableHead>Value</TableHead>
								<TableHead>Level</TableHead>
								<TableHead>Organization ID</TableHead>
								<TableHead>User ID</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{flags.map((flag) => (
								<TableRow key={flag.id}>
									<TableCell>{flag.key}</TableCell>
									<TableCell>{JSON.stringify(flag.value)}</TableCell>
									<TableCell>{flag.level}</TableCell>
									<TableCell>{flag.organizationId}</TableCell>
									<TableCell>{flag.userId}</TableCell>
									<TableCell>
										<FeatureFlagDialog flag={flag}>
											<Button variant="outline" className="mr-2">
												Edit
											</Button>
										</FeatureFlagDialog>
										<fetcher.Form
											method="post"
											action="/feature-flags"
											className="inline-block"
										>
											<input type="hidden" name="_action" value="delete" />
											<input type="hidden" name="id" value={flag.id} />
											<Button type="submit" variant="destructive">
												Delete
											</Button>
										</fetcher.Form>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}
