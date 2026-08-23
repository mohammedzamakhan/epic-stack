import {
	Html,
	Container,
	Text,
	Head,
	Body,
	Button,
	Section,
	Heading,
	Preview,
	Tailwind,
} from '@react-email/components'
import { brand, getBrandTeam, getCopyright } from '@repo/config/brand'

export interface SignupEmailProps {
	onboardingUrl: string
	otp: string
	firstName?: string
}

export default function SignupEmail({
	onboardingUrl,
	otp,
	firstName = 'Developer',
}: SignupEmailProps) {
	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Preview>
					Welcome to {brand.name} - Get started with your account
				</Preview>
				<Body className="bg-[#F6F8FA] py-[40px] font-sans">
					<Container className="mx-auto max-w-[600px] rounded-[8px] bg-[#FFFFFF] px-[32px] py-[40px]">
						{/* Main Content */}
						<Section>
							<Heading className="mb-[16px] text-center text-[24px] font-bold text-[#020304]">
								Welcome to {brand.name}, {firstName}!
							</Heading>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								You've successfully created your {brand.name} account. We're
								excited to help you organize your thoughts and ideas with our
								powerful note-taking platform.
							</Text>

							<Text className="mb-[16px] text-[16px] leading-[24px] text-[#020304]">
								Here's your verification code:{' '}
								<strong className="text-[#2563eb]">{otp}</strong>
							</Text>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								Or click the button below to get started:
							</Text>

							<Section className="mb-[32px] text-center">
								<Button
									href={onboardingUrl}
									className="box-border rounded-[6px] bg-[#2563eb] px-[24px] py-[12px] text-[16px] font-medium text-white no-underline"
								>
									Get Started
								</Button>
							</Section>

							<Text className="mb-[16px] text-[16px] leading-[24px] text-[#020304]">
								Need help getting started? Our documentation and support team
								are here to help you make the most of {brand.name}.
							</Text>

							<Text className="text-[16px] leading-[24px] text-[#020304]">
								Happy note-taking!
								<br />
								{getBrandTeam()}
							</Text>
						</Section>

						{/* Footer */}
						<Section className="mt-[40px] border-t border-solid border-[#E5E7EB] pt-[32px]">
							<Text className="mb-[8px] text-center text-[14px] leading-[20px] text-[#6B7280]">
								Organize your thoughts with {brand.name}
							</Text>
							<Text className="mb-[8px] text-center text-[12px] leading-[16px] text-[#6B7280]">
								If the button doesn't work, copy this link: {onboardingUrl}
							</Text>
							<Text className="m-0 text-center text-[12px] leading-[16px] text-[#6B7280]">
								{getCopyright()}
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}

SignupEmail.PreviewProps = {
	onboardingUrl: 'https://example.com/onboarding/abc123',
	otp: '123456',
	firstName: 'Alex',
} as SignupEmailProps
