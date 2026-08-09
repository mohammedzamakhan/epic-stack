
## 2026-08-09 - [@base-ui component composition]
**Learning:** When using @base-ui React components with custom wrapping components (like Link from react-router), the 'asChild' pattern is implemented using the `render` prop on the Trigger/Item components (e.g. `<Button render={<Link to="..." />} />`), which allows merging accessibility attributes seamlessly while preserving the HTML semantics of the child.
**Action:** Apply the `render` prop instead of children when needing to make a @base-ui component act as a link (e.g. Button, Menu.Item).
