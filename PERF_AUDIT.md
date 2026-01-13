═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/routes/_app+/$orgSlug_+/notes.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issue)
───────────────────
[DATA] Line 71: Large list without virtualization / No pagination

  const notes = await prisma.organizationNote.findMany({
    // ... select 20+ fields ...
    where: { ... },
    orderBy: [{ statusId: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
  })

  Fix: Implement pagination or infinite loading

  const notes = await prisma.organizationNote.findMany({
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    // ...
  })

  Impact: Loads ALL organization notes into memory and sends to client.
  Server crash risk with large datasets (O(N) memory).
  Slow initial page load (High TTI).


SERIOUS (3 issues)
──────────────────
[RENDER] Line 240: Rapid state updates causing list re-render

  <Input
    value={searchValue}
    onChange={(e) => {
      setSearchValue(e.target.value)
    }}
  />

  Fix: Debounce the state update or move Input to an isolated component.
  Better yet, memoize the list components (`NotesCards`, `NotesKanbanBoard`).

  Impact: Every keystroke triggers a re-render of `NotesRoute`.
  Since `NotesCards` is not memoized, it re-renders.
  This causes O(N) re-renders of `NoteCard` components.

[RENDER] Line 323 (in notes-cards.tsx): Missing React.memo on list items

  export const NoteCard = ({ note, ... }: NoteCardProps) => { ... }

  Fix: Wrap in React.memo

  export const NoteCard = React.memo(({ note, ... }: NoteCardProps) => { ... })

  Impact: Combined with the search input issue, this causes the entire list
  to re-render 500+ times if the user types 500 characters, even if the
  list content hasn't changed.

[RENDER] Line 125 (in notes-kanban-board.tsx): Expensive operations in render

  Object.values(grouped).forEach((arr) =>
    arr.sort((a, b) => { ... })
  )

  Fix: Use useMemo

  const groupedNotes = useMemo(() => {
    // ... grouping and sorting logic ...
  }, [notes, columns])

  Impact: Sorting runs on every render. O(N log N) blocking the main thread.


MODERATE (2 issues)
───────────────────
[CODE] Line 283: Eager loading of heavy views

  import { NotesCards } from './notes-cards.tsx'
  import { NotesKanbanBoard } from './notes-kanban-board.tsx'

  Fix: Use React.lazy for the view not currently active

  const NotesKanbanBoard = lazy(() => import('./notes-kanban-board.tsx'))

  Impact: Kanban board (dragging libraries) is loaded even if user is in 'cards' view.
  Increases bundle size.

[NETWORK] Line 129: Potential N+1 / Over-fetching

  uploads: {
    select: { ... }
  }

  Fix: Verify if `uploads` are always needed for the list view.
  If only a thumbnail is needed, ensure DB query is optimized or use a summary table.
  Currently acceptable with Prisma but watch for row count.

  Impact: Increased payload size.


═══════════════════════════════════════════════════
PERFORMANCE METRICS ESTIMATE
═══════════════════════════════════════════════════

Bundle Impact:     +50KB (current), -20KB (after lazy loading)
Render Performance: 100s of unnecessary re-renders detected per search interaction
Memory Safety:      Critical risk (unbounded list size)
Network Efficiency: Poor (loading all data upfront)

Performance Score: 45/100

Priority: Fix Pagination (Critical) and Memoization (Serious) immediately

═══════════════════════════════════════════════════
RECOMMENDATIONS
═══════════════════════════════════════════════════

1. Implement cursor-based pagination for `notes` loader.
2. Wrap `NoteCard` and `NotesKanbanBoard` in `React.memo`.
3. Memoize the `grouped` notes calculation in `NotesKanbanBoard`.
4. Separate the Search Input into a component that manages its own state and
   only notifies parent on blur/debounce.

═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/web/src/components/Header.astro
═══════════════════════════════════════════════════

MODERATE (1 issue)
───────────────────
[BROWSER] Line 140: Scroll event listener not throttled

  window.addEventListener('scroll', handleScroll, { passive: true })

  Fix: Use requestAnimationFrame or throttle

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  Impact: High frequency execution of `handleScroll` during scroll.
