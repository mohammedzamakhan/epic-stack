# Storybook App

This is the Storybook application for showcasing UI components from `@repo/ui` package.

## Getting Started

To run Storybook in development mode:

```bash
npm run dev
```

This will start Storybook on port 3007 and will be available at `http://storybook.epic-stack.me:2999` through the dev proxy.

To build Storybook for production:

```bash
npm run build
```

To preview the built Storybook:

```bash
npm run preview
```

## Known Issues

### Version Compatibility

If you encounter an error like `Cannot find module 'storybook/internal/common'`, this is due to a version mismatch between Storybook packages. To fix this:

1. Remove all Storybook packages from the root node_modules:
   ```bash
   rm -rf node_modules/@storybook node_modules/storybook
   ```

2. Clean install dependencies:
   ```bash
   npm install
   ```

3. If the issue persists, try clearing the entire node_modules and reinstalling:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

This issue is being tracked in Storybook v8.6+ releases and should be resolved in future versions.

## Adding Stories

Stories are located in the `stories` directory. To add a new story:

1. Create a new file with the pattern `ComponentName.stories.tsx` in the `stories` directory
2. Import the component from `@repo/ui`
3. Export story variants following the Storybook 8 format

Example:

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@repo/ui'

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Button',
  },
}
```

## Available Components

All UI components from the `@repo/ui` package are available for creating stories. Check the `packages/ui/index.ts` file for the full list of exported components.
