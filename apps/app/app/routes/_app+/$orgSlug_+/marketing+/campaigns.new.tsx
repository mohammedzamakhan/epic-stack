import { CampaignForm } from '@repo/marketing'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import {
	Form,
	Link,
	redirect,
	useActionData,
	useNavigation,
	type ActionFunctionArgs,
} from 'react-router'
import { getOperatorTenantClient } from '#app/utils/tenant-api.server.ts'

export async function action({ request, params }: ActionFunctionArgs) {
	const orgSlug = params.orgSlug || ''
	const { fetchTenant } = await getOperatorTenantClient(request, orgSlug)

	const formData = await request.formData()
	const name = formData.get('name')
	const channel = formData.get('channel')
	const subject = formData.get('subject')
	const content = formData.get('content')

	const createRes = await fetchTenant('/operator/marketing/campaigns', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			name,
			channel,
			subject,
			content,
		}),
	})

	if (!createRes.ok) {
		const err = await createRes.json().catch(() => ({}))
		return {
			error:
				(err as { error?: string }).error ||
				'Failed to create and dispatch campaign',
		}
	}

	return redirect(`/${orgSlug}/marketing/campaigns`)
}

export default function NewCampaignRoute() {
	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()
	const isSubmitting = navigation.state === 'submitting'

	return (
		<div className="mx-auto max-w-2xl space-y-8">
			<div className="flex items-start gap-3">
				<Button
					variant="ghost"
					size="icon-xs"
					render={<Link to=".." />}
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
						Send a one-time email or SMS to your audience.
					</p>
				</header>
			</div>

			<Form method="post">
				<CampaignForm
					error={actionData?.error}
					isSubmitting={isSubmitting}
					cancelTo=".."
				/>
			</Form>
		</div>
	)
}
