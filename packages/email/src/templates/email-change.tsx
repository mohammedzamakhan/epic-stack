import {
	Html,
	Container,
	Text,
	Link,
	Head,
	Body,
	Button,
	Section,
	Heading,
	Preview,
	Tailwind,
} from '@react-email/components'

export interface EmailChangeEmailProps {
	verifyUrl: string
	otp: string
	firstName?: string
}

export default function EmailChangeEmail({
	verifyUrl,
	otp,
	firstName = 'Developer',
}: EmailChangeEmailProps) {
	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Preview>Verify your new Epic Notes email address</Preview>
				<Body className="bg-[#F6F8FA] py-[40px] font-sans">
					<Container className="mx-auto max-w-[600px] rounded-[8px] bg-[#FFFFFF] px-[32px] py-[40px]">
						{/* Main Content */}
						<Section>
							<Heading className="mb-[16px] text-center text-[24px] font-bold text-[#020304]">
								Verify Your New Email, {firstName}
							</Heading>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								We need to verify your new email address to complete the change
								to your Epic Notes account. This helps keep your account secure.
							</Text>

							<Text className="mb-[16px] text-[16px] leading-[24px] text-[#020304]">
								Here's your verification code:{' '}
								<strong className="text-[#2563eb]">{otp}</strong>
							</Text>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								Or click the button below to verify your email:
							</Text>

							<Section className="mb-[32px] text-center">
								<Button
									href={verifyUrl}
									className="box-border rounded-[6px] bg-[#2563eb] px-[24px] py-[12px] text-[16px] font-medium text-white no-underline"
								>
									Verify Email
								</Button>
							</Section>

							<Text className="mb-[16px] text-[16px] leading-[24px] text-[#020304]">
								If you didn't request this email change, please contact our
								support team immediately to secure your account.
							</Text>

							<Text className="text-[16px] leading-[24px] text-[#020304]">
								Stay secure!
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
								If the button doesn't work, copy this link: {verifyUrl}
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

EmailChangeEmail.PreviewProps = {
	verifyUrl: 'https://example.com/verify/abc123',
	otp: '123456',
	firstName: 'Alex',
} as EmailChangeEmailProps
