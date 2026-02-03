═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: COMPLETE CODEBASE
═══════════════════════════════════════════════════

CRITICAL (2 issues)
───────────────────
[A11Y] packages/ui/components/icon.tsx: Line 47
  <svg {...props} ...> {title ? <title>{title}</title> : null} <use ... /> </svg>
  Problem: Missing `aria-hidden="true"` when title is missing. Decorative icons may be announced incorrectly.
  Fix: Add `aria-hidden={!title}` to the svg element.
  WCAG: 1.1.1 (Non-text Content)

[A11Y] packages/ui/components/ui/button.tsx: Line 26
  Problem: Icon-only variants (`icon`, `icon-sm`) do not enforce accessible names.
  Fix: Enforce `aria-label` prop or presence of `sr-only` children when using icon-only variants.
  WCAG: 4.1.2 (Name, Role, Value)

SERIOUS (7 issues)
──────────────────
[A11Y] packages/ui/components/ui/button.tsx: Line 24
  size: { default: 'h-8', xs: 'h-6', sm: 'h-7' }
  Problem: Touch targets are significantly below 44px (32px, 24px, 28px).
  Fix: Increase default height to at least 40px, ideally 44px.
  WCAG: 2.5.5 (Target Size)

[A11Y] packages/ui/components/ui/input.tsx: Line 10
  className="... h-8 ..."
  Problem: Touch target is 32px.
  Fix: Increase height to at least 40px.
  WCAG: 2.5.5 (Target Size)

[A11Y] packages/ui/components/ui/select.tsx: Line 38
  data-[size=default]:h-8
  Problem: Trigger touch target is 32px. Items (`py-1`) are also too small.
  Fix: Increase trigger height and item padding.
  WCAG: 2.5.5 (Target Size)

[A11Y] packages/ui/components/ui/dialog.tsx: Line 55
  <Button ... size="icon-sm" />
  Problem: Close button size is 28px.
  Fix: Use a larger button variant or increase hit area.
  WCAG: 2.5.5 (Target Size)

[A11Y] packages/ui/components/ui/sheet.tsx: Line 57
  <Button ... size="icon-sm" />
  Problem: Close button size is 28px.
  Fix: Use a larger button variant.
  WCAG: 2.5.5 (Target Size)

[A11Y] packages/ui/components/ui/switch.tsx: Line 16
  Problem: Touch target with pseudo-element is ~34.4px.
  Fix: Increase pseudo-element expansion to meet 44px.
  WCAG: 2.5.5 (Target Size)

[A11Y] packages/ui/components/ui/checkbox.tsx: Line 10
  Problem: Touch target with pseudo-element is 32px.
  Fix: Increase pseudo-element expansion to meet 44px.
  WCAG: 2.5.5 (Target Size)

MODERATE (4 issues)
───────────────────
[A11Y] packages/ai/src/components/ai-elements/image.tsx: Line 19
  alt={props.alt ?? ''}
  Problem: Defaults to empty alt text, which may be inappropriate for generated content.
  Fix: Require alt text or provide a descriptive fallback.
  WCAG: 1.1.1 (Non-text Content)

[A11Y] apps/web/src/components/cms/Card.tsx: Line 31
  alt={metaImage.alt || title || 'Post image'}
  Problem: 'Post image' is a weak fallback.
  Fix: Enforce alt text in CMS or use title as fallback consistently.
  WCAG: 1.1.1 (Non-text Content)

[A11Y] apps/web/src/components/DefaultHero.astro: Line 124
  alt={media.alt || 'Hero image'}
  Problem: 'Hero image' is a weak fallback.
  Fix: Enforce alt text in CMS.
  WCAG: 1.1.1 (Non-text Content)

[A11Y] packages/ui/components/ui/sidebar.tsx: Line 199
  tabIndex={-1}
  Problem: SidebarRail is removed from tab order.
  Fix: Ensure keyboard users can access sidebar toggle via other means (SidebarTrigger).
  WCAG: 2.1.1 (Keyboard)

═══════════════════════════════════════════════════
SUMMARY: 2 critical, 7 serious, 4 moderate
Score: 65/100
═══════════════════════════════════════════════════
