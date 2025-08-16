import { invariant } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
} from 'react-router'

import { BillingCard } from '#app/components/settings/cards/organization/billing-card'
import {
	AnnotatedLayout,
	AnnotatedSection,
} from '#app/components/ui/annotated-layout'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import {
	checkoutAction,
	customerPortalAction,
	getPlansAndPrices,
} from '#app/utils/payments.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	invariant(params.orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: {
			slug: params.orgSlug,
			users: {
				some: {
					userId,
				},
			},
		},
		select: {
			id: true,
			name: true,
			slug: true,
			size: true,
			stripeCustomerId: true,
			stripeSubscriptionId: true,
			stripeProductId: true,
			planName: true,
			subscriptionStatus: true,
		},
	})

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	const isClosedBeta = process.env.LAUNCH_STATUS === 'CLOSED_BETA'
	const plansAndPrices = isClosedBeta ? null : await getPlansAndPrices()

	return {
		organization,
		plansAndPrices,
		isClosedBeta,
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	invariant(params.orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: {
			slug: params.orgSlug,
			users: {
				some: {
					userId,
				},
			},
		},
		select: { id: true, name: true, slug: true },
	})

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	const formData = await request.formData()
	const intent = formData.get('intent')
	const priceId = formData.get('priceId') as string | null

	if (intent === 'upgrade') {
		const organizationWithBilling = await prisma.organization.findUnique({
			where: { id: organization.id },
			select: {
				id: true,
				createdAt: true,
				updatedAt: true,
				name: true,
				slug: true,
				description: true,
				active: true,
				size: true,
				stripeCustomerId: true,
				stripeSubscriptionId: true,
				stripeProductId: true,
				planName: true,
				subscriptionStatus: true,
				verifiedDomain: true,
			},
		})

		if (!organizationWithBilling) {
			return Response.json({ error: 'Organization not found' }, { status: 404 })
		}

		return checkoutAction(
			request,
			organizationWithBilling,
			priceId ?? undefined,
		)
	}

	if (intent === 'customer-portal') {
		const organizationWithBilling = await prisma.organization.findUnique({
			where: { id: organization.id },
			select: {
				id: true,
				createdAt: true,
				updatedAt: true,
				name: true,
				slug: true,
				description: true,
				active: true,
				size: true,
				stripeCustomerId: true,
				stripeSubscriptionId: true,
				stripeProductId: true,
				planName: true,
				subscriptionStatus: true,
				verifiedDomain: true,
			},
		})

		if (!organizationWithBilling) {
			return Response.json({ error: 'Organization not found' }, { status: 404 })
		}

		return customerPortalAction(request, organizationWithBilling)
	}

	return Response.json({ error: `Invalid intent: ${intent}` }, { status: 400 })
}

export default function BillingSettings() {
	const { organization, plansAndPrices, isClosedBeta } =
		useLoaderData<typeof loader>()

	return (
		<AnnotatedLayout>
			<AnnotatedSection
				title="Billing & Subscription"
				description="Manage your organization's subscription and billing settings."
			>
				<BillingCard
					organization={organization}
					plansAndPrices={plansAndPrices}
					isClosedBeta={isClosedBeta}
				/>
			</AnnotatedSection>
		</AnnotatedLayout>
	)
}
