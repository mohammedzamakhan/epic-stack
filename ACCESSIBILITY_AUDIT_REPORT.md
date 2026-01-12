# WCAG 2.2 AA Accessibility Audit Report

**Date**: 2026-01-12
**Auditor**: Senior Accessibility Engineer / Inclusive Design Expert
**Standard**: WCAG 2.2 Level AA
**Repository**: Epic Stack Monorepo

---

## Executive Summary

This comprehensive accessibility audit evaluates the Epic Stack codebase for WCAG 2.2 AA compliance. The codebase demonstrates **solid foundational accessibility practices** through the use of Base UI and Radix UI primitives, which provide built-in ARIA attributes and keyboard navigation. However, several areas require remediation to achieve full WCAG 2.2 AA compliance.

### Overall Assessment: **Good with Improvements Needed**

**Strengths:**
- Consistent use of accessible UI primitives (Base UI, Radix)
- Proper form field associations using `htmlFor` and `id` attributes
- Screen reader text (`sr-only`) used on icon-only buttons
- Focus visible styles implemented throughout
- Dialog components properly structured with `DialogTitle` and `DialogDescription`
- `role="alert"` used for error messages
- RTL (Right-to-Left) language support implemented

**Critical Issues to Address:**
- Missing `<main>` landmark in primary layout
- Avatar images missing `alt` attributes on fallbacks
- Expandable navigation menu items missing ARIA states
- Table components missing `scope` attributes
- Some interactive elements missing accessible names

---

## Issue Log

### Issue #1: Missing Main Landmark in Layout

**File/Line:** `apps/app/app/components/marketing-layout.tsx:55-58`

**WCAG Success Criterion:** 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks

**Impact:** Screen reader users cannot efficiently navigate to the main content area. Users with motor impairments who rely on skip links or landmark navigation will have difficulty reaching the primary content.

**Remediation:**

**Before:**
```tsx
<div className="flex flex-1 flex-col">
  <div className="@container/main flex flex-1 flex-col gap-2 px-4 md:px-2">
    {children}
  </div>
</div>
```

**After:**
```tsx
<main className="flex flex-1 flex-col" role="main">
  <div className="@container/main flex flex-1 flex-col gap-2 px-4 md:px-2">
    {children}
  </div>
</main>
```

---

### Issue #2: SidebarInset Uses `<main>` but Layout Also Needs Content Landmark

**File/Line:** `packages/ui/components/ui/sidebar.tsx:299-310`

**WCAG Success Criterion:** 1.3.1 Info and Relationships

**Impact:** The `SidebarInset` component correctly uses `<main>`, which is good. However, when the marketing layout wraps content in additional divs, there may be confusion about the primary landmark.

**Status:** Partial compliance - the component itself is correct, but usage should be verified to ensure only one `<main>` element exists per page.

**Recommendation:** Audit all routes to ensure there is exactly one `<main>` element per page view.

---

### Issue #3: Missing Skip Link for Keyboard Navigation

**File/Line:** `apps/app/app/root.tsx` (Document component)

**WCAG Success Criterion:** 2.4.1 Bypass Blocks

**Impact:** Keyboard users must tab through all navigation items before reaching the main content, causing significant friction for users with motor impairments.

**Remediation:**

**Before:** No skip link present

**After:**
```tsx
<body className="bg-background text-foreground">
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:ring-2 focus:ring-ring"
  >
    Skip to main content
  </a>
  <DirectionProvider direction={direction}>{children}</DirectionProvider>
  {/* ... rest of body */}
</body>
```

Then add `id="main-content"` to the `<main>` element or primary content container.

---

### Issue #4: Header Element Missing Landmark Role

**File/Line:** `apps/app/app/components/site-header.tsx:20`

**WCAG Success Criterion:** 1.3.1 Info and Relationships

**Impact:** The `<header>` element is correctly used but needs to be associated with the banner role for proper landmark navigation.

**Status:** Partial compliance - the semantic `<header>` element is used correctly and implicitly has `role="banner"` when it's a direct child of `<body>`. However, since it's nested within other components, explicit role may be needed.

