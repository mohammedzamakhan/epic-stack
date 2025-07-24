import {
    Body,
    Container,
    Head,
    Html,
    Preview,
    Section,
    Tailwind,
    Text,
    Heading,
    Link,
  } from '@react-email/components';
  
  export interface ContactTemplateProps {
    readonly name: string;
    readonly email: string;
    readonly message: string;
  }
  
  export const ContactTemplate = ({
    name,
    email,
    message,
  }: ContactTemplateProps) => (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>New contact message from {name}</Preview>
        <Body className="bg-[#F6F8FA] font-sans py-[40px]">
          <Container className="bg-[#FFFFFF] rounded-[8px] mx-auto px-[32px] py-[40px] max-w-[600px]">
            {/* Main Content */}
            <Section>
              <Heading className="text-[#020304] text-[24px] font-bold mb-[16px] text-center">
                New Contact Message
              </Heading>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                You've received a new contact message through Epic Notes. Here are the details:
              </Text>
              
              <Section className="bg-[#F6F8FA] rounded-[6px] p-[20px] mb-[24px]">
                <Text className="text-[#020304] text-[16px] leading-[24px] mb-[8px]">
                  <strong>From:</strong> {name}
                </Text>
                <Text className="text-[#020304] text-[16px] leading-[24px] mb-[16px]">
                  <strong>Email:</strong> <Link href={`mailto:${email}`} className="text-[#2563eb] no-underline">{email}</Link>
                </Text>
                <Text className="text-[#020304] text-[16px] leading-[24px] mb-[8px]">
                  <strong>Message:</strong>
                </Text>
                <Text className="text-[#020304] text-[16px] leading-[24px] mb-0">
                  {message}
                </Text>
              </Section>
              
              <Text className="text-[#020304] text-[16px] leading-[24px]">
                You can reply directly to this email address: <Link href={`mailto:${email}`} className="text-[#2563eb] no-underline">{email}</Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="border-t border-solid border-[#E5E7EB] pt-[32px] mt-[40px]">
              <Text className="text-[#6B7280] text-[14px] leading-[20px] text-center mb-[8px]">
                Epic Notes Contact Form
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
  
  ContactTemplate.PreviewProps = {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    message: "I'm interested in your services.",
  };
  
  export default ContactTemplate;