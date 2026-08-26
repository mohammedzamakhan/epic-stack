import { parseWithZod } from '@conform-to/zod'
import { redirectWithToast } from '@repo/common/toast'
import { AnnotatedLayout, AnnotatedSection } from '@repo/ui/annotated-layout'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	redirect,
	useLoaderData,
} from 'react-router'
import { z } from 'zod'

import { ShopCard } from '#app/components/settings/cards/organization/shop-card.tsx'
import { requireUserOrganization } from '#app/utils/organization/loader.server.ts'
import {
	requireUserWithOrganizationPermission,
	ORG_PERMISSIONS,
} from '#app/utils/organization/permissions.server.ts'
import {
	checkRateLimit,
	SHOP_CONNECT_ONBOARDING_RATE_LIMIT,
} from '#app/utils/rate-limit.server.ts'
import {
	createConnectDashboardLink,
	listOrganizationShopOrders,
	startConnectOnboarding,
	syncConnectAccountStatus,
	updateShopProduct,
} from '#app/utils/shop.server.ts'

const shopFields = {
	id: true,
	name: true,
	slug: true,
	dataRegion: true,
	hasProvisionedDb: true,
	customDomain: true,
	sitePublished: true,
	stripeConnectAccountId: true,
	stripeConnectChargesEnabled: true,
	stripeConnectPayoutsEnabled: true,
	shopProductName: true,
	shopProductDescription: true,
	shopProductPriceCents: true,
	shopEnabled: true,
} as const

export async function loader({ request, params }: LoaderFunctionArgs) {
	const organization = await requireUserOrganization(
		request,
		params.orgSlug,
		shopFields,
	)

	const url = new URL(request.url)
	const connectParam = url.searchParams.get('connect')
	if (
		(connectParam === 'return' || connectParam === 'refresh') &&
		organization.stripeConnectAccountId
	) {
		try {
			await syncConnectAccountStatus(organization.id)
		} catch (error) {
			console.error(
				'Failed to sync Stripe Connect status:',
				error instanceof Error ? error.message : error,
			)
		}
	}

	const orders =
		organization.dataRegion === 'us' && organization.hasProvisionedDb
			? await listOrganizationShopOrders(organization.id)
			: []

	const refreshedOrg = await requireUserOrganization(
		request,
		params.orgSlug,
		shopFields,
	)

	return {
		organization: refreshedOrg,
		orders,
	}
}

const ShopProductSchema = z.object({
	productName: z.string().trim().min(1, 'Product name is required'),
	productDescription: z.string().trim().optional(),
	priceDollars: z
		.string()
		.min(1, 'Price is required')
		.refine((value) => {
			const parsed = Number.parseFloat(value)
			return Number.isFinite(parsed) && parsed >= 0.5
		}, 'Minimum price is $0.50'),
	enabled: z
		.string()
		.optional()
		.transform((value) => value === 'on' || value === 'true'),
})

export async function action({ request, params }: ActionFunctionArgs) {
	const organization = await requireUserOrganization(
		request,
		params.orgSlug,
		shopFields,
	)

	await requireUserWithOrganizationPermission(
		request,
		organization.id,
		ORG_PERMISSIONS.UPDATE_SETTINGS_ANY,
	)

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'connect-stripe') {
		if (organization.dataRegion !== 'us') {
			return redirectWithToast(`/${organization.slug}/settings/shop`, {
				title: 'US only',
				description:
					'Stripe Connect shop payouts are available for US organizations only.',
				type: 'error',
			})
		}

		const rateLimitCheck = await checkRateLimit(
			{ type: 'token', value: organization.id },
			SHOP_CONNECT_ONBOARDING_RATE_LIMIT,
		)
		if (!rateLimitCheck.allowed) {
			return redirectWithToast(`/${organization.slug}/settings/shop`, {
				title: 'Please wait',
				description:
					'Stripe Connect onboarding can only be started once every 30 seconds.',
				type: 'error',
			})
		}

		try {
			const url = await startConnectOnboarding(request, organization)
			return redirect(url)
		} catch (error) {
			const description =
				error instanceof Error ? error.message : 'Unable to start onboarding'
			return redirectWithToast(`/${organization.slug}/settings/shop`, {
				title: 'Stripe Connect failed',
				description,
				type: 'error',
			})
		}
	}

	if (intent === 'open-stripe-dashboard') {
		if (!organization.stripeConnectAccountId) {
			return redirectWithToast(`/${organization.slug}/settings/shop`, {
				title: 'Not connected',
				description: 'Connect Stripe before opening the dashboard.',
				type: 'error',
			})
		}

		try {
			const url = await createConnectDashboardLink(
				organization.stripeConnectAccountId,
			)
			return redirect(url)
		} catch (error) {
			const description =
				error instanceof Error
					? error.message
					: 'Unable to open Stripe dashboard'
			return redirectWithToast(`/${organization.slug}/settings/shop`, {
				title: 'Stripe dashboard unavailable',
				description,
				type: 'error',
			})
		}
	}

	if (intent === 'update-shop-product') {
		const submission = parseWithZod(formData, { schema: ShopProductSchema })

		if (submission.status !== 'success') {
			return Response.json({ result: submission.reply() })
		}

		const priceCents = Math.round(
			Number.parseFloat(submission.value.priceDollars) * 100,
		)

		await updateShopProduct(organization.id, {
			productName: submission.value.productName,
			productDescription: submission.value.productDescription,
			priceCents,
			enabled: submission.value.enabled,
		})

		return redirectWithToast(`/${organization.slug}/settings/shop`, {
			title: 'Shop updated',
			description: 'Your product listing has been saved.',
			type: 'success',
		})
	}

	return Response.json({ error: `Invalid intent: ${intent}` }, { status: 400 })
}

export default function ShopSettingsRoute() {
	const { organization, orders } = useLoaderData<typeof loader>()

	return (
		<AnnotatedLayout>
			<AnnotatedSection>
				<ShopCard organization={organization} orders={orders} />
			</AnnotatedSection>
		</AnnotatedLayout>
	)
}