**Recommendation:** Verify that the header is recognized as a banner landmark by assistive technologies. If not, add `role="banner"` explicitly.

---

### Issue #5: Avatar Component Missing Alt Text for Fallback Images

**File/Line:** `packages/ui/components/ui/avatar.tsx:28-38`

**WCAG Success Criterion:** 1.1.1 Non-text Content

**Impact:** When avatar images fail to load and display fallback initials, screen readers may not convey meaningful information about the avatar's purpose.

**Remediation:**

**Before:**
```tsx
function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        'aspect-square size-full rounded-full object-cover',
        className,
      )}
      {...props}
    />
  )
}
```

**After:**
```tsx
function AvatarImage({
  className,
  alt = '', // Require alt or provide default
  ...props
}: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      alt={alt}
      className={cn(
        'aspect-square size-full rounded-full object-cover',
        className,
      )}
      {...props}
    />
  )
}
```

**Note:** The `UserAvatar` component in `apps/app/app/components/user-avatar.tsx:43` correctly passes `alt={altText}`, which is good. Ensure all Avatar usages follow this pattern.

---

### Issue #6: Data Table Missing Table Caption and Scope Attributes

**File/Line:** `apps/app/app/components/data-table.tsx:559-613`

**WCAG Success Criterion:** 1.3.1 Info and Relationships, 1.3.2 Meaningful Sequence

**Impact:** Screen reader users may have difficulty understanding the table structure and relationships between headers and data cells.

**Remediation:**

**Before:**
```tsx
<table className="relative min-w-full table-fixed whitespace-nowrap">
  <thead>
    {table.getHeaderGroups().map((headerGroup) => (
      <tr key={headerGroup.id} className="group">
        {headerGroup.headers.map((header) => {
          return (
            <th
              key={header.id}
              colSpan={header.colSpan}
              className="text-foreground overflow-hidden px-2 pt-3 pb-2 text-left text-sm font-medium"
            >
```

**After:**
```tsx
<table
  className="relative min-w-full table-fixed whitespace-nowrap"
  aria-label={_(msg`Data Table`)} // Add accessible name
>
  <caption className="sr-only">
    <Trans>Data table showing headers, types, statuses, targets, limits, and reviewers</Trans>
  </caption>
  <thead>
    {table.getHeaderGroups().map((headerGroup) => (
      <tr key={headerGroup.id} className="group">
        {headerGroup.headers.map((header) => {
          return (
            <th
              key={header.id}
              colSpan={header.colSpan}
              scope="col" // Add scope attribute
              className="text-foreground overflow-hidden px-2 pt-3 pb-2 text-left text-sm font-medium"
            >
```

---

### Issue #7: Table Component Missing Scope Attributes

**File/Line:** `packages/ui/components/ui/table.tsx:66-76`

**WCAG Success Criterion:** 1.3.1 Info and Relationships

**Impact:** Screen readers may not properly associate header cells with data cells.

**Remediation:**

**Before:**
```tsx
function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  )
}
```

**After:**
```tsx
function TableHead({
  className,
  scope = 'col', // Default to column scope
  ...props
}: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn(
        'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  )
}
```

---

### Issue #8: Expandable Navigation Missing ARIA States

**File/Line:** `packages/ui/components/nav-main.tsx:136-164`

**WCAG Success Criterion:** 4.1.2 Name, Role, Value

**Impact:** Screen reader users are not informed whether navigation items with submenus are expanded or collapsed.

**Remediation:**

**Before:**
```tsx
<SidebarMenuButton
  onClick={() => toggleItem(item.title)}
  tooltip={item.title}
  isActive={item.isActive}
  className="w-full justify-between"
  onMouseEnter={() => handleMenuItemMouseEnter(item.title)}
  onMouseLeave={() => handleMenuItemMouseLeave(item.title)}
>
```

**After:**
```tsx
<SidebarMenuButton
  onClick={() => toggleItem(item.title)}
  tooltip={item.title}
  isActive={item.isActive}
  className="w-full justify-between"
  aria-expanded={isOpen}
  aria-controls={`submenu-${item.title.replace(/\s+/g, '-').toLowerCase()}`}
  onMouseEnter={() => handleMenuItemMouseEnter(item.title)}
  onMouseLeave={() => handleMenuItemMouseLeave(item.title)}
>
```

