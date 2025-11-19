import type { Media, User } from '@/payload-types'
import { RequiredDataFromCollectionSlug } from 'payload'
import {
  createHeading,
  createDisclaimerBanner,
  createParagraph,
  createCodeBlock,
  createMediaBlock,
  createDynamicComponentsBanner,
} from './helpers'

export type PostArgs = {
  heroImage: Media
  blockImage: Media
  author: User
}

export const post1: (args: PostArgs) => RequiredDataFromCollectionSlug<'posts'> = ({
  heroImage,
  blockImage,
  author,
}) => {
  return {
    slug: 'digital-horizons',
    _status: 'published',
    authors: [author],
    content: {
      root: {
        type: 'root',
        children: [
          createHeading(
            'Dive into the marvels of modern innovation, where the only constant is change. A journey where pixels and data converge to craft the future.',
          ),
          createDisclaimerBanner(),
          createHeading('The Rise of AI and Machine Learning'),
          createParagraph(
            'We find ourselves in a transformative era where artificial intelligence (AI) stands at the forefront of technological evolution. The ripple effects of its advancements are reshaping industries at an unprecedented pace. No longer are businesses bound by the limitations of tedious, manual processes. Instead, sophisticated machines, fueled by vast amounts of historical data, are now capable of making decisions previously left to human intuition. These intelligent systems are not only optimizing operations but also pioneering innovative approaches, heralding a new age of business transformation worldwide. ',
          ),
          createHeading(
            'To demonstrate basic AI functionality, here is a javascript snippet that makes a POST request to a generic AI API in order to generate text based on a prompt. ',
            'h4',
          ),
          createCodeBlock(
            `async function generateText(prompt) {
    const apiKey = 'your-api-key';
    const apiUrl = 'https://api.example.com/generate-text';

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${apiKey}\`
        },
        body: JSON.stringify({
            model: 'text-generation-model',
            prompt: prompt,
            max_tokens: 50
        })
    });

    const data = await response.json();
    console.log(data.choices[0].text.trim());
}

// Example usage
generateText("Once upon a time in a faraway land,");
`,
            'javascript',
            'Generate Text',
          ),
          createHeading('IoT: Connecting the World Around Us'),
          createParagraph(
            "In today's rapidly evolving technological landscape, the Internet of Things (IoT) stands out as a revolutionary force. From transforming our residences with smart home systems to redefining transportation through connected cars, IoT's influence is palpable in nearly every facet of our daily lives.",
          ),
          createParagraph(
            "This technology hinges on the seamless integration of devices and systems, allowing them to communicate and collaborate effortlessly. With each connected device, we move a step closer to a world where convenience and efficiency are embedded in the very fabric of our existence. As a result, we're transitioning into an era where our surroundings intuitively respond to our needs, heralding a smarter and more interconnected global community.",
          ),
          createMediaBlock(blockImage.id),
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
      description:
        'Dive into the marvels of modern innovation, where the only constant is change. A journey where pixels and data converge to craft the future.',
      image: heroImage.id,
      title: 'Digital Horizons: A Glimpse into Tomorrow',
    },
    relatedPosts: [], // this is populated by the seed script
    title: 'Digital Horizons: A Glimpse into Tomorrow',
  }
}
