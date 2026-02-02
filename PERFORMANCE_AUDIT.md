═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/components/data-table.tsx
═══════════════════════════════════════════════════

CRITICAL (2 issues)
───────────────────
[RENDER] Line 325: Hidden heavy component in every row

  cell: ({ row }) => {
      return <TableCellViewer item={row.original} />
  },

  // Inside TableCellViewer
  <Drawer>
      <DrawerContent>
           <ChartContainer ...>
              <AreaChart ... />

  Fix: Lazy load the drawer content or the chart components

  const TableCellViewer = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent>
          {isOpen && <Suspense fallback={<Spinner />}><HeavyChart ... /></Suspense>}
        </DrawerContent>
      </Drawer>
    )
  }

  Impact: Renders hundreds of hidden AreaCharts, causing massive DOM node count and JS execution overhead.


[RENDER] Line 477: Large list without virtualization

  {table.getRowModel().rows.map((row) => (
      <DraggableRowStyled key={row.id} row={row} />
  ))}

  Fix: Use @tanstack/react-virtual

  const rowVirtualizer = useVirtualizer({ count: rows.length, ... });

  return (
    <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index];
        return <DraggableRowStyled key={row.id} row={row} ... />
      })}
    </div>
  )

  Impact: Rendering all rows causes slow initial paint and laggy interactions for large datasets (>100 rows).


MODERATE (1 issue)
───────────────────
[CODE] Line 86: Inline function definitions in ColumnDef

  cell: ({ row }) => (
      <form onSubmit={(e) => { ... }}>

  Fix: Extract to component

  const TargetCell = ({ row }) => {
    const handleSubmit = useCallback(...)
    return <form onSubmit={handleSubmit}>...</form>
  }

  Impact: Creates new function instances on every render, increasing GC pressure.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/routes/_app+/$orgSlug_+/notes-kanban-board.tsx
═══════════════════════════════════════════════════

CRITICAL (1 issue)
───────────────────
[RENDER] Line 562: Large list without virtualization in Kanban Column

  {displayNotes.map((n) => (
      <SortableNote ... />
  ))}

  Fix: Implement virtualization for Kanban lists (complex with dnd-kit but necessary)

  Impact: Critical performance degradation when columns have many notes. 500 notes = 500+ DOM nodes per column.


MODERATE (1 issue)
───────────────────
[CODE] Line 114: Expensive useMemo dependency

  const { noteMap, grouped } = useMemo(() => { ... }, [notes, ...])

  Fix: Ensure 'notes' array reference is stable or use deep comparison if appropriate, or move logic to worker/server.

  Impact: Recalculating grouping on every note update/filter change freezes UI for large lists.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/routes/_app+/$orgSlug_+/notes.tsx
═══════════════════════════════════════════════════

SERIOUS (2 issues)
──────────────────
[NETWORK] Line 62: Unbounded query

  const notes = await prisma.organizationNote.findMany({
      where: { ... },
      // No take/skip/cursor
  })

  Fix: Implement pagination

  const limit = 50;
  const cursor = url.searchParams.get('cursor');
  const notes = await prisma.organizationNote.findMany({
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      ...
  })

  Impact: fetching thousands of records crashes the DB or times out the request.

[DATA] Line 64: Large payload

  select: {
      content: true, // Full note content
      ...
  }

  Fix: Exclude content from list view, fetch only on detail view

  select: {
      id: true,
      title: true,
      // content: false,
  }

  Impact: Transferring MBs of text data unnecessarily for a list view.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/admin/app/routes/_admin+/audit-logs.tsx
═══════════════════════════════════════════════════

SERIOUS (2 issues)
──────────────────
[NETWORK] Line 254: Missing debounce on search input

  onChange={(e) => updateFilter('search', e.target.value)}

  Fix: Debounce the input handler

  const handleSearch = useDebounce((val) => updateFilter('search', val), 300);
  onChange={(e) => handleSearch(e.target.value)}

  Impact: Triggers a server request on every keystroke, flooding the network and server.

[ACCESSIBILITY] Line 248: Missing label association

  <label className="text-sm font-medium"><Trans>Search</Trans></label>
  <Input ... />

  Fix: Use htmlFor or wrap

  <Label htmlFor="search-input"><Trans>Search</Trans></Label>
  <Input id="search-input" ... />

  Impact: Screen readers cannot identify the input purpose.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/root.tsx
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[NETWORK] Line 140: Sequential data fetching (Waterfall)

  const userId = await time(...)
  const locale = await linguiServer.getLocale(...)
  const user = userId ? await time(...) : null
  const { getUserOrganizationsWithSlugHandling } = await import(...)
  const userOrganizations = ...

  Fix: Parallelize with Promise.all

  const [userId, locale] = await Promise.all([
    time(...),
    linguiServer.getLocale(...)
  ]);

  const [user, orgModule] = await Promise.all([
    userId ? time(...) : null,
    import(...)
  ]);

  Impact: Increases Time To First Byte (TTFB) significantly by waiting for serial operations.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/app/app/components/notes-chart.tsx
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[RENDER] Line 32: Expensive operations in render

  const totalNotes = data.reduce(...)
  const lastHalf = data.slice(...)
  const lastHalfTotal = lastHalf.reduce(...)

  Fix: Memoize calculations

  const stats = useMemo(() => {
    const total = data.reduce(...);
    // ...
    return { total, ... };
  }, [data]);

  Impact: Blocks main thread during rendering, causing dropped frames if data is large.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: packages/ui/components/ui/button.tsx
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[ACCESSIBILITY] Line 25: Touch targets too small

  default: 'h-8 ...', // 32px
  xs: "h-6 ...", // 24px

  Fix: Increase minimum height to 44px for touch interfaces or add invisible touch area

  default: 'h-11 ...', // 44px

  Impact: Fails WCAG 2.1 Target Size (AAA) and difficult to use on mobile devices.


═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: apps/web/src/pages/index.astro
═══════════════════════════════════════════════════

SERIOUS (1 issue)
──────────────────
[NETWORK] Line 10: Sequential data fetching

  const recentPostsData = await cmsClient.getPosts(1, 3)
  const homePage = await cmsClient.getHomePage()

  Fix: Parallelize

  const [recentPostsData, homePage] = await Promise.all([
      cmsClient.getPosts(1, 3),
      cmsClient.getHomePage()
  ]);

  Impact: Increases page load time.


═══════════════════════════════════════════════════
RECOMMENDATIONS
═══════════════════════════════════════════════════

1. Implement Virtualization: Add `@tanstack/react-virtual` to `DataTable` and `NotesKanbanBoard` immediately.
2. Optimize Data Fetching: Parallelize loaders in `root.tsx` and `index.astro`. Implement server-side pagination for Notes.
3. Fix Rendering Bottlenecks: Memoize `NotesChart` and lazy-load the chart in `DataTable` using `Suspense` and `lazy`.
4. Accessibility: Fix Button sizes and Audit Log labels.
5. Network: Debounce search in Audit Logs.
