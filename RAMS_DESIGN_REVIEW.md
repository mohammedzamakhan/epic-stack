═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: Full Codebase Audit
═══════════════════════════════════════════════════

CRITICAL (Must Fix)
───────────────────
[A11Y] apps/app/app/components/user-dropdown.tsx:24
  <Button variant="secondary"><Link ...>...</Link></Button>
  Problem: Invalid HTML nesting. Interactive `Link` inside interactive `Button`.
  Fix: Use `asChild` on Button or remove Button wrapper and style Link directly.
  WCAG: 4.1.2

[A11Y] apps/app/app/routes/_app+/$orgSlug_+/notes.tsx:238
  <Button variant="default"><Link ...>...</Link></Button>
  Problem: Invalid HTML nesting. Interactive `Link` inside interactive `Button`.
  Fix: Use `asChild` on Button or remove Button wrapper.
  WCAG: 4.1.2

[A11Y] packages/ui/components/icon.tsx:35
  <svg ...>{title ? <title>{title}</title> : null}<use ... /></svg>
  Problem: Icons do not default to `aria-hidden="true"`. If title is missing, it's treated as an image without alt text or potentially confusing noise.
  Fix: Add `aria-hidden={!title}` or default to `aria-hidden="true"` and require explicit override if semantic.
  WCAG: 1.1.1

[A11Y] apps/web/src/components/DefaultHero.astro:165
  alt={media.alt || 'Hero image'}
  Problem: Weak fallback alt text "Hero image".
  Fix: Use empty alt (`alt=""`) if decorative/unknown, or require meaningful description.
  WCAG: 1.1.1

[A11Y] apps/admin/app/routes/_admin+/audit-logs.tsx:154
  <label ...><Trans>Search</Trans></label><Input ... />
  Problem: Input not programmatically associated with label (missing `htmlFor` matching `id`).
  Fix: Add `id="search-input"` to Input and `htmlFor="search-input"` to label.
  WCAG: 1.3.1

SERIOUS (Should Fix)
──────────────────
[A11Y] packages/ui/components/ui/button.tsx:27
  size: { default: 'h-8', ... }
  Problem: Default button height is 32px, below WCAG 2.5.5 recommendation of 44px.
  Fix: Increase default height to at least 44px or add touch target padding.
  WCAG: 2.5.5

[A11Y] packages/ui/components/ui/input.tsx:10
  className={cn(..., 'h-8 w-full ...')}
  Problem: Default input height is 32px.
  Fix: Increase min-height to 44px.
  WCAG: 2.5.5

[A11Y] packages/ui/components/ui/switch.tsx:15
  data-[size=default]:h-[18.4px] ... after:absolute after:-inset-x-3 after:-inset-y-2
  Problem: Effective touch target is ~34px height, below 44px.
  Fix: Increase pseudo-element inset to achieve 44px touch target.
  WCAG: 2.5.5

[A11Y] apps/app/app/components/data-table.tsx:109
  className="text-muted-foreground size-7 hover:bg-transparent"
  Problem: DragHandle button is 28x28px.
  Fix: Increase size or touch target to 44x44px.
  WCAG: 2.5.5

[A11Y] apps/app/app/components/app-sidebar.tsx:340
  style={{ pointerEvents: isAccountRoute ? 'auto' : 'none' }}
  Problem: Inactive sidebar is hidden visually (opacity) and by pointer, but may remain in accessibility tree.
  Fix: Add `aria-hidden={!isAccountRoute}` or `visibility: hidden`.
  WCAG: 2.4.7

[A11Y] apps/app/app/components/impersonation-banner.tsx:32
  <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-3">
  Problem: Potential low contrast with yellow text on yellow background.
  Fix: Verify contrast ratio is > 4.5:1. Use darker yellow/orange for text.
  WCAG: 1.4.3

[A11Y] apps/web/src/components/ThemeSwitcher.astro:12
  class="theme-switcher flex size-8 ..."
  Problem: Button size 32x32px.
  Fix: Increase to 44x44px.
  WCAG: 2.5.5

MODERATE (Consider Fixing)
──────────────────
[Visual] apps/admin/app/routes/_admin+/audit-logs.tsx:220
  <Input ... type="date" />
  Problem: Date inputs can be inconsistent across browsers.
  Fix: Consider a custom date picker component for consistent UX.

[Visual] apps/app/app/components/notes-chart.tsx:43
  trendPercentage calculation
  Problem: Potential visual noise if trend is flat or data is sparse.
  Fix: Handle edge cases (0 notes) gracefully in UI text.

═══════════════════════════════════════════════════
SUMMARY: 5 critical, 7 serious, 2 moderate
Score: 65/100
═══════════════════════════════════════════════════
