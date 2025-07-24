import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

export interface InvoiceEmailProps {
  orderNumber: string;
  invoiceDate: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    description: string;
    quantity: number;
    amount: string;
  }>;
  subtotal: string;
  tax: string;
  total: string;
  downloadUrl: string;
}

const InvoiceEmail = (props: InvoiceEmailProps) => {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>Invoice {props.orderNumber} - Your Owner.com purchase confirmation</Preview>
        <Body className="bg-white font-sans py-[40px]">
          <Container className="mx-auto px-[20px] max-w-[600px]">
            {/* Header */}
            <Section className="mb-[40px]">
              <Img
                src="https://cdn.prod.website-files.com/66643a14df53b71d1ed72d08/6690093d302b5a56c10c0a1a_favicon.png"
                width="48"
                height="48"
                alt="Owner.com"
                className="mx-auto"
              />
              <Heading className="text-center text-[28px] font-light text-black mt-[20px] mb-0">
                Invoice
              </Heading>
            </Section>

            {/* Invoice Details */}
            <Section className="mb-[32px]">
              <Row>
                <Column className="w-1/2">
                  <Text className="text-[14px] text-gray-600 mb-[4px] font-medium">
                    INVOICE NUMBER
                  </Text>
                  <Text className="text-[16px] text-black mb-[16px] font-medium">
                    {props.orderNumber}
                  </Text>
                  <Text className="text-[14px] text-gray-600 mb-[4px] font-medium">
                    INVOICE DATE
                  </Text>
                  <Text className="text-[16px] text-black mb-0">
                    {props.invoiceDate}
                  </Text>
                </Column>
                <Column className="w-1/2 text-right">
                  <Text className="text-[14px] text-gray-600 mb-[4px] font-medium">
                    BILLED TO
                  </Text>
                  <Text className="text-[16px] text-black mb-[16px] font-medium">
                    {props.customerName}
                  </Text>
                  <Text className="text-[14px] text-gray-600 mb-[4px] font-medium">
                    EMAIL
                  </Text>
                  <Text className="text-[16px] text-black mb-0">
                    {props.customerEmail}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Hr className="border-gray-200 my-[32px]" />

            {/* Itemized Breakdown */}
            <Section className="mb-[32px]">
              <Text className="text-[18px] font-medium text-black mb-[20px]">
                Order Summary
              </Text>
              
              {/* Header Row */}
              <Row className="border-b border-gray-200 pb-[12px] mb-[16px]">
                <Column className="w-1/2">
                  <Text className="text-[14px] font-medium text-gray-600 mb-0">
                    ITEM
                  </Text>
                </Column>
                <Column className="w-1/4 text-center">
                  <Text className="text-[14px] font-medium text-gray-600 mb-0">
                    QTY
                  </Text>
                </Column>
                <Column className="w-1/4 text-right">
                  <Text className="text-[14px] font-medium text-gray-600 mb-0">
                    AMOUNT
                  </Text>
                </Column>
              </Row>

              {/* Items */}
              {props.items.map((item, index) => (
                <Row key={index} className="mb-[12px]">
                  <Column className="w-1/2">
                    <Text className="text-[16px] text-black mb-[2px] font-medium">
                      {item.name}
                    </Text>
                    <Text className="text-[14px] text-gray-600 mb-0">
                      {item.description}
                    </Text>
                  </Column>
                  <Column className="w-1/4 text-center">
                    <Text className="text-[16px] text-black mb-0">
                      {item.quantity}
                    </Text>
                  </Column>
                  <Column className="w-1/4 text-right">
                    <Text className="text-[16px] text-black mb-0 font-medium">
                      ${item.amount}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>

            <Hr className="border-gray-200 my-[24px]" />

            {/* Total Section */}
            <Section className="mb-[32px]">
              <Row className="mb-[8px]">
                <Column className="w-3/4">
                  <Text className="text-[16px] text-black mb-0 text-right">
                    Subtotal:
                  </Text>
                </Column>
                <Column className="w-1/4">
                  <Text className="text-[16px] text-black mb-0 text-right">
                    ${props.subtotal}
                  </Text>
                </Column>
              </Row>
              <Row className="mb-[8px]">
                <Column className="w-3/4">
                  <Text className="text-[16px] text-black mb-0 text-right">
                    Tax:
                  </Text>
                </Column>
                <Column className="w-1/4">
                  <Text className="text-[16px] text-black mb-0 text-right">
                    ${props.tax}
                  </Text>
                </Column>
              </Row>
              <Row className="border-t border-gray-200 pt-[12px]">
                <Column className="w-3/4">
                  <Text className="text-[18px] text-black mb-0 text-right font-medium">
                    Total:
                  </Text>
                </Column>
                <Column className="w-1/4">
                  <Text className="text-[18px] text-black mb-0 text-right font-medium">
                    ${props.total}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Download Button */}
            <Section className="text-center mb-[40px]">
              <Button
                href={props.downloadUrl}
                className="bg-[#015bf8] text-white px-[32px] py-[12px] text-[16px] font-medium"
                style={{ borderRadius: '4px' }}
              >
                Download Invoice
              </Button>
            </Section>

            {/* Support Section */}
            <Section className="text-center mb-[32px]">
              <Text className="text-[16px] text-black mb-[8px]">
                Questions about your invoice?
              </Text>
              <Text className="text-[14px] text-gray-600 mb-0">
                Contact our support team at{' '}
                <Link href="mailto:support@owner.com" className="text-[#015bf8]">
                  support@owner.com
                </Link>
              </Text>
            </Section>

            <Hr className="border-gray-200 my-[32px]" />

            {/* Footer */}
            <Section className="text-center">
              <Text className="text-[14px] text-gray-600 mb-[8px]">
                Thank you for choosing Owner.com to grow your restaurant business.
              </Text>
              <Text className="text-[12px] text-gray-500 mb-0 m-0">
                © 2024 Owner.com. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

InvoiceEmail.PreviewProps = {
  orderNumber: "INV-2024-001234",
  invoiceDate: "December 11, 2024",
  customerName: "Restaurant Pro",
  customerEmail: "mohammed.zama.khan@gmail.com",
  items: [
    {
      name: "Owner.com Pro Plan",
      description: "Monthly subscription - Restaurant marketing platform",
      quantity: 1,
      amount: "199.00"
    },
    {
      name: "Mobile App Setup",
      description: "One-time setup fee for branded mobile application",
      quantity: 1,
      amount: "299.00"
    },
    {
      name: "Premium Support",
      description: "Priority customer support and onboarding",
      quantity: 1,
      amount: "99.00"
    }
  ],
  subtotal: "597.00",
  tax: "47.76",
  total: "644.76",
  downloadUrl: "https://owner.com/invoice/download/INV-2024-001234"
};

export default InvoiceEmail;