═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: Global Audit
═══════════════════════════════════════════════════

CRITICAL (2 issues)
───────────────────
[A11Y] apps/app/app/components/user-dropdown.tsx:24
  <Button variant="secondary"><Link ...>...</Link></Button>
  Problem: Invalid HTML nesting. Interactive <a> tag inside <button> tag.
  Fix: Use 'asChild' prop on Button if using Radix/Base UI, or remove Button wrapper and style Link directly.
  WCAG: 4.1.2

[A11Y] apps/app/app/routes/_app+/$orgSlug_+/notes.tsx:192
  <Button variant="default"><Link to="new">...</Link></Button>
  Problem: Invalid HTML nesting. Interactive <a> tag inside <button> tag.
  Fix: Use 'asChild' prop on Button or style Link directly.
  WCAG: 4.1.2

SERIOUS (8 issues)
──────────────────
[A11Y] packages/ui/components/ui/button.tsx:24-34
  size: default (h-8/32px), sm (h-7/28px), xs (h-6/24px)
  Problem: Touch targets are smaller than 44x44px.
  Fix: Increase default height to h-11 (44px) or add padding/invisible touch area.
  WCAG: 2.5.5

[A11Y] packages/ui/components/ui/input.tsx:11
  h-8 (32px)
  Problem: Input touch target is smaller than 44px.
  Fix: Increase height to h-11 or use h-10 as a minimum with extra padding.
  WCAG: 2.5.5

[A11Y] packages/ui/components/ui/switch.tsx:19
  h-[18.4px] w-[32px] (with after pseudo: ~34px height)
  Problem: Switch touch target is smaller than 44px even with pseudo-element.
  Fix: Increase 'after' pseudo-element inset to ensure 44x44px hit area.
  WCAG: 2.5.5

[A11Y] packages/ui/components/ui/checkbox.tsx:13
  size-4 (16px) (with after pseudo: 32px)
  Problem: Checkbox touch target is smaller than 44px.
  Fix: Increase 'after' pseudo-element inset to ensure 44x44px hit area.
  WCAG: 2.5.5

[A11Y] apps/web/src/components/ThemeSwitcher.astro:12
  size-8 (32px)
  Problem: Touch target too small.
  Fix: Increase to size-11 (44px) or add transparent padding.
  WCAG: 2.5.5

[A11Y] apps/web/src/components/ThemeSwitcher.astro:18
  <svg ...>
  Problem: Icons used inside button without aria-hidden="true".
  Fix: Add aria-hidden="true" to SVGs as they are decorative (button has aria-label).
  WCAG: 4.1.2

[A11Y] apps/app/app/components/data-table.tsx:95
  size="icon" (size-7/28px)
  Problem: DragHandle button touch target too small.
  Fix: Increase size or add invisible touch area.
  WCAG: 2.5.5

[A11Y] apps/web/src/components/DefaultHero.astro:202
  alt={media.alt || 'Hero image'}
  Problem: Weak fallback alt text "Hero image".
  Fix: Use empty string (alt="") for decorative images if no specific alt text is provided, or require specific alt text.
  WCAG: 1.1.1

═══════════════════════════════════════════════════
SUMMARY: 2 critical, 8 serious, 0 moderate
Score: 65/100
═══════════════════════════════════════════════════
