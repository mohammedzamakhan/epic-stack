/**
 * Marketing blocks plugin for Emdash CMS.
 *
 * Registers all 24 marketing block types in the Emdash Admin Block Kit
 * so editors can visually insert, configure, and reorder all components.
 */

const ICON_OPTIONS = [
	{ label: 'Lightning / Zap', value: 'zap' },
	{ label: 'Shield / Security', value: 'shield' },
	{ label: 'Users / Team', value: 'users' },
	{ label: 'Chart / Analytics', value: 'chart' },
	{ label: 'Code / Tech', value: 'code' },
	{ label: 'Globe / Network', value: 'globe' },
	{ label: 'Heart', value: 'heart' },
	{ label: 'Star', value: 'star' },
	{ label: 'Check / Success', value: 'check' },
	{ label: 'Lock / Privacy', value: 'lock' },
	{ label: 'Clock / Fast', value: 'clock' },
	{ label: 'Cloud / Edge', value: 'cloud' },
	{ label: 'Database / Storage', value: 'database' },
	{ label: 'Sparkles / AI', value: 'sparkles' },
	{ label: 'Layers / Stack', value: 'layers' },
]

const HERO_VARIANT_OPTIONS = [
	{ label: 'High Impact (Dark, Grid, Glow, Full-width)', value: 'highImpact' },
	{
		label: 'Medium Impact (Clean, Centered, Container)',
		value: 'mediumImpact',
	},
	{ label: 'Low Impact (Compact, Text-focused)', value: 'lowImpact' },
	{ label: 'Default (Minimal)', value: 'default' },
]

const PERSPECTIVE_OPTIONS = [
	{ label: 'None (Flat)', value: 'none' },
	{ label: 'Paper Fold', value: 'paper' },
	{ label: 'Tilt Left', value: 'left' },
	{ label: 'Tilt Right', value: 'right' },
	{ label: 'Tilt Bottom', value: 'bottom' },
	{ label: 'Tilt Bottom Large', value: 'bottom-lg' },
]

const FORM_TYPE_OPTIONS = [
	{ label: 'Contact Us', value: 'contact' },
	{ label: 'Newsletter Signup', value: 'newsletter' },
	{ label: 'Request a Demo', value: 'demo' },
]

