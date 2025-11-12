/**
 * Payment utilities for the app
 * Uses @repo/payments for provider abstraction
 */

import { type Organization } from '@prisma/client'
import { TrialEndingEmail } from '@repo/email'
import {
	createStripeProvider,
	getTrialConfig,
	calculateManualTrialDaysRemaining,
	type StripeProvider,
} from '@repo/payments'
import { data, redirect } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { sendEmail } from '#app/utils/email.server.ts'

if (!process.env.STRIPE_SECRET_KEY) {
	const errorMsg = 'STRIPE_SECRET_KEY environment variable is not set!'
	throw new Error(errorMsg)
}

// Create payment provider instance
const paymentProvider = createStripeProvider(process.env.STRIPE_SECRET_KEY)

// Export for advanced usage
export const stripe = paymentProvider.getClient()

// Re-export trial config functions
export { getTrialConfig, calculateManualTrialDaysRemaining }

/**
 * Get plans and prices from payment provider
 */
export async function getPlansAndPrices() {
	return paymentProvider.getPlansAndPrices()
}

/**
 * Get Stripe products (for backwards compatibility)
 */
export async function getStripeProducts() {
	return paymentProvider.getProducts()
}

/**
 * Get Stripe prices (for backwards compatibility)
 */
export async function getStripePrices() {
	const prices = await paymentProvider.getPrices()
	// Map to include additional properties for backwards compatibility
	return prices.map((price) => ({
		...price,
		productId: price.productId,
		unitAmount: price.unitAmount,
		interval: price.interval,
		trialPeriodDays: price.trialPeriodDays,
	}))
}

/**
 * Database operations
 */

export async function getOrganizationByStripeCustomerId(customerId: string) {
	const result = await prisma.organization.findFirst({
		where: {
			stripeCustomerId: customerId,
		},
	})
	return result || null
}

export async function updateOrganizationSubscription(
	organizationId: string,
	subscriptionData: {
		stripeSubscriptionId: string | null
		stripeProductId: string | null
		planName: string | null
		subscriptionStatus: string
	},
) {
	await prisma.organization.update({
		where: {
			id: organizationId,
		},
		data: {
			...subscriptionData,
			updatedAt: new Date(),
		},
	})
}

/**
 * Subscription management
 */

export async function upgradeSubscription(
	organization: Organization,
	newPriceId: string,
) {
	if (!organization.stripeCustomerId || !organization.stripeSubscriptionId) {
		throw new Error('Organization must have existing subscription to upgrade')
	}

	const quantity = await getOrganizationSeatQuantity(organization.id)

	// Get current subscription
	const subscription = await paymentProvider.retrieveSubscription(
		organization.stripeSubscriptionId,
	)

	// Preserve trial period if the subscription is currently trialing
	const preserveTrialEnd = subscription.status === 'trialing'

	// Update the subscription to the new price
	const updatedSubscription = await paymentProvider.updateSubscription({
		subscriptionId: organization.stripeSubscriptionId,
		priceId: newPriceId,
		quantity,
		preserveTrialEnd,
		prorationBehavior: 'create_prorations',
	})

	// Update organization with new subscription details
	// Get product details from Stripe
	const products = await paymentProvider.getProducts()
	const product = products.find((p) => p.id === updatedSubscription.productId)

	await updateOrganizationSubscription(organization.id, {
		stripeSubscriptionId: updatedSubscription.id,
		stripeProductId: updatedSubscription.productId,
		planName: product?.name || null,
		subscriptionStatus: updatedSubscription.status,
	})

	return updatedSubscription
}

