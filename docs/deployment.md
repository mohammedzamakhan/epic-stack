# Deployment

When you first create an Epic Stack repo, it should take you through a series of
questions to get your app setup and deployed. However, we'll document the steps
here in case things don't go well for you or you decide to do it manually later.
Here they are!

## Deploying to Fly.io

Prior to your first deployment, you'll need to do a few things:

1. [Install Fly](https://fly.io/docs/getting-started/installing-flyctl/).

   > **Note**: Try `flyctl` instead of `fly` if the commands below won't work.

2. Sign up and log in to Fly:

   ```sh
   fly auth signup
   ```

   > **Note**: If you have more than one Fly account, ensure that you are signed
   > into the same account in the Fly CLI as you are in the browser. In your
   > terminal, run `fly auth whoami` and ensure the email matches the Fly
   > account signed into the browser.

3. Create two apps on Fly, one for staging and one for production:

   ```sh
   fly apps create [YOUR_APP_NAME]
   fly apps create [YOUR_APP_NAME]-staging
   ```

   > **Note**: Make sure this name matches the `app` set in your `fly.toml`
   > file. Otherwise, you will not be able to deploy.

4. Initialize Git.

   ```sh
   git init
   ```

- Create a new [GitHub Repository](https://repo.new), and then add it as the
  remote for your project. **Do not push your app yet!**

  ```sh
  git remote add origin <ORIGIN_URL>
  ```

5. Add secrets:

- Add a `FLY_API_TOKEN` to your GitHub repo. To do this, go to your user
  settings on Fly and create a new
  [token](https://web.fly.io/user/personal_access_tokens/new), then add it to
  [your repo secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
  with the name `FLY_API_TOKEN`.

- Add a `SESSION_SECRET` and `HONEYPOT_SECRET` to your fly app secrets, to do
  this you can run the following commands:

  ```sh
  fly secrets set SESSION_SECRET=$(openssl rand -hex 32) HONEYPOT_SECRET=$(openssl rand -hex 32) --app [YOUR_APP_NAME]
  fly secrets set SESSION_SECRET=$(openssl rand -hex 32) HONEYPOT_SECRET=$(openssl rand -hex 32) --app [YOUR_APP_NAME]-staging
  ```

  > **Note**: If you don't have openssl installed, you can also use
  > [1Password](https://1password.com/password-generator) to generate a random
  > secret, just replace `$(openssl rand -hex 32)` with the generated secret.

- Add a `ALLOW_INDEXING` with `false` value to your non-production fly app
  secrets, this is to prevent duplicate content from being indexed multiple
  times by search engines. To do this you can run the following commands:

  ```sh
  fly secrets set ALLOW_INDEXING=false --app [YOUR_APP_NAME]-staging
  ```

6. Create production database:

   Create a persistent volume for the sqlite database for both your staging and
   production environments. Run the following (feel free to change the GB size
   based on your needs and the region of your choice
   (`https://fly.io/docs/reference/regions/`). If you do change the region, make
   sure you change the `primary_region` in fly.toml as well):

   ```sh
   fly volumes create data --region sjc --size 1 --app [YOUR_APP_NAME]
   fly volumes create data --region sjc --size 1 --app [YOUR_APP_NAME]-staging
   ```

7. Attach Consul:

- Consul is a fly-managed service that manages your primary instance for data
  replication
  ([learn more about configuring consul](https://fly.io/docs/litefs/getting-started/#lease-configuration)).

  ```sh
  fly consul attach --app [YOUR_APP_NAME]
  fly consul attach --app [YOUR_APP_NAME]-staging
  ```

8. Set up Tigris object storage:

   ```sh
   fly storage create --app [YOUR_APP_NAME]
   fly storage create --app [YOUR_APP_NAME]-staging
   ```

   This will create a Tigris object storage bucket for both your production and
   staging environments. The bucket will be used for storing uploaded files and
   other objects in your application. This will also automatically create the
   necessary environment variables for your app. During local development, this
   is completely mocked out so you don't need to worry about it.

9. Commit!

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

## Deploying locally using fly

If you'd like to deploy locally, just run fly's deploy command:

```
fly deploy
```

## Regional tenant data plane

App and Admin stay on Fly in the US. Customer PII for tenant Sites lives on
**regional tenant-api** nodes on **Oracle Cloud Infrastructure**:

| Logical `dataRegion` | OCI region                                  | Shape                                 |
| -------------------- | ------------------------------------------- | ------------------------------------- |
| `us`                 | US East (Ashburn) `us-ashburn-1`            | Ampere A1 VM + block volume           |
| `ksa`                | Saudi Arabia Central (Riyadh) `me-riyadh-1` | Always Free A1 in the **home** region |

Set the tenancy **home region to Riyadh** at signup. Always Free compute, 200 GB
block volume, and 10 TB egress apply only in the home region. The Ashburn VM is
paid (~1 OCPU / 4 GB). Do not put KSA customer data on Fly, on the US
control-plane SQLite volume, or in Bahrain/UAE.

Full architecture, local two-node setup, and SMS rules:
[Tenant data residency](./tenant-data-residency.md).

### OCI shape

Use the same image (`apps/tenant-api/Dockerfile`, `linux/arm64`) twice. One VM
and one block volume per region. **Do not use LiteFS** — that is Fly-only and
would require a sticky multi-machine cluster. Mount the volume at
`/data/tenants` (`TENANT_DB_DIR`).

1. **US (Ashburn)** — paid Ampere A1. `DATA_REGION=us`. Public URL in App
   `TENANT_API_URL` and Sites `PUBLIC_TENANT_API_URL`.
2. **KSA (Riyadh)** — home-region Always Free A1. `DATA_REGION=ksa`. Public URL
   in `TENANT_API_URL_KSA` / `PUBLIC_TENANT_API_URL_KSA`.

Skip an OCI load balancer and NAT gateway. Put Cloudflare (or a Cloudflare
Tunnel) in front of port 8080. Set `APP_URL` to the US App so org flags do not
require a shared control-plane SQLite volume.

On each VM, copy `apps/tenant-api/docker-compose.yml` and
`apps/tenant-api/.env.example` to `/opt/tenant-api`, attach the volume at
`/data/tenants`, then:

```sh
export TENANT_API_IMAGE=ghcr.io/<owner>/epic-startup/tenant-api:<sha>
docker compose up -d
```

Secrets (on the VM `.env`, not `fly secrets`):

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
PUBLIC_TENANT_API_URL=https://tenant-us.example.com
PUBLIC_TENANT_API_URL_KSA=https://tenant-ksa.example.com
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

## Deploying locally using docker/podman

If you'd like to deploy locally by building a docker container image, you
definitely can. For that you need to make some minimal changes to the Dockerfile
located at other/Dockerfile. Remove everything from the line that says (#prepare
for litefs) in "other/Dockerfile" till the end of file and swap with the
contents below.

```
# prepare for litefs
VOLUME /litefs
ADD . .

EXPOSE ${PORT}
ENTRYPOINT ["/myapp/other/docker-entry-point.sh"]
```

There are 2 things that we are doing here.

1. docker volume is used to swap out the fly.io litefs mount.
2. Docker ENTRYPOINT is used to execute some commands upon launching of the
   docker container

Create a file at other/docker-entry-point.sh with the contents below.

```
#!/bin/sh -ex

npx tsx packages/database/src/migrate.ts
sqlite3 /litefs/data/sqlite.db "PRAGMA journal_mode = WAL;"
sqlite3 /litefs/data/cache.db "PRAGMA journal_mode = WAL;"
npm run start
```

This takes care of applying control-plane SQL migrations, followed by launching
the node application (on port 8081).

Helpful commands:

```
# builds the docker container
docker build -t epic-startup . -f other/Dockerfile --build-arg COMMIT_SHA=`git rev-parse --short HEAD`

# mountpoint for your sqlite databases
mkdir ~/litefs

# Runs the docker container.
docker run -d -p 8081:8081 -e SESSION_SECRET='somesecret' -e HONEYPOT_SECRET='somesecret' -e FLY='false' -v ~/litefs:/litefs epic-startup

# http://localhost:8081 should now point to your docker instance. ~/litefs directory has the sqlite databases
```
