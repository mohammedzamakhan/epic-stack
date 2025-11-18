// import { getFormProps, getInputProps, useForm } from '@conform-to/react'
// import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Form, useActionData, useLoaderData } from 'react-router'
import { z } from 'zod'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import { Textarea } from '@repo/ui/textarea'
// import { Field, ErrorList, CheckboxField } from './forms.tsx'

const SSOConfigurationSchema = z.object({
	providerName: z.string().min(1, 'Provider name is required'),
	issuerUrl: z.string().url('Must be a valid URL'),
	clientId: z.string().min(1, 'Client ID is required'),
	clientSecret: z.string().min(1, 'Client secret is required'),
	scopes: z.string().default('openid email profile'),
	// Transform checkbox values to booleans
	autoDiscovery: z
		.union([z.literal('on'), z.literal('off'), z.boolean()])
		.transform((val) => val === 'on' || val === true)
		.default(true),
	pkceEnabled: z
		.union([z.literal('on'), z.literal('off'), z.boolean()])
		.transform((val) => val === 'on' || val === true)
		.default(true),
	autoProvision: z
		.union([z.literal('on'), z.literal('off'), z.boolean()])
		.transform((val) => val === 'on' || val === true)
		.default(true),
	defaultRole: z.string().default('member'),
	attributeMapping: z.string().optional(),
	// Manual endpoint configuration (when autoDiscovery is false)
	authorizationUrl: z.string().url().optional(),
	tokenUrl: z.string().url().optional(),
	userinfoUrl: z.string().url().optional(),
	revocationUrl: z.string().url().optional(),
})

export type SSOConfigurationFormData = z.infer<typeof SSOConfigurationSchema>

interface SSOConfigurationFormProps {
	organizationId: string
	existingConfig?: {
		id: string
		providerName: string
		issuerUrl: string
		clientId: string
		clientSecret: string
		scopes: string
		autoDiscovery: boolean
		pkceEnabled: boolean
		autoProvision: boolean
		defaultRole: string
		attributeMapping: string | null
		authorizationUrl: string | null
		tokenUrl: string | null
		userinfoUrl: string | null
		revocationUrl: string | null
		isEnabled: boolean
		lastTested: Date | null
	} | null
	isSubmitting?: boolean
	testConnectionResult?: {
		success: boolean
		message: string
		discoveredEndpoints?: {
			authorization_endpoint: string
			token_endpoint: string
			userinfo_endpoint?: string
			revocation_endpoint?: string
		}
	} | null
}

