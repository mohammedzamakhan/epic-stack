import { type ActionFunctionArgs } from 'react-router'
import { handleStripeWebhook } from '@repo/payments'
import {
	stripe,
	handleSubscriptionChange,
	handleTrialEnd,
} from '#app/utils/payments.server.ts'

export async function action(args: ActionFunctionArgs) {
	return handleStripeWebhook(args, {
		stripe,
		handleSubscriptionChange,
		handleTrialEnd,
		webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
	})
}
