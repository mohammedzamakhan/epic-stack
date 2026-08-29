## 2024-08-12 - [Database Query Parallelization]
**Learning:** Found sequential independent database and data operations in `apps/app/app/routes/_app+/$orgSlug_+/notes.tsx`. Sequential data fetching operations that do not depend on each other act as blocking request waterfalls on the server, significantly degrading TTFB (Time to First Byte).
**Action:** When performing independent data fetching or asynchronous tasks (e.g. `findMany`, cookie parsing) in route loaders, always parallelize them using `Promise.all` to reduce server-side blocking and drastically improve response times.
## 2024-10-27 - [Lazy Loading Drawer Content]
**Learning:** The `@repo/ui/drawer` (based on Vaul) mounts its child contents immediately even when closed. Placing heavy or computationally expensive components (like Recharts) inside drawers without conditional rendering causes significant memory and rendering overhead, especially when rendered multiple times (e.g. in a data table).
**Action:** Always track the open state of drawers (`isOpen`) and use conditional rendering (`{isOpen && <HeavyComponent />}`) for heavy or computationally expensive components inside them to optimize rendering performance.
