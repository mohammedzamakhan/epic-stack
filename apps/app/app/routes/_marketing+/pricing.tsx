import { type Organization } from '@prisma/client'
import {
	type ActionFunctionArgs,
	redirect,
	Form,
	useLoaderData,
} from 'react-router'
import { Button, Icon } from '@repo/ui'

import { prisma } from '#app/utils/db.server.ts'
import {
	createCheckoutSession,
	getPlansAndPrices,
} from '#app/utils/payments.server.ts'

export async function loader() {
	const isClosedBeta = process.env.LAUNCH_STATUS === 'CLOSED_BETA'
	if (isClosedBeta) {
		return redirect('/')
	}
	const plansAndPrices = await getPlansAndPrices()
	const trialDays = parseInt(process.env.TRIAL_DAYS || '14', 10)

	return {
		...plansAndPrices,
		trialDays,
	}
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const priceId = formData.get('priceId') as string
	const url = new URL(request.url)
	const orgSlug = url.searchParams.get('orgSlug') as string

	let organization: Organization | null = null

	if (orgSlug) {
		organization = await prisma.organization.findUnique({
			where: {
				slug: orgSlug,
			},
		})
	}

	return createCheckoutSession(request, {
		organization,
		priceId,
		from: 'pricing',
	})
}

export default function Pricing() {
	const { prices, plans, trialDays } = useLoaderData<typeof loader>()

	return (
		<main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
			<div className="mb-12 text-center">
				<h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-100">
					Simple, transparent pricing
				</h1>
				<p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
					Choose the plan that's right for you and your team
				</p>
			</div>

			<div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
				<PricingCard
					name={plans.base?.name || 'Base'}
					price={prices.base?.unitAmount || 799}
					interval={prices.base?.interval || 'month'}
					trialDays={prices.base?.trialPeriodDays || trialDays}
					features={[
						'Unlimited Usage',
						'Unlimited Organization Members',
						'Email Support',
						'Core Features',
						'Mobile App Access',
					]}
					priceId={prices.base?.id}
					isPopular={false}
				/>
				<PricingCard
					name={plans.plus?.name || 'Plus'}
					price={prices.plus?.unitAmount || 4999}
					interval={prices.plus?.interval || 'month'}
					trialDays={prices.plus?.trialPeriodDays || trialDays}
					features={[
						'Everything in Base, and:',
						'Early Access to New Features',
						'24/7 Support + Slack Access',
						'Advanced Analytics',
						'Priority Feature Requests',
						'Custom Integrations',
					]}
					priceId={prices.plus?.id}
					isPopular={true}
				/>
			</div>

			<div className="mt-12 text-center">
				<p className="text-sm text-gray-600 dark:text-gray-400">
					All plans include a {trialDays}-day free trial. No credit card
					required to start your trial.
				</p>
			</div>
		</main>
	)
}

function PricingCard({
	name,
	price,
	interval,
	trialDays,
	features,
	priceId,
	isPopular,
}: {
	name: string
	price: number
	interval: string
	trialDays: number
	features: string[]
	priceId?: string
	isPopular: boolean
}) {
	return (
		<div
			className={`relative rounded-2xl border ${isPopular ? 'border-orange-500 shadow-lg' : 'border-gray-200 dark:border-gray-700'} bg-white p-8 dark:bg-gray-800`}
		>
			{isPopular && (
				<div className="absolute -top-4 left-1/2 -translate-x-1/2">
					<span className="rounded-full bg-orange-500 px-4 py-1 text-sm font-medium text-white">
						Most Popular
					</span>
				</div>
			)}

			<div className="text-center">
				<h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
					{name}
				</h2>
				<p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
					with {trialDays} day free trial
				</p>
				<div className="mb-6">
					<span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
						${(price / 100).toFixed(0)}
					</span>
					<span className="ml-1 text-xl text-gray-600 dark:text-gray-400">
						per user / {interval}
					</span>
				</div>
			</div>

			<ul className="mb-8 space-y-4">
				{features.map((feature, index) => (
					<li key={index} className="flex items-start">
						<Icon
							name="check"
							className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-orange-500"
						/>
						<span className="text-gray-700 dark:text-gray-300">{feature}</span>
					</li>
				))}
			</ul>

			<Form method="post">
				<input type="hidden" name="priceId" value={priceId} />
				<Button
					type="submit"
					className={`w-full ${isPopular ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
					variant={isPopular ? 'default' : 'outline'}
				>
					Get Started
				</Button>
			</Form>
		</div>
	)
}
