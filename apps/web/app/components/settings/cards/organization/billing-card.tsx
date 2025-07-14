import { type Organization } from '@prisma/client'
import { Check } from 'lucide-react'
import { Form, Link } from 'react-router'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { type getPlansAndPrices } from '#app/utils/payments.server.ts'

const PLANS = {
	Base: {
		name: 'Base plan',
		seats: 3,
		price: 7.99,
		additionalSeatPrice: 4.99,
	},
	Plus: {
		name: 'Plus plan',
		seats: 5,
		price: 49.99,
		additionalSeatPrice: 9.99,
	},
}

type BillingCardProps = {
	organization: Pick<Organization, 'id' | 'name' | 'slug' | 'stripeCustomerId' | 'stripeSubscriptionId' | 'stripeProductId' | 'planName' | 'subscriptionStatus'> & {
		_count?: {
			users: number
		}
	}
	plansAndPrices?: Awaited<ReturnType<typeof getPlansAndPrices>> | null
	isClosedBeta?: boolean
}

export function BillingCard({ organization, plansAndPrices, isClosedBeta }: BillingCardProps) {
	if (isClosedBeta) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Billing & Subscription</CardTitle>
					<CardDescription>Manage your organization's subscription</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-center py-8">
						<div className="mb-4">
							<Badge variant="secondary" className="text-sm">
								Beta Access
							</Badge>
						</div>
						<p className="text-muted-foreground">
							You are covered during our beta phase. No billing required at this time.
						</p>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			{/* Current Subscription Status */}
			<Card>
				<CardHeader>
					<CardTitle>Current Subscription</CardTitle>
					<CardDescription>Your organization's current plan and billing status</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<div className="flex items-center gap-2 mb-2">
								<h3 className="font-medium text-lg">
									{organization.planName || 'Free Plan'}
								</h3>
								{organization.subscriptionStatus && (
									<Badge 
										variant={
											organization.subscriptionStatus === 'active' ? 'default' :
											organization.subscriptionStatus === 'trialing' ? 'secondary' :
											'destructive'
										}
									>
										{organization.subscriptionStatus === 'active' ? 'Active' :
										 organization.subscriptionStatus === 'trialing' ? 'Trial' :
										 organization.subscriptionStatus}
									</Badge>
								)}
							</div>
							<p className="text-sm text-muted-foreground">
								{organization.subscriptionStatus === 'active'
									? 'Billed monthly'
									: organization.subscriptionStatus === 'trialing'
									? 'Trial period active'
									: organization.stripeCustomerId
									? 'Subscription inactive'
									: 'No active subscription'}
							</p>
							{organization._count?.users && (
								<p className="text-sm text-muted-foreground mt-1">
									{organization._count.users} active member{organization._count.users !== 1 ? 's' : ''}
								</p>
							)}
						</div>
						<div className="flex gap-2">
							{organization.stripeCustomerId ? (
								<Form method="post">
									<input type="hidden" name="intent" value="customer-portal" />
									<Button type="submit" variant="outline">
										Manage Subscription
									</Button>
								</Form>
							) : (
								<Button asChild>
									<Link to={`/pricing?orgSlug=${organization.slug}`}>
										Subscribe
									</Link>
								</Button>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Available Plans */}
			{plansAndPrices && (
				<div className="grid gap-6 lg:grid-cols-2">
					<PricingPlan
						title={PLANS.Base.name}
						price={PLANS.Base.price}
						includesSeats={PLANS.Base.seats}
						additionalSeatPrice={PLANS.Base.additionalSeatPrice}
						currentPlan={plansAndPrices?.prices.base?.productId === organization.stripeProductId}
						priceId={plansAndPrices?.prices.base?.id}
					/>
					<PricingPlan
						title={PLANS.Plus.name}
						price={PLANS.Plus.price}
						includesSeats={PLANS.Plus.seats}
						additionalSeatPrice={PLANS.Plus.additionalSeatPrice}
						currentPlan={plansAndPrices?.prices.plus?.productId === organization.stripeProductId}
						priceId={plansAndPrices?.prices.plus?.id}
					/>
				</div>
			)}

			{/* Enterprise Plan */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-semibold mb-2">Enterprise Plan</h3>
							<p className="text-sm text-muted-foreground">
								Single sign-on, custom SLA, private support channel, and more.{' '}
								<Link to="/contact" className="text-primary hover:underline">
									Learn more
								</Link>
							</p>
						</div>
						<Button variant="outline" asChild>
							<Link to="/contact?subject=Enterprise">Schedule a call</Link>
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Help Section */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex items-center justify-between">
						<div className="text-sm text-muted-foreground">
							Questions about billing?
						</div>
						<Button variant="link" className="text-sm" asChild>
							<Link to="/support">Get in touch</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

function PricingPlan({
	title,
	price,
	includesSeats,
	additionalSeatPrice,
	currentPlan,
	priceId,
}: {
	title: string
	price: number
	includesSeats: number
	additionalSeatPrice: number
	currentPlan?: boolean
	priceId?: string
}) {
	return (
		<Card className={currentPlan ? 'ring-2 ring-primary' : ''}>
			<CardHeader>
				<div className="flex items-baseline gap-2">
					<CardTitle className="text-2xl font-bold">${price}</CardTitle>
					<span className="text-sm text-muted-foreground">per month</span>
				</div>
				<CardDescription>{title}</CardDescription>
			</CardHeader>
			<CardContent>
				<ul className="text-sm text-muted-foreground space-y-2 mb-4">
					<li>Includes {includesSeats} user seats</li>
					<li>Additional seats: ${additionalSeatPrice}/seat/month</li>
				</ul>

				<Form method="post">
					<input type="hidden" name="intent" value="upgrade" />
					<input type="hidden" name="priceId" value={priceId} />
					<Button
						disabled={currentPlan}
						variant={currentPlan ? 'outline' : 'default'}
						type="submit"
						className="w-full"
					>
						{currentPlan ? (
							<>
								<Check className="mr-2 h-4 w-4" /> Current Plan
							</>
						) : (
							'Upgrade'
						)}
					</Button>
				</Form>
			</CardContent>
		</Card>
	)
}