export function SSOConfigurationForm({
	organizationId,
	existingConfig,
	isSubmitting = false,
	testConnectionResult,
}: SSOConfigurationFormProps) {
	const actionData = useActionData<{
		result?: any
		errors?: any
	}>()

	// Simplified form without Conform for debugging

	const autoDiscoveryEnabled = existingConfig?.autoDiscovery ?? true

	return (
		<div className="space-y-6">
			{/* Connection Test Result */}
			{testConnectionResult && (
				<div
					className={`flex items-center gap-2 rounded-lg border p-4 ${
						testConnectionResult.success
							? 'border-green-200 bg-green-50 text-green-800'
							: 'border-red-200 bg-red-50 text-red-800'
					}`}
				>
					<Icon
						name={
							testConnectionResult.success ? 'check-circle' : 'alert-triangle'
						}
						className="h-4 w-4"
					/>
					<span>{testConnectionResult.message}</span>
				</div>
			)}

			<Form
				method="post"
				className="space-y-6"
				onSubmit={(e) => {
					console.log('Form submitting...')
					const formData = new FormData(e.currentTarget)
					console.log('Form data being submitted:')
					for (const [key, value] of formData.entries()) {
						console.log(`  ${key}: ${value}`)
					}
				}}
			>
				<input type="hidden" name="organizationId" value={organizationId} />
				{existingConfig && (
					<input type="hidden" name="configId" value={existingConfig.id} />
				)}

				{/* Basic Configuration */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon name="settings" className="h-5 w-5" />
							Identity Provider Configuration
						</CardTitle>
						<CardDescription>
							Configure your organization's identity provider settings
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="providerName">Provider Name</Label>
							<Input
								id="providerName"
								name="providerName"
								type="text"
								placeholder="e.g., Okta, Azure AD, Auth0"
								defaultValue={existingConfig?.providerName || ''}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="issuerUrl">Issuer URL</Label>
							<Input
								id="issuerUrl"
								name="issuerUrl"
								type="url"
								placeholder="https://your-domain.okta.com"
								defaultValue={existingConfig?.issuerUrl || ''}
								required
							/>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="clientId">Client ID</Label>
								<Input
									id="clientId"
									name="clientId"
									type="text"
									placeholder="OAuth2 Client ID"
									defaultValue={existingConfig?.clientId || ''}
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="clientSecret">Client Secret</Label>
								<Input
									id="clientSecret"
									name="clientSecret"
									type="password"
									placeholder="OAuth2 Client Secret"
									defaultValue={existingConfig?.clientSecret || ''}
									required
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="scopes">Scopes</Label>
							<Input
								id="scopes"
								name="scopes"
								type="text"
								placeholder="openid email profile"
								defaultValue={existingConfig?.scopes || 'openid email profile'}
							/>
						</div>
					</CardContent>
				</Card>

				{/* OAuth2 Configuration */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon name="link-2" className="h-5 w-5" />
							OAuth2 Configuration
						</CardTitle>
						<CardDescription>
							Configure OAuth2 endpoints and security settings
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center space-x-2">
							<input
								type="checkbox"
								id="autoDiscovery"
								name="autoDiscovery"
								defaultChecked={existingConfig?.autoDiscovery ?? true}
								className="rounded border-gray-300"
							/>
							<div className="space-y-0.5">
								<Label htmlFor="autoDiscovery">Auto-Discovery</Label>
								<p className="text-muted-foreground text-sm">
									Automatically discover OAuth2 endpoints from the issuer URL
								</p>
							</div>
						</div>

						{!autoDiscoveryEnabled && (
							<div className="space-y-4 rounded-lg border p-4">
								<h4 className="font-medium">Manual Endpoint Configuration</h4>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="authorizationUrl">Authorization URL</Label>
										<Input
											id="authorizationUrl"
											name="authorizationUrl"
											type="url"
											placeholder="https://your-domain.okta.com/oauth2/v1/authorize"
											defaultValue={existingConfig?.authorizationUrl || ''}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="tokenUrl">Token URL</Label>
										<Input
											id="tokenUrl"
											name="tokenUrl"
											type="url"
											placeholder="https://your-domain.okta.com/oauth2/v1/token"
											defaultValue={existingConfig?.tokenUrl || ''}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="userinfoUrl">UserInfo URL</Label>
										<Input
											id="userinfoUrl"
											name="userinfoUrl"
											type="url"
											placeholder="https://your-domain.okta.com/oauth2/v1/userinfo"
											defaultValue={existingConfig?.userinfoUrl || ''}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="revocationUrl">
											Revocation URL (Optional)
										</Label>
										<Input
											id="revocationUrl"
											name="revocationUrl"
											type="url"
											placeholder="https://your-domain.okta.com/oauth2/v1/revoke"
											defaultValue={existingConfig?.revocationUrl || ''}
										/>
									</div>
								</div>
							</div>
						)}

						<div className="flex items-center space-x-2">
							<input
								type="checkbox"
								id="pkceEnabled"
								name="pkceEnabled"
								defaultChecked={existingConfig?.pkceEnabled ?? true}
								className="rounded border-gray-300"
							/>
							<div className="space-y-0.5">
								<Label htmlFor="pkceEnabled">PKCE Enabled</Label>
								<p className="text-muted-foreground text-sm">
									Use Proof Key for Code Exchange for enhanced security
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* User Provisioning */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon name="user-plus" className="h-5 w-5" />
							User Provisioning
						</CardTitle>
						<CardDescription>
							Configure how users are created and managed through SSO
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center space-x-2">
							<input
								type="checkbox"
								id="autoProvision"
								name="autoProvision"
								defaultChecked={existingConfig?.autoProvision ?? true}
								className="rounded border-gray-300"
							/>
							<div className="space-y-0.5">
								<Label htmlFor="autoProvision">Auto-Provision Users</Label>
								<p className="text-muted-foreground text-sm">
									Automatically create user accounts for new SSO users
								</p>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="defaultRole">Default Role</Label>
							<Input
								id="defaultRole"
								name="defaultRole"
								type="text"
								placeholder="member"
								defaultValue={existingConfig?.defaultRole || 'member'}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="attributeMapping">Attribute Mapping (JSON)</Label>
							<Textarea
								id="attributeMapping"
								name="attributeMapping"
								placeholder={`{
  "email": "email",
  "name": "name",
  "firstName": "given_name",
  "lastName": "family_name",
  "department": "department"
}`}
								rows={6}
								className="font-mono text-sm"
								defaultValue={existingConfig?.attributeMapping || ''}
							/>
							<p className="text-muted-foreground text-sm">
								Map OIDC claims to user attributes. Leave empty for default
								mapping.
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Actions */}
				<div className="flex items-center justify-between">
					<div className="flex gap-2">
						<Button
							type="submit"
							name="intent"
							value="save"
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<>
									<Icon name="loader" className="mr-2 h-4 w-4 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Icon name="check" className="mr-2 h-4 w-4" />
									{existingConfig
										? 'Update Configuration'
										: 'Save Configuration'}
								</>
							)}
						</Button>

						<Button
							type="submit"
							name="intent"
							value="test"
							variant="outline"
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<>
									<Icon name="loader" className="mr-2 h-4 w-4 animate-spin" />
									Testing...
								</>
							) : (
								<>
									<Icon name="plug" className="mr-2 h-4 w-4" />
									Test Connection
								</>
							)}
						</Button>
					</div>

					{existingConfig && (
						<Button
							type="submit"
							name="intent"
							value={existingConfig.isEnabled ? 'disable' : 'enable'}
							variant={existingConfig.isEnabled ? 'destructive' : 'default'}
							disabled={isSubmitting}
						>
							<Icon
								name={existingConfig.isEnabled ? 'ban' : 'check'}
								className="mr-2 h-4 w-4"
							/>
							{existingConfig.isEnabled ? 'Disable SSO' : 'Enable SSO'}
						</Button>
					)}
				</div>
			</Form>
		</div>
	)
}
