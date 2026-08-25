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
				error instanceof Error ? error.message : 'Failed to create campaign',
		}
	}

	return redirect('/marketing/campaigns')
}

export default function AdminNewCampaignRoute() {
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
					aria-label="Back"
					className="mt-0.5"
				>
					<Icon name="arrow-left" className="size-4" />
				</Button>
				<header className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						New broadcast
					</h1>
					<p className="text-muted-foreground text-sm">
						Send a one-time message to tenant operators.
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
								<Label htmlFor="audience">Target Audience</Label>
								<Select name="audience" defaultValue="all_operators">
									<SelectTrigger id="audience">
										<SelectValue placeholder="Select audience" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all_operators">
											All Tenant Operators
										</SelectItem>
										<SelectItem value="organization">
											Specific Organization
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="targetOrganizationId">
									Organization (optional)
								</Label>
								<Select name="targetOrganizationId">
									<SelectTrigger id="targetOrganizationId">
										<SelectValue placeholder="All organizations" />
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
