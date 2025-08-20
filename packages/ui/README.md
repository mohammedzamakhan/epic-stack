# UI Package POC

This is a proof of concept for moving UI components to a shared package in the Epic Stack monorepo.

## What's included

- **Card Component**: Moved from `apps/web/app/components/ui/card.tsx` to this package
- **CN Utility**: Utility function that combines `clsx` and `tailwind-merge` for conditional classes
- **Tailwind 4 Configuration**: Shared design tokens and styles

## Usage

The card components can be imported from the UI package:

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui'

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Card content here</p>
      </CardContent>
    </Card>
  )
}
```

## How it works

1. **Component Source**: UI components are defined in `packages/ui/components/`
2. **Shared Styles**: Tailwind 4 configuration and CSS variables are shared via `packages/ui/styles/tailwind.css`
3. **Web App Integration**: The web app imports components via `@repo/ui` and maintains the same API for existing components
4. **Type Safety**: Full TypeScript support with proper exports

## Migration Strategy

The web app's `apps/web/app/components/ui/card.tsx` now re-exports from this package, maintaining backward compatibility while using the shared components.

This allows for a gradual migration approach where:
- New components can be built directly in the UI package
- Existing components can be moved one by one
- No breaking changes to existing code that imports from the local `ui/` directory

## Tailwind 4 Integration

The UI package includes the same Tailwind 4 configuration as the web app, ensuring:
- Consistent design tokens (colors, spacing, typography)
- Shared CSS variables for theming
- Same utility classes available in both packages
