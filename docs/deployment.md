# Deployment

When you first create an Epic Stack repo, it should take you through a series of
questions to get your app setup and deployed. However, we'll document the steps
here in case things don't go well for you or you decide to do it manually later.
Here they are!

## Deploying to Cloudflare Workers

Prior to your first deployment, you'll need to do a few things:

1. **Install Wrangler CLI**:

   ```sh
   npm install -g wrangler
   ```

2. Sign up and log in to Cloudflare:

   ```sh
   wrangler login
   ```

3. Create your Workers and D1 databases:

   ```sh
   # Create the main app
   wrangler deploy --dry-run  # This will create the worker if needed

   # Create D1 database
   wrangler d1 create epic-startup
   ```

4. Initialize Git.

   ```sh
   git init
   ```

- Create a new [GitHub Repository](https://repo.new), and then add it as the
  remote for your project. **Do not push your app yet!**

  ```sh
  git remote add origin <ORIGIN_URL>
  ```

5. Add secrets via wrangler:

   ```sh
   wrangler secret put SESSION_SECRET
   wrangler secret put HONEYPOT_SECRET
   wrangler secret put INTERNAL_COMMAND_TOKEN
   ```

   Or use `npx wrangler secret bulk --env production secrets.json` to set
   multiple.

   > **Note**: Generate secrets with `openssl rand -hex 32`

6. Set up GitHub Actions secrets:

   - Add `CLOUDFLARE_API_TOKEN` to your GitHub repo. Get this from
     [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
     (Create Custom Token with Workers edit permission).
   - Add `CLOUDFLARE_ACCOUNT_ID` as a variable.

7. Commit!

   The Epic Stack comes with a GitHub Action that handles automatically
   deploying your app to production and staging environments.

   Now that everything is set up you can commit and push your changes to your
   repo. Every commit to your `main` branch will trigger a deployment to your
   production environment, and every commit to your `dev` branch will trigger a
   deployment to your staging environment.

---

### Optional: Email service setup

Find instructions for this optional step in [the email docs](./email.md).

### Optional: Error monitoring setup

Find instructions for this optional step in
[the error tracking docs](./monitoring.md).

### Optional: Connecting to your production database

Find instructions for this optional step in [the database docs](./database.md).

### Optional: Seeding Production

Find instructions for this optional step in [the database docs](./database.md).

## Deploying locally

To run the app locally:

```sh
npm run dev
```

This starts all apps in the monorepo. For individual app development:

```sh
npm run dev:app    # Main app on port 3001
npm run dev:admin  # Admin on port 3004 (auto-detected)
npm run dev:web    # Marketing site on port 3002
npm run dev:cms    # CMS on port 3006
```

## Regional tenant data plane

App and Admin deploy to Cloudflare Workers. Customer PII for tenant Sites lives
on **regional tenant-api** nodes on **Oracle Cloud Infrastructure**:

| Logical `dataRegion` | OCI region                                  | Shape                                 |
| -------------------- | ------------------------------------------- | ------------------------------------- |
| `us`                 | US East (Ashburn) `us-ashburn-1`            | Ampere A1 VM + block volume           |
| `ksa`                | Saudi Arabia Central (Riyadh) `me-riyadh-1` | Always Free A1 in the **home** region |

Set the tenancy **home region to Riyadh** at signup. Always Free compute, 200 GB
block volume, and 10 TB egress apply only in the home region. The Ashburn VM is
paid (~1 OCPU / 4 GB). Do not put KSA customer data on the US control-plane D1,
or in Bahrain/UAE.

Full architecture, local two-node setup, and SMS rules:
[Tenant data residency](./tenant-data-residency.md).

### OCI shape

Use the same image (`apps/tenant-api/Dockerfile`, `linux/arm64`) twice. One VM
and one block volume per region. Mount the volume at `/data/tenants`
(`TENANT_DB_DIR`).

1. **US (Ashburn)** — paid Ampere A1. `DATA_REGION=us`. Public URL in App and
   Sites `TENANT_API_URL`.
2. **KSA (Riyadh)** — home-region Always Free A1. `DATA_REGION=ksa`. Public URL
   in `TENANT_API_URL_KSA` (App and Sites).

Skip an OCI load balancer and NAT gateway. Put Cloudflare (or a Cloudflare
Tunnel) in front of port 8080. Set `APP_URL` to the US App so org flags do not
require a shared control-plane database.

On each VM, copy `apps/tenant-api/docker-compose.yml` and
`apps/tenant-api/.env.example` to `/opt/tenant-api`, attach the volume at
`/data/tenants`, then:

```sh
export TENANT_API_IMAGE=ghcr.io/<owner>/epic-startup/tenant-api:<sha>
docker compose up -d
```

Secrets (on the VM `.env`):

```sh
# Per regional tenant-api
DATA_REGION=us   # or ksa
TENANT_DB_DIR=/data/tenants
JWT_SECRET=...   # unique per region
AUTH_HMAC_SECRET=...
INTERNAL_COMMAND_TOKEN=...   # same value as US App
APP_URL=https://epic-startup.me
ROOT_APP=epic-startup.me
```

On US App:

```
TENANT_API_URL=https://tenant-us.example.com
TENANT_API_URL_KSA=https://tenant-ksa.example.com
INTERNAL_COMMAND_TOKEN=<same as tenant-api>
```

On Sites (Cloudflare env / GitHub Actions variables):

```
TENANT_API_URL=https://tenant-us.example.com
TENANT_API_URL_KSA=https://tenant-ksa.example.com
```

GitHub Actions builds `linux/arm64` and pushes to GHCR. If `OCI_TENANT_US_HOST`
/ `OCI_TENANT_KSA_HOST` (variables) and `OCI_TENANT_SSH_KEY` (secret) are set,
it SSHs to `/opt/tenant-api` and runs `docker compose pull && up`. Add
`GHCR_PULL_TOKEN` (packages:read PAT) so the VMs can pull a private image.

Riyadh has a single availability domain. Back up `tenant_*.db` with volume
backups or `sqlite3 .backup` to Object Storage. Always Free A1 instances can be
reclaimed if they stay idle (CPU, RAM, and network all under 20% for a week);
Pay as You Go plus a live API is the usual mitigation.

Sites can stay in the US for CMS HTML. Customer login/profile must **not** go
through a Sites `/api/auth/*` BFF. The page JS calls the regional tenant-api
directly.

Production startup refuses empty or development-default `JWT_SECRET`,
`AUTH_HMAC_SECRET`, and `INTERNAL_COMMAND_TOKEN`. KSA production SMS via Twilio
is rejected; configure an in-kingdom provider first.

## Scheduled jobs (Cloudflare Worker)

Control-plane cron work (audit archival, MCP token cleanup, GDPR erasure) runs
on the App primary instance. Scheduling is handled by `apps/jobs-cron`, a
Cloudflare Worker that POSTs to `/resources/jobs/*` with
`Authorization: Bearer INTERNAL_COMMAND_TOKEN`.

1. Use the **same** `INTERNAL_COMMAND_TOKEN` on App and the worker
   (`wrangler secret put INTERNAL_COMMAND_TOKEN` in `apps/jobs-cron`).
2. Set `APP_BASE_URL` in `apps/jobs-cron/wrangler.jsonc` to your App URL
   (staging vs production).
3. CI deploys via the `deploy-jobs-cron` job when `apps/jobs-cron/**` changes.

Full details: [scheduled jobs](./scheduled-jobs.md).

## Video media transformations

Note video posters and hover clips use **Cloudflare Media Transformations** on
demand (no ffmpeg, no async job queue):

1. Put the App hostname behind Cloudflare (proxied).
2. Enable **Media Transformations** on the zone.
3. Set on the App: `MEDIA_TRANSFORM_BASE_URL=https://app.yourdomain.com`

The App serves raw video bytes from org storage via `/resources/videos/source`;
Cloudflare `/cdn-cgi/media/` derives frames and short clips from that URL.

See
[scheduled jobs — video media](./scheduled-jobs.md#video-note-media-no-background-jobs).

## Deploying locally using docker/podman

If you'd like to deploy locally by building a docker container image, you
definitely can.

```sh
# Build the docker container
docker build -t epic-startup . -f apps/app/other/Dockerfile --build-arg COMMIT_SHA=$(git rev-parse --short HEAD)

# Run the docker container
docker run -d -p 8787:8787 -e SESSION_SECRET='somesecret' -e HONEYPOT_SECRET='somesecret' epic-startup

# http://localhost:8787 should now point to your docker instance
```

The Dockerfile is now configured for Cloudflare Workers compatibility. The app
runs on port 8787 by default.