export async function createCheckoutSession(
	request: Request,
	{
		organization,
		priceId,
		from,
		isCreationFlow = false,
	}: {
		organization: Organization | null
		priceId: string
		from: 'checkout' | 'pricing'
		isCreationFlow?: boolean
	},
) {
	const userId = await requireUserId(request)

	const trialConfig = getTrialConfig()

	if (from === 'pricing' && trialConfig.creditCardRequired === 'manual') {
		return redirect('/signup')
	}

	if (!organization || !userId) {
		return redirect(`/signup?redirect=checkout&priceId=${priceId}`)
	}

	// Check if organization has existing active subscription
	if (
		organization.stripeCustomerId &&
		organization.stripeSubscriptionId &&
		from === 'checkout'
	) {
		try {
			const subscription = await paymentProvider.retrieveSubscription(
				organization.stripeSubscriptionId,
			)

			if (
				subscription.status === 'active' ||
				subscription.status === 'trialing'
			) {
				// This is an upgrade - modify existing subscription instead of creating new one
				await upgradeSubscription(organization, priceId)
				return data({
					success: true,
				})
			}
		} catch (error) {
			console.error('Error checking existing subscription:', error)
			// Continue with checkout if we can't retrieve subscription
		}
	}

	const quantity = await getOrganizationSeatQuantity(organization.id)

	let testCustomerId: string | undefined

	// Create test customer in non-production environments
	if (
		process.env.NODE_ENV !== 'production' &&
		paymentProvider.createTestClock &&
		paymentProvider.createTestCustomer
	) {
		try {
			const testClock = await paymentProvider.createTestClock()
			const testCustomer = await paymentProvider.createTestCustomer(testClock.id)
			testCustomerId = testCustomer.id
		} catch {
			// Ignore test customer creation errors
		}
	}

	const session = await paymentProvider.createCheckoutSession({
		priceId,
		quantity,
		successUrl: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}&organizationId=${organization.id}${isCreationFlow ? '&creation=true' : ''}`,
		cancelUrl:
			from === 'checkout'
				? `${process.env.BASE_URL}/${organization.slug}/settings/billing`
				: `${process.env.BASE_URL}/pricing`,
		customerId: organization.stripeCustomerId || testCustomerId || undefined,
		clientReferenceId: userId.toString(),
		allowPromotionCodes: true,
		trialPeriodDays:
			trialConfig.creditCardRequired === 'manual'
				? undefined
				: trialConfig.trialDays,
		paymentMethodCollection:
			trialConfig.creditCardRequired === 'stripe' ? 'if_required' : 'always',
	})

	return redirect(session.url!)
}

export async function deleteSubscription(subscriptionId: string) {
	await paymentProvider.cancelSubscription(subscriptionId)
}

export async function createCustomerPortalSession(organization: Organization) {
	if (!organization.stripeCustomerId || !organization.stripeProductId) {
		return redirect('/pricing')
	}

	return paymentProvider.createCustomerPortalSession({
		customerId: organization.stripeCustomerId,
		returnUrl: `${process.env.BASE_URL}/${organization.slug}/settings`,
		productId: organization.stripeProductId,
	})
}

export async function handleSubscriptionChange(subscription: {
	id: string
	status: string
	customer: string
	items: Array<{
		price: { id: string; product: string }
	}>
}) {
	const customerId = subscription.customer
	const subscriptionId = subscription.id
	const status = subscription.status

	const organization = await getOrganizationByStripeCustomerId(customerId)

	if (!organization) {
		return
	}

	if (status === 'active' || status === 'trialing') {
		const productId = subscription.items[0]?.price.product

		// If this is a new active subscription and the organization has a different subscription ID,
		// cancel the old one to prevent multiple active subscriptions
		if (
			organization.stripeSubscriptionId &&
			organization.stripeSubscriptionId !== subscriptionId
		) {
			try {
				await paymentProvider.cancelSubscription(
					organization.stripeSubscriptionId,
				)
				console.log(
					`Cancelled old subscription: ${organization.stripeSubscriptionId}`,
				)
			} catch (error) {
				console.error('Error cancelling old subscription:', error)
			}
		}

		// Get product name
		const products = await paymentProvider.getProducts()
		const product = products.find((p) => p.id === productId)

		await updateOrganizationSubscription(organization.id, {
			stripeSubscriptionId: subscriptionId,
			stripeProductId: productId || null,
			planName: product?.name || null,
			subscriptionStatus: status,
		})
	} else if (status === 'canceled' || status === 'unpaid') {
		// Only update to null if this is the current subscription
		if (organization.stripeSubscriptionId === subscriptionId) {
			await updateOrganizationSubscription(organization.id, {
				stripeSubscriptionId: null,
				stripeProductId: null,
				planName: null,
				subscriptionStatus: status,
			})
		}
	}
}

export async function handleTrialEnd(subscription: {
	id: string
	customer: string
	trial_end?: number | null
}) {
	const customerId = subscription.customer

	const organization = await getOrganizationByStripeCustomerId(customerId)
	const admins = await prisma.userOrganization.findMany({
		where: {
			organizationId: organization?.id,
			organizationRole: {
				name: 'admin',
			},
		},
		include: {
			user: true,
		},
	})

	// Calculate actual days remaining from trial end date
	const trialEnd = subscription.trial_end
		? new Date(subscription.trial_end * 1000)
		: null
	const now = new Date()
	const daysRemaining = trialEnd
		? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
		: 3 // fallback to 3 days if trial_end is not available

	await Promise.all(
		admins.map(async (admin) => {
			const user = admin.user
			if (!user) {
				return
			}
			await sendEmail({
				to: user.email,
				subject: 'Trial Ending Soon',
				react: TrialEndingEmail({
					portalUrl: process.env.STRIPE_PORTAL_URL!,
					userName: user.name || undefined,
					daysRemaining: Math.max(0, daysRemaining), // Ensure non-negative
				}),
			})
		}),
	)
}

export async function getTrialStatus(userId: string, organizationSlug: string) {
	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
		})

		const organization = await prisma.organization.findUnique({
			where: { slug: organizationSlug },
		})

		const trialConfig = getTrialConfig()

		if (trialConfig.creditCardRequired === 'manual') {
			if (!organization?.createdAt) {
				return { isActive: false, daysRemaining: 0 }
			}

			const daysRemaining = calculateManualTrialDaysRemaining(
				organization.createdAt,
			)
			return {
				isActive: daysRemaining > 0,
				daysRemaining,
			}
		}

		if (!user || !organization || !organization?.stripeCustomerId) {
			return { isActive: false, daysRemaining: 0 }
		}

		const subscriptions = await paymentProvider.listSubscriptions(
			organization.stripeCustomerId,
		)

		if (subscriptions.length === 0) {
			return { isActive: false, daysRemaining: 0 }
		}

		const subscription = subscriptions[0]

		if (subscription && subscription.status === 'trialing') {
			const trialEnd = subscription.trialEnd
			if (!trialEnd) {
				return { isActive: false, daysRemaining: 0 }
			}
			const now = new Date()
			const daysRemaining = Math.ceil(
				(trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
			)

			return { isActive: true, daysRemaining }
		} else if (subscription && subscription.status === 'active') {
			return { isActive: true, daysRemaining: 0 }
		} else {
			return { isActive: false, daysRemaining: 0 }
		}
	} catch {
		throw new Error('Failed to fetch subscription status')
	}
}

const getOrganizationSeatQuantity = async (organizationId: string) => {
	return prisma.userOrganization.count({
		where: {
			organizationId,
			active: true,
		},
	})
}

export const updateSeatQuantity = async (organizationId: string) => {
	const organization = await prisma.organization.findUnique({
		where: {
			id: organizationId,
		},
	})
	if (!organization?.stripeSubscriptionId) {
		throw new Error(
			'Organization does not have a stripe subscription. Cannot add user.',
		)
	}

	// Get the number of users in the organization
	const numUsersInOrganization =
		await getOrganizationSeatQuantity(organizationId)

	// Get the subscription
	const subscription = await paymentProvider.retrieveSubscription(
		organization.stripeSubscriptionId,
	)

	if (subscription.items.length !== 1) {
		throw new Error('Subscription does not have exactly 1 item')
	}

	const firstItem = subscription.items[0]
	if (!firstItem) {
		throw new Error('Subscription item not found')
	}

	// Update the subscription
	return paymentProvider.updateSubscription({
		subscriptionId: organization.stripeSubscriptionId,
		priceId: firstItem.priceId,
		quantity: numUsersInOrganization,
	})
}

export const checkoutAction = async (
	request: Request,
	organization: Organization,
	priceIdArg?: string,
) => {
	let priceId: string | undefined | null = priceIdArg
	if (!priceId) {
		const formData = await request.formData()
		priceId = formData.get('priceId') as string | null
	}
	if (!priceId) throw new Response('priceId is required', { status: 400 })

	return createCheckoutSession(request, {
		organization,
		priceId,
		from: 'checkout',
	})
}

export const customerPortalAction = async (
	_: Request,
	organization: Organization,
) => {
	const portalSession = await createCustomerPortalSession(organization)
	return redirect(portalSession.url)
}

export async function getOrganizationInvoices(organization: {
	stripeCustomerId: string | null
}) {
	if (!organization.stripeCustomerId) {
		return []
	}

	return paymentProvider.listInvoices(organization.stripeCustomerId, 20)
}

export async function cleanupDuplicateSubscriptions(
	organization: Organization,
) {
	if (!organization.stripeCustomerId) {
		return
	}

	try {
		// Get all subscriptions for this customer
		const subscriptions = await paymentProvider.listSubscriptions(
			organization.stripeCustomerId,
		)

		const activeSubscriptions = subscriptions.filter(
			(sub) => sub.status === 'active',
		)

		if (activeSubscriptions.length <= 1) {
			return // No duplicates
		}

		// Sort by ID (newer subscriptions have higher IDs in most cases)
		const sortedSubscriptions = activeSubscriptions.sort((a, b) =>
			b.id.localeCompare(a.id),
		)

		// Keep the newest subscription, cancel the rest
		const [keepSubscription, ...cancelSubscriptions] = sortedSubscriptions

		if (!keepSubscription) {
			console.error('No subscription to keep after sorting')
			return
		}

		for (const sub of cancelSubscriptions) {
			await paymentProvider.cancelSubscription(sub.id)
			console.log(`Cancelled duplicate subscription: ${sub.id}`)
		}

		// Get product details
		const products = await paymentProvider.getProducts()
		const product = products.find((p) => p.id === keepSubscription.productId)

		// Update organization with the kept subscription
		await updateOrganizationSubscription(organization.id, {
			stripeSubscriptionId: keepSubscription.id,
			stripeProductId: keepSubscription.productId,
			planName: product?.name || null,
			subscriptionStatus: keepSubscription.status,
		})

		console.log(`Kept subscription: ${keepSubscription.id}`)
	} catch (error) {
		console.error('Error cleaning up duplicate subscriptions:', error)
	}
}
