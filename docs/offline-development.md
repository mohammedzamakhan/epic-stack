# Offline Development Guide

The Epic Stack is designed to support offline development as much as possible,
following our [guiding principles](./guiding-principles.md).

## What Works Offline

Once you've completed the initial setup, you can develop completely offline:

### ✅ Fully Offline

- **Main App**: SQLite database with LiteFS
- **Admin Dashboard**: Shares SQLite database
- **CMS (Payload)**: Local SQLite file (`@payloadcms/db-sqlite`) + local file
  storage — no Docker, no cloud database
- **CMS Media**: Stored in `apps/cms/public/media/` directory (no R2 needed)
- **Mobile App**: Expo with local development server
- **UI Development**: All components and packages
- **Testing**: Unit tests and E2E tests
- **Database**: Prisma Studio, migrations, seeding

### ⚠️ Requires Internet (Optional)

- **Email Previews**: Resend API (can be mocked)
- **Background Jobs**: Trigger.dev (can be skipped in dev)
- **Notifications**: Local DB polling (fully offline)
- **AI Features**: Google AI, OpenAI (can be mocked)

## Initial Setup (Requires Internet)

The first-time setup requires internet for:

1. Installing npm packages
2. Setting up SSL certificates

```bash
# One-time setup
npm install
npm run setup
```

There are no Docker services to start for local development — the CMS uses a
local SQLite file, not a containerized database.

## Mocking External Services

For services that require internet, you can use mocks:

### Email (Resend)

```typescript
// .env
RESEND_API_KEY = 're_mock_key'
```

The app detects mock keys and uses console logging instead.

### OAuth Providers

```typescript
// .env
GITHUB_CLIENT_ID = 'MOCK_GITHUB_CLIENT_ID'
GITHUB_CLIENT_SECRET = 'MOCK_GITHUB_CLIENT_SECRET'
```

Mock OAuth providers are automatically used when prefixed with `MOCK_`.

### Object Storage (Tigris / R2)

**CMS (Payload)**: Automatically uses local file storage in development. Files
are stored in `apps/cms/public/media/` and served directly by Next.js. In
production it uses Cloudflare R2 — there is no local-dev toggle for the CMS. See
[CMS storage](./cms-storage.md).

**Main App**: Uses custom S3 client with mock credentials (Tigris in
production). `USE_S3_STORAGE=true` forces this mock-S3 path in development; it
has no effect on the CMS.

```bash
# .env
AWS_ACCESS_KEY_ID="mock-access-key"
AWS_SECRET_ACCESS_KEY="mock-secret-key"
BUCKET_NAME="mock-bucket"
```

## Working Completely Offline

After initial setup, to work offline:

1. **Run development**:

   ```bash
   npm run dev
   ```

2. **All services run locally**:
   - Main app: http://localhost:3001
   - Marketing site (web): http://localhost:3002
   - CMS: http://localhost:3006
   - Sites (tenant sites): http://localhost:3008
   - Tenant API (US): http://localhost:3007
   - Tenant API (KSA): http://localhost:3009
   - Admin: picks a free port near 3005 automatically (`get-port`); see the
     terminal output for the actual port
   - Prisma Studio: http://localhost:5555

## Troubleshooting Offline Development

### Port Conflicts

If ports are already in use:

1. Check what's using the port:

   ```bash
   lsof -i :3001   # Main app
   lsof -i :3006   # CMS
   ```

2. Stop conflicting services or change ports in app configs

## Data Persistence

All data is stored locally and persists between sessions:

- **SQLite (App/Admin)**: `packages/database/data.db`
- **SQLite (CMS)**: `apps/cms/data/cms.db`
- **Cache**: `other/cache.db`

To reset data:

```bash
# Reset App/Admin SQLite
npm run db:reset

# Reset CMS SQLite: just delete the local file
rm apps/cms/data/cms.db
```

## CI/CD Considerations

While local development is offline-first, CI/CD pipelines require internet for:

- Installing dependencies
- Running tests
- Building Docker images (App, Admin) and the CMS Worker bundle
- Deploying App/Admin to Fly.io, CMS to Cloudflare Workers, and Sites/Web to
  Cloudflare Pages

This is expected and doesn't impact local development experience.

## Benefits of Offline Development

1. **Work anywhere**: Planes, trains, coffee shops without WiFi
2. **Faster development**: No network latency
3. **Cost savings**: No cloud service costs during development
4. **Privacy**: All data stays on your machine
5. **Reliability**: No dependency on external service uptime

## Future Improvements

We're continuously improving offline capabilities:

- [ ] Local email preview without Resend
- [ ] Offline AI model support
- [ ] Local background job processing

See [guiding principles](./guiding-principles.md) for our commitment to offline
development.
