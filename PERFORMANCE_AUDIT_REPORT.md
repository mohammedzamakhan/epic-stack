═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/routes/_app+/$orgSlug_+/notes.tsx
═══════════════════════════════════════════════════

CRITICAL (2 issues)
───────────────────
[DATA] Line 69: Large list without pagination

  const notes = await prisma.organizationNote.findMany({
    // ...
    where: {
      organizationId: organization.id,
      // ...
    },
    // No take/skip
  })

  Fix: Implement cursor-based or offset pagination

  const limit = 20;
  const cursor = url.searchParams.get('cursor');
  const notes = await prisma.organizationNote.findMany({
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    // ...
  });

  Impact: Prevents server OOM and slow response times as dataset grows

[RENDER] Line 293: Invalid HTML Nesting (Interactive inside Interactive)

  <Button variant="default">
    <Link to="new">
      <Icon name="plus">
        <Trans>New Note</Trans>
      </Icon>
    </Link>
  </Button>

  Fix: Use Button asChild with Link

  <Button variant="default" asChild>
    <Link to="new">
      <Icon name="plus">
        <Trans>New Note</Trans>
      </Icon>
    </Link>
  </Button>

  Impact: Fixes hydration mismatches and browser event bubbling issues

SERIOUS (3 issues)
──────────────────
[DATABASE] Line 64: Inefficient wildcard search

  { title: { contains: searchQuery } }

  Fix: Use Full Text Search (FTS) or specific indexing

  // Enable FTS in Prisma and use:
  { title: { search: searchQuery } }

  Impact: Full Table Scan -> Index Scan (O(n) -> O(log n))

[NETWORK] Line 325: Large component not lazy loaded

  import { NotesKanbanBoard } from './notes-kanban-board.tsx'
  // ...
  <NotesKanbanBoard ... />

  Fix: Use dynamic import

  const NotesKanbanBoard = lazy(() => import('./notes-kanban-board.tsx'))
  // Wrap in Suspense

  Impact: Reduces initial bundle size significantly (removes @dnd-kit when not in Kanban mode)

[RENDER] Line 233: State update on every keystroke in search

  onChange={(e) => {
    setSearchValue(e.target.value) // Triggers re-render of entire parent
    handleDebouncedSearch(e.target.value)
  }}

  Fix: Debounce the state update or use uncontrolled input

  <Input
    defaultValue={loaderData.searchQuery}
    onChange={(e) => handleDebouncedSearch(e.target.value)}
  />

  Impact: Eliminates re-render of note list on every character typed

═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/components/data-table.tsx
═══════════════════════════════════════════════════

CRITICAL (2 issues)
───────────────────
[RENDER] Line 622: Hidden heavy chart rendering per row

  function TableCellViewer({ item }) {
    // ...
    return (
      <Drawer ...>
        <DrawerContent>
           <ChartContainer ...> <AreaChart ... /> ... </ChartContainer>
        </DrawerContent>
      </Drawer>
    )
  }

  Fix: Conditionally render content only when Drawer is open

  {isOpen && (
    <ChartContainer ...> ... </ChartContainer>
  )}

  Impact: Removes hundreds of Recharts instances from DOM initialization

[RENDER] Line 384: Large list without virtualization

  table.getRowModel().rows.map((row) => ...)

  Fix: Use @tanstack/react-virtual

  const rowVirtualizer = useVirtualizer({ count: rows.length, ... });
  // Render only visible items

  Impact: Enables rendering 1000+ rows without browser freeze

SERIOUS (1 issue)
──────────────────
[BUNDLE] Line 33: Heavy dependency imported in list item

  import { Area, AreaChart, ... } from 'recharts'

  Fix: Lazy load the chart component inside the Drawer

  const ChartComponent = lazy(() => import('./chart-component'));

  Impact: Reduces main bundle size

═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/root.tsx
═══════════════════════════════════════════════════

SERIOUS (2 issues)
──────────────────
[NETWORK] Line 129: Sequential Data Fetching (Waterfall)

  const userId = await time(...)
  const locale = await linguiServer.getLocale(request)
  const user = userId ? ... : null
  const { getUserOrganizationsWithSlugHandling } = await import(...)
  const userOrganizations = ...

  Fix: Use Promise.all

  const [userId, locale, ...] = await Promise.all([
    getUserId(request),
    linguiServer.getLocale(request),
    // ...
  ])

  Impact: Reduces Time to First Byte (TTFB) by parallelizing IO

[NETWORK] Line 158: Blocking Dynamic Import

  const { getUserOrganizationsWithSlugHandling } = await import(...)

  Fix: Use static import or move top-level if possible, or parallelize

  import { getUserOrganizationsWithSlugHandling } from '...'

  Impact: Removes JS loading latency from the critical path

═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/routes/_app+/$orgSlug_+/notes-kanban-board.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issue)
──────────────────
[RENDER] Line 427: Large list rendering in columns

  displayNotes.map((n) => ...)

  Fix: Use @dnd-kit/core with virtualization (react-window or similar)

  <FixedSizeList ...>
    {({ index, style }) => <SortableNote ... />}
  </FixedSizeList>

  Impact: Prevents UI locking when column has many notes

═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/components/notes-chart.tsx
═══════════════════════════════════════════════════

MODERATE (1 issue)
──────────────────
[CODE] Line 36: Expensive derived calculations in render

  const totalNotes = data.reduce(...)
  const avgNotesPerDay = ...
  const lastHalf = data.slice(...)

  Fix: Use useMemo

  const { totalNotes, avgNotesPerDay, trendPercentage } = useMemo(() => {
     // calculations
  }, [data]);

  Impact: Prevents re-calculation on every parent re-render

═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/components/app-sidebar.tsx
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[RENDER] Line 384: Layout Thrashing / Superimposed Layers

  <motion.div style={{ opacity: isAccountRoute ? 1 : 0 }}> ... </motion.div>
  <motion.div style={{ opacity: !isAccountRoute ? 1 : 0 }}> ... </motion.div>

  Fix: Use 'visibility: hidden' or remove from DOM when not active

  <motion.div
    style={{
      opacity: isAccountRoute ? 1 : 0,
      visibility: isAccountRoute ? 'visible' : 'hidden'
    }}
  >

  Impact: Reduces composite layer work and improves accessibility tree performance

═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/web/src/pages/index.astro
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[NETWORK] Line 10: Sequential CMS Fetching

  const recentPostsData = await cmsClient.getPosts(1, 3)
  const homePage = await cmsClient.getHomePage()

  Fix: Parallelize requests

  const [recentPostsData, homePage] = await Promise.all([
    cmsClient.getPosts(1, 3),
    cmsClient.getHomePage()
  ]);

  Impact: Reduces Page Load Time significantly

═══════════════════════════════════════════════════
PERFORMANCE METRICS ESTIMATE (GLOBAL)
═══════════════════════════════════════════════════

Bundle Impact:     ~350KB reduction possible (Recharts, DndKit lazy loading)
Render Performance: ~1000s of unnecessary DOM nodes removed (Virtualization, Hidden Charts)
Network Efficiency: ~30-50% reduction in TTFB for core routes (Parallel fetching)

Priority: Fix CRITICAL issues in data-table.tsx and notes.tsx immediately
