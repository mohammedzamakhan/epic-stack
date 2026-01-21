
═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/admin/app/root.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issue)
───────────────────
[A11Y] Line 159 (Document component): Missing skip link
  <body className="bg-background text-foreground">
  Fix: Add <a href="#main-content" className="sr-only focus:not-sr-only...">Skip to main content</a> as the first child of body.
  WCAG: 2.4.1

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/app/app/components/marketing-layout.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issue)
───────────────────
[A11Y] Line 38: Skip link target missing
  <SidebarInset role="main">
  Fix: Add id="main-content" to SidebarInset to match root.tsx skip link.
  WCAG: 2.4.1

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/app/app/routes/_auth+/login.tsx
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[A11Y] Line 196: Missing h1 heading
  <CardTitle className="text-xl">
  Fix: Wrap content in <h1> or allow polymorphism in CardTitle to render as h1.
  WCAG: 1.3.1

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/ui/button.tsx
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[A11Y] Line 24: Touch target too small
  default: 'h-8 ...' (32px)
  Fix: Increase default height to h-11 (44px) or at least h-9/h-10 to approach target size.
  WCAG: 2.5.5

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/ui/input.tsx
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[A11Y] Line 11: Touch target too small
  h-8 (32px)
  Fix: Increase height to h-10 or h-11.
  WCAG: 2.5.5

MODERATE (1 issue)
──────────────────
[DX/A11Y] Line 5: Missing forwardRef
  function Input(...)
  Fix: Wrap in React.forwardRef to allow focus management libraries to work correctly.

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/ui/switch.tsx
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[A11Y] Line 18: Touch target too small
  size=sm is 14px height
  Fix: Ensure pseudo-element ::after expands hit area to at least 44px.
  WCAG: 2.5.5

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: packages/ui/components/icon.tsx
═══════════════════════════════════════════════════

MODERATE (1 issue)
──────────────────
[A11Y] Line 43: Missing default aria-hidden
  <svg ...>
  Fix: Add aria-hidden="true" by default unless title is provided.
  WCAG: 1.1.1

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/web/src/pages/index.astro
═══════════════════════════════════════════════════

MODERATE (1 issue)
──────────────────
[A11Y] Line 52: Duplicate main role
  <main class="..."> inside <MarketingLayout> (which also has <main>)
  Fix: Change inner <main> to <div> or use Fragment.
  WCAG: 1.3.1

═══════════════════════════════════════════════════
RAMS DESIGN REVIEW: apps/web/src/components/Header.astro
═══════════════════════════════════════════════════

MODERATE (1 issue)
──────────────────
[A11Y] Line 139: Missing focus trap in mobile menu
  mobileMenuOverlay
  Fix: Implement focus trapping when menu is open.
  WCAG: 2.1.2

═══════════════════════════════════════════════════
SUMMARY: 2 critical, 4 serious, 3 moderate
Score: 65/100
═══════════════════════════════════════════════════
