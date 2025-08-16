import { invariantResponse } from '@epic-web/invariant'
import { useEffect, useState } from 'react'
import { Form, useActionData, useLoaderData, useSubmit, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import {
	AnnotatedLayout,
	AnnotatedSection,
} from '#app/components/ui/annotated-layout'
import { Button } from '#app/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card'
import { Checkbox } from '#app/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '#app/components/ui/dialog'
import { Icon } from '#app/components/ui/icon'
import { Input } from '#app/components/ui/input'
import { Label } from '#app/components/ui/label'
import { PageTitle } from '#app/components/ui/page-title'
import { Textarea } from '#app/components/ui/textarea'
import { generateApiKey } from '#app/utils/api-key.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { orgSlug } = params
	invariantResponse(orgSlug, 'Organization slug is required')

	const organization = await prisma.organization.findFirst({
		select: {
			id: true,
			name: true,
			slug: true,
		},
		where: { slug: orgSlug },
	})

	invariantResponse(organization, 'Organization not found', { status: 404 })

	// Check if the user has access to this organization
	const userId = await requireUserId(request)
	await userHasOrgAccess(request, organization.id)

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, name: true, username: true },
	})
	invariantResponse(user, 'User not found')

	// Get existing API keys for this user and organization
	const apiKeys = await prisma.apiKey.findMany({
		where: {
			userId: user.id,
			organizationId: organization.id,
		},
		orderBy: { createdAt: 'desc' },
	})

	return { user, organization, apiKeys, orgSlug }
}

export async function action({ request, params }: ActionFunctionArgs) {
	const { orgSlug } = params
	invariantResponse(orgSlug, 'Organization slug is required')

	const organization = await prisma.organization.findFirst({
		select: { id: true, name: true, slug: true },
		where: { slug: orgSlug },
	})

	invariantResponse(organization, 'Organization not found', { status: 404 })

	// Check if the user has access to this organization
	const userId = await requireUserId(request)
	await userHasOrgAccess(request, organization.id)

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, name: true, username: true },
	})
	invariantResponse(user, 'User not found')

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'create') {
		const name = formData.get('name')
		invariantResponse(
			typeof name === 'string' && name.length > 0,
			'Name is required',
		)

		const key = generateApiKey()
		const expiresAt = formData.get('expiresAt')

		const createdKey = await prisma.apiKey.create({
			data: {
				key,
				name,
				userId: user.id,
				organizationId: organization.id,
				expiresAt:
					expiresAt && typeof expiresAt === 'string'
						? new Date(expiresAt)
						: null,
			},
		})

		return {
			success: true,
			message: 'API key created successfully',
			newApiKey: createdKey,
		}
	}

	if (intent === 'delete') {
		const keyId = formData.get('keyId')
		invariantResponse(typeof keyId === 'string', 'Key ID is required')

		await prisma.apiKey.delete({
			where: {
				id: keyId,
				userId: user.id, // Ensure user can only delete their own keys
			},
		})

		return { success: true, message: 'API key deleted successfully' }
	}

	return { success: false, message: 'Invalid action' }
}

// Copy to clipboard utility
function copyToClipboard(text: string) {
	if (navigator.clipboard) {
		void navigator.clipboard.writeText(text)
	} else {
		// Fallback for older browsers
		const textArea = document.createElement('textarea')
		textArea.value = text
		document.body.appendChild(textArea)
		textArea.select()
		document.execCommand('copy')
		document.body.removeChild(textArea)
	}
}

// Code block with copy button component
function CodeBlock({
	code,
}: {
	code: string
}) {
	const [copied, setCopied] = useState(false)

	const handleCopy = () => {
		copyToClipboard(code)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="relative">
			<div className="overflow-x-auto rounded bg-muted p-4 font-mono text-sm">
				<pre>{code}</pre>
			</div>
			<Button
				variant="outline"
				size="sm"
				className="absolute top-2 right-2 h-8 p-0"
				onClick={handleCopy}
			>
				<Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" />
				{copied ? 'Copied!' : 'Copy'}
			</Button>
		</div>
	)
}

