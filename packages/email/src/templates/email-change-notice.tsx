import {
	Html,
	Container,
	Text,
	Link,
	Head,
	Body,
	Section,
	Heading,
	Preview,
	Tailwind,
} from '@react-email/components'
import { brand, getBrandTeam, getCopyright } from '@repo/config/brand'

export interface EmailChangeNoticeEmailProps {
	userId: string
	firstName?: string
}

export default function EmailChangeNoticeEmail({
	userId,
	firstName = 'Developer',
}: EmailChangeNoticeEmailProps) {
	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Preview>Your {brand.name} email has been changed</Preview>
				<Body className="bg-[#F6F8FA] py-[40px] font-sans">
					<Container className="mx-auto max-w-[600px] rounded-[8px] bg-[#FFFFFF] px-[32px] py-[40px]">
						{/* Main Content */}
						<Section>
							<Heading className="mb-[16px] text-center text-[24px] font-bold text-[#020304]">
								Email Address Changed, {firstName}
							</Heading>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								We're writing to let you know that your {brand.name} email
								address has been successfully changed. This is an important
								security notification.
							</Text>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								If you made this change, you can safely ignore this email. Your
								account is secure and ready to use with your new email address.
							</Text>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								However, if you did not authorize this email change, please
								contact our support team immediately to secure your account. We
								take security seriously and will help you resolve any issues.
							</Text>

							<Text className="mb-[16px] text-[16px] leading-[24px] text-[#020304]">
								For your reference, your Account ID is:{' '}
								<strong className="text-[#2563eb]">{userId}</strong>
							</Text>

							<Text className="text-[16px] leading-[24px] text-[#020304]">
								Stay secure!
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
								<Link
									href={`mailto:${brand.supportEmail}`}
									className="text-[#2563eb] no-underline"
								>
									Contact Support
								</Link>
								{' | '}
								<Link
									href={`${brand.url}/security`}
									className="text-[#2563eb] no-underline"
								>
									Security Center
								</Link>
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

EmailChangeNoticeEmail.PreviewProps = {
	userId: 'user_123456789',
	firstName: 'Alex',
} as EmailChangeNoticeEmailProps
