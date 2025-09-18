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

export interface TrialEndingEmailProps {
	portalUrl: string
	userName?: string
	daysRemaining?: number
}

export default function TrialEndingEmail({
	portalUrl,
	userName = 'Developer',
	daysRemaining = 3,
}: TrialEndingEmailProps) {
	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Preview>
					Your Epic Startup trial ends in {daysRemaining.toString()}{' '}
					{daysRemaining === 1 ? 'day' : 'days'}
				</Preview>
				<Body className="bg-[#F6F8FA] py-[40px] font-sans">
					<Container className="mx-auto max-w-[600px] rounded-[8px] bg-[#FFFFFF] px-[32px] py-[40px]">
						{/* Main Content */}
						<Section>
							<Heading className="mb-[16px] text-center text-[24px] font-bold text-[#020304]">
								Your Trial Ends Soon, {userName}
							</Heading>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								Your Epic Startup trial is ending in {daysRemaining}{' '}
								{daysRemaining === 1 ? 'day' : 'days'}. We hope you've enjoyed
								organizing your thoughts and collaborating with your team using
								our powerful note-taking platform.
							</Text>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								To continue using Epic Startup without interruption and keep all
								your valuable notes and collaborations, please upgrade your
								account:
							</Text>

							<Text className="mb-[8px] ml-[16px] text-[16px] leading-[24px] text-[#020304]">
								• Keep all your notes and organization data
							</Text>
							<Text className="mb-[8px] ml-[16px] text-[16px] leading-[24px] text-[#020304]">
								• Continue collaborating with your team
							</Text>
							<Text className="mb-[24px] ml-[16px] text-[16px] leading-[24px] text-[#020304]">
								• Access premium features and integrations
							</Text>

							<Section className="mb-[32px] text-center">
								<Button
									href={portalUrl}
									className="box-border rounded-[6px] bg-[#2563eb] px-[24px] py-[12px] text-[16px] font-medium text-white no-underline"
								>
									Upgrade Now
								</Button>
							</Section>

							<Text className="mb-[16px] text-[16px] leading-[24px] text-[#020304]">
								Questions about pricing or need help choosing the right plan?
								Our support team is here to help you make the most of Epic
								Notes.
							</Text>

							<Text className="text-[16px] leading-[24px] text-[#020304]">
								Thank you for trying Epic Startup!
								<br />
								The Epic Startup Team
							</Text>
						</Section>

						{/* Footer */}
						<Section className="mt-[40px] border-t border-solid border-[#E5E7EB] pt-[32px]">
							<Text className="mb-[8px] text-center text-[14px] leading-[20px] text-[#6B7280]">
								Organize your thoughts with Epic Startup
							</Text>
							<Text className="mb-[8px] text-center text-[12px] leading-[16px] text-[#6B7280]">
								<Link
									href="mailto:support@epicnotes.com"
									className="text-[#2563eb] no-underline"
								>
									Contact Support
								</Link>
								{' | '}
								If the button doesn't work, copy this link: {portalUrl}
							</Text>
							<Text className="m-0 text-center text-[12px] leading-[16px] text-[#6B7280]">
								Copyright © 2025 Epic Startup
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}

TrialEndingEmail.PreviewProps = {
	portalUrl: 'https://billing.stripe.com/p/session/test_123',
	userName: 'John Doe',
	daysRemaining: 3,
} as TrialEndingEmailProps
