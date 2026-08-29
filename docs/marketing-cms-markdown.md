# Marketing CMS markdown

The marketing site (`apps/web`) uses
[Emdash CMS](https://github.com/emdash-cms/emdash) for page content. Marketing
block **titles**, **headlines**, and **descriptions** support markdown so
editors can add emphasis, brand-colored text, and highlights without touching
code.

## Where markdown works

In the Emdash admin, open any page and edit a marketing block. Markdown fields
include:

- Hero **Headline** and **Subheadline / Description**
- Section **Title**, **Headline**, and **Subtitle**
- **Description** copy on CTAs, feature grids, FAQs, testimonials, and similar
  blocks
- Nested item titles and descriptions (features, FAQ answers, benefit lines,
  etc.)

Plain text fields (button labels, badge pills, prices, names, URLs) stay plain
text — only copy meant for display as rich text uses markdown.

Each markdown field shows a syntax cheat sheet and a **Show preview** toggle so
you can check rendering before publishing.

## Syntax reference

| You type                           | Result                                 |
| ---------------------------------- | -------------------------------------- |
| `**bold**`                         | **bold**                               |
| `*italic*`                         | _italic_                               |
| `==highlight==`                    | Soft brand-tinted highlight background |
| `^^brand color^^`                  | Text in the site brand color           |
| `[link text](https://example.com)` | Clickable link                         |
| `[about us](/about)`               | Internal link                          |

### Examples

**Headline:**

```markdown
Build your next startup ==even faster==
```

**Description:**

```markdown
Ship **faster** with our stack, built for ^^Cloudflare^^ and Astro.
```

**FAQ answer:**

```markdown
Yes — you can self-host. See our [deployment guide](/pages/features) for
details.
```

### Highlights and brand color

- `==word==` wraps text in a highlight (`<mark class="md-highlight">`) with a
  soft brand-colored background.
- `^^word^^` wraps text in brand color (`<span class="text-brand">`).

These are the recommended ways to emphasize words in headings. Raw HTML is
stripped — use the markdown syntax above instead of pasting tags.

## SEO and metadata

Markdown in titles is rendered on the page, but **meta tags** (browser tab
title, Open Graph, Twitter cards) use plain text. Syntax like `**bold**` and
`==highlight==` is stripped automatically so search snippets stay readable.

Blog and post card titles on the home page also parse markdown for display.

## For developers

### Key files

| Path                                                            | Purpose                                                              |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/web/src/lib/markdown.ts`                                  | Parser (`marked` + custom `==` / `^^` extensions), `stripMarkdown()` |
| `apps/web/src/components/site/MarkdownText.astro`               | Block markdown (descriptions, paragraphs)                            |
| `apps/web/src/components/site/MarkdownInline.astro`             | Inline markdown inside `h1`–`h3` headings                            |
| `apps/web/src/plugins/marketing-blocks/markdown-fields.ts`      | `markdownField()` helper for Block Kit field defs                    |
| `apps/web/src/plugins/marketing-blocks/admin/MarkdownField.tsx` | Admin field widget with preview                                      |
| `apps/web/src/plugins/marketing-blocks/index.ts`                | Marketing block field definitions                                    |
| `apps/web/scripts/patch-emdash-admin.mjs`                       | Patches `@emdash-cms/admin` to register the `markdown_input` widget  |

### Adding markdown to a new block field

1. In `apps/web/src/plugins/marketing-blocks/index.ts`, use `markdownField()`:

   ```ts
   import { markdownField } from './markdown-fields'

   // Single-line title / headline
   markdownField('title', 'Title')

   // Multiline description
   markdownField('description', 'Description', true)
   ```

2. In the Astro component, render with:
   - `MarkdownInline` inside heading tags for titles
   - `MarkdownText` for body/description copy

3. Run `node apps/web/scripts/patch-emdash-admin.mjs` after `npm install` if the
   admin widget is missing (the web app `postinstall` / dev scripts should run
   this automatically).

### Tests

```bash
npx vitest run apps/web/tests/markdown.test.ts
```

### Seed example

`apps/web/.emdash/seed.json` includes a hero with markdown in the home page
headline and subheadline for local reference.
