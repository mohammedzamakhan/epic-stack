import { i18n } from '@lingui/core'
import { t } from '@lingui/macro'
import { requireUserWithRole } from '@repo/auth'
import { CampaignDetailView } from '@repo/marketing'
import { getPlatformCampaign } from '@repo/marketing/server/platform-campaigns'
import { type LoaderFunctionArgs, useLoaderData } from 'react-router'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	const campaignId = params.campaignId || ''
	const campaign = await getPlatformCampaign(campaignId)

	if (!campaign) {
		throw new Response(i18n._(t`Broadcast not found`), { status: 404 })
	}

	return { campaign }
}

export default function AdminCampaignDetailRoute() {
	const { campaign } = useLoaderData<typeof loader>()

	return (
		<CampaignDetailView campaign={campaign} backHref="/marketing/campaigns" />
	)
}
