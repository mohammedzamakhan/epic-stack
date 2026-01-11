import { type PrismaClient } from '@prisma/client'
import { type LoaderFunctionArgs, redirect } from 'react-router'
import type Stripe from 'stripe'

export interface StripeCheckoutDependencies {
	stripe: Stripe
	prisma: PrismaClient
}

/**
 * Shared Stripe checkout success handler.
 * This handler processes successful Stripe checkout sessions and updates the organization.
 * Used by both the admin and app applications.
 *
 * @param request - The incoming request with session_id and organizationId params
 * @param deps - Dependencies (stripe client, prisma client)
 * @returns Redirect response to appropriate page
 */
export async function handleStripeCheckout(
	{ request }: LoaderFunctionArgs,
	deps: StripeCheckoutDependencies,
) {
	const url = new URL(request.url)
	const sessionId = url.searchParams.get('session_id')
	const organizationId = url.searchParams.get('organizationId')
	if (!sessionId) {
		return redirect('/pricing')
	}

	try {
		const session = await deps.stripe.checkout.sessions.retrieve(sessionId, {
			expand: ['customer', 'subscription'],
		})

		if (!session.customer || typeof session.customer === 'string') {
			throw new Error('Invalid customer data from Stripe.')
		}

		const customerId = session.customer.id
		const subscriptionId =
			typeof session.subscription === 'string'
				? session.subscription
				: session.subscription?.id

		if (!subscriptionId) {
			throw new Error('No subscription found for this session.')
		}

		const subscription = await deps.stripe.subscriptions.retrieve(
			subscriptionId,
			{
				expand: ['items.data.price.product'],
			},
		)

		const plan = subscription.items.data[0]?.price

		if (!plan) {
			throw new Error('No plan found for this subscription.')
		}

		const productId = (plan.product as Stripe.Product).id

		if (!productId) {
			throw new Error('No product ID found for this subscription.')
		}

		const userId = session.client_reference_id
		if (!userId) {
			throw new Error("No user ID found in session's client_reference_id.")
		}

		const user = await deps.prisma.user.findUnique({
			where: { id: userId },
			include: { organizations: { select: { organizationId: true } } },
		})

		if (!user) {
			throw new Error('User not found in database.')
		}

		if (user.organizations.length === 0) {
			throw new Error('User is not associated with any tenant.')
		}

		if (!organizationId) {
			throw new Error('Tenant not found in database.')
		}

		const isMember = user.organizations.some(
			(org) => org.organizationId === organizationId,
		)
		if (!isMember) {
			throw new Error('User is not authorized to update this organization.')
		}

		const tenant = await deps.prisma.organization.update({
			where: { id: organizationId },
			data: {
				stripeCustomerId: customerId,
				stripeSubscriptionId: subscriptionId,
				stripeProductId: productId,
				planName: (plan.product as Stripe.Product).name,
				subscriptionStatus: subscription.status,
				updatedAt: new Date(),
			},
			select: {
				slug: true,
			},
		})

		// Check if this is part of organization creation flow
		const isCreationFlow = url.searchParams.get('creation') === 'true'

		if (isCreationFlow) {
			// Continue with organization creation flow
			return redirect(`/organizations/create?step=3&orgId=${organizationId}`)
		}

		// Regular checkout flow - go to dashboard
		return redirect(`/${tenant.slug}/dashboard`)
	} catch (error) {
		console.error('Error handling successful checkout:', error)
		return redirect('/error')
	}
}
