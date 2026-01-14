═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: Project Audit
═══════════════════════════════════════════════════

CRITICAL (3 issues)
───────────────────
[A11Y] packages/ui/components/icon.tsx: Line 57
  <svg {...props} ...>
  Issue: Decorative icons are exposed to assistive technology when 'title' is missing.
  Fix: Add aria-hidden={!title} to the svg element.
  WCAG: 1.1.1 (Non-text Content)

[A11Y] apps/web/src/components/heros/HighImpactHero.astro: Line 52
  alt={media.alt || 'Hero background'}
  Issue: Fallback alt text "Hero background" is not descriptive or null.
  Fix: Use alt={media.alt || ""} for decorative background images.
  WCAG: 1.1.1 (Non-text Content)

[A11Y] apps/web/src/components/blocks/MediaBlock.astro: Line 18
  alt={media.alt || 'Media image'}
  Issue: Fallback alt text "Media image" is not descriptive.
  Fix: Use alt={media.alt || ""} or require alt text.
  WCAG: 1.1.1 (Non-text Content)

SERIOUS (3 issues)
──────────────────
[A11Y] apps/app/app/components/app-sidebar.tsx: UpgradeAccountCard
  <Button ... render={<Link ...>...</Link>} />
  Issue: Potential invalid HTML nesting (interactive <a> inside interactive <button>).
  Fix: Use 'asChild' pattern or style the Link component directly as a button.
  WCAG: 4.1.1 (Parsing - Indirectly affects 4.1.2)

[A11Y] apps/app/app/routes/_auth+/login.tsx: Line ~250
  className="... text-orange-600 ..."
  Issue: Low color contrast for error text (#ea580c on #fff7ed is ~3.0:1).
  Fix: Use text-orange-700 or darker (Need 4.5:1).
  WCAG: 1.4.3 (Contrast)

[A11Y] apps/app/app/routes/_auth+/login.tsx: Line ~360
  <Icon name="lock" />
  Issue: Icon used next to text "Account Suspended" is decorative but not hidden.
  Fix: Add aria-hidden="true" to the Icon component instance.
  WCAG: 1.1.1 (Non-text Content)

MODERATE (2 issues)
──────────────────
[A11Y] packages/ui/components/ui/button.tsx
  variants: { size: { 'icon': ... } }
  Issue: Icon-only button variants exist but don't enforce aria-label.
  Fix: Add comment or prop check to ensure aria-label is provided for icon buttons.
  WCAG: 4.1.2 (Name, Role, Value)

[A11Y] apps/web/src/components/Header.astro
  <svg ... aria-hidden="true"><title>rocket</title>...
  Issue: Redundant <title> in hidden SVG.
  Fix: Remove <title> if the icon is truly decorative/hidden.
  WCAG: Best Practice

═══════════════════════════════════════════════════
SUMMARY: 3 critical, 3 serious, 2 moderate
Score: 65/100
═══════════════════════════════════════════════════
