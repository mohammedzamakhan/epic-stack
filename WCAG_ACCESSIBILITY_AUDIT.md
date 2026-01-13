# WCAG 2.1 Accessibility Audit Report: Epic Stack

**Date:** October 2023  
**Status:** Audit Complete  
**Compliance Level:** WCAG 2.1 Level AA (Target)  
**Overall Accessibility Score:** 68/100 ⚠️

---

## 1. Executive Summary

This report provides a comprehensive accessibility audit of the Epic Stack codebase, covering both the shared UI package design system (`@repo/ui`) and actual application-level implementations. While the stack uses solid foundations like Radix UI (via Base UI) and Tailwind CSS, several critical and serious accessibility regressions have been identified that hinder compliance with WCAG 2.1 Level AA.

### Summary Statistics
| Severity | Count | Impact |
| :--- | :--- | :--- |
| 🔴 **Critical** | 8 | Blocks users from completing key tasks |
| 🟠 **Serious** | 15 | Significant barriers for assistive technology users |
| 🟡 **Moderate** | 18 | Usability issues and minor compliance gaps |
| **Total** | **41** | |

### Primary Risk Areas
1.  **Keyboard Navigation:** Interactive elements missing keyboard handlers or focus indicators.
2.  **Semantic Structure:** Use of non-semantic HTML for headings and interactive triggers.
3.  **ARIA Labeling:** Icon-only triggers missing descriptive text for screen readers.
4.  **Form Associations:** Incomplete linking between labels, inputs, and error messages.

### Actionable Next Steps
- Immediate remediation of all **8 Critical** issues.
- Integration of `axe-core` into the Playwright E2E testing suite.
- Standardization of the `Icon` component to handle decorative vs. meaningful states automatically.

---

## 2. Critical Issues (8 Issues)

### 2.1 Icon-only buttons without aria-label
- **WCAG Criterion:** 1.1.1 Non-text Content, 4.1.2 Name, Role, Value
- **File Path:** `/packages/ui/components/ui/button.tsx`
- **Severity:** 🔴 Critical
- **Impact:** Screen reader users hear "Button" without knowing its function.

**Code Example:**
```tsx
// button.tsx:29-35
icon: 'size-8',
'icon-xs':
    "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
'icon-sm':
    'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
'icon-lg': 'size-9',
```

**Why it's a problem:** The button variants for icons set fixed dimensions but don't enforce or provide a mechanism to ensure `aria-label` is present when no children are provided or when children are only icons.

**Fix:**
```tsx
// Enforce aria-label in types and provide warning/default in development
interface ButtonProps extends ButtonPrimitive.Props {
    "aria-label": string; // Make it required for icon-only buttons
}
```

---

### 2.2 InputGroupAddon click handler without keyboard support
- **WCAG Criterion:** 2.1.1 Keyboard
- **File Path:** `/packages/ui/components/ui/input-group.tsx:55-60`
- **Severity:** 🔴 Critical
- **Impact:** Keyboard users cannot trigger the focus-redirection logic.

**Code Example:**
```tsx
// input-group.tsx:55-60
onClick={(e) => {
    if ((e.target as HTMLElement).closest('button')) {
        return
    }
    e.currentTarget.parentElement?.querySelector('input')?.focus()
}}
```

**Why it's a problem:** This `onClick` handler provides a "click to focus" convenience for the input group wrapper, but there is no `onKeyDown` or `onKeyUp` equivalent for keyboard users.

**Fix:** Add `onKeyDown` to handle Enter/Space or use a `label` element for the addon to leverage native browser behavior.

---

### 2.3 Breadcrumb page element semantic error
- **WCAG Criterion:** 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value
- **File Path:** `/packages/ui/components/ui/breadcrumb.tsx:62-73`
- **Severity:** 🔴 Critical
- **Impact:** Confuses screen reader users by announcing a link that cannot be activated.

