import { invariant } from '@epic-web/invariant'
import { parseWithZod } from '@conform-to/zod'
import { useLoaderData, useActionData, useNavigation } from 'react-router'
import { z } from 'zod'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { ssoConfigurationService } from '#app/utils/sso-configuration.server.ts'
import { auditLogService } from '#app/utils/audit-log.server.ts'
import { SSOConfigurationForm } from '#app/components/sso-configuration-form.tsx'
import { SSOConfigurationOverview } from '#app/components/sso-configuration-overview.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/$organizationId.sso.ts'

const SSOConfigurationActionSchema = z.object({
	intent: z.enum(['save', 'test', 'enable', 'disable']),
	organizationId: z.string(),
	configId: z.string().optional(),
	providerName: z.string().min(1).optional(),
	issuerUrl: z.string().url().optional(),
	clientId: z.string().min(1).optional(),
	clientSecret: z.string().min(1).optional(),
	scopes: z.string().default('openid email profile').optional(),
	// Transform checkbox values to booleans
	autoDiscovery: z
		.union([z.literal('on'), z.literal('off'), z.boolean()])
		.transform((val) => val === 'on' || val === true)
		.default(true)
		.optional(),
	pkceEnabled: z
		.union([z.literal('on'), z.literal('off'), z.boolean()])
		.transform((val) => val === 'on' || val === true)
		.default(true)
		.optional(),
	autoProvision: z
		.union([z.literal('on'), z.literal('off'), z.boolean()])
		.transform((val) => val === 'on' || val === true)
		.default(true)
		.optional(),
	defaultRole: z.string().default('member').optional(),
	attributeMapping: z.string().optional(),
	authorizationUrl: z.string().url().optional(),
	tokenUrl: z.string().url().optional(),
	userinfoUrl: z.string().url().optional(),
	revocationUrl: z.string().url().optional(),
})

export async function loader({ request, params }: Route['LoaderArgs']) {
	await requireUserWithRole(request, 'admin')

	invariant(params.organizationId, 'Organization ID is required')

	// Get organization
	const organization = await prisma.organization.findUnique({
		where: { id: params.organizationId },
		select: {
			id: true,
			name: true,
			slug: true,
		},
	})

	if (!organization) {
		throw new Response('Organization not found', { status: 404 })
	}

	// Get SSO configuration if it exists
	const ssoConfig = await ssoConfigurationService.getConfiguration(
		organization.id,
	)

	// Get SSO statistics
	let ssoStats = null
	if (ssoConfig) {
		const [totalUsers, activeUsers, recentLogins, lastLoginResult] =
			await Promise.all([
				// Total users with SSO sessions
				prisma.user.count({
					where: {
						organizations: {
							some: {
								organizationId: organization.id,
							},
						},
						sessions: {
							some: {
								ssoSession: {
									ssoConfigId: ssoConfig.id,
								},
							},
						},
					},
				}),
				// Active users with SSO sessions
				prisma.user.count({
					where: {
						organizations: {
							some: {
								organizationId: organization.id,
								active: true,
							},
						},
						sessions: {
							some: {
								ssoSession: {
									ssoConfigId: ssoConfig.id,
								},
							},
						},
					},
				}),
				// Recent logins (last 7 days)
				prisma.sSOSession.count({
					where: {
						ssoConfigId: ssoConfig.id,
						createdAt: {
							gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
						},
					},
				}),
				// Last login
				prisma.sSOSession.findFirst({
					where: {
						ssoConfigId: ssoConfig.id,
					},
					orderBy: {
						updatedAt: 'desc',
					},
					select: {
						updatedAt: true,
					},
				}),
			])

		ssoStats = {
			totalUsers,
			activeUsers,
			recentLogins,
			lastLogin: lastLoginResult?.updatedAt || null,
		}
	}

	return Response.json({
		organization,
		ssoConfig,
		ssoStats,
	})
}

