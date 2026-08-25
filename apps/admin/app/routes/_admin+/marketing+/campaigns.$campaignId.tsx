import { requireUserWithRole } from '@repo/auth'
import { CampaignDetailView } from '@repo/marketing'
import { getPlatformCampaign } from '@repo/marketing/server/platform-campaigns'
import { type LoaderFunctionArgs, useLoaderData } from 'react-router'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	const campaignId = params.campaignId || ''
	const campaign = await getPlatformCampaign(campaignId)

	if (!campaign) {
		throw new Response('Broadcast not found', { status: 404 })
	}

	return { campaign }
}

export default function AdminCampaignDetailRoute() {
	const { campaign } = useLoaderData<typeof loader>()

	return (
		<CampaignDetailView campaign={campaign} backHref="/marketing/campaigns" />
	)
}
