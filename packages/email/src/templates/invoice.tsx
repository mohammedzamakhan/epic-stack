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
        <Preview>Invoice {props.orderNumber} - Your Epic Notes purchase confirmation</Preview>
        <Body className="bg-[#F6F8FA] font-sans py-[40px]">
          <Container className="bg-[#FFFFFF] rounded-[8px] mx-auto px-[32px] py-[40px] max-w-[600px]">
            {/* Header */}
            <Section className="mb-[32px]">
              <Heading className="text-[#020304] text-[24px] font-bold mb-[16px] text-center">
                Invoice {props.orderNumber}
              </Heading>
            </Section>

            {/* Invoice Details */}
            <Section className="mb-[32px]">
              <Row>
                <Column className="w-1/2">
                  <Text className="text-[14px] text-[#6B7280] mb-[4px] font-medium">
                    INVOICE NUMBER
                  </Text>
                  <Text className="text-[16px] text-[#020304] mb-[16px] font-medium">
                    {props.orderNumber}
                  </Text>
                  <Text className="text-[14px] text-[#6B7280] mb-[4px] font-medium">
                    INVOICE DATE
                  </Text>
                  <Text className="text-[16px] text-[#020304] mb-0">
                    {props.invoiceDate}
                  </Text>
                </Column>
                <Column className="w-1/2 text-right">
                  <Text className="text-[14px] text-[#6B7280] mb-[4px] font-medium">
                    BILLED TO
                  </Text>
                  <Text className="text-[16px] text-[#020304] mb-[16px] font-medium">
                    {props.customerName}
                  </Text>
                  <Text className="text-[14px] text-[#6B7280] mb-[4px] font-medium">
                    EMAIL
                  </Text>
                  <Text className="text-[16px] text-[#020304] mb-0">
                    {props.customerEmail}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section className="border-t border-solid border-[#E5E7EB] pt-[24px] mb-[24px]" />

            {/* Itemized Breakdown */}
            <Section className="mb-[32px]">
              <Text className="text-[18px] font-medium text-[#020304] mb-[20px]">
                Order Summary
              </Text>
              
              {/* Header Row */}
              <Row className="border-b border-[#E5E7EB] pb-[12px] mb-[16px]">
                <Column className="w-1/2">
                  <Text className="text-[14px] font-medium text-[#6B7280] mb-0">
                    ITEM
                  </Text>
                </Column>
                <Column className="w-1/4 text-center">
                  <Text className="text-[14px] font-medium text-[#6B7280] mb-0">
                    QTY
                  </Text>
                </Column>
                <Column className="w-1/4 text-right">
                  <Text className="text-[14px] font-medium text-[#6B7280] mb-0">
                    AMOUNT
                  </Text>
                </Column>
              </Row>

              {/* Items */}
              {props.items.map((item, index) => (
                <Row key={index} className="mb-[12px]">
                  <Column className="w-1/2">
                    <Text className="text-[16px] text-[#020304] mb-[2px] font-medium">
                      {item.name}
                    </Text>
                    <Text className="text-[14px] text-[#6B7280] mb-0">
                      {item.description}
                    </Text>
                  </Column>
                  <Column className="w-1/4 text-center">
                    <Text className="text-[16px] text-[#020304] mb-0">
                      {item.quantity}
                    </Text>
                  </Column>
                  <Column className="w-1/4 text-right">
                    <Text className="text-[16px] text-[#020304] mb-0 font-medium">
                      ${item.amount}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>

            <Section className="border-t border-solid border-[#E5E7EB] pt-[24px] mb-[24px]" />

            {/* Total Section */}
            <Section className="mb-[32px]">
              <Row className="mb-[8px]">
                <Column className="w-3/4">
                  <Text className="text-[16px] text-[#020304] mb-0 text-right">
                    Subtotal:
                  </Text>
                </Column>
                <Column className="w-1/4">
                  <Text className="text-[16px] text-[#020304] mb-0 text-right">
                    ${props.subtotal}
                  </Text>
                </Column>
              </Row>
              <Row className="mb-[8px]">
                <Column className="w-3/4">
                  <Text className="text-[16px] text-[#020304] mb-0 text-right">
                    Tax:
                  </Text>
                </Column>
                <Column className="w-1/4">
                  <Text className="text-[16px] text-[#020304] mb-0 text-right">
                    ${props.tax}
                  </Text>
                </Column>
              </Row>
              <Row className="border-t border-[#E5E7EB] pt-[12px]">
                <Column className="w-3/4">
                  <Text className="text-[18px] text-[#020304] mb-0 text-right font-medium">
                    Total:
                  </Text>
                </Column>
                <Column className="w-1/4">
                  <Text className="text-[18px] text-[#020304] mb-0 text-right font-medium">
                    ${props.total}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Download Button */}
            <Section className="text-center mb-[32px]">
              <Button
                href={props.downloadUrl}
                className="bg-[#2563eb] text-white px-[24px] py-[12px] rounded-[6px] text-[16px] font-medium no-underline box-border"
              >
                Download Invoice
              </Button>
            </Section>

            <Text className="text-[#020304] text-[16px] leading-[24px] mb-[16px] text-center">
              Questions about your invoice? Our support team is here to help.
            </Text>

            {/* Footer */}
            <Section className="border-t border-solid border-[#E5E7EB] pt-[32px] mt-[40px]">
              <Text className="text-[#6B7280] text-[14px] leading-[20px] text-center mb-[8px]">
                Thank you for choosing Epic Notes
              </Text>
              <Text className="text-[#6B7280] text-[12px] leading-[16px] text-center mb-[8px]">
                <Link href="mailto:support@epicnotes.com" className="text-[#2563eb] no-underline">Contact Support</Link>
                {" | "}
                <Link href={props.downloadUrl} className="text-[#2563eb] no-underline">Download Invoice</Link>
              </Text>
              <Text className="text-[#6B7280] text-[12px] leading-[16px] text-center m-0">
                Copyright © 2025 Epic Notes
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

InvoiceEmail.PreviewProps = {
  orderNumber: "INV-2025-001234",
  invoiceDate: "January 24, 2025",
  customerName: "Epic Notes Pro",
  customerEmail: "alex@example.com",
  items: [
    {
      name: "Epic Notes Pro Plan",
      description: "Monthly subscription - Advanced note-taking platform",
      quantity: 1,
      amount: "29.00"
    },
    {
      name: "Team Collaboration",
      description: "Additional team member seats (5 users)",
      quantity: 5,
      amount: "75.00"
    },
    {
      name: "Premium Support",
      description: "Priority customer support and onboarding",
      quantity: 1,
      amount: "15.00"
    }
  ],
  subtotal: "119.00",
  tax: "9.52",
  total: "128.52",
  downloadUrl: "https://epicnotes.com/invoice/download/INV-2025-001234"
};

export default InvoiceEmail;