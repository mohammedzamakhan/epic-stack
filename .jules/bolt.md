## 2024-08-12 - [Database Query Parallelization]
**Learning:** Found sequential independent database and data operations in `apps/app/app/routes/_app+/$orgSlug_+/notes.tsx`. Sequential data fetching operations that do not depend on each other act as blocking request waterfalls on the server, significantly degrading TTFB (Time to First Byte).
**Action:** When performing independent data fetching or asynchronous tasks (e.g. `findMany`, cookie parsing) in route loaders, always parallelize them using `Promise.all` to reduce server-side blocking and drastically improve response times.
