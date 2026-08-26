## 2024-10-24 - Minimum Touch Targets for Small Buttons
**Learning:** WCAG 2.2 SC 2.5.8 requires interactive elements to have a minimum touch target size of 44x44 CSS pixels. In this app, many icon-only or small buttons (e.g., sizes `icon`, `xs`, `sm`) naturally fall below this limit (e.g., 32px or 24px).
**Action:** When creating or modifying small interactive components (like small buttons or inputs), apply expanded pseudo-element padding using utility classes like `relative after:absolute after:-inset-2 md:after:hidden` to increase the effective touch area on mobile without changing the visual layout.

## 2024-10-24 - Tailwind Pseudo-Elements Need Content
**Learning:** When using Tailwind pseudo-elements (like `after:`) to expand touch targets or perform other structural tasks, the element won't render unless it has a `content` property. The class `after:content-['']` MUST be explicitly included, otherwise the accessibility improvement will be completely non-functional.
**Action:** Always include `after:content-['']` (or the appropriate content utility class) alongside `after:absolute` when rendering pseudo-elements for padding or visual expansion.
