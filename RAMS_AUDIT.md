
═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: Full Codebase Audit
═══════════════════════════════════════════════════

CRITICAL (0 issues)
───────────────────
No critical issues found in the sampled components based on the rubric (Missing alt, Icon-only without label, etc.).

SERIOUS (8 issues)
──────────────────
[A11Y] packages/ui/components/ui/button.tsx
  Default button height is 32px (h-8), and XS is 24px (h-6).
  WCAG 2.5.5 requires a minimum target size of 44x44px.
  Fix: Increase default height to h-10 or h-11, or add large negative margins/pseudo-elements for touch targets.
  WCAG: 2.5.5 (Touch target too small)

[A11Y] packages/ui/components/ui/input.tsx
  Default input height is 32px (h-8).
  WCAG 2.5.5 requires a minimum target size of 44x44px.
  Fix: Increase default height to h-10 or h-11.
  WCAG: 2.5.5 (Touch target too small)

[A11Y] packages/ui/components/ui/dialog.tsx:64
  Dialog close button uses `size="icon-sm"` which is 28x28px.
  <Button variant="ghost" size="icon-sm" />
  Fix: Use `size="icon"` (32px) and ensure touch target expansion, or increase to 44px.
  WCAG: 2.5.5 (Touch target too small)

[A11Y] apps/web/src/components/ThemeSwitcher.astro:12
  Theme switcher button is `size-8` (32px).
  class="theme-switcher flex size-8 cursor-pointer..."
  Fix: Increase to `size-11` or add `min-w-[44px] min-h-[44px]`.
  WCAG: 2.5.5 (Touch target too small)

[A11Y] apps/web/src/components/ui/Button.astro
  Astro Button component mimics the React Button issues with `h-8` default.
  Fix: Update sizing to meet minimum touch requirements.
  WCAG: 2.5.5 (Touch target too small)

[A11Y] apps/app/app/components/app-sidebar.tsx:317
  Sidebars use `opacity` and `pointer-events` to hide content, but do not remove it from the accessibility tree.
  Screen readers can still navigate to the hidden sidebar.
  Fix: Add `aria-hidden={!isAccountRoute}` and `inert={!isAccountRoute ? '' : undefined}` to the motion.div containers.
  WCAG: 4.1.2

[A11Y] packages/ui/components/icon.tsx
  Icons do not default to `aria-hidden="true"`.
  Decorative icons might be announced by some screen readers if they lack a title but aren't hidden.
  Fix: Default `aria-hidden="true"` unless `title` is provided.
  WCAG: 1.1.1

[A11Y] packages/ui/components/ui/switch.tsx:21
  Switch component has a small visual height (18.4px).
  While it uses pseudo-elements for touch expansion, the calculated height (approx 34px) is still below 44px.
  Fix: Increase pseudo-element inset to ensure 44px hit area.
  WCAG: 2.5.5 (Touch target too small)

MODERATE (2 issues)
──────────────────
[A11Y] packages/ui/components/ui/checkbox.tsx
  Checkbox touch target with pseudo-elements is approx 40x32px.
  Slightly below the 44px recommendation.
  Fix: Increase negative insets on `after` pseudo-element.
  WCAG: 2.5.5

[Visual] packages/ui/components/ui/button.tsx
  Inconsistent sizing between `xs`, `sm`, `default`, `lg`.
  `xs` (24px) is extremely small for any interactive element.
  Fix: Standardize on a minimum viable size (e.g., 32px) even for "small" elements, or use density scaling carefully.

═══════════════════════════════════════════════════
SUMMARY: 0 critical, 8 serious, 2 moderate
Score: 56/100
═══════════════════════════════════════════════════
