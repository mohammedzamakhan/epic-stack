
═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: Global Codebase Audit
═══════════════════════════════════════════════════

CRITICAL (2 issues)
───────────────────
[A11Y] apps/app/app/components/app-sidebar.tsx:357
  <motion.div ... opacity: isAccountRoute ? 1 : 0 ... style={{ pointerEvents: ... }}>
  Description: Hidden sidebar content (Account/Organization switcher) remains in the tab order when invisible (opacity: 0). Users can tab into invisible elements.
  Fix: Add `aria-hidden={!isVisible}` and `inert={!isVisible ? "true" : undefined}` (or `visibility: hidden`) to the container.
  WCAG: 2.4.3, 2.4.7

[A11Y] apps/web/src/components/DefaultHero.astro:139
  alt={media.alt || 'Hero image'}
  Description: Image uses weak redundant alt text "Hero image" when no alt is provided.
  Fix: Use `alt={media.alt || ""}` if decorative, or enforce meaningful text from CMS.
  WCAG: 1.1.1

SERIOUS (4 issues)
──────────────────
[A11Y] packages/ui/components/ui/button.tsx:31
  default: 'h-8 ...'
  Description: Button touch targets are consistently too small (32px, 28px, 24px) across the design system. Recommended minimum is 44px.
  Fix: Increase default height to h-11 (44px) or add transparent padding.
  WCAG: 2.5.5

[A11Y] packages/ui/components/ui/switch.tsx:19
  h-[18.4px] ... after:-inset-x-3 after:-inset-y-2
  Description: Switch component touch area is approx 34px height, below 44px minimum.
  Fix: Increase `after` pseudo-element inset to at least -inset-y-[13px] (approx).
  WCAG: 2.5.5

[A11Y] apps/web/src/components/ThemeSwitcher.astro:11
  class="... size-8 ..."
  Description: Theme switcher button is 32x32px, below 44px minimum.
  Fix: Increase size to 44px or add padding.
  WCAG: 2.5.5

[A11Y] apps/app/app/components/impersonation-banner.tsx:31
  text-yellow-600
  Description: Yellow text on yellow-50 background likely has insufficient contrast (< 4.5:1).
  Fix: Use darker shade (e.g., text-yellow-800 or text-yellow-900).
  WCAG: 1.4.3

MODERATE (2 issues)
──────────────────
[A11Y] apps/web/src/components/ThemeSwitcher.astro:17
  <svg ...>
  Description: Decorative SVG icons inside button lack `aria-hidden="true"`.
  Fix: Add `aria-hidden="true"` to SVGs.
  WCAG: 4.1.2

[A11Y] apps/app/app/components/search-bar.tsx:28
  autoFocus={autoFocus}
  Description: Autofocus can be disorienting for screen reader users (context change).
  Fix: Ensure autofocus is only used when user explicitly initiates search action.
  WCAG: 3.2.1

═══════════════════════════════════════════════════
SUMMARY: 2 critical, 4 serious, 2 moderate
Score: 65/100
═══════════════════════════════════════════════════
