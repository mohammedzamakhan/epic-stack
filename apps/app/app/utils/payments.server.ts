import { type Organization } from '@prisma/client'
import { TrialEndingEmail } from '@repo/email'
import { redirect } from 'react-router'
import Stripe from 'stripe'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { sendEmail } from '#app/utils/email.server.ts'

if (!process.env.STRIPE_SECRET_KEY) {
	const errorMsg = 'STRIPE_SECRET_KEY environment variable is not set!'
	throw new Error(errorMsg)
}

if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
	const errorMsg =
		'STRIPE_SECRET_KEY does not appear to be a valid Stripe secret key (should start with sk_)'
	throw new Error(errorMsg)
}

let stripe: Stripe
try {
	stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
		apiVersion: '2024-06-20',
		timeout: 10000, // 10 second timeout (same as test)
		maxNetworkRetries: 2,
	})
} catch (error) {
	throw error
}

export { stripe }

export async function getPlansAndPrices() {
	try {
		const products = await getStripeProducts()
		const prices = await getStripePrices()

		const basePlan = products.find((product) => product.name === 'Base')
		const plusPlan = products.find((product) => product.name === 'Plus')

		// Fetch the specific prices using the defaultPriceId from products
		const basePrice = prices.find(
			(price) => price.id === basePlan?.defaultPriceId,
		)
		let plusPrice = prices.find(
			(price) => price.id === plusPlan?.defaultPriceId,
		)

		const result = {
			plans: { base: basePlan, plus: plusPlan },
			prices: { base: basePrice, plus: plusPrice },
		}

		return result
	} catch (error) {
		console.error('Error in getPlansAndPrices:', error)

		// Return fallback data to prevent the app from hanging
		return {
			plans: { base: undefined, plus: undefined },
			prices: { base: undefined, plus: undefined },
		}
	}
}

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

