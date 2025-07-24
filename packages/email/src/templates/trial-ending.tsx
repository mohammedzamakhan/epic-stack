import { Html, Container, Text, Link, Head, Body, Section, Button, Heading, Preview, Tailwind } from "@react-email/components";

export interface TrialEndingEmailProps {
  portalUrl: string;
  userName?: string;
  daysRemaining?: number;
}

export default function TrialEndingEmail({ 
  portalUrl, 
  userName = "Developer",
  daysRemaining = 3
}: TrialEndingEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>Your Epic Notes trial ends in {daysRemaining.toString()} {daysRemaining === 1 ? 'day' : 'days'}</Preview>
        <Body className="bg-[#F6F8FA] font-sans py-[40px]">
          <Container className="bg-[#FFFFFF] rounded-[8px] mx-auto px-[32px] py-[40px] max-w-[600px]">
            {/* Main Content */}
            <Section>
              <Heading className="text-[#020304] text-[24px] font-bold mb-[16px] text-center">
                Your Trial Ends Soon, {userName}
              </Heading>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                Your Epic Notes trial is ending in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}. We hope you've enjoyed organizing your thoughts and collaborating with your team using our powerful note-taking platform.
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                To continue using Epic Notes without interruption and keep all your valuable notes and collaborations, please upgrade your account:
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[8px] ml-[16px]">
                • Keep all your notes and organization data
              </Text>
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[8px] ml-[16px]">
                • Continue collaborating with your team
              </Text>
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px] ml-[16px]">
                • Access premium features and integrations
              </Text>
              
              <Section className="text-center mb-[32px]">
                <Button
                  href={portalUrl}
                  className="bg-[#2563eb] text-white px-[24px] py-[12px] rounded-[6px] text-[16px] font-medium no-underline box-border"
                >
                  Upgrade Now
                </Button>
              </Section>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[16px]">
                Questions about pricing or need help choosing the right plan? Our support team is here to help you make the most of Epic Notes.
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px]">
                Thank you for trying Epic Notes!<br />
                The Epic Notes Team
              </Text>
            </Section>

            {/* Footer */}
            <Section className="border-t border-solid border-[#E5E7EB] pt-[32px] mt-[40px]">
              <Text className="text-[#6B7280] text-[14px] leading-[20px] text-center mb-[8px]">
                Organize your thoughts with Epic Notes
              </Text>
              <Text className="text-[#6B7280] text-[12px] leading-[16px] text-center mb-[8px]">
                <Link href="mailto:support@epicnotes.com" className="text-[#2563eb] no-underline">Contact Support</Link>
                {" | "}
                If the button doesn't work, copy this link: {portalUrl}
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

TrialEndingEmail.PreviewProps = {
  portalUrl: 'https://billing.stripe.com/p/session/test_123',
  userName: 'John Doe',
  daysRemaining: 3
} as TrialEndingEmailProps;