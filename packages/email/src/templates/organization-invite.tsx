import { Html, Container, Text, Link, Head, Body, Section, Button, Heading, Preview, Tailwind } from "@react-email/components";

export interface OrganizationInviteEmailProps {
  inviteUrl: string;
  organizationName: string;
  inviterName: string;
  firstName?: string;
}

export default function OrganizationInviteEmail({ 
  inviteUrl, 
  organizationName, 
  inviterName,
  firstName = "Developer"
}: OrganizationInviteEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>You're invited to join {organizationName} on Epic Notes</Preview>
        <Body className="bg-[#F6F8FA] font-sans py-[40px]">
          <Container className="bg-[#FFFFFF] rounded-[8px] mx-auto px-[32px] py-[40px] max-w-[600px]">
            {/* Main Content */}
            <Section>
              <Heading className="text-[#020304] text-[24px] font-bold mb-[16px] text-center">
                Join {organizationName}, {firstName}!
              </Heading>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                Great news! {inviterName} has invited you to collaborate with {organizationName} on Epic Notes. You'll be able to share notes, collaborate on projects, and stay organized together.
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px]">
                Here's what you can do once you join:
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[8px] ml-[16px]">
                • Share and collaborate on notes with team members
              </Text>
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[8px] ml-[16px]">
                • Access organization-wide templates and resources
              </Text>
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[24px] ml-[16px]">
                • Stay synchronized with team projects and updates
              </Text>
              
              <Section className="text-center mb-[32px]">
                <Button
                  href={inviteUrl}
                  className="bg-[#2563eb] text-white px-[24px] py-[12px] rounded-[6px] text-[16px] font-medium no-underline box-border"
                >
                  Accept Invitation
                </Button>
              </Section>
              
              <Text className="text-[#020304] text-[16px] leading-[24px] mb-[16px]">
                If you didn't expect this invitation, you can safely ignore this email. No account will be created without your explicit consent.
              </Text>
              
              <Text className="text-[#020304] text-[16px] leading-[24px]">
                Welcome to the team!<br />
                The Epic Notes Team
              </Text>
            </Section>

            {/* Footer */}
            <Section className="border-t border-solid border-[#E5E7EB] pt-[32px] mt-[40px]">
              <Text className="text-[#6B7280] text-[14px] leading-[20px] text-center mb-[8px]">
                Organize your thoughts with Epic Notes
              </Text>
              <Text className="text-[#6B7280] text-[12px] leading-[16px] text-center mb-[8px]">
                If the button doesn't work, copy this link: {inviteUrl}
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

OrganizationInviteEmail.PreviewProps = {
  inviteUrl: 'https://example.com/join/abc123',
  organizationName: 'Acme Corp',
  inviterName: 'John Doe',
  firstName: 'Alex'
} as OrganizationInviteEmailProps;