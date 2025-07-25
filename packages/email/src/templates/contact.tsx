import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Tailwind,
	Text,
	Heading,
	Link,
} from '@react-email/components'

export interface ContactTemplateProps {
	readonly name: string
	readonly email: string
	readonly message: string
}

export const ContactTemplate = ({
	name,
	email,
	message,
}: ContactTemplateProps) => (
	<Html lang="en" dir="ltr">
		<Tailwind>
			<Head />
			<Preview>New contact message from {name}</Preview>
			<Body className="bg-[#F6F8FA] py-[40px] font-sans">
				<Container className="mx-auto max-w-[600px] rounded-[8px] bg-[#FFFFFF] px-[32px] py-[40px]">
					{/* Main Content */}
					<Section>
						<Heading className="mb-[16px] text-center text-[24px] font-bold text-[#020304]">
							New Contact Message
						</Heading>

						<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
							You've received a new contact message through Epic Notes. Here are
							the details:
						</Text>

						<Section className="mb-[24px] rounded-[6px] bg-[#F6F8FA] p-[20px]">
							<Text className="mb-[8px] text-[16px] leading-[24px] text-[#020304]">
								<strong>From:</strong> {name}
							</Text>
							<Text className="mb-[16px] text-[16px] leading-[24px] text-[#020304]">
								<strong>Email:</strong>{' '}
								<Link
									href={`mailto:${email}`}
									className="text-[#2563eb] no-underline"
								>
									{email}
								</Link>
							</Text>
							<Text className="mb-[8px] text-[16px] leading-[24px] text-[#020304]">
								<strong>Message:</strong>
							</Text>
							<Text className="mb-0 text-[16px] leading-[24px] text-[#020304]">
								{message}
							</Text>
						</Section>

						<Text className="text-[16px] leading-[24px] text-[#020304]">
							You can reply directly to this email address:{' '}
							<Link
								href={`mailto:${email}`}
								className="text-[#2563eb] no-underline"
							>
								{email}
							</Link>
						</Text>
					</Section>

					{/* Footer */}
					<Section className="mt-[40px] border-t border-solid border-[#E5E7EB] pt-[32px]">
						<Text className="mb-[8px] text-center text-[14px] leading-[20px] text-[#6B7280]">
							Epic Notes Contact Form
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

ContactTemplate.PreviewProps = {
	name: 'Jane Smith',
	email: 'jane.smith@example.com',
	message: "I'm interested in your services.",
}

export default ContactTemplate
