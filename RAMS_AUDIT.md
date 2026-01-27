
═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: Global Audit
═══════════════════════════════════════════════════

CRITICAL (3 issues)
───────────────────
[A11Y] apps/app/app/components/app-sidebar.tsx
  Hidden sidebars are keyboard accessible.
  The sidebar uses `motion.div` to animate opacity to 0 but only sets `pointer-events: none`.
  Keyboard users can still tab into the hidden links.
  Code: `style={{ pointerEvents: isAccountRoute ? 'auto' : 'none' }}`
  Fix: Add `visibility: hidden` or `display: none` when the sidebar is inactive.
  WCAG: 2.1.1 (Keyboard), 2.4.3 (Focus Order)

[A11Y] apps/web/src/components/DefaultHero.astro
  Image missing meaningful alt text (uses weak placeholder).
  The code falls back to 'Hero image', which is not descriptive and not empty (decorative).
  Code: `alt={media.alt || 'Hero image'}`
  Fix: Use empty string `alt=""` if decorative, or require meaningful alt text from CMS.
  WCAG: 1.1.1 (Non-text Content)

[A11Y] apps/web/src/components/ThemeSwitcher.astro
  Icon-only button has accessible name but icons lack aria-hidden.
  Screen readers may announce the SVGs redundantly or incorrectly.
  Code: `<svg ...>` inside button.
  Fix: Add `aria-hidden="true"` to the SVG elements.
  WCAG: 4.1.2 (Name, Role, Value)

SERIOUS (5 issues)
──────────────────
[A11Y] packages/ui/components/ui/button.tsx
  Touch target too small (Default size).
  The default button height is `h-8` (32px), well below the 44px minimum recommendation.
  Code: `h-8` (32px)
  Fix: Increase default height to at least 44px, or ensure enough padding/spacing is clickable.
  WCAG: 2.5.5 (Target Size)

[A11Y] packages/ui/components/ui/input.tsx
  Touch target too small.
  The default input height is `h-8` (32px).
  Code: `h-8` (32px)
  Fix: Increase height to 44px.
  WCAG: 2.5.5 (Target Size)

[A11Y] packages/ui/components/ui/checkbox.tsx
  Touch target too small.
  The checkbox is 16px. Even with the pseudo-element padding, it falls slightly short of 44x44px.
  Code: `after:-inset-x-3 after:-inset-y-2` (Approx 40x32px).
  Fix: Increase pseudo-element inset to achieve full 44px (e.g., `-inset-3.5`).
  WCAG: 2.5.5 (Target Size)

[A11Y] packages/ui/components/ui/switch.tsx
  Touch target too small (Vertical).
  The switch is `h-[18.4px]`. With padding, it is approx 34px tall.
  Code: `data-[size=default]:h-[18.4px]`
  Fix: Increase vertical pseudo-element inset.
  WCAG: 2.5.5 (Target Size)

[A11Y] packages/ui/components/ui/dialog.tsx
  Close button touch target too small.
  Uses `size="icon-sm"` which maps to 28px.
  Code: `size="icon-sm"` (28px)
  Fix: Use `icon` size (32px) and add padding/touch area to reach 44px.
  WCAG: 2.5.5 (Target Size)

MODERATE (Consider Fixing)
──────────────────────────
[Visual] apps/web/src/components/DefaultHero.astro
  Fallback Alt Text "Hero image" is poor practice.
  While not missing, it provides no value.
  Fix: Audit CMS content to ensure alt text is always provided.

[A11Y] packages/ui/components/ui/input.tsx
  Missing explicit label enforcement.
  The component passes props but doesn't mandate an ID or Label linkage.
  Fix: Ensure `Label` or `aria-label` is always used in consuming components (Checked `search-bar.tsx` and it was good, but risk remains).

═══════════════════════════════════════════════════
SUMMARY: 3 critical, 5 serious, 2 moderate
Score: 45/100
═══════════════════════════════════════════════════
