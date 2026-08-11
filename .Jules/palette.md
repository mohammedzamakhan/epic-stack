## 2026-08-11 - Interactive Component Touch Targets
**Learning:** The Switch, Checkbox, and Radio Group components were using `after:-inset-y-2` which resulted in a touch target height of around 34.4px (for a 18.4px switch) and 32px (for a 16px checkbox/radio button). This failed the minimum 44px WCAG requirement for touch targets.
**Action:** Always ensure that small interactive components (14-18px) use sufficient pseudo-element padding, such as `after:-inset-y-4` or `after:-inset-4`, to expand their touch target area to at least 44px.
