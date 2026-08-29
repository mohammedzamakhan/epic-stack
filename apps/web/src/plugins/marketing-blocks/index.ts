/**
 * Marketing blocks plugin for Emdash CMS.
 *
 * Registers all 24 marketing block types in the Emdash Admin Block Kit
 * so editors can visually insert, configure, and reorder all components.
 */

import { definePlugin } from 'emdash'

import {
	buildContentLinkOptions,
	linkSettingsField,
	normalizeLinkPickFields,
} from './content-links'

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
	{ label: 'High Impact (Split layout, media showcase)', value: 'highImpact' },
	{
		label: 'Medium Impact (Centered waitlist / signup CTA)',
		value: 'mediumImpact',
	},
	{ label: 'Low Impact (Compact, text-focused)', value: 'lowImpact' },
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

const definition = {
	id: 'marketing-blocks',
	version: '0.2.6',
	capabilities: ['content:read', 'content:write'] as const,
	hooks: {
		'content:beforeSave': async (event: {
			content: Record<string, unknown>
		}) => {
			const content = { ...event.content }
			for (const [key, value] of Object.entries(content)) {
				if (Array.isArray(value)) {
					content[key] = normalizeLinkPickFields(value)
				}
			}
			return content
		},
	},
	routes: {
		'content-link-options': {
			handler: async (ctx: Parameters<typeof buildContentLinkOptions>[0]) => ({
				items: await buildContentLinkOptions(ctx, 'all'),
			}),
		},
		'content-link-pages': {
			handler: async (ctx: Parameters<typeof buildContentLinkOptions>[0]) => ({
				items: await buildContentLinkOptions(ctx, 'pages'),
			}),
		},
		'content-link-posts': {
			handler: async (ctx: Parameters<typeof buildContentLinkOptions>[0]) => ({
				items: await buildContentLinkOptions(ctx, 'posts'),
			}),
		},
	},

	admin: {
		entry: '/src/plugins/marketing-blocks/admin.tsx',
		fieldWidgets: [
			{
				name: 'link_settings',
				label: 'Link Settings',
				fieldTypes: ['json'],
			},
		],
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
						action_id: 'headlineAccent',
						label: 'Headline accent (Medium Impact — brand color suffix)',
					},
					{
						type: 'text_input',
						action_id: 'subheadline',
						label: 'Subheadline / Description',
						multiline: true,
					},
					{
						type: 'text_input',
						action_id: 'footnote',
						label: 'Footnote below CTA (Medium Impact)',
						multiline: true,
					},
					{
						type: 'repeater',
						action_id: 'trustItems',
						label: 'Trust bullets (Medium Impact)',
						item_label: 'Bullet',
						min_items: 0,
						max_items: 4,
						fields: [
							{
								type: 'text_input',
								action_id: 'text',
								label: 'Text',
							},
						],
					},
					{
						type: 'media_picker',
						action_id: 'mediaUrl',
						label: 'Media / Background Image',
					},
					{
						type: 'media_picker',
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
					linkSettingsField('primaryCtaUrl', 'Primary CTA URL'),
					{
						type: 'text_input',
						action_id: 'secondaryCtaLabel',
						label: 'Secondary CTA Label',
					},
					linkSettingsField('secondaryCtaUrl', 'Secondary CTA URL'),
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
						type: 'text_input',
						action_id: 'actionButtonText',
						label: 'Action Button Text',
					},
					linkSettingsField('actionButtonUrl', 'Action Button URL'),
					{
						type: 'repeater',
						action_id: 'companies',
						label: 'Companies',
						item_label: 'Company',
						min_items: 0,
						fields: [
							{ type: 'text_input', action_id: 'name', label: 'Company Name' },
							{
								type: 'media_picker',
								action_id: 'logoUrl',
								label: 'Logo (SVG / PNG)',
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
								type: 'media_picker',
								action_id: 'imageUrl',
								label: 'Feature Image',
							},
							{
								type: 'media_picker',
								action_id: 'backgroundImageUrl',
								label: 'Background Layer Image (optional)',
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
					{ type: 'text_input', action_id: 'buttonText', label: 'Button Text' },
					linkSettingsField('buttonUrl', 'Button URL'),
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
								action_id: 'monthlyPrice',
								label: 'Monthly Price (e.g. $29)',
							},
							{
								type: 'text_input',
								action_id: 'yearlyPrice',
								label: 'Yearly Price (e.g. $199)',
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
							linkSettingsField('ctaUrl', 'CTA URL'),
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
							{ type: 'media_picker', action_id: 'avatar', label: 'Avatar' },
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
					{ type: 'media_picker', action_id: 'avatar', label: 'Avatar' },
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
						type: 'text_input',
						action_id: 'supportText',
						label: 'Support Prompt',
					},
					{
						type: 'text_input',
						action_id: 'supportLinkLabel',
						label: 'Support Link Label',
					},
					linkSettingsField('supportLinkUrl', 'Support Link URL'),
					{
						type: 'text_input',
						action_id: 'getStartedLabel',
						label: 'Primary Button Label',
					},
					linkSettingsField('getStartedUrl', 'Primary Button URL'),
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
					linkSettingsField('primaryButtonUrl', 'Primary Button URL'),
					{
						type: 'text_input',
						action_id: 'secondaryButtonText',
						label: 'Secondary Button Text',
					},
					linkSettingsField('secondaryButtonUrl', 'Secondary Button URL'),
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
						type: 'text_input',
						action_id: 'buttonText',
						label: 'Primary Button Text',
					},
					linkSettingsField('buttonUrl', 'Primary Button URL'),
					{
						type: 'text_input',
						action_id: 'secondaryButtonText',
						label: 'Secondary Button Text',
					},
					linkSettingsField('secondaryButtonUrl', 'Secondary Button URL'),
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
								action_id: 'icon',
								label: 'Tab Icon (SVG)',
							},
							{
								type: 'media_picker',
								action_id: 'imageUrl',
								label: 'Tab Screenshot / Media',
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
							{ type: 'media_picker', action_id: 'imageUrl', label: 'Image' },
							{
								type: 'text_input',
								action_id: 'primaryButtonText',
								label: 'Primary Button Text',
							},
							linkSettingsField('primaryButtonUrl', 'Primary Button URL'),
							{
								type: 'text_input',
								action_id: 'secondaryButtonText',
								label: 'Secondary Button Text',
							},
							linkSettingsField('secondaryButtonUrl', 'Secondary Button URL'),
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
						type: 'media_picker',
						action_id: 'founderAvatar',
						label: 'Founder Avatar',
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
						min_items: 0,
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
								type: 'media_picker',
								action_id: 'avatar',
								label: 'Photo / Avatar',
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
						type: 'media_picker',
						action_id: 'mediaUrl',
						label: 'Image / Media',
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
					{
						type: 'toggle',
						action_id: 'showViewAll',
						label: 'Show View All Link',
					},
					{
						type: 'text_input',
						action_id: 'viewAllLabel',
						label: 'View All Label',
					},
					linkSettingsField('viewAllUrl', 'View All URL'),
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

			// 25. Showcase Cards (Horizontal Scroll)
			{
				type: 'marketing.showcaseCards',
				label: 'Showcase Cards (Horizontal Scroll)',
				category: 'Sections',
				description:
					'Full-bleed horizontal-scrolling portrait cards with image overlays, quotes, and stats',
				fields: [
					{ type: 'text_input', action_id: 'eyebrow', label: 'Eyebrow' },
					{ type: 'text_input', action_id: 'title', label: 'Title' },
					{
						type: 'text_input',
						action_id: 'description',
						label: 'Description',
						multiline: true,
					},
					{
						type: 'repeater',
						action_id: 'cards',
						label: 'Cards',
						item_label: 'Card',
						min_items: 1,
						max_items: 8,
						fields: [
							{
								type: 'media_picker',
								action_id: 'image',
								label: 'Card Image',
							},
							{
								type: 'text_input',
								action_id: 'quote',
								label: 'Quote',
								multiline: true,
							},
							{ type: 'text_input', action_id: 'name', label: 'Name' },
							{
								type: 'text_input',
								action_id: 'role',
								label: 'Role / Location',
							},
							{
								type: 'text_input',
								action_id: 'stat',
								label: 'Stat Value (e.g. Direct)',
							},
							{
								type: 'text_input',
								action_id: 'statLabel',
								label: 'Stat Label (e.g. Guest relationships)',
							},
						],
					},
				],
			},

			// 26. Capability Grid
			{
				type: 'marketing.capabilityGrid',
				label: 'Capability Grid',
				category: 'Sections',
				description:
					'2-column grid with 1px borders — tag pills, titles, and arrow icons per cell',
				fields: [
					{ type: 'text_input', action_id: 'eyebrow', label: 'Eyebrow' },
					{ type: 'text_input', action_id: 'title', label: 'Title' },
					{
						type: 'text_input',
						action_id: 'actionLabel',
						label: 'Action Link Label (optional)',
					},
					linkSettingsField('actionUrl', 'Action Link URL'),
					{
						type: 'repeater',
						action_id: 'items',
						label: 'Items',
						item_label: 'Item',
						min_items: 1,
						max_items: 12,
						fields: [
							{ type: 'text_input', action_id: 'tag', label: 'Tag / Category' },
							{ type: 'text_input', action_id: 'title', label: 'Title' },
							{
								type: 'text_input',
								action_id: 'meta',
								label: 'Meta (e.g. Built in)',
							},
							linkSettingsField('url', 'Link URL (optional)'),
						],
					},
				],
			},

			// 27. Beliefs
			{
				type: 'marketing.beliefs',
				label: 'Beliefs / Values',
				category: 'Sections',
				description:
					'Sticky heading with stacked value/belief cards — great for philosophy sections',
				fields: [
					{ type: 'text_input', action_id: 'eyebrow', label: 'Eyebrow' },
					{ type: 'text_input', action_id: 'title', label: 'Title' },
					{
						type: 'text_input',
						action_id: 'description',
						label: 'Description',
						multiline: true,
					},
					{
						type: 'text_input',
						action_id: 'ctaLabel',
						label: 'CTA Button Label',
					},
					linkSettingsField('ctaUrl', 'CTA Button URL'),
					{
						type: 'repeater',
						action_id: 'beliefs',
						label: 'Beliefs',
						item_label: 'Belief',
						min_items: 1,
						max_items: 10,
						fields: [
							{ type: 'text_input', action_id: 'title', label: 'Belief Title' },
							{
								type: 'text_input',
								action_id: 'body',
								label: 'Body Text',
								multiline: true,
							},
						],
					},
				],
			},

			// 27b. Benefits List (numbered waitlist reasons)
			{
				type: 'marketing.benefitsList',
				label: 'Benefits List',
				category: 'Sections',
				description:
					'Split section with eyebrow + headline on the left and a numbered benefit list on the right — ideal for waitlist “why join early” sections',
				fields: [
					{
						type: 'text_input',
						action_id: 'eyebrow',
						label: 'Eyebrow (e.g. Why join early)',
					},
					{ type: 'text_input', action_id: 'title', label: 'Headline' },
					{
						type: 'repeater',
						action_id: 'items',
						label: 'Benefits',
						item_label: 'Benefit',
						min_items: 1,
						max_items: 6,
						fields: [
							{
								type: 'text_input',
								action_id: 'text',
								label: 'Benefit text',
								multiline: true,
							},
						],
					},
				],
			},

			// 28. Sticky Showcase
			{
				type: 'marketing.stickyShowcase',
				label: 'Sticky Showcase',
				category: 'Sections',
				description:
					'Sticky heading on the left with visual showcase rows scrolling on the right',
				fields: [
					{ type: 'text_input', action_id: 'title', label: 'Title' },
					{
						type: 'text_input',
						action_id: 'description',
						label: 'Description',
						multiline: true,
					},
					{
						type: 'repeater',
						action_id: 'rows',
						label: 'Showcase Rows',
						item_label: 'Row',
						min_items: 1,
						max_items: 8,
						fields: [
							{
								type: 'media_picker',
								action_id: 'imageUrl',
								label: 'Image',
							},
							{
								type: 'text_input',
								action_id: 'imageAlt',
								label: 'Image Alt Text',
							},
							{
								type: 'text_input',
								action_id: 'lead',
								label: 'Lead Text (bold opener)',
							},
							{
								type: 'text_input',
								action_id: 'copy',
								label: 'Supporting Copy',
								multiline: true,
							},
						],
					},
				],
			},
		],
	},
}

export function createPlugin() {
	return definePlugin(definition as any)
}
export default createPlugin
