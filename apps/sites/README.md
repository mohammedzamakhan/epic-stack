# Organization Sites

Public Astro app that serves published organization websites at
`{orgSlug}.{brand}.me` (e.g. `acme.epic-startup.me`) and optional customer
custom domains (e.g. `www.acme.com`) via Cloudflare for SaaS.

## Local development

```bash
npm run dev:sites
# or via monorepo
npm run dev
```

Sites runs on port **3008**. Through the HTTPS proxy (`:2999`), org subdomains
and custom domains are routed here.

### Env (varlock)

Config is defined in [`.env.schema`](.env.schema) and loaded via
`@varlock/astro-integration` (same pattern as `apps/web`). Copy values into a
local `.env` (gitignored) as needed. Types are generated to `env.d.ts`.

### Hosts

`/etc/hosts` does not support wildcards. `npm run setup:hosts` adds product app
domains, published org slug subdomains, and connected custom domains from the
database. Re-run after publishing or connecting a domain.

### Custom domains (Cloudflare for SaaS)

Production custom domains use
[Cloudflare for SaaS Custom Hostnames](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/):

1. Enable Cloudflare for SaaS on your platform zone
2. Set the Sites Worker/Pages deploy as the **fallback origin**
3. Configure on the main app (`apps/app`):
   - `CLOUDFLARE_API_TOKEN` (SSL and Certificates Write)
   - `CLOUDFLARE_ZONE_ID`
   - `CLOUDFLARE_CUSTOM_HOSTNAME_CNAME_TARGET` (e.g. `sites.epic-startup.me`)
4. In org settings → Organization site → Connect domain
5. Customer CNAMEs their hostname to the CNAME target; SSL validates via HTTP
   DCV

Without Cloudflare credentials (local), domains are still stored so you can test
host resolution via `/etc/hosts` + the dev proxy.
