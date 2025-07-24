import { Html, Container, Text, Link, Head, Body, Section, Heading, Preview, Tailwind } from '@react-email/components';

export interface EmailChangeNoticeEmailProps {
  userId: string;
  firstName?: string;
}

export default function EmailChangeNoticeEmail({ 
  userId, 
  firstName = "Developer" 
}: EmailChangeNoticeEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>Your Epic Notes email has been changed</Preview>
        <Body className="bg-[#F6F8FA] font-sans py-[40px]">
          <Container className="bg-[#FFFFFF] rounded-[8px] mx-auto px-[32px] py-[40px] max-w-[600px]">
            {/* Main Content */}
            <Section>
              <Heading className="text-[#020304] text-[24px] font-bold mb-[16px] text-center">
                Email Address Changed, {firstName}
              </Heading>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                We're writing to let you know that your Epic Notes email address has been successfully changed. This is an important security notification.
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                If you made this change, you can safely ignore this email. Your account is secure and ready to use with your new email address.
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                However, if you did not authorize this email change, please contact our support team immediately to secure your account. We take security seriously and will help you resolve any issues.
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[16px]">
                For your reference, your Account ID is: <strong className="text-[#2563eb]">{userId}</strong>
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
                <Link href="mailto:support@epicnotes.com" className="text-[#2563eb] no-underline">Contact Support</Link>
                {" | "}
                <Link href="https://epicnotes.com/security" className="text-[#2563eb] no-underline">Security Center</Link>
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

EmailChangeNoticeEmail.PreviewProps = {
  userId: 'user_123456789',
  firstName: 'Alex'
} as EmailChangeNoticeEmailProps;