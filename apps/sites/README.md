# Organization Sites

Public Astro app that serves published organization websites at
`{orgSlug}.{brand}.me` (e.g. `acme.epic-startup.me`).

## Local development

```bash
npm run dev:sites
# or via monorepo
npm run dev
```

Sites runs on port **3008**. Through the HTTPS proxy (`:2999`), org subdomains
that are not reserved product apps are routed here.

### Env (varlock)

Config is defined in [`.env.schema`](.env.schema) and loaded via
`@varlock/astro-integration` (same pattern as `apps/web`). Copy values into a
local `.env` (gitignored) as needed. Types are generated to `env.d.ts`.

### Hosts

`/etc/hosts` does not support wildcards. `npm run setup:hosts` adds product app
domains plus a hosts entry for every **published** organization site
(`sitePublished`) from the database. Re-run it after publishing a site.

For full wildcard local DNS, use dnsmasq (or similar).
