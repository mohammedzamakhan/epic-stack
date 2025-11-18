import { invariantResponse } from '@epic-web/invariant'
import { useEffect, useState } from 'react'
import {
	Form,
	useActionData,
	useLoaderData,
	useSubmit,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from 'react-router'
import { AnnotatedLayout, AnnotatedSection } from '@repo/ui/annotated-layout'
import { Button } from '@repo/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardHeaderContent, CardTitle } from '@repo/ui/card'
import { Checkbox } from '@repo/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@repo/ui/dialog'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import { PageTitle } from '@repo/ui/page-title'
import { Textarea } from '@repo/ui/textarea'
import { Icon } from '@repo/ui/icon'
import { FieldLabel, FieldGroup, FieldDescription } from '@repo/ui/field'
import { Trans } from '@lingui/macro'
import { generateApiKey } from '#app/utils/api-key.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'
import { EmptyState } from '#app/components/empty-state.tsx'
import { cn } from '#app/utils/misc.tsx'

// Define ApiKey type based on Prisma query result
type ApiKeyData = {
	id: string
	key: string
	name: string
	createdAt: Date
	expiresAt: Date | null
}

/**
 * Helper function to validate organization access and get user data.
 * Reduces code duplication between loader and action functions.
 */
async function getOrgAndUser(request: Request, orgSlug: string) {
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

	return { organization, user }
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { orgSlug } = params
	const { organization, user } = await getOrgAndUser(request, orgSlug!)

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
	const { organization, user } = await getOrgAndUser(request, orgSlug!)

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
function CodeBlock({ code }: { code: string }) {
	const [copied, setCopied] = useState(false)

	const handleCopy = () => {
		copyToClipboard(code)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="relative">
			<div className="bg-muted overflow-x-auto rounded p-4 font-mono text-sm">
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
						<Trans>Create API Key</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>
							Create a new API key to connect your AI assistants to{' '}
							{organization.name} data.
						</Trans>
					</DialogDescription>
				</DialogHeader>

				<Form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<FieldGroup>
							<FieldLabel htmlFor="api-key-name">
								<Trans>Key Name</Trans>
							</FieldLabel>
							<Input
								id="api-key-name"
								placeholder="e.g., Claude Desktop, Kiro IDE"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								disabled={isSubmitting}
							/>
						</FieldGroup>
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
							<FieldLabel htmlFor="has-expiration" className="text-sm">
								<Trans>Set expiration date (optional)</Trans>
							</FieldLabel>
						</div>

						{hasExpiration && (
							<FieldGroup>
								<FieldLabel
									htmlFor="expiration-date"
									className="flex items-center gap-2"
								>
									<Icon name="calendar" className="h-4 w-4" />
									<Trans>Expiration Date</Trans>
								</FieldLabel>
								<Input
									id="expiration-date"
									type="date"
									value={expirationDate}
									onChange={(e) => setExpirationDate(e.target.value)}
									min={minDate}
									disabled={isSubmitting}
								/>
								<FieldDescription>
									<Trans>
										The API key will expire on this date. Leave unchecked for no
										expiration.
									</Trans>
								</FieldDescription>
							</FieldGroup>
						)}
					</div>

					<DialogFooter className="gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isSubmitting}
						>
							<Trans>Cancel</Trans>
						</Button>
						<Button
							type="submit"
							disabled={!name.trim() || isSubmitting}
							className="gap-2"
						>
							{isSubmitting ? (
								<>
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
									<Trans>Creating...</Trans>
								</>
							) : (
								<>
									<Icon name="key" className="h-4 w-4" />
									<Trans>Create API Key</Trans>
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
						<Trans>API Key Created</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>
							Your API key has been created successfully. Copy it now - you won't
							be able to see it again.
						</Trans>
					</DialogDescription>
				</DialogHeader>

				{apiKey && (
					<div className="space-y-6">
						<div className="space-y-2">
							<Label className="text-sm font-medium">
								<Trans>Key Name</Trans>
							</Label>
							<div className="bg-muted rounded-md p-3 font-medium">
								{apiKey.name}
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-sm font-medium">
								<Trans>API Key</Trans>
							</Label>
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
									{copied ? <Trans>Copied!</Trans> : <Trans>Copy</Trans>}
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
									<div className="mb-1 font-semibold">
										<Trans>Important:</Trans>
									</div>
									<div>
										<Trans>
											This is the only time you'll see this API key. Make sure to
											copy it and store it securely.
										</Trans>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				<DialogFooter className="mt-6">
					<Button onClick={onClose} className="w-full" size="lg">
						<Trans>I've Copied the Key</Trans>
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
	apiKeys: ApiKeyData[]
	actionData: { success?: boolean; message?: string; newApiKey?: ApiKeyData } | undefined
	onCreateClick: () => void
}) {
	return (
		<Card>
			<CardHeader className="grid grid-cols-[1fr_auto] items-start">
				<CardHeaderContent>
					<CardTitle className="flex items-center gap-2">
						<Icon name="key" className="h-5 w-5" />
						<Trans>API Keys</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>Create and manage API keys to authenticate your MCP clients</Trans>
					</CardDescription>
				</CardHeaderContent>
				<CardAction>
					<Button onClick={onCreateClick} className="gap-2">
						<Icon name="plus" className="h-4 w-4" />
						<Trans>Create API Key</Trans>
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent
				className={cn(
					apiKeys.length === 0 && 'border-0 p-0 shadow-none ring-0',
					'space-y-4',
				)}
			>
				{/* Existing API keys */}
				<div className="space-y-3">
					{apiKeys.map((apiKey) => (
						<div
							key={apiKey.id}
							className="flex items-center justify-between rounded-lg border p-4"
						>
							<div className="flex flex-1 items-center justify-between">
								<div>
									<div className="font-medium">{apiKey.name}</div>
									<div className="text-muted-foreground text-sm">
										<Trans>
											Created {new Date(apiKey.createdAt).toLocaleDateString()}
										</Trans>
										{apiKey.expiresAt && (
											<span className="ml-2">
												• <Trans>
													Expires{' '}
													{new Date(apiKey.expiresAt).toLocaleDateString()}
												</Trans>
											</span>
										)}
									</div>
								</div>
								<div className="bg-muted mr-2 flex h-8 items-center gap-2 rounded p-4 py-0 font-mono text-xs">
									<span>
										{apiKey.key.substring(0, 8)}...
										{apiKey.key.substring(apiKey.key.length - 8)}
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
						<EmptyState
							title={<Trans>No API keys created yet</Trans>}
							description={<Trans>Create your first API key to get started</Trans>}
							icons={['key']}
							className="-m-1 w-[calc(100%+12px)]"
						/>
					)}
				</div>
			</CardContent>
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
						args: ['epic-notes-mcp', `YOUR_API_KEY_HERE`],
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
						args: ['epic-notes-mcp', `YOUR_API_KEY_HERE`],
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
					<Trans>Client Configuration</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>Configuration examples for popular MCP clients</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Claude Desktop */}
				<div>
					<h3 className="mb-2 flex items-center gap-2 font-semibold">
						<Icon name="bot" className="h-4 w-4" />
						<Trans>Claude Desktop</Trans>
					</h3>
					<p className="text-muted-foreground mb-3 text-sm">
						<Trans>Add this configuration to your Claude Desktop settings:</Trans>
					</p>
					<CodeBlock code={claudeConfig} />
					<p className="text-muted-foreground mt-2 text-xs">
						<Trans>Replace YOUR_API_KEY_HERE with one of your API keys above</Trans>
					</p>
				</div>

				{/* Kiro IDE */}
				<div>
					<h3 className="mb-2 flex items-center gap-2 font-semibold">
						<Icon name="bot" className="h-4 w-4" />
						<Trans>Kiro IDE</Trans>
					</h3>
					<p className="text-muted-foreground mb-3 text-sm">
						<Trans>Add this to your .kiro/settings/mcp.json file:</Trans>
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
					<Trans>Available Tools</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>Tools available through your MCP server connection</Trans>
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
		<div className="py-8 md:p-8">
			<div className="mb-8">
				<PageTitle
					title={<Trans>MCP Server</Trans>}
					description={
						<Trans>
							Connect your AI assistants to {organization.name} data using the
							Model Context Protocol
						</Trans>
					}
				/>
			</div>

			<AnnotatedLayout>
				<AnnotatedSection>
					<ApiKeysCard
						organization={organization}
						apiKeys={apiKeys}
						actionData={actionData}
						onCreateClick={() => setIsCreateModalOpen(true)}
					/>
				</AnnotatedSection>

				<AnnotatedSection>
					<SetupInstructionsCard
						organization={organization}
						serverUrl={serverUrl}
					/>
				</AnnotatedSection>

				<AnnotatedSection>
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