export async function action({ request, params }: Route['ActionArgs']) {
	const user = await requireUserWithRole(request, 'admin')

	invariant(params.organizationId, 'Organization ID is required')

	const formData = await request.formData()

	// Debug: Log all form data
	console.log('Form data received:')
	for (const [key, value] of formData.entries()) {
		console.log(`  ${key}: ${value}`)
	}

	const submission = parseWithZod(formData, {
		schema: SSOConfigurationActionSchema,
	})

	console.log('Parsed submission:', submission)

	if (submission.status !== 'success') {
		return Response.json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { intent, organizationId, configId, ...configData } = submission.value

	try {
		switch (intent) {
			case 'save': {
				// Validate required fields for save
				if (
					!configData.providerName ||
					!configData.issuerUrl ||
					!configData.clientId ||
					!configData.clientSecret
				) {
					return Response.json(
						{
							result: submission.reply({
								formErrors: [
									'Provider name, issuer URL, client ID, and client secret are required',
								],
							}),
						},
						{ status: 400 },
					)
				}

				if (configId) {
					// Update existing configuration
					await ssoConfigurationService.updateConfiguration(configId, {
						providerName: configData.providerName,
						issuerUrl: configData.issuerUrl,
						clientId: configData.clientId,
						clientSecret: configData.clientSecret,
						scopes: configData.scopes || 'openid email profile',
						autoDiscovery: configData.autoDiscovery ?? true,
						pkceEnabled: configData.pkceEnabled ?? true,
						autoProvision: configData.autoProvision ?? true,
						defaultRole: configData.defaultRole || 'member',
						attributeMapping: configData.attributeMapping
							? (JSON.parse(configData.attributeMapping) as Record<
									string,
									string
								>)
							: undefined,
					})

					// Log the configuration update
					await auditLogService.logSSOConfigChange(
						organizationId,
						(user as any).id,
						'updated',
						{ providerName: configData.providerName },
					)

					return redirectWithToast(
						`/organizations/${organizationId}/sso`,
						{
							type: 'success',
							title: 'SSO Configuration Updated',
							description:
								'The SSO configuration has been successfully updated.',
						},
					)
				} else {
					// Create new configuration
					await ssoConfigurationService.createConfiguration(
						organizationId,
						{
							providerName: configData.providerName,
							issuerUrl: configData.issuerUrl,
							clientId: configData.clientId,
							clientSecret: configData.clientSecret,
							scopes: configData.scopes || 'openid email profile',
							autoDiscovery: configData.autoDiscovery ?? true,
							pkceEnabled: configData.pkceEnabled ?? true,
							autoProvision: configData.autoProvision ?? true,
							defaultRole: configData.defaultRole || 'member',
							attributeMapping: configData.attributeMapping
								? (JSON.parse(configData.attributeMapping) as Record<
										string,
										string
									>)
								: undefined,
						},
						(user as any).id,
					)

					// Log the configuration creation
					await auditLogService.logSSOConfigChange(
						organizationId,
						(user as any).id,
						'created',
						{ providerName: configData.providerName },
					)

					return redirectWithToast(
						`/organizations/${organizationId}/sso`,
						{
							type: 'success',
							title: 'SSO Configuration Created',
							description:
								'The SSO configuration has been successfully created.',
						},
					)
				}
			}

			case 'test': {
				// Handle test connection
				let config: any

				if (configId) {
					// Test existing saved configuration
					config = await ssoConfigurationService.getConfigurationById(configId)
					if (!config) {
						return Response.json({
							result: submission.reply(),
							testConnectionResult: {
								success: false,
								message:
									'Configuration not found. Please save the configuration first.',
							},
						})
					}
				} else {
					// Test unsaved configuration
					if (
						!configData.providerName ||
						!configData.issuerUrl ||
						!configData.clientId ||
						!configData.clientSecret
					) {
						return Response.json({
							result: submission.reply(),
							testConnectionResult: {
								success: false,
								message:
									'Please fill in all required fields (Provider Name, Issuer URL, Client ID, Client Secret) before testing.',
							},
						})
					}

					// Create a temporary config object for testing (without saving to DB)
					config = {
						id: 'temp-test-config',
						organizationId,
						providerName: configData.providerName,
						issuerUrl: configData.issuerUrl,
						clientId: configData.clientId,
						clientSecret: configData.clientSecret,
						scopes: configData.scopes || 'openid email profile',
						autoDiscovery: configData.autoDiscovery ?? true,
						pkceEnabled: configData.pkceEnabled ?? true,
						autoProvision: configData.autoProvision ?? true,
						defaultRole: configData.defaultRole || 'member',
						attributeMapping: configData.attributeMapping || null,
						authorizationUrl: configData.authorizationUrl || null,
						tokenUrl: configData.tokenUrl || null,
						userinfoUrl: configData.userinfoUrl || null,
						revocationUrl: configData.revocationUrl || null,
						isEnabled: false,
						lastTested: null,
						createdAt: new Date(),
						updatedAt: new Date(),
						createdById: (user as any).id,
					}
				}

				console.log('Testing SSO connection for config:', {
					id: config.id,
					providerName: config.providerName,
					issuerUrl: config.issuerUrl,
					autoDiscovery: config.autoDiscovery,
				})

				const testResult = await ssoConfigurationService.testConnection(config)

				console.log('SSO test result:', testResult)

				return Response.json({
					result: submission.reply(),
					testConnectionResult: testResult,
				})
			}

			case 'enable':
			case 'disable': {
				if (!configId) {
					return Response.json(
						{
							result: submission.reply({
								formErrors: ['Configuration ID is required'],
							}),
						},
						{ status: 400 },
					)
				}

				const isEnabled = intent === 'enable'
				await ssoConfigurationService.toggleConfiguration(configId, isEnabled)

				// Log the configuration toggle
				await auditLogService.logSSOConfigChange(
					organizationId,
					(user as any).id,
					isEnabled ? 'enabled' : 'disabled',
				)

				return redirectWithToast(`/organizations/${organizationId}/sso`, {
					type: 'success',
					title: `SSO ${isEnabled ? 'Enabled' : 'Disabled'}`,
					description: `SSO has been ${isEnabled ? 'enabled' : 'disabled'} for this organization.`,
				})
			}

			default:
				return Response.json(
					{
						result: submission.reply({
							formErrors: ['Invalid action'],
						}),
					},
					{ status: 400 },
				)
		}
	} catch (error) {
		console.error('SSO configuration error:', error)
		return Response.json(
			{
				result: submission.reply({
					formErrors: ['An error occurred while processing the request'],
				}),
			},
			{ status: 500 },
		)
	}
}

export default function AdminOrganizationSSOPage() {
	const { organization, ssoConfig, ssoStats } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>() as any
	const navigation = useNavigation()

	const isSubmitting = navigation.state === 'submitting'

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						SSO Configuration
					</h1>
					<p className="text-muted-foreground">
						Configure Single Sign-On for {(organization as any).name}
					</p>
				</div>
			</div>

			{/* SSO Configuration Overview */}
			<SSOConfigurationOverview
				organizationId={(organization as any).id}
				ssoConfig={ssoConfig}
				ssoStats={ssoStats}
				onEdit={() => {
					// Scroll to form or show form
					const formElement = document.getElementById('sso-configuration-form')
					if (formElement) {
						formElement.scrollIntoView({ behavior: 'smooth' })
					}
				}}
				onToggleStatus={() => {
					// This will be handled by the form submission
				}}
				onTestConnection={() => {
					// This will be handled by the form submission
				}}
			/>

			{/* SSO Configuration Form */}
			<div id="sso-configuration-form">
				<SSOConfigurationForm
					organizationId={(organization as any).id}
					existingConfig={ssoConfig}
					isSubmitting={isSubmitting}
					testConnectionResult={actionData?.testConnectionResult}
				/>
			</div>
		</div>
	)
}