const definition: any = {
	id: 'marketing-blocks',
	version: '0.2.0',
	capabilities: [],
	hooks: {},
	routes: {},

	admin: {
		portableTextBlocks: [
			// 1. Hero (Advanced Multi-Variant)
			{
				type: 'marketing.hero',
				label: 'Hero Section',
				category: 'Sections',
				description:
					'Polymorphic Hero with variant selection, video/image media, 3D perspective, and CTAs',
				fields: [
					{
						type: 'select',
						action_id: 'variant',
						label: 'Hero Variant',
						options: HERO_VARIANT_OPTIONS,
					},
					{
						type: 'text_input',
						action_id: 'badge',
						label: 'Badge / Pill text',
					},
					{ type: 'text_input', action_id: 'headline', label: 'Headline' },
					{
						type: 'text_input',
						action_id: 'subheadline',
						label: 'Subheadline / Description',
						multiline: true,
					},
					{
						type: 'text_input',
						action_id: 'mediaUrl',
						label: 'Media / Background Image URL',
					},
					{
						type: 'text_input',
						action_id: 'videoUrl',
						label: 'Video Stream / Embed URL (optional)',
					},
					{
						type: 'select',
						action_id: 'imagePerspective',
						label: 'Image 3D Perspective Angle',
						options: PERSPECTIVE_OPTIONS,
					},
					{
						type: 'toggle',
						action_id: 'withBackgroundGlow',
						label: 'Show Background Glow Effect',
					},
					{
						type: 'toggle',
						action_id: 'isClosedBeta',
						label: 'Show Closed Beta Tag',
					},
					{
						type: 'text_input',
						action_id: 'primaryCtaLabel',
						label: 'Primary CTA Label',
					},
					{
						type: 'text_input',
						action_id: 'primaryCtaUrl',
						label: 'Primary CTA URL',
					},
					{
						type: 'text_input',
						action_id: 'secondaryCtaLabel',
						label: 'Secondary CTA Label',
					},
					{
						type: 'text_input',
						action_id: 'secondaryCtaUrl',
						label: 'Secondary CTA URL',
					},
				],
			},

			// 2. Logos / Social Proof
			{
				type: 'marketing.logos',
				label: 'Company Logos',
				category: 'Sections',
				description: 'Trusted by leading companies logo showcase',
				fields: [
					{
						type: 'text_input',
						action_id: 'title',
						label: 'Section Title (e.g. // TRUSTED BY LEADING TEAMS)',
					},
					{
						type: 'repeater',
						action_id: 'companies',
						label: 'Companies',
						item_label: 'Company',
						min_items: 1,
						fields: [
							{ type: 'text_input', action_id: 'name', label: 'Company Name' },
							{
								type: 'text_input',
								action_id: 'logoUrl',
								label: 'Logo URL (SVG / PNG)',
							},
						],
					},
				],
			},

			// 3. Feature Grid
			{
				type: 'marketing.features',
				label: 'Feature Grid',
				category: 'Sections',
				description: 'Bento-style grid of features with icons and descriptions',
				fields: [
					{
						type: 'text_input',
						action_id: 'badge',
						label: 'Badge (e.g. // FEATURES)',
					},
					{ type: 'text_input', action_id: 'headline', label: 'Headline' },
					{
						type: 'text_input',
						action_id: 'subheadline',
						label: 'Subheadline',
						multiline: true,
					},
					{
						type: 'repeater',
						action_id: 'features',
						label: 'Features',
						item_label: 'Feature',
						min_items: 1,
						max_items: 12,
						fields: [
							{
								type: 'select',
								action_id: 'icon',
								label: 'Icon',
								options: ICON_OPTIONS,
							},
							{ type: 'text_input', action_id: 'title', label: 'Title' },
							{
								type: 'text_input',
								action_id: 'description',
								label: 'Description',
								multiline: true,
							},
						],
					},
				],
			},

			// 4. Feature List (Detailed with Image & Testimonial)
			{
				type: 'marketing.featureList',
				label: 'Feature List (Deep Dive)',
				category: 'Sections',
				description:
					'Alternating feature sections with preview images and mini testimonials',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Section Title' },
					{
						type: 'text_input',
						action_id: 'subtitle',
						label: 'Subtitle',
						multiline: true,
					},
					{
						type: 'repeater',
						action_id: 'features',
						label: 'Feature Items',
						item_label: 'Feature Item',
						min_items: 1,
						fields: [
							{
								type: 'text_input',
								action_id: 'title',
								label: 'Feature Title',
							},
							{
								type: 'text_input',
								action_id: 'description',
								label: 'Description',
								multiline: true,
							},
							{
								type: 'text_input',
								action_id: 'imageUrl',
								label: 'Feature Image URL',
							},
							{
								type: 'text_input',
								action_id: 'testimonialText',
								label: 'Mini Testimonial Quote',
							},
							{
								type: 'text_input',
								action_id: 'companyName',
								label: 'Testimonial Company',
							},
						],
					},
				],
			},

			// 5. Featured Highlight Grid
			{
				type: 'marketing.featured',
				label: 'Featured Highlights',
				category: 'Sections',
				description: 'Key product highlights with icons and accent tags',
				fields: [
					{ type: 'text_input', action_id: 'badge', label: 'Badge' },
					{ type: 'text_input', action_id: 'title', label: 'Title' },
					{
						type: 'text_input',
						action_id: 'subtitle',
						label: 'Subtitle',
						multiline: true,
					},
					{
						type: 'repeater',
						action_id: 'features',
						label: 'Highlights',
						item_label: 'Highlight',
						min_items: 1,
						fields: [
							{
								type: 'select',
								action_id: 'icon',
								label: 'Icon',
								options: ICON_OPTIONS,
							},
							{ type: 'text_input', action_id: 'title', label: 'Title' },
							{
								type: 'text_input',
								action_id: 'description',
								label: 'Description',
								multiline: true,
							},
						],
					},
				],
			},

			// 6. Pricing Table
			{
				type: 'marketing.pricing',
				label: 'Pricing Table',
				category: 'Sections',
				description:
					'Tiered pricing table with features list and highlighted plan',
				fields: [
					{
						type: 'text_input',
						action_id: 'badge',
						label: 'Badge (e.g. PRICING PLANS)',
					},
					{ type: 'text_input', action_id: 'headline', label: 'Headline' },
					{
						type: 'repeater',
						action_id: 'plans',
						label: 'Plans',
						item_label: 'Plan',
						min_items: 1,
						max_items: 6,
						fields: [
							{
								type: 'text_input',
								action_id: 'name',
								label: 'Plan Name (e.g. Pro)',
							},
							{
								type: 'text_input',
								action_id: 'price',
								label: 'Price (e.g. $29)',
							},
							{
								type: 'text_input',
								action_id: 'period',
								label: 'Period (e.g. /month)',
							},
							{
								type: 'text_input',
								action_id: 'description',
								label: 'Plan Description',
							},
							{
								type: 'text_input',
								action_id: 'features',
								label: 'Features (one per line)',
								multiline: true,
							},
							{ type: 'text_input', action_id: 'ctaLabel', label: 'CTA Label' },
							{ type: 'text_input', action_id: 'ctaUrl', label: 'CTA URL' },
							{
								type: 'toggle',
								action_id: 'highlighted',
								label: 'Highlight as Popular',
							},
						],
					},
				],
			},

			// 7. Testimonials
			{
				type: 'marketing.testimonials',
				label: 'Testimonials Grid',
				category: 'Sections',
				description: 'Customer quote cards with author information and avatar',
				fields: [
					{ type: 'text_input', action_id: 'badge', label: 'Badge' },
					{ type: 'text_input', action_id: 'headline', label: 'Headline' },
					{
						type: 'repeater',
						action_id: 'testimonials',
						label: 'Testimonials',
						item_label: 'Testimonial',
						min_items: 1,
						fields: [
							{
								type: 'text_input',
								action_id: 'quote',
								label: 'Quote',
								multiline: true,
							},
							{ type: 'text_input', action_id: 'author', label: 'Author Name' },
							{ type: 'text_input', action_id: 'role', label: 'Role / Title' },
							{ type: 'text_input', action_id: 'company', label: 'Company' },
							{ type: 'text_input', action_id: 'avatar', label: 'Avatar URL' },
						],
					},
				],
			},

			// 8. Testimonial Highlight
			{
				type: 'marketing.testimonialHighlight',
				label: 'Hero Testimonial',
				category: 'Sections',
				description: 'Large featured single testimonial with author spotlight',
				fields: [
					{
						type: 'text_input',
						action_id: 'quote',
						label: 'Quote',
						multiline: true,
					},
					{ type: 'text_input', action_id: 'author', label: 'Author Name' },
					{ type: 'text_input', action_id: 'role', label: 'Role / Title' },
					{ type: 'text_input', action_id: 'company', label: 'Company' },
					{ type: 'text_input', action_id: 'avatar', label: 'Avatar URL' },
				],
			},

			// 9. FAQ
			{
				type: 'marketing.faq',
				label: 'Frequently Asked Questions',
				category: 'Sections',
				description: 'Expandable accordion FAQ section',
				fields: [
					{ type: 'text_input', action_id: 'badge', label: 'Badge' },
					{ type: 'text_input', action_id: 'headline', label: 'Headline' },
					{
						type: 'repeater',
						action_id: 'items',
						label: 'FAQ Questions',
						item_label: 'Question',
						min_items: 1,
						fields: [
							{ type: 'text_input', action_id: 'question', label: 'Question' },
							{
								type: 'text_input',
								action_id: 'answer',
								label: 'Answer',
								multiline: true,
							},
						],
					},
				],
			},

			// 10. Call To Action (CTA)
			{
				type: 'marketing.cta',
				label: 'Call to Action',
				category: 'Sections',
				description:
					'High-conversion banner with heading, description, and action buttons',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Title' },
					{
						type: 'text_input',
						action_id: 'description',
						label: 'Description',
						multiline: true,
					},
					{
						type: 'text_input',
						action_id: 'primaryButtonText',
						label: 'Primary Button Text',
					},
					{
						type: 'text_input',
						action_id: 'primaryButtonUrl',
						label: 'Primary Button URL',
					},
					{
						type: 'text_input',
						action_id: 'secondaryButtonText',
						label: 'Secondary Button Text',
					},
					{
						type: 'text_input',
						action_id: 'secondaryButtonUrl',
						label: 'Secondary Button URL',
					},
				],
			},

			// 11. Stats Grid
			{
				type: 'marketing.statsGrid',
				label: 'Stats Grid',
				category: 'Sections',
				description: 'Grid of key metrics and statistical highlights',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Section Title' },
					{
						type: 'text_input',
						action_id: 'subtitle',
						label: 'Subtitle',
						multiline: true,
					},
					{
						type: 'repeater',
						action_id: 'stats',
						label: 'Stat Items',
						item_label: 'Stat Item',
						min_items: 1,
						fields: [
							{
								type: 'text_input',
								action_id: 'value',
								label: 'Metric Value (e.g. 99.9%)',
							},
							{
								type: 'text_input',
								action_id: 'label',
								label: 'Metric Label (e.g. Uptime SLA)',
							},
							{
								type: 'text_input',
								action_id: 'description',
								label: 'Description',
								multiline: true,
							},
						],
					},
				],
			},

			// 12. Stats Bar
			{
				type: 'marketing.stats',
				label: 'Stats Bar',
				category: 'Sections',
				description: 'Compact horizontal row of stats',
				fields: [
					{
						type: 'repeater',
						action_id: 'stats',
						label: 'Stats',
						item_label: 'Stat',
						min_items: 1,
						fields: [
							{
								type: 'text_input',
								action_id: 'value',
								label: 'Stat Value (e.g. 10x)',
							},
							{ type: 'text_input', action_id: 'label', label: 'Stat Label' },
						],
					},
				],
			},

			// 13. Integration Cloud
			{
				type: 'marketing.integration',
				label: 'Integrations Grid',
				category: 'Sections',
				description: 'Ecosystem integration tools and tech stack cards',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Title' },
					{
						type: 'text_input',
						action_id: 'subtitle',
						label: 'Subtitle',
						multiline: true,
					},
					{
						type: 'repeater',
						action_id: 'integrations',
						label: 'Integrations',
						item_label: 'Integration',
						min_items: 1,
						fields: [
							{
								type: 'text_input',
								action_id: 'name',
								label: 'Integration Name',
							},
							{
								type: 'text_input',
								action_id: 'description',
								label: 'Description',
							},
							{
								type: 'select',
								action_id: 'icon',
								label: 'Icon',
								options: ICON_OPTIONS,
							},
						],
					},
				],
			},

			// 14. Interactive Tabs Showcase
			{
				type: 'marketing.tabs',
				label: 'Interactive Tabs',
				category: 'Sections',
				description:
					'Tabbed feature walkthrough with screenshots and rich descriptions',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Title' },
					{
						type: 'text_input',
						action_id: 'subtitle',
						label: 'Subtitle',
						multiline: true,
					},
					{
						type: 'repeater',
						action_id: 'tabs',
						label: 'Tabs',
						item_label: 'Tab',
						min_items: 1,
						fields: [
							{ type: 'text_input', action_id: 'label', label: 'Tab Label' },
							{ type: 'text_input', action_id: 'title', label: 'Tab Title' },
							{
								type: 'text_input',
								action_id: 'description',
								label: 'Tab Description',
								multiline: true,
							},
							{
								type: 'text_input',
								action_id: 'imageUrl',
								label: 'Tab Screenshot / Media URL',
							},
						],
					},
				],
			},

			// 15. Sticky Cards Stack
			{
				type: 'marketing.stickyCards',
				label: 'Sticky Scroll Cards',
				category: 'Sections',
				description: 'Stack of sticky cards that pin and scroll gracefully',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Title' },
					{
						type: 'text_input',
						action_id: 'subtitle',
						label: 'Subtitle',
						multiline: true,
					},
					{
						type: 'repeater',
						action_id: 'cards',
						label: 'Cards',
						item_label: 'Card',
						min_items: 1,
						fields: [
							{ type: 'text_input', action_id: 'title', label: 'Card Title' },
							{
								type: 'text_input',
								action_id: 'description',
								label: 'Description',
								multiline: true,
							},
							{ type: 'text_input', action_id: 'tag', label: 'Tag / Category' },
						],
					},
				],
			},

			// 16. Founder Note
			{
				type: 'marketing.founderNote',
				label: 'Founder Note',
				category: 'Sections',
				description: 'Personal note or letter from the founders',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Heading' },
					{
						type: 'text_input',
						action_id: 'content',
						label: 'Letter Content',
						multiline: true,
					},
					{
						type: 'text_input',
						action_id: 'founderName',
						label: 'Founder Name',
					},
					{
						type: 'text_input',
						action_id: 'founderRole',
						label: 'Founder Title / Role',
					},
					{
						type: 'text_input',
						action_id: 'founderAvatar',
						label: 'Founder Avatar URL',
					},
				],
			},

			// 17. Scroll Highlight Text
			{
				type: 'marketing.scrollHighlight',
				label: 'Scroll Highlight',
				category: 'Sections',
				description: 'Typography statement that highlights words on scroll',
				fields: [
					{
						type: 'text_input',
						action_id: 'heading',
						label: 'Section Heading',
					},
					{
						type: 'text_input',
						action_id: 'text',
						label: 'Highlightable Text',
						multiline: true,
					},
				],
			},

			// 18. Build For / Personas
			{
				type: 'marketing.buildFor',
				label: 'Build For Personas',
				category: 'Sections',
				description: 'Target persona cards (Startups, Scaleups, Enterprises)',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Title' },
					{
						type: 'text_input',
						action_id: 'subtitle',
						label: 'Subtitle',
						multiline: true,
					},
					{
						type: 'repeater',
						action_id: 'items',
						label: 'Persona Items',
						item_label: 'Persona',
						min_items: 1,
						fields: [
							{
								type: 'text_input',
								action_id: 'title',
								label: 'Persona Title (e.g. For Indie Hackers)',
							},
							{
								type: 'text_input',
								action_id: 'description',
								label: 'Description',
								multiline: true,
							},
							{ type: 'text_input', action_id: 'tag', label: 'Tag' },
						],
					},
				],
			},

			// 19. Team Grid
			{
				type: 'marketing.team',
				label: 'Team Members',
				category: 'Sections',
				description: 'Grid of leadership and team members with social links',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Title' },
					{
						type: 'text_input',
						action_id: 'subtitle',
						label: 'Subtitle',
						multiline: true,
					},
					{
						type: 'repeater',
						action_id: 'members',
						label: 'Team Members',
						item_label: 'Member',
						min_items: 1,
						fields: [
							{ type: 'text_input', action_id: 'name', label: 'Full Name' },
							{
								type: 'text_input',
								action_id: 'role',
								label: 'Role / Position',
							},
							{
								type: 'text_input',
								action_id: 'avatar',
								label: 'Photo / Avatar URL',
							},
							{
								type: 'text_input',
								action_id: 'bio',
								label: 'Short Bio',
								multiline: true,
							},
						],
					},
				],
			},

			// 20. Form Block
			{
				type: 'marketing.formBlock',
				label: 'Lead & Contact Form',
				category: 'Sections',
				description:
					'Interactive form for contact, newsletter, or demo requests',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Form Title' },
					{
						type: 'text_input',
						action_id: 'subtitle',
						label: 'Subtitle',
						multiline: true,
					},
					{
						type: 'select',
						action_id: 'formType',
						label: 'Form Type',
						options: FORM_TYPE_OPTIONS,
					},
				],
			},

			// 21. Media Block
			{
				type: 'marketing.mediaBlock',
				label: 'Standalone Media / Video',
				category: 'Sections',
				description: 'Full-width or framed screenshot, illustration, or video',
				fields: [
					{
						type: 'text_input',
						action_id: 'mediaUrl',
						label: 'Image / Media URL',
					},
					{
						type: 'text_input',
						action_id: 'caption',
						label: 'Caption / Description',
					},
				],
			},

			// 22. Recent Blog Posts
			{
				type: 'marketing.blog',
				label: 'Recent Blog Posts',
				category: 'Sections',
				description: 'Automated teaser showing the latest articles',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Heading' },
					{ type: 'text_input', action_id: 'subtitle', label: 'Subtitle' },
				],
			},

			// 23. Content Section
			{
				type: 'marketing.content',
				label: 'Rich Content Section',
				category: 'Sections',
				description: 'Text content section with headings and body copy',
				fields: [
					{
						type: 'text_input',
						action_id: 'body',
						label: 'Content Text',
						multiline: true,
					},
				],
			},

			// 24. Archive Block
			{
				type: 'marketing.archive',
				label: 'Post Archive',
				category: 'Sections',
				description: 'Paginated or filtered archive of content entries',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Archive Title' },
				],
			},
		],
	},
}

export function createPlugin() {
	return definition
}
export default createPlugin
