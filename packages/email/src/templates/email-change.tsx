import { Html, Container, Text, Link, Head, Body, Button, Section, Heading, Preview, Tailwind } from '@react-email/components';

export interface EmailChangeEmailProps {
  verifyUrl: string;
  otp: string;
  firstName?: string;
}

export default function EmailChangeEmail({
  verifyUrl,
  otp,
  firstName = "Developer",
}: EmailChangeEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>Verify your new Epic Notes email address</Preview>
        <Body className="bg-[#F6F8FA] font-sans py-[40px]">
          <Container className="bg-[#FFFFFF] rounded-[8px] mx-auto px-[32px] py-[40px] max-w-[600px]">
            {/* Main Content */}
            <Section>
              <Heading className="text-[#020304] text-[24px] font-bold mb-[16px] text-center">
                Verify Your New Email, {firstName}
              </Heading>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                We need to verify your new email address to complete the change to your Epic Notes account. This helps keep your account secure.
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[16px]">
                Here's your verification code: <strong className="text-[#2563eb]">{otp}</strong>
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                Or click the button below to verify your email:
              </Text>
              
              <Section className="text-center mb-[32px]">
                <Button
                  href={verifyUrl}
                  className="bg-[#2563eb] text-white px-[24px] py-[12px] rounded-[6px] text-[16px] font-medium no-underline box-border"
                >
                  Verify Email
                </Button>
              </Section>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[16px]">
                If you didn't request this email change, please contact our support team immediately to secure your account.
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px]">
                Stay secure!<br />
                The Epic Notes Team
              </Text>
            </Section>

            {/* Footer */}
            <Section className="border-t border-solid border-[#E5E7EB] pt-[32px] mt-[40px]">
              <Text className="text-[#6B7280] text-[14px] leading-[20px] text-center mb-[8px]">
                Organize your thoughts with Epic Notes
              </Text>
              <Text className="text-[#6B7280] text-[12px] leading-[16px] text-center mb-[8px]">
                If the button doesn't work, copy this link: {verifyUrl}
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
}

EmailChangeEmail.PreviewProps = {
  verifyUrl: 'https://example.com/verify/abc123',
  otp: '123456',
  firstName: 'Alex'
} as EmailChangeEmailProps;