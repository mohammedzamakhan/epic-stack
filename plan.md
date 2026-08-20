1. Add `aria-label={_(t\`Quick edit\`)}` to the Quick edit button in `apps/app/app/routes/_app+/$orgSlug_+/notes-cards.tsx` (around line 341).
2. It is currently missing an aria-label.
3. Call `pre_commit_instructions` before submitting.
4. Verify with `npm run test --workspace=apps/app`.
5. Submit PR.
