## 2025-12-19 - Input Focus Management
**Learning:** The existing `Input` component does not forward refs, making imperative focus management (e.g., focusing input after clearing via a button) difficult without using `document.getElementById` or modifying the component.
**Action:** Use ID-based focus as a workaround for now, but consider refactoring `Input` to forward refs in a larger update.
