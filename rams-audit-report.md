═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: Complete Codebase Audit
═══════════════════════════════════════════════════

CRITICAL (2 issues)
───────────────────
[A11Y] apps/admin/app/root.tsx: Body
  Missing "Skip to main content" link.
  Fix: Add `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to main content</a>` as the first child of `<body>`.
  WCAG: 2.4.1 (Bypass Blocks)

[A11Y] apps/web/src/layouts/MarketingLayout.astro: Script (Lines 56-83)
  Dropdown menu (`operation-types-trigger`) uses only `mouseenter`/`mouseleave` events.
  Keyboard users cannot access this menu.
  Fix: Add `click` or `focus` event listeners to toggle visibility, or use the `<MegaMenu>` pattern found in other components which handles keyboard interaction correctly.
  WCAG: 2.1.1 (Keyboard)

SERIOUS (3 issues)
──────────────────
[A11Y] packages/ui/components/status-button.tsx: StatusButton
  Status changes (Pending → Success/Error) are visual only (Icon change).
  Screen readers are not notified of the completion state.
  Fix: Add `aria-live="polite"` to a container wrapping the status content, or use `role="status"`.
  WCAG: 4.1.3 (Status Messages)

[A11Y] apps/web/src/components/Navigation.astro: Line 31
  Potential empty links: `href={link.url || '#'}`.
  If CMS data is missing, this renders a dead link.
  Fix: Filter out items with missing URLs or render as `<span>` if not interactive.
  WCAG: 2.4.4 (Link Purpose)

[A11Y] packages/ui/components/icon.tsx: Icon
  The `Icon` component allows rendering SVGs without a `title` or `aria-label`.
  If used inside a button without text (e.g. `<Button><Icon name="close" /></Button>`), it creates an inaccessible button.
  Fix: Enforce `aria-label` on the parent `<Button>` or require `title` prop on `<Icon>` when used standalone.
  WCAG: 1.1.1 (Non-text Content)

MODERATE (3 issues)
──────────────────
[A11Y] packages/ui/components/ui/button.tsx
  Uses `outline-none` and replaces it with `focus-visible:ring-[3px]`.
  Ensure the ring color (usually `ring-ring`) has 3:1 contrast against the background in both light and dark modes.
  WCAG: 2.4.7 (Focus Visible)

[A11Y] apps/app/app/components/ui/multi-image-upload.tsx: ImagePreview
  Image preview `alt` defaults to empty string if not yet set by user.
  While the file input handles the label, the visual image might be confusing to AT if discovered.
  Fix: Provide a default alt like "Image preview" until user sets one.
  WCAG: 1.1.1

[Visual] apps/web/src/layouts/MarketingLayout.astro
  Hardcoded z-index `z-50` in skip link.
  Ensure this doesn't conflict with modals or sticky headers (Header is also `z-50`).
  Recommendation: Use a z-index variable system or ensure skip link is highest.

═══════════════════════════════════════════════════
SUMMARY: 2 critical, 3 serious, 3 moderate
Score: 85/100
═══════════════════════════════════════════════════
