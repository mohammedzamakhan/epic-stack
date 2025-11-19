/**
 * Helper functions for creating consistent rich text editor structures
 * Reduces code duplication across seed data files
 */

/**
 * Creates a simple text node for the Lexical editor
 */
export function createTextNode(
  text: string,
  options: {
    format?: number
    mode?: 'normal' | 'token' | 'segmented'
    style?: string
    detail?: number
  } = {},
) {
  return {
    type: 'text',
    detail: options.detail ?? 0,
    format: options.format ?? 0,
    mode: options.mode ?? 'normal',
    style: options.style ?? '',
    text,
    version: 1,
  }
}

/**
 * Creates a paragraph block with text content
 */
export function createParagraph(content: string | Array<ReturnType<typeof createTextNode>>) {
  return {
    type: 'paragraph',
    children: typeof content === 'string' ? [createTextNode(content)] : content,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    textFormat: 0,
    version: 1,
  }
}

/**
 * Creates a heading block with simple text
 */
export function createHeading(text: string, tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' = 'h2') {
  return {
    type: 'heading',
    children: [createTextNode(text)],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    tag,
    version: 1,
  }
}

/**
 * Creates a heading block with complex content (multiple text nodes with different formatting)
 */
export function createHeadingWithContent(
  children: Array<ReturnType<typeof createTextNode>>,
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' = 'h2',
) {
  return {
    type: 'heading',
    children,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    tag,
    version: 1,
  }
}

/**
 * Creates a link node
 */
export function createLink(text: string, url: string, rel?: string) {
  return {
    type: 'link',
    children: [createTextNode(text)],
    direction: 'ltr' as const,
    fields: {
      doc: null,
      linkType: 'custom' as const,
      newTab: true,
      rel: rel ?? 'noopener noreferrer',
      url,
    },
    format: '' as const,
    indent: 0,
    version: 3,
  }
}

/**
 * Creates a media block
 */
export function createMediaBlock(mediaId: string) {
  return {
    type: 'block',
    fields: {
      blockName: '',
      blockType: 'mediaBlock',
      media: mediaId,
    },
    format: '' as const,
    version: 2,
  }
}

/**
 * Creates an info/warning/error banner block with simple text content
 */
export function createBanner(
  content: string,
  style: 'info' | 'warning' | 'error' = 'info',
  blockName = '',
) {
  return {
    type: 'block',
    fields: {
      blockName,
      blockType: 'banner',
      content: {
        root: {
          type: 'root',
          children: [createParagraph(content)],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          version: 1,
        },
      },
      style,
    },
    format: '' as const,
    version: 2,
  }
}

/**
 * Creates a banner block with complex content (multiple text nodes/links)
 */
export function createBannerWithContent(
  children: Array<ReturnType<typeof createTextNode | typeof createLink>>,
  style: 'info' | 'warning' | 'error' = 'info',
  blockName = '',
) {
  return {
    type: 'block',
    fields: {
      blockName,
      blockType: 'banner',
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children,
              direction: 'ltr' as const,
              format: '' as const,
              indent: 0,
              textFormat: 0,
              version: 1,
            },
          ],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          version: 1,
        },
      },
      style,
    },
    format: '' as const,
    version: 2,
  }
}

/**
 * Creates the standard disclaimer banner used across all post seed files
 */
export function createDisclaimerBanner() {
  return createBannerWithContent(
    [
      createTextNode('Disclaimer:', { format: 1 }), // format: 1 = bold
      createTextNode(
        ' This content is fabricated and for demonstration purposes only. To edit this post, ',
      ),
      createLink('navigate to the admin dashboard', '/admin'),
      createTextNode('.'),
    ],
    'info',
    'Disclaimer',
  )
}

/**
 * Creates the standard "dynamic components" banner used across post seed files
 */
export function createDynamicComponentsBanner() {
  return createBanner(
    "This content above is completely dynamic using custom layout building blocks configured in the CMS. This can be anything you'd like from rich text and images, to highly designed, complex components.",
    'info',
    'Dynamic Components',
  )
}

/**
 * Creates a code block
 */
export function createCodeBlock(code: string, language: string, blockName = '') {
  return {
    type: 'block',
    fields: {
      blockName,
      blockType: 'code',
      code,
      language,
    },
    format: '' as const,
    version: 2,
  }
}

/**
 * Creates a root document structure for Lexical editor
 */
export function createRootDocument(
  children: Array<ReturnType<typeof createParagraph | typeof createHeading>>,
) {
  return {
    root: {
      type: 'root',
      children,
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

/**
 * Creates the standard image caption structure used across seed files
 */
export function createImageCaption(photographerName: string, photographerUrl: string) {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: 'Photo by ',
              version: 1,
            },
            {
              type: 'link',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: photographerName,
                  version: 1,
                },
              ],
              direction: 'ltr' as const,
              fields: {
                linkType: 'custom',
                newTab: true,
                url: photographerUrl,
              },
              format: '' as const,
              indent: 0,
              version: 2,
            },
            {
              type: 'text',
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: ' on Unsplash.',
              version: 1,
            },
          ],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          textFormat: 0,
          version: 1,
        },
      ],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

/**
 * Creates a simple card with heading and paragraph text
 * Used in home page content columns
 */
export function createContentCard(
  heading: string,
  paragraphText: string,
  size: 'oneThird' | 'twoThirds' | 'full' = 'oneThird',
) {
  return {
    enableLink: false,
    richText: createRootDocument([createHeading(heading, 'h3'), createParagraph(paragraphText)]),
    size,
  }
}