And add the corresponding id to the submenu:
```tsx
{isOpen && (
  <SidebarMenuSub id={`submenu-${item.title.replace(/\s+/g, '-').toLowerCase()}`}>
```

---

### Issue #9: Sidebar Rail Button Has tabIndex=-1

**File/Line:** `packages/ui/components/ui/sidebar.tsx:274-296`

**WCAG Success Criterion:** 2.1.1 Keyboard, 2.4.3 Focus Order

**Impact:** The sidebar rail toggle is not accessible via keyboard navigation despite being interactive.

**Remediation:**

**Before:**
```tsx
<button
  data-sidebar="rail"
  data-slot="sidebar-rail"
  aria-label="Toggle Sidebar"
  tabIndex={-1}
  onClick={toggleSidebar}
  title="Toggle Sidebar"
```

**After:**
```tsx
<button
  data-sidebar="rail"
  data-slot="sidebar-rail"
  aria-label="Toggle Sidebar"
  tabIndex={0} // Make keyboard accessible, or remove entirely
  onClick={toggleSidebar}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleSidebar()
    }
  }}
  title="Toggle Sidebar"
```

**Note:** If this is intentionally excluded from tab order because `SidebarTrigger` provides the primary keyboard-accessible toggle, this can be left as-is but should be documented.

---

### Issue #10: Search Button Missing Explicit Type

**File/Line:** `apps/app/app/components/site-header.tsx:36-48`

**WCAG Success Criterion:** 4.1.2 Name, Role, Value

**Impact:** The search button correctly has visible text but could benefit from an explicit `aria-label` for screen readers.

**Status:** Partial compliance - The button has visible text "Search notes..." which is good, but for buttons that open modals, an `aria-haspopup` attribute would be beneficial.

**Remediation:**

**Before:**
```tsx
<Button
  variant="outline"
  className="bg-muted/50 text-muted-foreground relative h-8 w-[calc(100%-1rem)] flex-1 flex-row-reverse justify-start rounded-[0.5rem] text-sm font-normal shadow-none md:w-40 lg:w-64 ltr:text-left ltr:sm:pr-12 rtl:text-right rtl:sm:pl-12"
  onClick={() => setCommandOpen(true)}
>
```

**After:**
```tsx
<Button
  variant="outline"
  className="bg-muted/50 text-muted-foreground relative h-8 w-[calc(100%-1rem)] flex-1 flex-row-reverse justify-start rounded-[0.5rem] text-sm font-normal shadow-none md:w-40 lg:w-64 ltr:text-left ltr:sm:pr-12 rtl:text-right rtl:sm:pl-12"
  onClick={() => setCommandOpen(true)}
  aria-haspopup="dialog"
  aria-expanded={commandOpen}
>
```

---

### Issue #11: Notification Bell Missing Accessible Name

**File/Line:** `apps/app/app/components/site-header.tsx:49`

**WCAG Success Criterion:** 4.1.2 Name, Role, Value

**Impact:** The notification bell component should be verified to have an accessible name for screen reader users.

**Recommendation:** Review the `NotificationBell` component to ensure it has proper `aria-label` or visible text.

---

### Issue #12: Drawer Close Button Needs Accessible Name

**File/Line:** `apps/app/app/components/data-table.tsx:940-944`

**WCAG Success Criterion:** 4.1.2 Name, Role, Value

**Impact:** The DrawerClose component wraps a Button with "Done" text, but the structure may cause issues with assistive technologies.

**Remediation:**

**Before:**
```tsx
<DrawerClose>
  <Button variant="outline">
    <Trans>Done</Trans>
  </Button>
</DrawerClose>
```

**After:**
```tsx
<DrawerClose asChild>
  <Button variant="outline">
    <Trans>Done</Trans>
  </Button>
</DrawerClose>
```

Or use the render prop pattern if supported by the Base UI Dialog component.

