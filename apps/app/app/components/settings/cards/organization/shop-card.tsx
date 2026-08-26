import { Trans } from '@lingui/macro'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import { Textarea } from '@repo/ui/textarea'
import { Form } from 'react-router'
import {
	SHOP_PLATFORM_FEE_PERCENT,
	type ShopOrganization,
	type ShopOrderSummary,
} from '#app/utils/shop.types.ts'

type ShopCardProps = {
	organization: ShopOrganization
	orders: ShopOrderSummary[]
}

function formatMoney(cents: number, currency = 'usd') {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	}).format(cents / 100)
}

export function ShopCard({ organization, orders }: ShopCardProps) {
	const isUsRegion = (organization.dataRegion || 'us') === 'us'
	const isConnected = Boolean(organization.stripeConnectAccountId)
	const canAcceptPayments =
		isConnected && organization.stripeConnectChargesEnabled
	const priceDollars =
		typeof organization.shopProductPriceCents === 'number'
			? (organization.shopProductPriceCents / 100).toFixed(2)
			: '19.99'
	const orgSharePercent = 100 - SHOP_PLATFORM_FEE_PERCENT

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Site shop</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>
							Sell one product on your public site. The platform keeps{' '}
							{SHOP_PLATFORM_FEE_PERCENT}% and the rest is paid out to your
							connected Stripe account.
						</Trans>
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{!isUsRegion ? (
						<div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
							<Trans>
								Shop payouts are available for US organizations only. KSA
								checkout will be supported separately.
							</Trans>
						</div>
					) : (
						<>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant={canAcceptPayments ? 'default' : 'secondary'}>
									{canAcceptPayments ? (
										<Trans>Payments enabled</Trans>
									) : isConnected ? (
										<Trans>Setup incomplete</Trans>
									) : (
										<Trans>Not connected</Trans>
									)}
								</Badge>
								{organization.stripeConnectPayoutsEnabled ? (
									<Badge variant="outline">
										<Trans>Payouts enabled</Trans>
									</Badge>
								) : null}
							</div>

							<div className="flex flex-wrap gap-3">
								<Form method="post">
									<input type="hidden" name="intent" value="connect-stripe" />
									<Button type="submit">
										{isConnected ? (
											<Trans>Continue Stripe setup</Trans>
										) : (
											<Trans>Connect Stripe</Trans>
										)}
									</Button>
								</Form>
								{isConnected ? (
									<Form method="post">
										<input
											type="hidden"
											name="intent"
											value="open-stripe-dashboard"
										/>
										<Button type="submit" variant="outline">
											<Trans>Open Stripe dashboard</Trans>
										</Button>
									</Form>
								) : null}
							</div>

							<Form method="post" className="space-y-4 border-t pt-6">
								<input
									type="hidden"
									name="intent"
									value="update-shop-product"
								/>

								<div className="space-y-2">
									<Label htmlFor="productName">
										<Trans>Product name</Trans>
									</Label>
									<Input
										id="productName"
										name="productName"
										defaultValue={
											organization.shopProductName || 'Starter pack'
										}
										required
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="productDescription">
										<Trans>Description</Trans>
									</Label>
									<Textarea
										id="productDescription"
										name="productDescription"
										rows={3}
										defaultValue={
											organization.shopProductDescription ||
											'A simple offering for your customers.'
										}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="priceDollars">
										<Trans>Price (USD)</Trans>
									</Label>
									<Input
										id="priceDollars"
										name="priceDollars"
										type="number"
										min="0.5"
										step="0.01"
										defaultValue={priceDollars}
										required
									/>
									<p className="text-muted-foreground text-xs">
										<Trans>
											Customers pay this amount. You receive {orgSharePercent}%
											after the platform fee.
										</Trans>
									</p>
								</div>

								<label className="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										name="enabled"
										defaultChecked={organization.shopEnabled}
										className="border-input size-4 rounded"
									/>
									<Trans>Show product on your public site</Trans>
								</label>

								<Button type="submit">
									<Trans>Save product</Trans>
								</Button>
							</Form>

							{organization.sitePublished ? (
								<p className="text-muted-foreground text-sm">
									<Trans>
										Your customers can buy at{' '}
										<code className="bg-muted rounded px-1">/shop</code> on your
										published site once payments are enabled.
									</Trans>
								</p>
							) : (
								<p className="text-sm text-amber-700 dark:text-amber-400">
									<Trans>
										Publish your site before sharing the shop link with
										customers.
									</Trans>
								</p>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{isUsRegion && orders.length > 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>
							<Trans>Recent orders</Trans>
						</CardTitle>
						<CardDescription>
							<Trans>Orders placed on your public site.</Trans>
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="divide-y rounded-lg border">
							{orders.map((order) => (
								<li
									key={order.id}
									className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
								>
									<div>
										<p className="font-medium">{order.productName}</p>
										{order.customerName || order.customerPhone ? (
											<p className="text-muted-foreground">
												{order.customerName}
												{order.customerName && order.customerPhone
													? ' · '
													: null}
												{order.customerPhone}
											</p>
										) : (
											<p className="text-muted-foreground">
												<Trans>Guest checkout</Trans>
											</p>
										)}
										<p className="text-muted-foreground">
											{order.status} ·{' '}
											{order.createdAt
												? new Date(order.createdAt).toLocaleString()
												: ''}
										</p>
									</div>
									<div className="text-right">
										<p>{formatMoney(order.amountCents, order.currency)}</p>
										<p className="text-muted-foreground text-xs">
											<Trans>You receive</Trans>{' '}
											{formatMoney(order.orgPayoutCents, order.currency)}
										</p>
									</div>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			) : null}
		</div>
	)
}
