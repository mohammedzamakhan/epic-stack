═══════════════════════════════════════════════════
PERF PERFORMANCE REVIEW: Project Audit
═══════════════════════════════════════════════════

CRITICAL (3 issues)
───────────────────
[DATA] apps/app/app/routes/_app+/$orgSlug_+/notes.tsx: Unbounded query

  // Line 65
  const notes = await prisma.organizationNote.findMany({
    // ...
    where: {
        organizationId: organization.id,
        // ...
    },
    // ...
  })

  Fix: Implement pagination (cursor-based or offset-based)

  const limit = 50;
  const cursor = url.searchParams.get('cursor');
  const notes = await prisma.organizationNote.findMany({
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    // ...
  });

  Impact: Server crash or timeout with large datasets (e.g., 10,000 notes).


[RENDER] apps/app/app/routes/_app+/$orgSlug_+/notes-kanban-board.tsx: Large list without virtualization

  // Line 477 (KanbanColumn)
  {displayNotes.map((n) => (
      <SortableNote ... />
  ))}

  Fix: Use virtualization (e.g., @tanstack/react-virtual)

  import { useVirtualizer } from '@tanstack/react-virtual';
  // ...
  const rowVirtualizer = useVirtualizer({ count: displayNotes.length, ... });

  return (
    <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <SortableNote note={displayNotes[virtualRow.index]} ... />
        ))}
    </div>
  );

  Impact: Freezes UI when rendering hundreds/thousands of notes.


[NETWORK] apps/web/src/pages/index.astro: Sequential data fetching (Waterfall)

  // Line 11
  const recentPostsData = await cmsClient.getPosts(1, 3)
  const recentPosts = recentPostsData

  // Try to fetch home page content from CMS
  const homePage = await cmsClient.getHomePage()

  Fix: Parallelize requests with Promise.all

  const [recentPostsData, homePage] = await Promise.all([
    cmsClient.getPosts(1, 3),
    cmsClient.getHomePage()
  ]);
  const recentPosts = recentPostsData;

  Impact: Increases Time to First Byte (TTFB) significantly.


SERIOUS (3 issues)
──────────────────
[JS] apps/app/app/entry.client.tsx: Blocking hydration

  // Line 13
  await loadCatalog(locale)

  startTransition(() => {
    hydrateRoot(...)
  })

  Fix: Start hydration immediately, load locale in background or provider

  loadCatalog(locale).then(() => {
      // update state or rely on suspense
  });

  startTransition(() => {
    hydrateRoot(...)
  })

  Impact: Delays Time to Interactive (TTI) for all users.


[RENDER] apps/app/app/routes/_app+/$orgSlug_+/notes-kanban-board.tsx: Expensive operation in render

  // Line 186
  const grouped: Record<string, Note[]> = {}
  columns.forEach((c) => (grouped[c.id] = []))
  noteMap.forEach((n) => { ... })
  Object.values(grouped).forEach((arr) => arr.sort(...))

  Fix: Memoize the grouping and sorting logic

  const grouped = useMemo(() => {
      const g: Record<string, Note[]> = {};
      // ... grouping logic ...
      return g;
  }, [notes, columns, noteMap]);

  Impact: Blocks main thread during renders, causing jank.


[NETWORK] apps/web/src/pages/index.astro: Unoptimized images

  // Line 106
  <img src={post.meta.image.url} ... />

  Fix: Use Astro's <Image /> component for optimization

  import { Image } from 'astro:assets';
  // ...
  <Image src={post.meta.image.url} width={600} height={338} ... />

  Impact: Large LCP (Largest Contentful Paint) and wasted bandwidth.


MODERATE (3 issues)
───────────────────
[NETWORK] apps/app/app/root.tsx: Bundle size bloat (NovuProvider)

  import { NovuProvider } from '@novu/react/hooks'

  Fix: Lazy load the provider if possible or split chunk

  const NovuProvider = React.lazy(() => import('@novu/react/hooks').then(m => ({ default: m.NovuProvider })));

  Impact: Increases initial bundle size for all users.


[JS] apps/app/app/routes/_app+/$orgSlug_+/index.tsx: Calculation in loader

  // Line 94
  const dailyNotes = notesData.reduce(...)

  Fix: Move complex stats calculation to DB (using groupBy/count) or caching

  // Prisma groupBy is already used for leadership, but daily counts are manual.
  // Use raw SQL or optimized queries for time-series data if scaling.

  Impact: Increases CPU usage on server for dashboards with much data.


[STATE] apps/app/app/routes/_app+/$orgSlug_+/notes.tsx: Search state causes re-renders

  const [searchValue, setSearchValue] = useState(loaderData.searchQuery)
  // ...
  <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} ... />

  Fix: Isolate search input or use debounce to prevent parent re-render

  // Use a separate SearchInput component that manages its own state
  // and only calls onSearch after debounce/submit.

  Impact: Re-renders the entire NotesRoute (and lists) on every keystroke.


═══════════════════════════════════════════════════
PERFORMANCE METRICS ESTIMATE
═══════════════════════════════════════════════════

Bundle Impact:     Unknown (requires build analysis), potentially -50KB with code splitting
Render Performance: Huge improvement for large lists (Virtualization)
Memory Safety:      Critical fix for unbounded queries (Notes)
Network Efficiency: ~30-50% faster TTFB for Marketing site (Parallel data fetching)

Performance Score: 60/100

Priority: Fix 3 critical issues immediately

═══════════════════════════════════════════════════
RECOMMENDATIONS
═══════════════════════════════════════════════════

1. Implement cursor-based pagination for the Notes API.
2. Add `@tanstack/react-virtual` to the Kanban board.
3. Use `Promise.all` for data fetching in Astro pages.
4. Refactor `entry.client.tsx` to not block hydration on translation loading.
