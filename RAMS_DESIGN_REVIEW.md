
═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/app/app/components/ui/multi-image-upload.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issues)
───────────────────
[A11Y] Line 123: Non-semantic click handler without keyboard support
  <div onClick={handleClick} ...>
  Fix: Add role="button", tabIndex={0}, and onKeyDown handler for Enter/Space
  WCAG: 2.1.1

SERIOUS (0 issues)
──────────────────

MODERATE (0 issues)
──────────────────

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/app/app/components/user-dropdown.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issues)
───────────────────
[A11Y] Line 94: Invalid HTML nesting (Interactive controls nested)
  <DropdownMenuTrigger render={<SidebarMenuButton ...> ... </DropdownMenuTrigger>
  Fix: Ensure SidebarMenuButton is not a button if DropdownMenuTrigger renders a button, or use asChild to merge them.
  WCAG: 4.1.2

SERIOUS (0 issues)
──────────────────

MODERATE (0 issues)
──────────────────

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/web/src/components/DefaultHero.astro
═══════════════════════════════════════════════════

CRITICAL (1 issues)
───────────────────
[A11Y] Line 56: Link missing destination
  const url = child.fields?.url || child.url || '#'
  Fix: Ensure a valid URL is provided or hide the link if no URL exists. href="#" is not accessible.
  WCAG: 2.1.1

SERIOUS (0 issues)
──────────────────

MODERATE (1 issues)
──────────────────
[A11Y] Line 185: Weak alt text
  alt={media.alt || 'Hero image'}
  Fix: Use empty alt="" if decorative, or provide descriptive text. "Hero image" is redundant.
  WCAG: 1.1.1

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/ui/button.tsx
═══════════════════════════════════════════════════

CRITICAL (0 issues)
───────────────────

SERIOUS (6 issues)
──────────────────
[A11Y] Line 25: Touch target too small (size="default")
  h-8 (32px)
  Fix: Increase min-height to 44px
  WCAG: 2.5.5

[A11Y] Line 27: Touch target too small (size="xs")
  h-6 (24px)
  Fix: Increase min-height to 44px
  WCAG: 2.5.5

[A11Y] Line 28: Touch target too small (size="sm")
  h-7 (28px)
  Fix: Increase min-height to 44px
  WCAG: 2.5.5

[A11Y] Line 30: Touch target too small (size="icon")
  size-8 (32px)
  Fix: Increase size to 44px
  WCAG: 2.5.5

[A11Y] Line 32: Touch target too small (size="icon-xs")
  size-6 (24px)
  Fix: Increase size to 44px
  WCAG: 2.5.5

[A11Y] Line 34: Touch target too small (size="icon-sm")
  size-7 (28px)
  Fix: Increase size to 44px
  WCAG: 2.5.5

MODERATE (0 issues)
──────────────────

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/ui/input.tsx
═══════════════════════════════════════════════════

CRITICAL (0 issues)
───────────────────

SERIOUS (1 issues)
──────────────────
[A11Y] Line 11: Touch target too small
  h-8 (32px)
  Fix: Increase min-height to 44px
  WCAG: 2.5.5

MODERATE (0 issues)
──────────────────

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/ui/switch.tsx
═══════════════════════════════════════════════════

CRITICAL (0 issues)
───────────────────

SERIOUS (1 issues)
──────────────────
[A11Y] Line 18: Touch target too small
  h-[18.4px] w-[32px] (even with pseudo-element, likely < 44px)
  Fix: Increase dimensions or touch area to 44x44px
  WCAG: 2.5.5

MODERATE (0 issues)
──────────────────

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/ui/checkbox.tsx
═══════════════════════════════════════════════════

CRITICAL (0 issues)
───────────────────

SERIOUS (1 issues)
──────────────────
[A11Y] Line 12: Touch target too small
  size-4 (16px) (even with pseudo-element, likely < 44px)
  Fix: Increase dimensions or touch area to 44x44px
  WCAG: 2.5.5

MODERATE (0 issues)
──────────────────

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/ui/dialog.tsx
═══════════════════════════════════════════════════

CRITICAL (0 issues)
───────────────────

SERIOUS (1 issues)
──────────────────
[A11Y] Line 62: Touch target too small (Close button)
  size="icon-sm" (28px)
  Fix: Use a larger button size or increase touch area
  WCAG: 2.5.5

MODERATE (0 issues)
──────────────────

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/app/app/components/impersonation-banner.tsx
═══════════════════════════════════════════════════

CRITICAL (0 issues)
───────────────────

SERIOUS (1 issues)
──────────────────
[A11Y] Line 37: Touch target too small
  size="sm" (28px)
  Fix: Use size="default" (though still small) or custom larger size
  WCAG: 2.5.5

MODERATE (0 issues)
──────────────────

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/web/src/components/ThemeSwitcher.astro
═══════════════════════════════════════════════════

CRITICAL (0 issues)
───────────────────

SERIOUS (1 issues)
──────────────────
[A11Y] Line 11: Touch target too small
  size-8 (32px)
  Fix: Increase size to 44px (e.g., size-11)
  WCAG: 2.5.5

MODERATE (0 issues)
──────────────────

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/web/src/components/ui/Button.astro
═══════════════════════════════════════════════════

CRITICAL (0 issues)
───────────────────

SERIOUS (6 issues)
──────────────────
[A11Y] Line 41: Touch target too small (size="default")
  h-8 (32px)
  Fix: Increase to 44px
  WCAG: 2.5.5

[A11Y] Line 43: Touch target too small (size="xs")
  h-6 (24px)
  Fix: Increase to 44px
  WCAG: 2.5.5

[A11Y] Line 44: Touch target too small (size="sm")
  h-7 (28px)
  Fix: Increase to 44px
  WCAG: 2.5.5

[A11Y] Line 47: Touch target too small (size="icon")
  size-8 (32px)
  Fix: Increase to 44px
  WCAG: 2.5.5

[A11Y] Line 49: Touch target too small (size="icon-xs")
  size-6 (24px)
  Fix: Increase to 44px
  WCAG: 2.5.5

[A11Y] Line 51: Touch target too small (size="icon-sm")
  size-7 (28px)
  Fix: Increase to 44px
  WCAG: 2.5.5

MODERATE (0 issues)
──────────────────

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/app/app/components/note/comment-image-preview.tsx
═══════════════════════════════════════════════════

CRITICAL (0 issues)
───────────────────

SERIOUS (1 issues)
──────────────────
[A11Y] Line 54: Touch target too small (extremely small)
  h-5 w-5 (20px)
  Fix: Remove explicit size override or increase to 44px
  WCAG: 2.5.5

MODERATE (1 issues)
──────────────────
[A11Y] Line 47: Weak alt text
  alt={file.name}
  Fix: Provide a way to enter alt text or describe the image content
  WCAG: 1.1.1

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/icon.tsx
═══════════════════════════════════════════════════

CRITICAL (0 issues)
───────────────────

SERIOUS (1 issues)
──────────────────
[A11Y] Line 54: Missing default aria-hidden
  <svg ...>
  Fix: Add aria-hidden="true" by default unless title is provided
  WCAG: 4.1.2

MODERATE (0 issues)
──────────────────

═══════════════════════════════════════════════════
SUMMARY: 3 critical, 22 serious, 2 moderate
Score: 45/100
═══════════════════════════════════════════════════
