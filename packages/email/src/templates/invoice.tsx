import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Row,
	Column,
	Section,
	Tailwind,
	Text,
} from '@react-email/components'

export interface InvoiceEmailProps {
	orderNumber: string
	invoiceDate: string
	customerName: string
	customerEmail: string
	items: Array<{
		name: string
		description: string
		quantity: number
		amount: string
	}>
	subtotal: string
	tax: string
	total: string
	downloadUrl: string
}

const InvoiceEmail = (props: InvoiceEmailProps) => {
	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Preview>
					Invoice {props.orderNumber} - Your Epic Notes purchase confirmation
				</Preview>
				<Body className="bg-[#F6F8FA] py-[40px] font-sans">
					<Container className="mx-auto max-w-[600px] rounded-[8px] bg-[#FFFFFF] px-[32px] py-[40px]">
						{/* Header */}
						<Section className="mb-[32px]">
							<Heading className="mb-[16px] text-center text-[24px] font-bold text-[#020304]">
								Invoice {props.orderNumber}
							</Heading>
						</Section>

						{/* Invoice Details */}
						<Section className="mb-[32px]">
							<Row>
								<Column className="w-1/2">
									<Text className="mb-[4px] text-[14px] font-medium text-[#6B7280]">
										INVOICE NUMBER
									</Text>
									<Text className="mb-[16px] text-[16px] font-medium text-[#020304]">
										{props.orderNumber}
									</Text>
									<Text className="mb-[4px] text-[14px] font-medium text-[#6B7280]">
										INVOICE DATE
									</Text>
									<Text className="mb-0 text-[16px] text-[#020304]">
										{props.invoiceDate}
									</Text>
								</Column>
								<Column className="w-1/2 text-right">
									<Text className="mb-[4px] text-[14px] font-medium text-[#6B7280]">
										BILLED TO
									</Text>
									<Text className="mb-[16px] text-[16px] font-medium text-[#020304]">
										{props.customerName}
									</Text>
									<Text className="mb-[4px] text-[14px] font-medium text-[#6B7280]">
										EMAIL
									</Text>
									<Text className="mb-0 text-[16px] text-[#020304]">
										{props.customerEmail}
									</Text>
								</Column>
							</Row>
						</Section>

						<Section className="mb-[24px] border-t border-solid border-[#E5E7EB] pt-[24px]" />

						{/* Itemized Breakdown */}
						<Section className="mb-[32px]">
							<Text className="mb-[20px] text-[18px] font-medium text-[#020304]">
								Order Summary
							</Text>

							{/* Header Row */}
							<Row className="mb-[16px] border-b border-[#E5E7EB] pb-[12px]">
								<Column className="w-1/2">
									<Text className="mb-0 text-[14px] font-medium text-[#6B7280]">
										ITEM
									</Text>
								</Column>
								<Column className="w-1/4 text-center">
									<Text className="mb-0 text-[14px] font-medium text-[#6B7280]">
										QTY
									</Text>
								</Column>
								<Column className="w-1/4 text-right">
									<Text className="mb-0 text-[14px] font-medium text-[#6B7280]">
										AMOUNT
									</Text>
								</Column>
							</Row>

							{/* Items */}
							{props.items.map((item, index) => (
								<Row key={index} className="mb-[12px]">
									<Column className="w-1/2">
										<Text className="mb-[2px] text-[16px] font-medium text-[#020304]">
											{item.name}
										</Text>
										<Text className="mb-0 text-[14px] text-[#6B7280]">
											{item.description}
										</Text>
									</Column>
									<Column className="w-1/4 text-center">
										<Text className="mb-0 text-[16px] text-[#020304]">
											{item.quantity}
										</Text>
									</Column>
									<Column className="w-1/4 text-right">
										<Text className="mb-0 text-[16px] font-medium text-[#020304]">
											${item.amount}
										</Text>
									</Column>
								</Row>
							))}
						</Section>

						<Section className="mb-[24px] border-t border-solid border-[#E5E7EB] pt-[24px]" />

						{/* Total Section */}
						<Section className="mb-[32px]">
							<Row className="mb-[8px]">
								<Column className="w-3/4">
									<Text className="mb-0 text-right text-[16px] text-[#020304]">
										Subtotal:
									</Text>
								</Column>
								<Column className="w-1/4">
									<Text className="mb-0 text-right text-[16px] text-[#020304]">
										${props.subtotal}
									</Text>
								</Column>
							</Row>
							<Row className="mb-[8px]">
								<Column className="w-3/4">
									<Text className="mb-0 text-right text-[16px] text-[#020304]">
										Tax:
									</Text>
								</Column>
								<Column className="w-1/4">
									<Text className="mb-0 text-right text-[16px] text-[#020304]">
										${props.tax}
									</Text>
								</Column>
							</Row>
							<Row className="border-t border-[#E5E7EB] pt-[12px]">
								<Column className="w-3/4">
									<Text className="mb-0 text-right text-[18px] font-medium text-[#020304]">
										Total:
									</Text>
								</Column>
								<Column className="w-1/4">
									<Text className="mb-0 text-right text-[18px] font-medium text-[#020304]">
										${props.total}
									</Text>
								</Column>
							</Row>
						</Section>

						{/* Download Button */}
						<Section className="mb-[32px] text-center">
							<Button
								href={props.downloadUrl}
								className="box-border rounded-[6px] bg-[#2563eb] px-[24px] py-[12px] text-[16px] font-medium text-white no-underline"
							>
								Download Invoice
							</Button>
						</Section>

						<Text className="mb-[16px] text-center text-[16px] leading-[24px] text-[#020304]">
							Questions about your invoice? Our support team is here to help.
						</Text>

						{/* Footer */}
						<Section className="mt-[40px] border-t border-solid border-[#E5E7EB] pt-[32px]">
							<Text className="mb-[8px] text-center text-[14px] leading-[20px] text-[#6B7280]">
								Thank you for choosing Epic Notes
							</Text>
							<Text className="mb-[8px] text-center text-[12px] leading-[16px] text-[#6B7280]">
								<Link
									href="mailto:support@epicnotes.com"
									className="text-[#2563eb] no-underline"
								>
									Contact Support
								</Link>
								{' | '}
								<Link
									href={props.downloadUrl}
									className="text-[#2563eb] no-underline"
								>
									Download Invoice
								</Link>
							</Text>
							<Text className="m-0 text-center text-[12px] leading-[16px] text-[#6B7280]">
								Copyright © 2025 Epic Notes
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}

InvoiceEmail.PreviewProps = {
	orderNumber: 'INV-2025-001234',
	invoiceDate: 'January 24, 2025',
	customerName: 'Epic Notes Pro',
	customerEmail: 'alex@example.com',
	items: [
		{
			name: 'Epic Notes Pro Plan',
			description: 'Monthly subscription - Advanced note-taking platform',
			quantity: 1,
			amount: '29.00',
		},
		{
			name: 'Team Collaboration',
			description: 'Additional team member seats (5 users)',
			quantity: 5,
			amount: '75.00',
		},
		{
			name: 'Premium Support',
			description: 'Priority customer support and onboarding',
			quantity: 1,
			amount: '15.00',
		},
	],
	subtotal: '119.00',
	tax: '9.52',
	total: '128.52',
	downloadUrl: 'https://epicnotes.com/invoice/download/INV-2025-001234',
}

export default InvoiceEmail
