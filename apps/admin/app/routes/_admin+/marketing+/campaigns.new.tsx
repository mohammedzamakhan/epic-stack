import { i18n } from '@lingui/core'
import { msg, t, Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { requireUserWithRole } from '@repo/auth'
import { db, Organization } from '@repo/database'
import { CampaignForm } from '@repo/marketing'
import { createPlatformCampaign } from '@repo/marketing/server/platform-campaigns'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { Label } from '@repo/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui/select'
import {
	Form,
	Link,
	redirect,
	useActionData,
	useLoaderData,
	useNavigation,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')
	const organizations = await db
		.select({ id: Organization.id, name: Organization.name })
		.from(Organization)
		.orderBy(Organization.name)

	return { organizations }
}

export async function action({ request }: ActionFunctionArgs) {
	const adminUserId = await requireUserWithRole(request, 'admin')
	const formData = await request.formData()

	try {
		await createPlatformCampaign(
			{
				name: String(formData.get('name') || ''),
				channel: (formData.get('channel') as 'email' | 'sms') || 'email',
				subject: String(formData.get('subject') || ''),
				content: String(formData.get('content') || ''),
				audience:
					(formData.get('audience') as 'all_operators' | 'organization') ||
					'all_operators',
				targetOrganizationId:
					String(formData.get('targetOrganizationId') || '') || undefined,
			},
			adminUserId,
		)
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: i18n._(t`Failed to create campaign`),
		}
	}

	return redirect('/marketing/campaigns')
}

export default function AdminNewCampaignRoute() {
	const { _ } = useLingui()
	const { organizations } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()
	const isSubmitting = navigation.state === 'submitting'

	return (
		<div className="mx-auto max-w-2xl space-y-8">
			<div className="flex items-start gap-3">
				<Button
					variant="ghost"
					size="icon-xs"
					render={<Link to="/marketing/campaigns" />}
					aria-label={_(msg`Back`)}
					className="mt-0.5"
				>
					<Icon name="arrow-left" className="size-4" />
				</Button>
				<header className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						<Trans>New broadcast</Trans>
					</h1>
					<p className="text-muted-foreground text-sm">
						<Trans>Send a one-time message to tenant operators.</Trans>
					</p>
				</header>
			</div>

			<Form method="post">
				<CampaignForm
					error={actionData?.error}
					isSubmitting={isSubmitting}
					cancelTo="/marketing/campaigns"
					showSmsProBadge={false}
					audienceField={
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="audience">
									<Trans>Target Audience</Trans>
								</Label>
								<Select name="audience" defaultValue="all_operators">
									<SelectTrigger id="audience">
										<SelectValue placeholder={_(msg`Select audience`)} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all_operators">
											<Trans>All Tenant Operators</Trans>
										</SelectItem>
										<SelectItem value="organization">
											<Trans>Specific Organization</Trans>
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="targetOrganizationId">
									<Trans>Organization (optional)</Trans>
								</Label>
								<Select name="targetOrganizationId">
									<SelectTrigger id="targetOrganizationId">
										<SelectValue placeholder={_(msg`All organizations`)} />
									</SelectTrigger>
									<SelectContent>
										{organizations.map((org) => (
											<SelectItem key={org.id} value={org.id}>
												{org.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					}
				/>
			</Form>
		</div>
	)
}
