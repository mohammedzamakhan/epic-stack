## 2024-05-15 - Adding inert to visually hidden sidebars
**Learning:** Sidebars hidden only by opacity and pointer-events still receive keyboard focus and are read by screen readers. This breaks keyboard navigation (tab order) and causes confusion for screen reader users.
**Action:** Always apply the `inert` attribute to components that are visually hidden but still in the DOM to ensure they are completely removed from the accessibility tree and keyboard navigation.
## 2024-10-24 - Minimum Touch Targets for Small Buttons
**Learning:** WCAG 2.2 SC 2.5.8 requires interactive elements to have a minimum touch target size of 44x44 CSS pixels. In this app, many icon-only or small buttons (e.g., sizes `icon`, `xs`, `sm`) naturally fall below this limit (e.g., 32px or 24px).
**Action:** When creating or modifying small interactive components (like small buttons or inputs), apply expanded pseudo-element padding using utility classes like `relative after:absolute after:-inset-2 md:after:hidden` to increase the effective touch area on mobile without changing the visual layout.
## 2024-10-25 - Polymorphic Components in @base-ui/react
**Learning:** Components based on `@base-ui/react` (like `Button` in `@repo/ui`) use the `render` prop for polymorphic behavior, not the `asChild` prop commonly found in Radix/shadcn. Using `asChild` will cause the element to fail rendering or log an invalid DOM attribute warning.
**Action:** When wrapping interactive elements (like a React Router `<Link>`) inside a `Button` to apply styling without causing invalid DOM nesting (e.g., `<button><a>`), use the `render` prop: `<Button render={<Link to="..." />} />`.
