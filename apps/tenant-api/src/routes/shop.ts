import { desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { customerPaymentMethods, shopOrders } from '@repo/tenant-db'
import { authenticateCustomer } from './auth.ts'

export const shopRoutes = new Hono()

function formatMoney(cents: number, currency = 'usd') {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase(),
	}).format(cents / 100)
}

shopRoutes.get('/orders', async (c) => {
	let auth
	try {
		auth = await authenticateCustomer(c)
	} catch (response) {
		return response as Response
	}

	const { db, customerId } = auth

	const orders = await db
		.select({
			id: shopOrders.id,
			productName: shopOrders.productName,
			amountCents: shopOrders.amountCents,
			currency: shopOrders.currency,
			status: shopOrders.status,
			createdAt: shopOrders.createdAt,
		})
		.from(shopOrders)
		.where(eq(shopOrders.customerId, customerId))
		.orderBy(desc(shopOrders.createdAt))
		.limit(50)

	return c.json({
		orders: orders.map((order) => ({
			id: order.id,
			productName: order.productName,
			amount: formatMoney(order.amountCents, order.currency),
			status: order.status,
			createdAt: order.createdAt?.toISOString() ?? null,
		})),
	})
})

shopRoutes.get('/payment-methods', async (c) => {
	let auth
	try {
		auth = await authenticateCustomer(c)
	} catch (response) {
		return response as Response
	}

	const { db, customerId } = auth

	const methods = await db
		.select({
			id: customerPaymentMethods.id,
			stripePaymentMethodId: customerPaymentMethods.stripePaymentMethodId,
			brand: customerPaymentMethods.brand,
			last4: customerPaymentMethods.last4,
			expMonth: customerPaymentMethods.expMonth,
			expYear: customerPaymentMethods.expYear,
			createdAt: customerPaymentMethods.createdAt,
		})
		.from(customerPaymentMethods)
		.where(eq(customerPaymentMethods.customerId, customerId))
		.orderBy(desc(customerPaymentMethods.updatedAt))
		.limit(20)

	return c.json({
		paymentMethods: methods.map((method) => ({
			id: method.id,
			stripePaymentMethodId: method.stripePaymentMethodId,
			brand: method.brand,
			last4: method.last4,
			expMonth: method.expMonth,
			expYear: method.expYear,
			label: `${method.brand} •••• ${method.last4}`,
			expires: `${String(method.expMonth).padStart(2, '0')}/${String(method.expYear).slice(-2)}`,
			createdAt: method.createdAt?.toISOString() ?? null,
		})),
	})
})
