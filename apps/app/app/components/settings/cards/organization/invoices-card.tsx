import { Link } from 'react-router'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'

type Invoice = {
	id?: string
	number: string | null
	status: string | null
	amountPaid: number
	amountDue: number
	currency: string
	created: number
	dueDate: number | null
	hostedInvoiceUrl: string | null
	invoicePdf: string | null
	periodStart: number | null
	periodEnd: number | null
}

type InvoicesCardProps = {
	invoices: Invoice[]
}

export function InvoicesCard({ invoices }: InvoicesCardProps) {
	const formatCurrency = (amount: number, currency: string) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
		}).format(amount / 100)
	}

	const formatDate = (timestamp: number) => {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})
	}

	const getStatusBadge = (status: string | null) => {
		switch (status) {
			case 'paid':
				return <Badge variant="default">Paid</Badge>
			case 'open':
				return <Badge variant="secondary">Open</Badge>
			case 'void':
				return <Badge variant="outline">Void</Badge>
			case 'uncollectible':
				return <Badge variant="destructive">Uncollectible</Badge>
			default:
				return <Badge variant="outline">{status || 'Unknown'}</Badge>
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Invoices</CardTitle>
				<CardDescription>
					View and download your billing invoices
				</CardDescription>
			</CardHeader>
			<CardContent>
				{invoices.length === 0 ? (
					<div className="py-8 text-center">
						<Icon
							name="file-text"
							className="text-muted-foreground mx-auto h-12 w-12"
						/>
						<p className="text-muted-foreground mt-4">
							No invoices found. Invoices will appear here once you have an
							active subscription.
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{invoices.map((invoice) => (
							<div
								key={invoice.id}
								className="flex items-center justify-between rounded-lg border p-4"
							>
								<div className="flex-1">
									<div className="flex items-center gap-3">
										<div>
											<p className="font-medium">
												{invoice.number || `Invoice ${invoice.id?.slice(-8)}`}
											</p>
											<p className="text-muted-foreground text-sm">
												{formatDate(invoice.created)}
												{invoice.periodStart && invoice.periodEnd && (
													<span className="ml-2">
														({formatDate(invoice.periodStart)} -{' '}
														{formatDate(invoice.periodEnd)})
													</span>
												)}
											</p>
										</div>
										{getStatusBadge(invoice.status)}
									</div>
								</div>
								<div className="flex items-center gap-4">
									<div className="text-right">
										<p className="font-medium">
											{formatCurrency(invoice.amountPaid, invoice.currency)}
										</p>
										{invoice.amountDue > 0 && (
											<p className="text-muted-foreground text-sm">
												Due:{' '}
												{formatCurrency(invoice.amountDue, invoice.currency)}
											</p>
										)}
									</div>
									<div className="flex gap-2">
										{invoice.hostedInvoiceUrl && (
											<Button variant="outline" size="sm" asChild>
												<Link
													to={invoice.hostedInvoiceUrl}
													target="_blank"
													rel="noopener noreferrer"
												>
													<Icon name="external-link" className="h-4 w-4" />
													View
												</Link>
											</Button>
										)}
										{invoice.invoicePdf && (
											<Button variant="outline" size="sm" asChild>
												<Link
													to={invoice.invoicePdf}
													target="_blank"
													rel="noopener noreferrer"
												>
													<Icon name="download" className="h-4 w-4" />
													PDF
												</Link>
											</Button>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