---

### Issue #13: Link Inside Button Accessibility Anti-pattern

**File/Line:** `apps/app/app/components/app-sidebar.tsx:77-79`

**WCAG Success Criterion:** 4.1.1 Parsing, 4.1.2 Name, Role, Value

**Impact:** Nesting a `<Link>` inside a `<Button>` creates invalid HTML and confuses assistive technologies about the interactive element's role.

**Remediation:**

**Before:**
```tsx
<Button
  variant="secondary"
  size="sm"
  className="bg-sidebar-foreground text-sidebar hover:bg-sidebar-foreground/70 w-full"
>
  <Link to={`/${orgSlug}/settings/billing`}>
    <Trans>Upgrade</Trans>
  </Link>
</Button>
```

**After:**
```tsx
<Button
  variant="secondary"
  size="sm"
  className="bg-sidebar-foreground text-sidebar hover:bg-sidebar-foreground/70 w-full"
  asChild
>
  <Link to={`/${orgSlug}/settings/billing`}>
    <Trans>Upgrade</Trans>
  </Link>
</Button>
```

Or style the Link directly:
```tsx
<Link
  to={`/${orgSlug}/settings/billing`}
  className="inline-flex items-center justify-center bg-sidebar-foreground text-sidebar hover:bg-sidebar-foreground/70 w-full h-7 px-2.5 rounded-md text-sm font-medium"
>
  <Trans>Upgrade</Trans>
</Link>
```

---

### Issue #14: QR Code Image Alt Text Could Be More Descriptive

**File/Line:** `apps/app/app/components/settings/two-factor-form.tsx:118`

**WCAG Success Criterion:** 1.1.1 Non-text Content

**Impact:** The alt text "qr code" is minimal and doesn't convey the purpose of the QR code to screen reader users.

**Remediation:**

**Before:**
```tsx
<img alt="qr code" src={qrCode} className="h-48 w-48" />
```

**After:**
```tsx
<img
  alt="QR code for two-factor authentication setup. Scan this code with your authenticator app."
  src={qrCode}
  className="h-48 w-48"
/>
```

---

### Issue #15: Toast Notifications Need ARIA Live Region Configuration

**File/Line:** `packages/ui/components/ui/sonner.tsx:6-36`

**WCAG Success Criterion:** 4.1.3 Status Messages

**Impact:** Toast notifications may not be announced to screen reader users promptly.

**Status:** The Sonner library should handle this automatically, but verification is recommended.

**Recommendation:** Test with screen readers (NVDA, JAWS, VoiceOver) to ensure toasts are announced. If not, consider adding `aria-live="polite"` or `role="status"` configuration to the Toaster component.

---

### Issue #16: Logo Link Missing Accessible Name

**File/Line:** `apps/app/app/components/app-sidebar.tsx:318-319`

**WCAG Success Criterion:** 2.4.4 Link Purpose

**Impact:** The logo link wraps a Logo component, which may or may not have an accessible name.

**Remediation:**

**Before:**
```tsx
<Link to="/">
  <Logo className="text-md m-1 mx-2" />
</Link>
```

**After:**
```tsx
<Link to="/" aria-label="Go to homepage">
  <Logo className="text-md m-1 mx-2" aria-hidden="true" />
</Link>
```

Or ensure the Logo component has an accessible name.

---

### Issue #17: Checkbox "Select All" Missing Label Association

**File/Line:** `apps/app/app/components/data-table.tsx:165-173`

**WCAG Success Criterion:** 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value

**Impact:** While `aria-label` is provided, form elements in data tables should have clear associations.

**Status:** Compliant - The `aria-label="Select all"` is correctly used.

---

### Issue #18: Decorative Icons Should Have aria-hidden

**File/Line:** Multiple locations

**WCAG Success Criterion:** 1.1.1 Non-text Content

**Impact:** Icons that are purely decorative may be announced by screen readers, causing confusion.

**Status:** Partially addressed - The navigation menu chevron icon at `packages/ui/components/ui/navigation-menu.tsx:75` correctly has `aria-hidden="true"`.

