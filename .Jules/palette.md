## 2024-05-15 - Adding inert to visually hidden sidebars
**Learning:** Sidebars hidden only by opacity and pointer-events still receive keyboard focus and are read by screen readers. This breaks keyboard navigation (tab order) and causes confusion for screen reader users.
**Action:** Always apply the `inert` attribute to components that are visually hidden but still in the DOM to ensure they are completely removed from the accessibility tree and keyboard navigation.
