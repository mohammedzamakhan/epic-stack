
═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: Global Audit
═══════════════════════════════════════════════════

## 1. Shared UI Components (`packages/ui`)

CRITICAL (1 issue)
───────────────────
[A11Y] packages/ui/components/icon.tsx
  <svg {...props}> {title ? <title>{title}</title> : null} ... </svg>
  Problem: Decorative icons (missing title) are not hidden from screen readers.
  Fix: Add aria-hidden={!title ? "true" : undefined}
  WCAG: 1.1.1

SERIOUS (4 issues)
──────────────────
[A11Y] packages/ui/components/ui/button.tsx
  size defaults: "default" (h-8/32px), "sm" (h-7/28px), "xs" (h-6/24px)
  Problem: Touch targets are significantly below WCAG 2.5.5 minimum (44x44px).
  Fix: Increase default heights or add touch target expansion (pseudo-elements).
  WCAG: 2.5.5

[A11Y] packages/ui/components/ui/input.tsx
  h-8 (32px)
  Problem: Input touch target too small.
  Fix: Increase to h-11 (44px) or add padding.
  WCAG: 2.5.5

[A11Y] packages/ui/components/ui/switch.tsx
  Problem: Computed height approx 34px even with pseudo-element.
  Fix: Increase pseudo-element inset to ensure 44px total height.
  WCAG: 2.5.5

[A11Y] packages/ui/components/ui/checkbox.tsx
  Problem: Computed size 32px with pseudo-element.
  Fix: Increase pseudo-element inset.
  WCAG: 2.5.5


## 2. App Application (`apps/app`)

CRITICAL (4 issues)
───────────────────
[A11Y] apps/app/app/components/user-dropdown.tsx
  <Button ...> <Link ...> ... </Link> </Button>
  Problem: Invalid HTML nesting (Interactive inside Interactive).
  Fix: Use `asChild` on Button or style the Link directly as a button.
  WCAG: 4.1.2

[A11Y] apps/app/app/components/nav-user.tsx
  <DropdownMenuItem ... render={<Link ...> ... </Link>} />
  Problem: Potential invalid nesting if DropdownMenuItem renders a div button.
  Fix: Ensure DropdownMenuItem renders as a Link via `asChild`.
  WCAG: 4.1.2

[A11Y] apps/app/app/components/ui/multi-media-upload.tsx
  <div ... onClick={handleClick}>
  Problem: Non-semantic click handler. Missing keyboard access.
  Fix: Add role="button", tabIndex={0}, onKeyDown={...}.
  WCAG: 2.1.1

[A11Y] apps/app/app/components/ui/multi-media-upload.tsx
  <img alt={fields.altText.initialValue ?? ''} />
  Problem: User-uploaded images may lack alt text if not provided, rendering them as decorative (empty alt) which might not be intended.
  Fix: Require alt text or provide a generic fallback like "Uploaded media".
  WCAG: 1.1.1

SERIOUS (3 issues)
──────────────────
[A11Y] apps/app/app/components/data-table.tsx
  DragHandle button size="icon" (size-7/28px).
  Problem: Touch target too small for a drag handle.
  Fix: Increase size or padding.
  WCAG: 2.5.5

[A11Y] apps/app/app/components/impersonation-banner.tsx
  Icon name="alert-triangle" (no aria-hidden).
  Problem: Decorative icon exposed to screen readers.
  Fix: Add aria-hidden="true".
  WCAG: 1.1.1

[A11Y] apps/app/app/routes/_app+/$orgSlug_+/notes.tsx
  <Button variant="default"><Link to="new">...</Link></Button>
  Problem: Nested interactive elements.
  Fix: Remove Button wrapper, style Link as button.
  WCAG: 4.1.2


## 3. Marketing Website (`apps/web`)

CRITICAL (3 issues)
───────────────────
[A11Y] apps/web/src/components/ThemeSwitcher.astro
  <svg>...</svg> (no aria-hidden)
  Problem: Decorative SVGs inside button are not hidden.
  Fix: Add aria-hidden="true" to SVGs.
  WCAG: 1.1.1

[A11Y] apps/web/src/components/DefaultHero.astro
  alt={media.alt || 'Hero image'}
  Problem: Weak fallback alt text.
  Fix: Use empty string if decorative, or more descriptive text.
  WCAG: 1.1.1

[A11Y] apps/web/src/components/DefaultHero.astro
  <video>... (no accessible name/captions)
  Problem: Video element lacks labeling.
  Fix: Add aria-label or title.
  WCAG: 1.1.1

SERIOUS (1 issue)
──────────────────
[A11Y] apps/web/src/components/ui/Button.astro
  Sizes default/sm/xs are all < 44px.
  Problem: Touch targets too small.
  Fix: Use size="xl" (44px) as default or increase base sizes.
  WCAG: 2.5.5


## 4. Admin Dashboard (`apps/admin`)

SERIOUS (2 issues)
──────────────────
[A11Y] apps/admin/app/routes/_admin+/audit-logs.tsx
  <label>Search</label><Input />
  Problem: Label not programmatically associated with Input (missing htmlFor/id).
  Fix: Add id="search" to Input and htmlFor="search" to label.
  WCAG: 1.3.1

[A11Y] apps/admin/app/routes/_admin+/audit-logs.tsx
  <Button ...><Icon .../></Button>
  Problem: Icons inside buttons with text are not hidden.
  Fix: Add aria-hidden="true" to Icons.
  WCAG: 1.1.1


═══════════════════════════════════════════════════
SUMMARY: 8 critical, 10 serious, 0 moderate
Score: 65/100
═══════════════════════════════════════════════════