export async function createCheckoutSession(
	request: Request,
	{
		organization,
		priceId,
		from,
	}: {
		organization: Organization | null
		priceId: string
		from: 'checkout' | 'pricing'
	},
) {
	const userId = await requireUserId(request)

	if (
		from === 'pricing' &&
		process.env.CREDIT_CARD_REQUIRED_FOR_TRIAL === 'manual'
	) {
		return redirect('/signup')
	}

	if (!organization || !userId) {
		return redirect(`/signup?redirect=checkout&priceId=${priceId}`)
	}

	const quantity = await getOrganizationSeatQuantity(organization.id)

	let customer: Stripe.Customer | null = null

	if (process.env.NODE_ENV !== 'production') {
		try {
			const testClock = await stripe.testHelpers.testClocks.create({
				frozen_time: Math.floor(new Date().getTime() / 1000),
			})
			customer = await stripe.customers.create({
				test_clock: testClock.id,
			})
		} catch {
			// Ignore test customer creation errors
		}
	}

	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		line_items: [
			{
				price: priceId,
				quantity,
			},
		],
		mode: 'subscription',
		success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}&organizationId=${organization.id}`,
		cancel_url:
			from === 'checkout'
				? `${process.env.BASE_URL}/app/${organization.slug}/settings/billing`
				: `${process.env.BASE_URL}/pricing`,
		customer: organization.stripeCustomerId || customer?.id || undefined,
		client_reference_id: userId.toString(),
		allow_promotion_codes: true,
		subscription_data: {
			...(process.env.CREDIT_CARD_REQUIRED_FOR_TRIAL === 'manual'
				? {}
				: {
						trial_period_days:
							process.env.CREDIT_CARD_REQUIRED_FOR_TRIAL === 'manual'
								? 0
								: parseInt(process.env.TRIAL_DAYS || '0', 10),
					}),
		},
		payment_method_collection:
			process.env.CREDIT_CARD_REQUIRED_FOR_TRIAL === 'stripe'
				? 'if_required'
				: 'always',
	})

	return redirect(session.url!)
}

export async function deleteSubscription(subscriptionId: string) {
	await stripe.subscriptions.cancel(subscriptionId)
}

export async function createCustomerPortalSession(organization: Organization) {
	if (!organization.stripeCustomerId || !organization.stripeProductId) {
		return redirect('/pricing')
	}

	let configuration: Stripe.BillingPortal.Configuration
	const configurations = await stripe.billingPortal.configurations.list()

	if (configurations.data.length > 0) {
		configuration = configurations.data[0] as Stripe.BillingPortal.Configuration
	} else {
		const product = await stripe.products.retrieve(organization.stripeProductId)
		if (!product.active) {
			throw new Error("Organization's product is not active in Stripe")
		}

		const prices = await stripe.prices.list({
			product: product.id,
			active: true,
		})
		if (prices.data.length === 0) {
			throw new Error("No active prices found for the organization's product")
		}

		configuration = await stripe.billingPortal.configurations.create({
			business_profile: {
				headline: 'Manage your subscription',
			},
			features: {
				subscription_update: {
					enabled: true,
					default_allowed_updates: ['price', 'quantity', 'promotion_code'],
					proration_behavior: 'create_prorations',
					products: [
						{
							product: product.id,
							prices: prices.data.map((price) => price.id),
						},
					],
				},
				subscription_cancel: {
					enabled: true,
					mode: 'at_period_end',
					cancellation_reason: {
						enabled: true,
						options: [
							'too_expensive',
							'missing_features',
							'switched_service',
							'unused',
							'other',
						],
					},
				},
			},
		})
	}

	return stripe.billingPortal.sessions.create({
		customer: organization.stripeCustomerId,
		return_url: `${process.env.BASE_URL}/app/${organization.slug}/settings`,
		configuration: configuration.id,
	})
}

export async function handleSubscriptionChange(
	subscription: Stripe.Subscription,
) {
	const customerId = subscription.customer as string
	const subscriptionId = subscription.id
	const status = subscription.status

	const organization = await getOrganizationByStripeCustomerId(customerId)

	if (!organization) {
		return
	}

	if (status === 'active' || status === 'trialing') {
		const plan = subscription.items.data[0]?.plan
		await updateOrganizationSubscription(organization.id, {
			stripeSubscriptionId: subscriptionId,
			stripeProductId: plan?.product as string,
			planName: (plan?.product as Stripe.Product).name,
			subscriptionStatus: status,
		})
	} else if (status === 'canceled' || status === 'unpaid') {
		await updateOrganizationSubscription(organization.id, {
			stripeSubscriptionId: null,
			stripeProductId: null,
			planName: null,
			subscriptionStatus: status,
		})
	}
}

export async function handleTrialEnd(subscription: Stripe.Subscription) {
	const customerId = subscription.customer as string

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
					daysRemaining: 3, // You can make this dynamic based on actual trial end date
				}),
			})
		}),
	)
}

export async function getStripePrices() {
	try {
		const prices = await stripe.prices.list({
			active: true,
			limit: 100,
			type: 'recurring',
		})

		const mappedPrices = prices.data.map((price) => ({
			id: price.id,
			productId:
				typeof price.product === 'string' ? price.product : price.product.id,
			unitAmount: price.unit_amount,
			currency: price.currency,
			interval: price.recurring?.interval,
			trialPeriodDays: price.recurring?.trial_period_days,
		}))

		return mappedPrices
	} catch (error: any) {
		console.error('getStripePrices: Failed to fetch prices:', error)
		throw new Error(`Failed to fetch Stripe prices: ${error?.message || error}`)
	}
}

export async function getStripeProducts() {
	try {
		const products = await stripe.products.list({
			active: true,
			limit: 10,
		})

		const mappedProducts = products.data.map((product) => ({
			id: product.id,
			name: product.name,
			description: product.description,
			defaultPriceId: product.default_price as string | undefined,
		}))

		return mappedProducts
	} catch (error: any) {
		console.error('getStripeProducts: Failed to fetch products:', error)
		throw new Error(
			`Failed to fetch Stripe products: ${error?.message || error}`,
		)
	}
}

export async function getTrialStatus(userId: string, organizationSlug: string) {
	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
		})

		const organization = await prisma.organization.findUnique({
			where: { slug: organizationSlug },
		})

		if (process.env.CREDIT_CARD_REQUIRED_FOR_TRIAL === 'manual') {
			return {
				isActive: true,
				daysRemaining:
					parseInt(process.env.TRIAL_DAYS!, 10) -
					(organization?.createdAt
						? Math.ceil(
								(new Date().getTime() - organization.createdAt.getTime()) /
									(1000 * 60 * 60 * 24),
							)
						: 0) +
					1,
			}
		}

		if (!user || !organization || !organization?.stripeCustomerId) {
			return { isActive: false, daysRemaining: 0 }
		}

		const subscriptions = await stripe.subscriptions.list({
			customer: organization.stripeCustomerId,
			status: 'all',
			limit: 1,
		})

		if (subscriptions.data.length === 0) {
			return { isActive: false, daysRemaining: 0 }
		}

		const subscription = subscriptions.data[0]

		if (subscription && subscription.status === 'trialing') {
			const trialEnd = new Date(subscription.trial_end! * 1000)
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

	// Get the subscription item id
	const subscription = await stripe.subscriptions.retrieve(
		organization.stripeSubscriptionId,
	)
	const subscriptionItems = subscription.items.data

	if (subscriptionItems.length !== 1) {
		throw new Error('Subscription does not have exactly 1 item')
	}

	// Update the stripe subscription
	return stripe.subscriptions.update(organization.stripeSubscriptionId, {
		items: [
			{
				id: subscriptionItems[0]?.id,
				quantity: numUsersInOrganization,
			},
		],
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
