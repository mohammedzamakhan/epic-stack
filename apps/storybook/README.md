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

### Module Resolution in Monorepo

Due to module resolution challenges in this monorepo setup, Storybook may have difficulty finding its packages. If you encounter errors like:
- `Cannot find module '@storybook/react-vite/preset'`
- `Cannot find module 'storybook/internal/common'`
- `Cannot find module '@storybook/core/common'`

**Recommended Solution:**

The Storybook app has been set up but requires additional configuration to work properly in this monorepo environment. Consider one of these approaches:

1. **Use Storybook in a separate repository**: Extract the storybook app to its own repository outside the monorepo for the most reliable setup.

2. **Run Storybook from the workspace**: Ensure you're running from the workspace directory:
   ```bash
   cd apps/storybook
   npx storybook@8.4.7 dev -p 3007
   ```

3. **Clean reinstall** if module errors persist:
   ```bash
   # From the root directory
   rm -rf node_modules package-lock.json
   rm -rf apps/storybook/node_modules
   npm install
   ```

### Alternative: Use Chromatic or Storybook Cloud

For the best experience showcasing components in a monorepo, consider using [Chromatic](https://www.chromatic.com/) or [Storybook Cloud](https://storybook.js.org/docs/sharing/publish-storybook), which handle module resolution automatically.

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