// Create API Key Modal Component
function CreateApiKeyModal({
	isOpen,
	onClose,
	organization,
}: {
	isOpen: boolean
	onClose: () => void
	organization: { name: string }
}) {
	const [name, setName] = useState('')
	const [hasExpiration, setHasExpiration] = useState(false)
	const [expirationDate, setExpirationDate] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const submit = useSubmit()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!name.trim()) {
			return
		}

		setIsSubmitting(true)

		const formData = new FormData()
		formData.append('intent', 'create')
		formData.append('name', name.trim())

		if (hasExpiration && expirationDate) {
			formData.append('expiresAt', expirationDate)
		}

		void submit(formData, { method: 'POST' })
		handleClose()
	}

	const handleClose = () => {
		if (!isSubmitting) {
			setName('')
			setHasExpiration(false)
			setExpirationDate('')
			onClose()
		}
	}

	// Set minimum date to tomorrow
	const tomorrow = new Date()
	tomorrow.setDate(tomorrow.getDate() + 1)
	const minDate = tomorrow.toISOString().split('T')[0]

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Icon name="key" className="h-5 w-5" />
						Create API Key
					</DialogTitle>
					<DialogDescription>
						Create a new API key to connect your AI assistants to{' '}
						{organization.name} data.
					</DialogDescription>
				</DialogHeader>

				<Form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="api-key-name">
							Key Name <span className="text-destructive">*</span>
						</Label>
						<Input
							id="api-key-name"
							placeholder="e.g., Claude Desktop, Kiro IDE"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							disabled={isSubmitting}
						/>
					</div>

					<div className="space-y-3">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="has-expiration"
								checked={hasExpiration}
								onCheckedChange={(checked) => {
									setHasExpiration(checked === true)
									if (!checked) {
										setExpirationDate('')
									}
								}}
								disabled={isSubmitting}
							/>
							<Label htmlFor="has-expiration" className="text-sm">
								Set expiration date (optional)
							</Label>
						</div>

						{hasExpiration && (
							<div className="space-y-2">
								<Label
									htmlFor="expiration-date"
									className="flex items-center gap-2"
								>
									<Icon name="calendar" className="h-4 w-4" />
									Expiration Date
								</Label>
								<Input
									id="expiration-date"
									type="date"
									value={expirationDate}
									onChange={(e) => setExpirationDate(e.target.value)}
									min={minDate}
									disabled={isSubmitting}
								/>
								<p className="text-muted-foreground text-xs">
									The API key will expire on this date. Leave unchecked for no
									expiration.
								</p>
							</div>
						)}
					</div>

					<DialogFooter className="gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={!name.trim() || isSubmitting}
							className="gap-2"
						>
							{isSubmitting ? (
								<>
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
									Creating...
								</>
							) : (
								<>
									<Icon name="key" className="h-4 w-4" />
									Create API Key
								</>
							)}
						</Button>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	)
}

