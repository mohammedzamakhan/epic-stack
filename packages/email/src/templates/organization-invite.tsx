import {
	Html,
	Container,
	Text,
	Link,
	Head,
	Body,
	Section,
	Button,
	Heading,
	Preview,
	Tailwind,
} from '@react-email/components'

export interface OrganizationInviteEmailProps {
	inviteUrl: string
	organizationName: string
	inviterName: string
	firstName?: string
}

export default function OrganizationInviteEmail({
	inviteUrl,
	organizationName,
	inviterName,
	firstName = 'Developer',
}: OrganizationInviteEmailProps) {
	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Preview>
					You're invited to join {organizationName} on Epic Notes
				</Preview>
				<Body className="bg-[#F6F8FA] py-[40px] font-sans">
					<Container className="mx-auto max-w-[600px] rounded-[8px] bg-[#FFFFFF] px-[32px] py-[40px]">
						{/* Main Content */}
						<Section>
							<Heading className="mb-[16px] text-center text-[24px] font-bold text-[#020304]">
								Join {organizationName}, {firstName}!
							</Heading>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								Great news! {inviterName} has invited you to collaborate with{' '}
								{organizationName} on Epic Notes. You'll be able to share notes,
								collaborate on projects, and stay organized together.
							</Text>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								Here's what you can do once you join:
							</Text>

							<Text className="mb-[8px] ml-[16px] text-[16px] leading-[24px] text-[#020304]">
								• Share and collaborate on notes with team members
							</Text>
							<Text className="mb-[8px] ml-[16px] text-[16px] leading-[24px] text-[#020304]">
								• Access organization-wide templates and resources
							</Text>
							<Text className="mb-[24px] ml-[16px] text-[16px] leading-[24px] text-[#020304]">
								• Stay synchronized with team projects and updates
							</Text>

							<Section className="mb-[32px] text-center">
								<Button
									href={inviteUrl}
									className="box-border rounded-[6px] bg-[#2563eb] px-[24px] py-[12px] text-[16px] font-medium text-white no-underline"
								>
									Accept Invitation
								</Button>
							</Section>

							<Text className="mb-[16px] text-[16px] leading-[24px] text-[#020304]">
								If you didn't expect this invitation, you can safely ignore this
								email. No account will be created without your explicit consent.
							</Text>

							<Text className="text-[16px] leading-[24px] text-[#020304]">
								Welcome to the team!
								<br />
								The Epic Notes Team
							</Text>
						</Section>

						{/* Footer */}
						<Section className="mt-[40px] border-t border-solid border-[#E5E7EB] pt-[32px]">
							<Text className="mb-[8px] text-center text-[14px] leading-[20px] text-[#6B7280]">
								Organize your thoughts with Epic Notes
							</Text>
							<Text className="mb-[8px] text-center text-[12px] leading-[16px] text-[#6B7280]">
								If the button doesn't work, copy this link: {inviteUrl}
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

OrganizationInviteEmail.PreviewProps = {
	inviteUrl: 'https://example.com/join/abc123',
	organizationName: 'Acme Corp',
	inviterName: 'John Doe',
	firstName: 'Alex',
} as OrganizationInviteEmailProps
