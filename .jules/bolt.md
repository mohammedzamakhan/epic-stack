## 2025-05-20 - Unused CMS Fetches in Astro Pages
**Learning:** Astro pages might contain unused data fetching logic (e.g., `await cmsClient.getPosts()`) that was left behind after refactoring or commenting out sections. These fetches run on every request (SSR) or build (SSG), impacting performance.
**Action:** Always check frontmatter in `.astro` files for data fetching that is not actually used in the template, especially when finding large commented-out blocks.