**Recommendation:** Audit all Icon usages to ensure decorative icons have `aria-hidden="true"` and informative icons have appropriate `aria-label`.

---

## Positive Findings

### 1. Form Components Use Proper Label Associations

**File:** `apps/app/app/components/forms.tsx`

The `Field`, `OTPField`, `TextareaField`, and `CheckboxField` components all properly associate labels with inputs using `htmlFor` and `id` attributes. The `FieldError` component uses `role="alert"` for error messages.

### 2. Dialog Components Have Proper Structure

**File:** `packages/ui/components/ui/dialog.tsx:62-75`

The Dialog close button includes `<span className="sr-only">Close</span>` for screen reader users.

### 3. Button Component Has Focus Visible Styles

**File:** `packages/ui/components/ui/button.tsx:8`

The button styles include `focus-visible:ring-ring/50` and other focus indicators.

### 4. Sidebar Trigger Has Screen Reader Text

**File:** `packages/ui/components/ui/sidebar.tsx:268-270`

```tsx
<span className="sr-only">Toggle Sidebar</span>
```

### 5. Sheet Component Has Proper ARIA Labels

**File:** `packages/ui/components/ui/sheet.tsx:61-73`

The Sheet close button includes `<span className="sr-only">Close</span>`.

### 6. Mobile Sidebar Has Proper Dialog Structure

**File:** `packages/ui/components/ui/sidebar.tsx:190-193`

```tsx
<SheetHeader className="sr-only">
  <SheetTitle>Sidebar</SheetTitle>
  <SheetDescription>Displays the mobile sidebar.</SheetDescription>
</SheetHeader>
```

### 7. Pagination Component Has Proper ARIA

**File:** `packages/ui/components/ui/pagination.tsx`

The pagination component includes `aria-label="pagination"`, `aria-label="Go to previous page"`, and `aria-label="Go to next page"`.

### 8. RTL Language Support

**File:** `apps/app/app/root.tsx:290-291`

The document properly sets `lang` and `dir` attributes based on locale.

### 9. Alert Component Has Role

**File:** `packages/ui/components/ui/alert.tsx:30`

The Alert component correctly uses `role="alert"`.

### 10. Spinner Has Status Role

**File:** `packages/ui/components/ui/spinner.tsx:12`

The Spinner component correctly uses `role="status"` and `aria-label="Loading"`.

---

## Recommendations Summary

### Priority 1 (Critical)
1. Add skip link to root layout
2. Fix Link-inside-Button anti-pattern
3. Add `aria-expanded` to expandable navigation items
4. Add `scope` attributes to table headers

### Priority 2 (High)
5. Verify main landmark exists on all pages
6. Add more descriptive alt text for QR codes
7. Add `aria-haspopup` to buttons that open modals
8. Review all Avatar usages for alt text

### Priority 3 (Medium)
9. Fix sidebar rail keyboard accessibility or document intentional exclusion
10. Add accessible names to logo links
11. Verify toast notifications are announced by screen readers

### Priority 4 (Low)
12. Audit all icons for appropriate `aria-hidden` usage
13. Add table captions for complex data tables

---

## Testing Recommendations

1. **Automated Testing:** Run axe-core or similar tools on all pages
2. **Screen Reader Testing:** Test with NVDA (Windows), VoiceOver (macOS/iOS), and TalkBack (Android)
3. **Keyboard Navigation:** Test all interactive elements with keyboard only
4. **Color Contrast:** Use browser dev tools to verify 4.5:1 contrast ratio
5. **Zoom Testing:** Test at 200% zoom to ensure content remains usable
6. **Motion Preferences:** Test with `prefers-reduced-motion` enabled

---

## Conclusion

The Epic Stack codebase has a strong accessibility foundation through its use of accessible UI primitives. The issues identified are primarily related to ARIA states, landmark structure, and semantic HTML improvements. Implementing the recommended remediations will bring the application to full WCAG 2.2 AA compliance.

The existing E2E accessibility tests at `apps/app/tests/e2e/accessibility.test.ts` provide a good starting point for automated accessibility testing and should be expanded to cover the issues identified in this audit.
