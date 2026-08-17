import {
	Html,
	Container,
	Text,
	Head,
	Body,
	Section,
	Button,
	Heading,
	Preview,
	Tailwind,
} from '@react-email/components'
import { brand, getCopyright } from '@repo/config/brand'

export interface MentionEmailProps {
	noteUrl: string
	noteTitle: string
	commenterName: string
	commentContent: string
}

export default function MentionEmail({
	noteUrl,
	noteTitle,
	commenterName,
	commentContent,
}: MentionEmailProps) {
	return (
		<Html lang="en" dir="ltr">
			<Tailwind>
				<Head />
				<Preview>
					{commenterName} mentioned you in a comment on "{noteTitle}"
				</Preview>
				<Body className="bg-[#F6F8FA] py-[40px] font-sans">
					<Container className="mx-auto max-w-[600px] rounded-[8px] bg-[#FFFFFF] px-[32px] py-[40px]">
						{/* Main Content */}
						<Section>
							<Heading className="mb-[16px] text-center text-[24px] font-bold text-[#020304]">
								You were mentioned!
							</Heading>

							<Text className="mb-[24px] text-[16px] leading-[24px] text-[#020304]">
								<strong>{commenterName}</strong> mentioned you in a comment on
								the note <strong>"{noteTitle}"</strong>.
							</Text>

							<Section className="mb-[32px] rounded-[6px] bg-[#F3F4F6] p-[16px]">
								<Text className="m-0 text-[16px] leading-[24px] text-[#374151] italic">
									"{commentContent}"
								</Text>
							</Section>

							<Section className="mb-[32px] text-center">
								<Button
									href={noteUrl}
									className="box-border rounded-[6px] bg-[#2563eb] px-[24px] py-[12px] text-[16px] font-medium text-white no-underline"
								>
									View Comment
								</Button>
							</Section>
						</Section>

						{/* Footer */}
						<Section className="mt-[40px] border-t border-solid border-[#E5E7EB] pt-[32px]">
							<Text className="mb-[8px] text-center text-[14px] leading-[20px] text-[#6B7280]">
								Organize your thoughts with {brand.name}
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

MentionEmail.PreviewProps = {
	noteUrl: 'https://example.com/notes/abc123',
	noteTitle: 'Project Alpha Planning',
	commenterName: 'Jane Smith',
	commentContent: 'Hey @alex, what do you think about this proposal?',
} as MentionEmailProps
