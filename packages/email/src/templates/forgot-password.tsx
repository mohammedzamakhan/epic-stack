import { Html, Container, Text, Link, Head, Body, Button, Section, Heading, Preview, Tailwind } from '@react-email/components';

export interface ForgotPasswordEmailProps {
  onboardingUrl: string;
  otp: string;
  firstName?: string;
}

export default function ForgotPasswordEmail({
  onboardingUrl,
  otp,
  firstName = "Developer",
}: ForgotPasswordEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>Reset your Epic Notes password</Preview>
        <Body className="bg-[#F6F8FA] font-sans py-[40px]">
          <Container className="bg-[#FFFFFF] rounded-[8px] mx-auto px-[32px] py-[40px] max-w-[600px]">
            {/* Main Content */}
            <Section>
              <Heading className="text-[#020304] text-[24px] font-bold mb-[16px] text-center">
                Reset Your Password, {firstName}
              </Heading>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                We received a request to reset your Epic Notes password. If you didn't make this request, you can safely ignore this email.
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[16px]">
                Here's your verification code: <strong className="text-[#2563eb]">{otp}</strong>
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                Or click the button below to reset your password:
              </Text>
              
              <Section className="text-center mb-[32px]">
                <Button
                  href={onboardingUrl}
                  className="bg-[#2563eb] text-white px-[24px] py-[12px] rounded-[6px] text-[16px] font-medium no-underline box-border"
                >
                  Reset Password
                </Button>
              </Section>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[16px]">
                For security reasons, this link will expire in 24 hours. If you need help, our support team is here to assist you.
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
                If the button doesn't work, copy this link: {onboardingUrl}
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

ForgotPasswordEmail.PreviewProps = {
  onboardingUrl: 'https://example.com/verify/abc123',
  otp: '123456',
  firstName: 'Alex'
} as ForgotPasswordEmailProps;