═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/routes/_app+/$orgSlug_+/notes.tsx
═══════════════════════════════════════════════════

CRITICAL (2 issues)
───────────────────
[DATA] Line 69: No data pagination (Large Payload)

  const notes = await prisma.organizationNote.findMany({
    // ... selection
    where: {
        organizationId: organization.id,
        // ...
    },
    orderBy: [{ statusId: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
  })

  Fix: Implement pagination (cursor or offset based)

  const limit = 50;
  const cursor = url.searchParams.get('cursor');
  const notes = await prisma.organizationNote.findMany({
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    // ...
  });

  Impact: Crashes with large datasets. Loads all notes into memory.

[DATA] Line 63: Inefficient search (Full Table Scan)

  const searchConditions = searchQuery
      ? {
              OR: [
                  { title: { contains: searchQuery } },
                  { content: { contains: searchQuery } },
              ],
          }
      : {}

  Fix: Use Full Text Search (FTS) or external search service (e.g. Algolia/Meilisearch)

  // Prisma/SQLite doesn't support performant 'contains' for large text without FTS setup.
  // For SQLite, use FTS5 virtual table or raw query.

  Impact: O(n) scan on every search. Slow for large tables.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/routes/_app+/$orgSlug_+/index.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issue)
───────────────────
[CODE] Line 80: Inefficient data processing (In-memory aggregation)

  const [notesData, ...] = await Promise.all([
      prisma.organizationNote.findMany({
          where: {
              organizationId: organization.id,
              createdAt: { gte: startDate },
          },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
      }),
      // ...
  ])

  // ...

  const dailyNotes = notesData.reduce(...)

  Fix: Use Database Aggregation

  const dailyNotesRaw = await prisma.organizationNote.groupBy({
      by: ['createdAt'],
      where: {
          organizationId: organization.id,
          createdAt: { gte: startDate },
      },
      _count: { id: true },
  });

  Impact: Transfers all rows to application server. High memory usage.


SERIOUS (1 issue)
──────────────────
[NETWORK] Line 66: Fetching unnecessary data

  select: { createdAt: true },

  Fix: Even with 'select', fetching 10k rows just to count them is bad. See Critical fix above.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/components/data-table.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issue)
───────────────────
[RENDER] Line 477: Heavy component in render (Hidden Chart)

  cell: ({ row }) => {
      return <TableCellViewer item={row.original} />
  },

  // Inside TableCellViewer
  <Drawer>
      <DrawerContent>
           <ChartContainer ...>
               <AreaChart ... />
           </ChartContainer>
      </DrawerContent>
  </Drawer>

  Fix: Lazy load the chart or render conditionally on open

  const [isOpen, setIsOpen] = useState(false);
  // ...
  <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerContent>
          {isOpen && (
              <Suspense fallback={<Skeleton />}>
                  <LazyChart />
              </Suspense>
          )}
      </DrawerContent>
  </Drawer>

  Impact: Renders a complex chart for *every* row in the table, even if hidden. Massive DOM size and memory usage.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/components/notes-kanban-board.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issue)
───────────────────
[RENDER] Line 531: Large list without virtualization

  {displayNotes.map((n) => {
      // ...
      return (
          <SortableNote ... />
      )
  })}

  Fix: Use virtualization (e.g., @tanstack/react-virtual)

  <Virtualizer>
    {displayNotes.map(...)}
  </Virtualizer>

  Impact: Renders all notes in DOM. Performance degrades significantly >100 items.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/root.tsx
═══════════════════════════════════════════════════

SERIOUS (2 issues)
──────────────────
[NETWORK] Line 118: Sequential Waterfall

  const userId = await time(() => getUserId(request), ...)
  // ...
  const user = userId ? await time(...) : null
  // ...
  const { getUserOrganizationsWithSlugHandling } = await import(...)
  const userOrganizations = user ? await getUserOrganizationsWithSlugHandling(...) : undefined
  // ...
  const favoriteNotes = user ? await cachified(...) : undefined

  Fix: Parallelize requests where possible using Promise.all

  const [user, ...others] = await Promise.all([
      getUser(request),
      // ...
  ])

  Impact: Increases Response Time (TTFB).

[NETWORK] Line 153: Dynamic Import in Waterfall

  await import('./utils/organization/organizations.server')

  Fix: Top-level import (static) or parallelize.

  Impact: Adds delay to every request.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/entry.client.tsx
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[JS] Line 13: Blocking Top-Level Await

  await loadCatalog(locale)
  startTransition(() => { hydrateRoot(...) })

  Fix: Non-blocking load

  loadCatalog(locale).then(() => {
    startTransition(() => { hydrateRoot(...) })
  })

  Impact: Blocks main thread / module execution. Delays TTI.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/components/app-sidebar.tsx
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[RENDER] Line 327: Double Rendering (Hidden Elements)

  <motion.div style={{ opacity: isAccountRoute ? 1 : 0 }}>
      <AccountSidebar />
  </motion.div>
  <motion.div style={{ opacity: !isAccountRoute ? 1 : 0 }}>
      <OrganizationSidebar />
  </motion.div>

  Fix: Unmount hidden sidebar or use `content-visibility: hidden` / `inert`

  {isAccountRoute && <AccountSidebar />}
  {!isAccountRoute && <OrganizationSidebar />}
  // Or use AnimatePresence

  Impact: Both sidebars are in the DOM, doubling event listeners and DOM nodes.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/components/user-dropdown.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issue)
──────────────────
[RENDER] Line 20: Invalid Nesting (Interactive inside Interactive)

  <Button variant="secondary">
      <Link ...> ... </Link>
  </Button>

  Fix: Remove Button or Link, or style Link as Button

  <Button asChild variant="secondary">
      <Link ...> ... </Link>
  </Button>

  Impact: Hydration mismatches. Browser quirks. Accessibility failure.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/web/src/components/ThemeSwitcher.astro
═══════════════════════════════════════════════════

MODERATE (2 issues)
───────────────────
[ACCESSIBILITY] Line 12: Small Touch Target

  class="theme-switcher flex size-8 ..."

  Fix: Increase to size-11 (44px) or add padding

  class="theme-switcher flex size-11 ..."

  Impact: Poor mobile UX.

[ACCESSIBILITY] Line 17: Decorative Icons missing aria-hidden

  <svg ...>

  Fix: Add aria-hidden="true"

  <svg ... aria-hidden="true">

  Impact: Screen reader noise.


═══════════════════════════════════════════════════
PERFORMANCE METRICS ESTIMATE
═══════════════════════════════════════════════════

Bundle Impact:     +50KB (lazy charts), -0KB
Render Performance: ~1000s of unnecessary components (Charts, Hidden Sidebars, Kanban Cards)
Memory Safety:      Potential OOM on large datasets (Notes)
Network Efficiency: Significant Latency reduction (Root Loader)

Performance Score: 45/100

Priority: Fix Critical Data Issues and Table/Kanban Rendering immediately.
