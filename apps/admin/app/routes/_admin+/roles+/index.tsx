import { parseWithZod } from '@conform-to/zod'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@repo/ui/dialog'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui/select'
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from '@repo/ui/table'
import { Textarea } from '@repo/ui/textarea'
import { useState } from 'react'
import {
	Form,
	redirect,
	useActionData,
	useNavigation,
	useLoaderData,
} from 'react-router'
import { z } from 'zod'

import { RolesTableRows } from '#app/components/roles/roles-table-rows.tsx'
import { prisma } from '@repo/database'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { type Route } from './+types/index.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

const CreateRoleSchema = z.object({
	intent: z.literal('create-role'),
	type: z.enum(['organization', 'system']),
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional(),
	level: z.coerce.number().min(1).max(10).optional(),
})

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')

	// Get all organization roles with their permission counts
	const organizationRoles = await prisma.organizationRole.findMany({
		include: {
			permissions: {
				where: {
					context: 'organization',
				},
			},
			_count: {
				select: {
					users: true,
				},
			},
		},
		orderBy: {
			level: 'desc',
		},
	})

	// Get system roles with their permission counts
	const systemRoles = await prisma.role.findMany({
		include: {
			permissions: {
				where: {
					context: 'system',
				},
			},
			_count: {
				select: {
					users: true,
				},
			},
		},
		orderBy: {
			name: 'asc',
		},
	})

	return {
		organizationRoles,
		systemRoles,
	}
}

export async function action({ request }: Route.ActionArgs) {
	await requireUserWithRole(request, 'admin')

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'create-role') {
		const submission = parseWithZod(formData, { schema: CreateRoleSchema })

		if (submission.status !== 'success') {
			return { result: submission.reply(), success: false }
		}

		const { type, name, description, level } = submission.value

		try {
			// Check if role already exists
			if (type === 'organization') {
				const existingRole = await prisma.organizationRole.findUnique({
					where: { name },
					select: { id: true, name: true },
				})

				if (existingRole) {
					return {
						result: submission.reply({
							formErrors: [
								`An organization role with the name "${name}" already exists.`,
							],
						}),
						success: false,
					}
				}

				const role = await prisma.organizationRole.create({
					data: {
						name,
						description: description || '',
						level: level || 1,
					},
				})
				return redirect(`/roles/${role.id}`)
			} else {
				const existingRole = await prisma.role.findUnique({
					where: { name },
					select: { id: true, name: true },
				})

				if (existingRole) {
					return {
						result: submission.reply({
							formErrors: [
								`A system role with the name "${name}" already exists.`,
							],
						}),
						success: false,
					}
				}

				const role = await prisma.role.create({
					data: {
						name,
						description: description || '',
					},
				})
				return redirect(`/roles/system/${role.id}`)
			}
		} catch (error: any) {
			console.error('Error creating role:', error)

			// Handle specific Prisma unique constraint errors
			if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
				return {
					result: submission.reply({
						formErrors: [`A role with the name "${name}" already exists.`],
					}),
					success: false,
				}
			}

			return {
				result: submission.reply({
					formErrors: ['Failed to create role. Please try again.'],
				}),
				success: false,
			}
		}
	}

	return { result: null, success: false }
}

function CreateRoleDialog() {
	const [open, setOpen] = useState(false)
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()
	const isSubmitting =
		navigation.formAction === '/roles' && navigation.state === 'submitting'

	// Close dialog on successful submission
	if (actionData?.success && open) {
		setOpen(false)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button>+ New Role</Button>}></DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Create New Role</DialogTitle>
					<DialogDescription>
						Create a new role with custom permissions
					</DialogDescription>
				</DialogHeader>

				<Form method="post" className="space-y-4">
					<input type="hidden" name="intent" value="create-role" />

					{/* Show form errors */}
					{actionData?.result?.error?.formErrors && (
						<div className="text-destructive bg-destructive/10 rounded-md p-3 text-sm">
							{actionData.result.error.formErrors.map((error, index) => (
								<div key={index}>{error}</div>
							))}
						</div>
					)}

					{/* Role Type */}
					<div className="space-y-2">
						<Label htmlFor="type">Role Type</Label>
						<Select
							name="type"
							defaultValue="organization"
							required
							aria-label="Select role type"
						>
							<SelectTrigger>Select role type</SelectTrigger>
							<SelectContent>
								<SelectItem value="organization">Organization Role</SelectItem>
								<SelectItem value="system">System Role</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-muted-foreground text-xs">
							Organization roles apply within specific organizations, while
							system roles are global.
						</p>
					</div>

					{/* Role Name */}
					<div className="space-y-2">
						<Label htmlFor="name">Name *</Label>
						<Input
							id="name"
							name="name"
							placeholder="e.g., editor, moderator, contributor"
							required
							disabled={isSubmitting}
						/>
						<p className="text-muted-foreground text-xs">
							Use lowercase letters, numbers, and hyphens only
						</p>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							name="description"
							placeholder="Describe what this role can do..."
							rows={2}
							disabled={isSubmitting}
						/>
					</div>

					{/* Level (only for organization roles) */}
					<div className="space-y-2">
						<Label htmlFor="level">Level (Organization roles only)</Label>
						<Input
							id="level"
							name="level"
							type="number"
							min="1"
							max="10"
							placeholder="1-10 (higher = more permissions)"
							defaultValue="1"
							disabled={isSubmitting}
						/>
						<p className="text-muted-foreground text-xs">
							Higher level roles can manage lower level roles
						</p>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Creating...' : 'Create Role'}
						</Button>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	)
}

export default function AdminRolesPage() {
	const { organizationRoles, systemRoles } = useLoaderData<typeof loader>()

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Roles</h1>
					<p className="text-muted-foreground mt-2">
						Manage organization and system roles and permissions
					</p>
				</div>
				<CreateRoleDialog />
			</div>

			{/* Organization Roles */}
			<Card>
				<CardHeader>
					<CardTitle>Organization Roles</CardTitle>
					<CardDescription>
						Roles that apply within specific organizations
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Role</TableHead>
								<TableHead>Level</TableHead>
								<TableHead>Users</TableHead>
								<TableHead>Permissions</TableHead>
								<TableHead>Description</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<RolesTableRows
								roles={organizationRoles}
								baseUrl="/roles"
								emptyMessage="No organization roles found"
								emptyColSpan={6}
								showLevel
							/>
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* System Roles */}
			<Card>
				<CardHeader>
					<CardTitle>System Roles</CardTitle>
					<CardDescription>
						Global roles that apply across the entire system
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Role</TableHead>
								<TableHead>Users</TableHead>
								<TableHead>Permissions</TableHead>
								<TableHead>Description</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<RolesTableRows
								roles={systemRoles}
								baseUrl="/roles/system"
								emptyMessage="No system roles found"
								emptyColSpan={5}
							/>
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}
