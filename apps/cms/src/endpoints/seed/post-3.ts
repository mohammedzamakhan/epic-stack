import { RequiredDataFromCollectionSlug } from 'payload'
import type { PostArgs } from './post-1'
import {
	createTextNode,
	createHeadingWithContent,
	createHeading,
	createDisclaimerBanner,
	createParagraph,
	createMediaBlock,
	createDynamicComponentsBanner,
} from './helpers.ts'

export const post3: (args: PostArgs) => RequiredDataFromCollectionSlug<'posts'> = ({
	heroImage,
	blockImage,
	author,
}) => {
	return {
		slug: 'dollar-and-sense-the-financial-forecast',
		_status: 'published',
		authors: [author],
		content: {
			root: {
				type: 'root',
				children: [
					createDisclaimerBanner(),
					createHeadingWithContent([
						createTextNode("Money isn't just currency; "),
						createTextNode("it's a language. ", { format: 2 }), // format: 2 = italic
						createTextNode(
							'Dive deep into its nuances, where strategy meets intuition in the vast sea of finance.',
						),
					]),
					createParagraph(
						"Money, in its essence, transcends the mere concept of coins and paper notes; it becomes a profound language that speaks of value, trust, and societal structures. Like any language, it possesses intricate nuances and subtleties that require a discerning understanding. It's in these depths where the calculated world of financial strategy collides with the raw, instinctive nature of human intuition. Just as a seasoned linguist might dissect the syntax and semantics of a sentence, a financial expert navigates the vast and tumultuous ocean of finance, guided not only by logic and data but also by gut feelings and foresight. Every transaction, investment, and financial decision becomes a dialogue in this expansive lexicon of commerce and value.",
					),
					createMediaBlock(blockImage.id),
					createHeading('Stock Market Dynamics: Bulls, Bears, and the Uncertain Middle'),
					createParagraph(
						'The stock market is a realm of vast opportunity but also poses risks. Discover the forces that drive market trends and the strategies employed by top traders to navigate this complex ecosystem. From market analysis to understanding investor psychology, get a comprehensive insight into the world of stocks.',
					),
					createParagraph(
						"The stock market, often visualized as a bustling arena of numbers and ticker tapes, is as much about human behavior as it is about economics. It's a place where optimism, represented by the bullish rally, meets the caution of bearish downturns, with each vying to dictate the market's direction. But between these two extremes lies an uncertain middle ground, a zone populated by traders and investors who constantly weigh hope against fear. Successful navigation requires more than just financial acumen; it demands an understanding of collective sentiments and the ability to predict not just market movements, but also the reactions of other market participants. In this intricate dance of numbers and nerves, the most astute players are those who master both the hard data and the soft nuances of human behavior.",
					),
					createDynamicComponentsBanner(),
				],
				direction: 'ltr',
				format: '',
				indent: 0,
				version: 1,
			},
		},
		heroImage: heroImage.id,
		meta: {
			description: `Money isn't just currency; it's a language. Dive deep into its nuances, where strategy meets intuition in the vast sea of finance.`,
			image: heroImage.id,
			title: 'Dollar and Sense: The Financial Forecast',
		},
		relatedPosts: [], // this is populated by the seed script
		title: 'Dollar and Sense: The Financial Forecast',
	}
}
