# Secrets

Managing secrets in the Epic Stack is done using environment variables and the
`wrangler secret` command.

> **Warning**: It is very important that you do NOT hard code any secrets in the
> code! This includes the `SESSION_SECRET` which is used to sign the session
> cookie! Doing so could put your application at risk for XSS and other attacks.

## Local Environment

When developing locally, secrets are stored in a `.env` file at the root of the
project. This file is not checked into version control. It's automatically
created for you when you run the initial setup script `npm run setup`. And is
based on the `.env.example` file.

## Production Environment

The Epic Stack applications use Cloudflare Workers and OCI instances. They do
not share a single `.env` file or environment.

App/Admin production secrets use `wrangler secret put`. Tenant-api production
secrets live in `/opt/tenant-api/.env` on each OCI VM. The jobs-cron Worker also
uses `wrangler secret put` (see [scheduled jobs](./scheduled-jobs.md)).

### Adding secrets

To publish a secret to your production and staging applications, you can use the
`wrangler secret put` command. For example, if you were integrating with the
`tito` API, to set the `TITO_API_SECRET` secret, you would run the following
command for your apps:

```sh
npx wrangler secret put TITO_API_SECRET --env production
npx wrangler secret put TITO_API_SECRET --env staging
```

Wrangler will prompt you to enter the secret value securely.
