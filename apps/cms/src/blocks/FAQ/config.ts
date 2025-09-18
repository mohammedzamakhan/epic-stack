import type { Block } from 'payload'

export const FAQ: Block = {
	slug: 'faq',
	interfaceName: 'FAQBlock',
	labels: {
		singular: 'FAQ',
		plural: 'FAQs',
	},
	fields: [
		{
			name: 'title',
			type: 'text',
			label: 'Title',
			defaultValue: 'FAQs',
			required: true,
		},
		{
			name: 'subtitle',
			type: 'text',
			label: 'Subtitle',
			defaultValue: 'Your questions answered',
		},
		{
			name: 'faqs',
			type: 'array',
			label: 'Questions',
			minRows: 1,
			maxRows: 12,
			fields: [
				{
					name: 'question',
					type: 'text',
					label: 'Question',
					required: true,
				},
				{
					name: 'answer',
					type: 'textarea',
					label: 'Answer',
					required: true,
				},
			],
			defaultValue: [
				{
					question: 'How long does shipping take?',
					answer:
						'Standard shipping takes 3-5 business days, depending on your location. Express shipping options are available at checkout for 1-2 business day delivery.',
				},
				{
					question: 'What payment methods do you accept?',
					answer:
						'We accept major credit cards, Apple Pay, Google Pay, and PayPal. For enterprise plans, we also support invoices and wire transfers.',
				},
				{
					question: 'Can I change or cancel my order?',
					answer:
						'Orders can be changed or canceled within 2 hours of placement. Contact support with your order number and we will assist you.',
				},
				{
					question: 'Do you ship internationally?',
					answer:
						'Yes, we ship to most countries. International shipping times vary by destination and customs processing.',
				},
				{
					question: 'What is your return policy?',
					answer:
						'You can return items within 30 days of delivery in original condition for a full refund. See our returns page for details.',
				},
			],
		},
		{
			type: 'row',
			fields: [
				{
					name: 'supportText',
					type: 'text',
					label: 'Support Text',
					defaultValue: "Can't find what you're looking for? Contact our",
					admin: { width: '66%' },
				},
				{
					name: 'supportLinkLabel',
					type: 'text',
					label: 'Support Link Label',
					defaultValue: 'customer support team',
					admin: { width: '34%' },
				},
			],
		},
		{
			name: 'supportLinkUrl',
			type: 'text',
			label: 'Support Link URL',
			defaultValue: '#',
		},
	],
}


