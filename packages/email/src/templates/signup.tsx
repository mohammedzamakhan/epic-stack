import { Html, Container, Text, Link, Head, Body, Button, Section, Heading, Preview, Tailwind } from '@react-email/components';

export interface SignupEmailProps {
  onboardingUrl: string;
  otp: string;
  firstName?: string;
}

export default function SignupEmail({
  onboardingUrl,
  otp,
  firstName = "Developer",
}: SignupEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>Welcome to Epic Notes - Get started with your account</Preview>
        <Body className="bg-[#F6F8FA] font-sans py-[40px]">
          <Container className="bg-[#FFFFFF] rounded-[8px] mx-auto px-[32px] py-[40px] max-w-[600px]">
            {/* Main Content */}
            <Section>
              <Heading className="text-[#020304] text-[24px] font-bold mb-[16px] text-center">
                Welcome to Epic Notes, {firstName}!
              </Heading>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                You've successfully created your Epic Notes account. We're excited to help you organize your thoughts and ideas with our powerful note-taking platform.
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[16px]">
                Here's your verification code: <strong className="text-[#2563eb]">{otp}</strong>
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                Or click the button below to get started:
              </Text>
              
              <Section className="text-center mb-[32px]">
                <Button
                  href={onboardingUrl}
                  className="bg-[#2563eb] text-white px-[24px] py-[12px] rounded-[6px] text-[16px] font-medium no-underline box-border"
                >
                  Get Started
                </Button>
              </Section>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[16px]">
                Need help getting started? Our documentation and support team are here to help you make the most of Epic Notes.
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px]">
                Happy note-taking!<br />
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

SignupEmail.PreviewProps = {
  onboardingUrl: 'https://example.com/onboarding/abc123',
  otp: '123456',
  firstName: 'Alex'
} as SignupEmailProps;