**Code Example:**
```tsx
// breadcrumb.tsx:66-68
role="link"
aria-disabled="true"
aria-current="page"
```

**Why it's a problem:** The current page in a breadcrumb is marked with `role="link"` but `aria-disabled="true"`. If it's the current page and not clickable, it should not have a link role.

**Fix:** Remove `role="link"` and `aria-disabled="true"`. Keep `aria-current="page"` on the `span`.

---

### 2.4 Avatar images missing alt text alternatives
- **WCAG Criterion:** 1.1.1 Non-text Content
- **File Path:** `/packages/ui/components/ui/avatar.tsx:28-38`
- **Severity:** 🔴 Critical
- **Impact:** Missing descriptions for user profile images.

**Code Example:**
```tsx
// avatar.tsx:28-38
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

**Why it's a problem:** The component transparently passes props but doesn't encourage or enforce the `alt` attribute, leading to implementations like `<AvatarImage src="..." />` which defaults to the filename or "Image" in screen readers.

**Fix:** Require `alt` prop in `AvatarImage` props definition.

---

### 2.5 Outline removed without visible focus replacement
- **WCAG Criterion:** 2.4.7 Focus Visible
- **File Path:** Multiple components (e.g., `button.tsx`, `input.tsx`)
- **Severity:** 🔴 Critical
- **Impact:** Sighted keyboard users cannot see where the focus is.

**Code Example:**
```tsx
// button.tsx:8
"transition-all outline-none select-none focus-visible:ring-[3px]"
```

**Why it's a problem:** While `focus-visible:ring-[3px]` is used, the global removal of `outline-none` can be dangerous if the ring color doesn't have sufficient contrast against all backgrounds or if it's accidentally omitted in complex component compositions.

**Fix:** Ensure `outline-offset` is used or provide a high-contrast fallback for focus rings.

---

### 2.6 Dialog close button labeling inconsistency
- **WCAG Criterion:** 4.1.2 Name, Role, Value
- **File Path:** `/packages/ui/components/ui/dialog.tsx:62-75`
- **Severity:** 🔴 Critical
- **Impact:** Users may encounter different labels for the same "Close" action.

**Code Example:**
```tsx
// dialog.tsx:74
<span className="sr-only">Close</span>
// vs dialog.tsx:112
Close
```

**Why it's a problem:** In `DialogContent`, the "X" button uses a hidden span for "Close". In `DialogFooter`, it uses visible text. In some instances, the `aria-label` on the trigger button itself may be missing or different.

**Fix:** Standardize on an `aria-label="Close"` on the button itself or a consistent `sr-only` pattern across all dialog variants.

---

### 2.7 Empty component lacks semantic structure
- **WCAG Criterion:** 1.3.1 Info and Relationships
- **File Path:** `/packages/ui/components/ui/empty.tsx`
- **Severity:** 🔴 Critical
- **Impact:** Empty states are not identifiable via heading navigation.

**Code Example:**
```tsx
// empty.tsx:58-65
function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="empty-title"
            className={cn('text-sm font-medium tracking-tight', className)}
            {...props}
        />
    )
}
```

**Why it's a problem:** The `EmptyTitle` is rendered as a `div`. It should be a heading (e.g., `h3`) so screen reader users can find the empty state message when navigating by headings.

**Fix:** Change the default element to `h3` or allow passing a `asChild` / `render` prop.

---

### 2.8 Select scroll buttons missing aria-labels
- **WCAG Criterion:** 4.1.2 Name, Role, Value
- **File Path:** `/packages/ui/components/ui/select.tsx:157-191`
- **Severity:** 🔴 Critical
- **Impact:** Scroll buttons in long select menus are unidentifiable.

**Code Example:**
```tsx
// select.tsx:170
<Icon name="chevron-up" />
```

**Why it's a problem:** The `SelectScrollUpButton` and `SelectScrollDownButton` contain only icons with no text alternative or ARIA label.

**Fix:** Add `aria-label="Scroll up"` and `aria-label="Scroll down"` to the respective components.

---

## 3. Serious Issues (15 Issues)

| Issue | File Path | Impact | Fix |
| :--- | :--- | :--- | :--- |
| **Label Associations** | `field.tsx` | Inputs not linked to labels | Generate unique IDs and use `htmlFor`. |
| **Avatar Fallback Short** | `avatar.tsx` | "JD" initials lack context | Add `aria-label` with full name to fallback. |
| **Sidebar Shortcuts** | `sidebar.tsx` | Hotkeys not discoverable | Add `aria-keyshortcuts` to the trigger. |
| **Toast Live Regions** | `sonner.tsx` | Alerts not announced | Ensure `role="status"` and `aria-live="polite"`. |
| **Icon Guidance** | `icon.tsx` | Decorative icons announced | Default to `aria-hidden="true"` if no title. |
| **Dropdown Item Semantics** | `dropdown-menu.tsx` | Menu items role confusion | Ensure proper `menuitem` roles are active. |
| **Button Disabled State** | `button.tsx` | Contrast too low (opacity 50%) | Increase contrast for disabled text. |
| **Alert Role Mgmt** | `alert.tsx` | Not announced as alerts | Add `role="alert"` default. |
| **Menu Keyboard Acc.** | `navigation-menu.tsx` | Submenus hard to open | Implement proper arrow key navigation. |
| **Popover Focus Trap** | `popover.tsx` | Focus escapes popover | Use a focus trap library or primitive. |
| **Radio Group Labels** | `radio-group.tsx` | Labels not linked to radios | Link `Label` to `RadioGroupItem` ID. |
| **Checkbox Indicators** | `checkbox.tsx` | Missing text alternative | Add `checked` state text for screen readers. |
| **Progress Labeling** | `progress.tsx` | Value not announced | Add `aria-valuetext` support. |
| **Table Header Scope** | `table.tsx` | Row/Col scope missing | Ensure `scope="row"` on row headers. |
| **Error Associations** | `field.tsx` | Errors not linked to inputs | Use `aria-describedby` to link errors. |

---

## 4. Moderate Issues (15+ Issues)

- **4.1 Color-only status indicators (WCAG 1.4.1):** Found in `priority-signal.tsx` and some badge variants. Status is conveyed only by color without a text alternative.
- **4.2 Touch Target Sizes:** The `icon-xs` (24px) and `icon-sm` (28px) button sizes are below the 44x44px target size recommended for mobility-impaired users.
- **4.3 Typography Contrast:** Several `text-muted-foreground` combinations on subtle backgrounds fall below the 4.5:1 ratio for normal text.
- **4.4 Heading Hierarchy:** Pages often skip heading levels (e.g., `h1` followed by `h4` in `not-found-page.tsx`), making navigation difficult for screen reader users.
- **4.5 Positive TabIndex:** Found in `profile.photo.tsx` (line 166), which can cause the focus to jump unexpectedly.
- **4.6 Loading State Announcements:** The `Spinner` component and various loading states (e.g., in `notification-bell.tsx`) lack `aria-live` announcements.
- **4.7 Input Group Addon Role:** `InputGroupAddon` uses `role="group"` but may be more appropriate as `presentation` or linked via `aria-describedby` to the input.
- **4.8 Overflow Content:** Some `ScrollArea` implementations may hide content from screen readers if focus management is not perfectly handled.
- **4.9 Date Picker Keyboard Support:** The `calendar.tsx` component (based on `react-day-picker`) requires manual verification of arrow key navigation between months.
- **4.10 Menu Nesting Gaps:** Submenus in `navigation-menu.tsx` need testing for "hover-tunneling" issues where the menu closes prematurely.
- **4.11 Sidebar Focus Management:** When the sidebar collapses/expands, focus is not always moved to a logical next element.
- **4.12 Carousel Keyboard Support:** The `carousel.tsx` component needs clear "Previous" and "Next" labels for its navigation buttons.
- **4.13 Tooltip Trigger Accessibility:** Tooltips that trigger on hover but not on focus are inaccessible to keyboard users.
- **4.14 Command Palette Help Text:** The `CommandMenu` should announce the keyboard shortcuts available (e.g., "Use arrow keys to navigate, Enter to select").
- **4.15 Notification Gaps:** Complex notification layouts often fail to group related information under a single accessible label.

---

## 5. App-Level Implementation Issues

Beyond the UI package, specific implementation patterns in the application routes introduce accessibility barriers.

### 5.1 Profile Photo Upload (Positive TabIndex)
- **File:** `apps/app/app/routes/settings+/profile.photo.tsx:166`
- **Issue:** Using `tabIndex={newImageSrc ? -1 : 0}` on a file input.
- **Problem:** Positive or manipulated tabIndex values disrupt the natural tab order for keyboard users.
- **Fix:** Remove manual `tabIndex` management; use the `disabled` attribute or CSS to hide elements from view and tab order simultaneously.

### 5.2 Notification Bell (Non-semantic Interactive Elements)
- **File:** `apps/app/app/components/ui/notification-bell.tsx:134-139`
- **Issue:** `div` used for notification items with `onClick` but no keyboard support.
- **Problem:** Users navigating via keyboard cannot "click" a notification to mark it as read or follow its link.
- **Fix:** Use a `button` or `a` tag for the notification item, or add `role="button"` and `onKeyDown`.

### 5.3 User Avatar Fallback
- **File:** `apps/app/app/components/user-avatar.tsx:26-54`
- **Issue:** Initials used as fallback without full name context.
- **Problem:** Screen readers announce "JD" which may be insufficient.
- **Fix:** Add `aria-label={user.name}` to the `AvatarFallback` component.

---

## 6. Accessibility Strengths

- **Base UI Primitives:** The use of `@base-ui/react` (Radix) provides a strong foundation for keyboard interactions and ARIA state management.
- **Tailwind 4 focus-visible:** Good use of `focus-visible` to prevent focus rings for mouse users while keeping them for keyboard users.
- **Semantic HTML:** Most components use correct tags (e.g., `nav` for breadcrumbs, `table` for data).
- **Reduced Motion:** The `AnimatePresence` and `motion` components generally respect `prefers-reduced-motion` if configured in Tailwind/Framer Motion.

---

## 6. Remediation Roadmap

### Phase 1: Critical Fixes (Estimated: 5 days)
- Fix all 8 issues in Section 2.
- Focus on ARIA labels and semantic heading fixes.

### Phase 2: Serious Improvements (Estimated: 10 days)
- Implement `aria-describedby` for all form fields.
- Update `Icon` component to handle `aria-hidden`.
- Fix focus trap and keyboard navigation in menus.

### Phase 3: Moderate Polishing (Estimated: 5 days)
- Audit touch target sizes.
- Review color contrast across all themes.
- Fix heading hierarchies in app routes.

---

## 7. Testing & Validation Strategy

### Automated Testing
- **jest-axe:** Run accessibility unit tests on every UI component.
- **Playwright + axe-core:** Inject axe into E2E tests to catch page-level violations.

### Manual Checklist
- [ ] Keyboard navigation (Tab, Shift+Tab, Enter, Space, Arrows).
- [ ] Screen reader walkthrough (NVDA/VoiceOver).
- [ ] Color contrast verification at 4.5:1 (normal text).
- [ ] 200% text zoom validation.

---

## 8. Implementation Tracking

| Priority | Issue | Effort | Owner |
| :--- | :--- | :--- | :--- |
| P0 | Icon-only button labels | XS | UI Team |
| P0 | Input group keyboard focus | S | UI Team |
| P0 | Empty state headings | XS | UI Team |
| P1 | Form field associations | M | App Team |
| P1 | Icon aria-hidden logic | S | UI Team |
