
═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/app/app/routes/_app+/$orgSlug_+/notes.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issue)
───────────────────
[A11Y] Line 235-239: Nested interactive controls
  <Button variant="default">
      <Link to="new">...</Link>
  </Button>
  Fix: Use `asChild` prop if supported, or restructure to avoid nesting <a> inside <button>.
  WCAG: 4.1.2

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/app/app/components/user-dropdown.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issue)
───────────────────
[A11Y] Line 22-35: Nested interactive controls
  <DropdownMenuTrigger>
      <Button variant="secondary">
          <Link ...>...</Link>
      </Button>
  </DropdownMenuTrigger>
  Fix: Remove the <Button> wrapper or make the <Link> the direct child of Trigger if supported.
  WCAG: 4.1.2

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/ui/button.tsx
═══════════════════════════════════════════════════

SERIOUS (4 issues)
──────────────────
[A11Y] Line 25: Touch target too small (default size)
  size: { default: 'h-8 ...' }
  Fix: Increase min-height to 44px (h-11) for touch targets.
  WCAG: 2.5.5

[A11Y] Line 27: Touch target too small (xs size)
  xs: "h-6 ..."
  Fix: Increase to 44px or ensure sufficient spacing/padding.
  WCAG: 2.5.5

[A11Y] Line 28: Touch target too small (sm size)
  sm: "h-7 ..."
  Fix: Increase to 44px.
  WCAG: 2.5.5

[A11Y] Line 30: Touch target too small (icon size)
  icon: 'size-8'
  Fix: Increase to size-11 (44px).
  WCAG: 2.5.5

VISUAL DESIGN
─────────────
[Typography] Line 27: Font size too small
  text-xs (12px) in xs size button.
  Fix: Use at least 14px for readability.

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/ui/input.tsx
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[A11Y] Line 11: Touch target too small
  h-8 (32px) default height.
  Fix: Increase to h-11 (44px).
  WCAG: 2.5.5

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/app/app/components/data-table.tsx
═══════════════════════════════════════════════════

SERIOUS (3 issues)
──────────────────
[A11Y] Line 74: Touch target too small (DragHandle)
  <Button ... size="icon" className="... size-7 ...">
  Fix: Increase button size to 44px.
  WCAG: 2.5.5

[A11Y] Line 166: Touch target too small (Reviewer Avatar)
  <Avatar ... className="... size-7 ...">
  Fix: Increase to 44px if interactive/tooltip trigger.
  WCAG: 2.5.5

[A11Y] Line 180: Touch target too small (Add Reviewer Button)
  <Button ... size="icon" className="... size-7 ...">
  Fix: Increase to 44px.
  WCAG: 2.5.5

MODERATE (1 issue)
──────────────────
[A11Y] Line 240: Table filters lack visible labels
  <Input ... /> inside cells without visible labels (only aria-label via sr-only Label).
  Fix: Verify placeholder or visible label is sufficient for context.
  WCAG: 3.3.2

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/web/src/components/ThemeSwitcher.astro
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[A11Y] Line 12: Touch target too small
  class="... size-8 ..."
  Fix: Increase to size-11 (44px).
  WCAG: 2.5.5

MODERATE (1 issue)
──────────────────
[A11Y] Line 17, 27: SVGs missing aria-hidden
  <svg ...>
  Fix: Add aria-hidden="true" to decorative icons.
  WCAG: 1.1.1

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/app/app/components/app-sidebar.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issue)
───────────────────
[A11Y] Line 86: Contrast ratio below 4.5:1
  <span className="font-bold text-red-400">
  Red text on sidebar-accent background (likely light gray in light mode).
  Fix: Use a darker red (e.g. red-600) or ensure high contrast background.
  WCAG: 1.4.3

SERIOUS (1 issue)
──────────────────
[A11Y] Line 92: Nested interactive controls (Upgrade Button)
  <Button ... render={<Link ... />} >
  Fix: Verify Button implementation supports 'render' prop correctly without nesting <button><a>...</a></button>.
  WCAG: 4.1.2

MODERATE (1 issue)
──────────────────
[A11Y] Line 323: Interactive element with onClick but no keyboard handler
  <SidebarRail ... onClick={toggleSidebar} tabIndex={-1}>
  Fix: Ensure keyboard users can toggle sidebar via other means (SidebarTrigger), or add onKeyDown handler.
  WCAG: 2.1.1

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/ui/switch.tsx
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[A11Y] Line 15: Touch target too small
  data-[size=default]:h-[18.4px] ... after:-inset-y-2
  Effective height ~34.4px.
  Fix: Increase hit area to at least 44px.
  WCAG: 2.5.5

═══════════════════════════════════════════════════
SUMMARY: 3 critical, 11 serious, 3 moderate
Score: 65/100
═══════════════════════════════════════════════════
