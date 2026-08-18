import { getDefaultConfig, type BlockType } from './block-types.ts'

export const HOME_PAGE_SLUG = 'home'
export const HOME_PAGE_TITLE = 'Home'

export function isHomePageSlug(slug: string) {
	return slug === HOME_PAGE_SLUG
}

type HomePageSection = {
	type: BlockType
	position: number
	config: Record<string, unknown>
}

export function getDefaultHomePageSections({
	organizationName,
	description,
}: {
	organizationName: string
	description?: string | null
}): HomePageSection[] {
	const trimmedDescription = description?.trim()
	const descriptionLead = trimmedDescription
		? `${trimmedDescription.replace(/[.!?]?$/, '.')} `
		: ''
	const heroSubheading = `${descriptionLead}Discover a better way to connect, decide, and get started with ${organizationName}.`

	return [
		{
			type: 'hero',
			position: 0,
			config: {
				...getDefaultConfig('hero'),
				heading: `Welcome to ${organizationName}`,
				subheading: heroSubheading,
				links: [{ url: '/login', link: { label: 'Get started' } }],
				assetType: 'none',
				textPosition: 'center',
				overlay: 'none',
				minHeight: 640,
			},
		},
		{
			type: 'features',
			position: 1,
			config: {
				...getDefaultConfig('features'),
				title: 'Everything visitors need to choose you with confidence',
				subtitle:
					'Highlight the outcomes, trust signals, and simple next steps that turn first-time visitors into loyal customers.',
				items: [
					{
						title: 'A clear promise',
						description:
							'Tell people what you do, who you help, and why it matters in seconds.',
					},
					{
						title: 'Friction-free next steps',
						description:
							'Guide visitors toward booking, signing in, or reaching out without making them search.',
					},
					{
						title: 'Built-in credibility',
						description:
							'Use proof points, answers, and testimonials to make every decision feel easy.',
					},
				],
			},
		},
		{
			type: 'content',
			position: 2,
			config: {
				...getDefaultConfig('content'),
				title: `Why ${organizationName} stands out`,
				subtitle: 'Designed around your customers',
				body: `${organizationName} brings helpful information, practical guidance, and a smooth digital experience together in one place. Visitors can understand what makes your work valuable, feel confident about what to expect, and take the next step without friction.\n\nEvery detail is designed to make the path from interest to action feel clear, trustworthy, and easy.`,
				layout: 'text',
				background: 'muted',
				ctaLabel: 'Get started',
				ctaUrl: '/login',
			},
		},
		{
			type: 'cards',
			position: 3,
			config: {
				...getDefaultConfig('cards'),
				title: 'How it works',
				items: [
					{
						title: 'Explore what matters',
						description:
							'Introduce your services, offers, or resources in a way visitors can understand quickly.',
						ctaLabel: 'Step 1',
					},
					{
						title: 'Choose the right path',
						description:
							'Help people compare options, answer common questions, and feel ready to move forward.',
						ctaLabel: 'Step 2',
					},
					{
						title: 'Take action with ease',
						description:
							'Send visitors to the next step with a focused call to action and a reassuring experience.',
						linkUrl: '/login',
						ctaLabel: 'Get started',
					},
				],
			},
		},
		{
			type: 'testimonials',
			position: 4,
			config: {
				...getDefaultConfig('testimonials'),
				title: 'Customers feel the difference',
				subtitle:
					'Use social proof to reinforce the promise you make at the top of the page.',
				items: [
					{
						quote:
							'The experience was clear, thoughtful, and easy from the first click.',
						name: 'Alex Rivera',
						rating: 5,
					},
					{
						quote:
							'We understood our options quickly and knew exactly what to do next.',
						name: 'Jordan Lee',
						rating: 5,
					},
					{
						quote:
							'Professional, approachable, and refreshingly simple to work with.',
						name: 'Sam Patel',
						rating: 5,
					},
				],
			},
		},
		{
			type: 'faq',
			position: 5,
			config: {
				...getDefaultConfig('faq'),
				title: 'Questions before you begin?',
				subtitle:
					'Answer the concerns that usually slow people down right before they take action.',
				items: [
					{
						question: 'What can I do on this site?',
						answer:
							'You can learn what the organization offers, understand the next steps, and access your customer account when you are ready.',
					},
					{
						question: 'How do I get started?',
						answer:
							'Use the call to action on this page to sign in or continue with the next step provided by the organization.',
					},
					{
						question: 'What happens after I get started?',
						answer:
							'You will be guided through the next step with the information and support you need to continue confidently.',
					},
				],
			},
		},
		{
			type: 'cta',
			position: 6,
			config: {
				...getDefaultConfig('cta'),
				heading: `Ready to experience ${organizationName}?`,
				description:
					'Make the next step obvious, reassuring, and easy for every visitor who reaches the end of the page.',
				variant: 'solid',
				cardPosition: 'center',
				primaryLabel: 'Get started',
				primaryUrl: '/login',
				secondaryLabel: '',
				secondaryUrl: '',
			},
		},
	]
}