// New API Key Display Modal
function NewApiKeyModal({
	isOpen,
	onClose,
	apiKey,
}: {
	isOpen: boolean
	onClose: () => void
	apiKey: { key: string; name: string } | null
}) {
	const [copied, setCopied] = useState(false)

	const handleCopy = () => {
		if (apiKey) {
			copyToClipboard(apiKey.key)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Icon name="check-circle" className="h-5 w-5 text-green-600" />
						API Key Created
					</DialogTitle>
					<DialogDescription>
						Your API key has been created successfully. Copy it now - you won't
						be able to see it again.
					</DialogDescription>
				</DialogHeader>

				{apiKey && (
					<div className="space-y-6">
						<div className="space-y-2">
							<Label className="text-sm font-medium">Key Name</Label>
							<div className="bg-muted rounded-md p-3 font-medium">
								{apiKey.name}
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-sm font-medium">API Key</Label>
							<div className="relative">
								<div className="bg-muted rounded-md border p-3 font-mono text-sm break-all">
									{apiKey.key}
								</div>
								<Button
									variant="outline"
									size="sm"
									className="absolute top-2 right-2 h-8 px-3"
									onClick={handleCopy}
								>
									<Icon
										name={copied ? 'check' : 'copy'}
										className="mr-1 h-4 w-4"
									/>
									{copied ? 'Copied!' : 'Copy'}
								</Button>
							</div>
						</div>

						<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
							<div className="flex items-start gap-3">
								<Icon
									name="alert-triangle"
									className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600"
								/>
								<div className="text-sm text-yellow-800">
									<div className="mb-1 font-semibold">Important:</div>
									<div>
										This is the only time you'll see this API key. Make sure to
										copy it and store it securely.
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				<DialogFooter className="mt-6">
					<Button onClick={onClose} className="w-full" size="lg">
						I've Copied the Key
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

// API Keys Management Card Component
function ApiKeysCard({
	organization,
	apiKeys,
	actionData,
	onCreateClick,
}: {
	organization: { name: string }
	apiKeys: any[]
	actionData: any
	onCreateClick: () => void
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Icon name="key" className="h-5 w-5" />
					API Keys
				</CardTitle>
				<CardDescription>
					Create and manage API keys to authenticate your MCP clients
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{actionData?.message && !actionData?.newApiKey && (
					<div
						className={`rounded p-3 ${actionData.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
					>
						{actionData.message}
					</div>
				)}

				{/* Existing API keys */}
				<div className="space-y-3">
					{apiKeys.map((apiKey: any) => (
						<div
							key={apiKey.id}
							className="flex justify-between rounded-lg border p-4"
						>
							<div className="flex-1">
								<div className="font-medium">{apiKey.name}</div>
								<div className="text-muted-foreground text-sm">
									Created {new Date(apiKey.createdAt).toLocaleDateString()}
									{apiKey.expiresAt && (
										<span className="ml-2">
											• Expires{' '}
											{new Date(apiKey.expiresAt).toLocaleDateString()}
										</span>
									)}
								</div>
								<div className="bg-muted mt-2 flex items-center gap-2 rounded p-2 font-mono text-xs">
									<span>
										{apiKey.key.substring(0, 8)}...
										{apiKey.key.substring(apiKey.key.length - 4)}
									</span>
								</div>
							</div>
							<Form method="post">
								<input type="hidden" name="intent" value="delete" />
								<input type="hidden" name="keyId" value={apiKey.id} />
								<Button variant="secondary" size="sm" type="submit">
									<Icon name="trash-2" className="h-4 w-4" />
								</Button>
							</Form>
						</div>
					))}
					{apiKeys.length === 0 && (
						<div className="text-muted-foreground py-8 text-center">
							<Icon name="key" className="mx-auto mb-4 h-12 w-12 opacity-50" />
							<p>No API keys created yet</p>
							<p className="text-sm">
								Create your first API key to get started
							</p>
						</div>
					)}
				</div>
			</CardContent>
			<CardFooter className="border-t pt-4">
				<Button onClick={onCreateClick} className="gap-2">
					<Icon name="plus" className="h-4 w-4" />
					Create API Key
				</Button>
			</CardFooter>
		</Card>
	)
}

// Setup Instructions Card Component
function SetupInstructionsCard({
	organization,
	serverUrl,
}: {
	organization: { name: string }
	serverUrl: string
}) {
	const claudeConfig = JSON.stringify(
		{
			mcpServers: {
				[`epic-notes-${organization.name.toLowerCase().replace(/\s+/g, '-')}`]:
					{
						command: 'npx',
						args: [
							'epic-notes-mcp',
							`YOUR_API_KEY_HERE`,
						],
						env: {},
					},
			},
		},
		null,
		2,
	)

	const kiroConfig = JSON.stringify(
		{
			mcpServers: {
				[`epic-notes-${organization.name.toLowerCase().replace(/\s+/g, '-')}`]:
					{
						command: 'npx',
						args: [
							'epic-notes-mcp',
							`YOUR_API_KEY_HERE`,
						],
						disabled: false,
						autoApprove: ['find_user', 'get_user_notes'],
					},
			},
		},
		null,
		2,
	)

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Icon name="settings" className="h-5 w-5" />
					Client Configuration
				</CardTitle>
				<CardDescription>
					Configuration examples for popular MCP clients
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Claude Desktop */}
				<div>
					<h3 className="mb-2 flex items-center gap-2 font-semibold">
						<Icon name="bot" className="h-4 w-4" />
						Claude Desktop
					</h3>
					<p className="text-muted-foreground mb-3 text-sm">
						Add this configuration to your Claude Desktop settings:
					</p>
					<CodeBlock code={claudeConfig} />
					<p className="text-muted-foreground mt-2 text-xs">
						Replace YOUR_API_KEY_HERE with one of your API keys above
					</p>
				</div>

				{/* Kiro IDE */}
				<div>
					<h3 className="mb-2 flex items-center gap-2 font-semibold">
						<Icon name="bot" className="h-4 w-4" />
						Kiro IDE
					</h3>
					<p className="text-muted-foreground mb-3 text-sm">
						Add this to your .kiro/settings/mcp.json file:
					</p>
					<CodeBlock code={kiroConfig} />
				</div>
			</CardContent>
		</Card>
	)
}

// Available Tools Card Component
function AvailableToolsCard({
	organization,
}: {
	organization: { name: string }
}) {
	const tools = [
		{
			name: 'find_user',
			icon: 'search',
			description: `Search for users in ${organization.name} by name or username`,
			example: 'find_user("john")',
		},
		{
			name: 'get_user_notes',
			icon: 'file-text',
			description: 'Get notes for a specific user (up to 10 most recent)',
			example: 'get_user_notes("username")',
		},
	]

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Icon name="pocket-knife" className="h-5 w-5" />
					Available Tools
				</CardTitle>
				<CardDescription>
					Tools available through your MCP server connection
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{tools.map((tool) => (
						<div key={tool.name} className="rounded-lg border p-4">
							<div className="flex items-start gap-3">
								<Icon
									name={tool.icon as any}
									className="text-primary h-5 w-5 self-auto"
								/>
								<div className="flex-1">
									<div className="font-mono text-sm font-medium">
										{tool.name}
									</div>
									<div className="text-muted-foreground mt-1 text-sm">
										{tool.description}
									</div>
									<div className="bg-muted mt-2 rounded p-2 font-mono text-xs">
										{tool.example}
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}

export default function McpPage() {
	const { organization, apiKeys } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
	const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false)
	const [newApiKey, setNewApiKey] = useState<{
		key: string
		name: string
	} | null>(null)

	const serverUrl =
		typeof window !== 'undefined'
			? `${window.location.protocol}//${window.location.host}/mcp`
			: 'https://yourdomain.com/mcp'

	// Handle successful API key creation
	useEffect(() => {
		if (actionData?.success && actionData?.newApiKey) {
			setNewApiKey(actionData.newApiKey)
			setIsNewKeyModalOpen(true)
		}
	}, [actionData])

	return (
		<div className="p-8">
			<div className="mb-8">
				<PageTitle
					title="MCP Server"
					description={`Connect your AI assistants to ${organization.name} data using the Model Context Protocol`}
				/>
			</div>

			<AnnotatedLayout>
				<AnnotatedSection
					title="API Key Management"
					description="Create and manage API keys to authenticate your MCP clients. Each key can have an optional expiration date."
				>
					<ApiKeysCard
						organization={organization}
						apiKeys={apiKeys}
						actionData={actionData}
						onCreateClick={() => setIsCreateModalOpen(true)}
					/>
				</AnnotatedSection>

				<AnnotatedSection
					title="Client Setup"
					description="Configuration examples for connecting popular AI assistants to your MCP server."
				>
					<SetupInstructionsCard
						organization={organization}
						serverUrl={serverUrl}
					/>
				</AnnotatedSection>

				<AnnotatedSection
					title="Available Tools"
					description="Tools and capabilities available through your MCP server connection."
				>
					<AvailableToolsCard organization={organization} />
				</AnnotatedSection>
			</AnnotatedLayout>

			{/* Modals */}
			<CreateApiKeyModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				organization={organization}
			/>

			<NewApiKeyModal
				isOpen={isNewKeyModalOpen}
				onClose={() => {
					setIsNewKeyModalOpen(false)
					setNewApiKey(null)
				}}
				apiKey={newApiKey}
			/>
		</div>
	)
}
