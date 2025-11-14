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
	Hr,
} from '@react-email/components'

export interface NewDeviceSigninEmailProps {
	firstName?: string
	deviceName: string
	operatingSystem: string
	location?: string
	ipAddress: string
	timestamp: string
	secureAccountUrl: string
}

export default function NewDeviceSigninEmail({
	firstName = 'there',
	deviceName,
	operatingSystem,
	location,
	ipAddress,
	timestamp,
	secureAccountUrl,
}: NewDeviceSigninEmailProps) {
	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Preview>New sign-in detected to your Epic Startup account</Preview>
				<Body className="bg-[#F6F8FA] py-[40px] font-sans">
					<Container className="mx-auto max-w-[600px] rounded-[8px] bg-[#FFFFFF] px-[32px] py-[40px]">
						{/* Main Content */}
						<Section>
							<Heading className="mb-[16px] text-center text-[24px] font-bold text-[#020304]">
								New Sign-In Detected
							</Heading>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								Hi {firstName},
							</Text>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								We detected a new sign-in to your Epic Startup account from a
								device we don't recognize.
							</Text>

							{/* Device Details Section */}
							<Section className="mb-[24px] rounded-[6px] bg-[#F6F8FA] p-[20px]">
								<Text className="mb-[8px] text-[14px] font-bold text-[#020304]">
									Device details:
								</Text>

								<Text className="mb-[8px] text-[14px] leading-[20px] text-[#020304]">
									<strong>Browser:</strong> {deviceName}
								</Text>

								<Text className="mb-[8px] text-[14px] leading-[20px] text-[#020304]">
									<strong>Operating System:</strong> {operatingSystem}
								</Text>

								{location && (
									<Text className="mb-[8px] text-[14px] leading-[20px] text-[#020304]">
										<strong>Location:</strong> {location}
									</Text>
								)}

								<Text className="mb-[8px] text-[14px] leading-[20px] text-[#020304]">
									<strong>IP Address:</strong> {ipAddress}
								</Text>

								<Text className="mb-[0] text-[14px] leading-[20px] text-[#020304]">
									<strong>Time:</strong> {timestamp}
								</Text>
							</Section>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								If this was you, you can safely ignore this email. If you don't
								recognize this activity, please secure your account immediately.
							</Text>

							<Section className="mb-[32px] text-center">
								<Button
									href={secureAccountUrl}
									className="box-border rounded-[6px] bg-[#dc2626] px-[24px] py-[12px] text-[16px] font-medium text-white no-underline"
								>
									Secure My Account
								</Button>
							</Section>

							<Hr className="my-[24px] border-[#E5E7EB]" />

							<Text className="mb-[16px] text-[14px] leading-[20px] text-[#6B7280]">
								If you didn't sign in, please contact support immediately at{' '}
								<Link
									href="mailto:support@epicnotes.com"
									className="text-[#2563eb] no-underline"
								>
									support@epicnotes.com
								</Link>
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
								<Link
									href="https://epicnotes.com/security"
									className="text-[#2563eb] no-underline"
								>
									Security Center
								</Link>
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

NewDeviceSigninEmail.PreviewProps = {
	firstName: 'Alex',
	deviceName: 'Chrome on macOS',
	operatingSystem: 'macOS 14.2',
	location: 'San Francisco, CA, United States',
	ipAddress: '192.168.1.1',
	timestamp: 'January 15, 2025 at 3:45 PM UTC',
	secureAccountUrl: 'https://epicnotes.com/settings/security',
} as NewDeviceSigninEmailProps
