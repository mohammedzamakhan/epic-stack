# Offline Development Guide

The Epic Stack is designed to support offline development as much as possible,
following our [guiding principles](./guiding-principles.md).

## What Works Offline

Once you've completed the initial setup, you can develop completely offline:

### ✅ Fully Offline

- **Main App**: SQLite database with LiteFS
- **Admin Dashboard**: Shares SQLite database
- **CMS (Payload)**: MongoDB via Docker (local) + Local file storage
- **CMS Media**: Stored in `public/media/` directory (no S3 needed)
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
2. Pulling Docker images (~400MB for MongoDB)
3. Setting up SSL certificates

```bash
# One-time setup
npm install
npm run setup
```

## Docker Services for Offline Development

The CMS uses MongoDB, which runs locally via Docker Compose. This ensures you
don't need a cloud MongoDB instance for development.

### Automatic Startup

Docker services start automatically with:

```bash
npm run dev
```

### Prerequisites

**Docker Desktop must be installed and running**:

- macOS: https://docs.docker.com/desktop/install/mac-install/
- Windows: https://docs.docker.com/desktop/install/windows-install/
- Linux: https://docs.docker.com/desktop/install/linux-install/

### How It Works

1. `npm run dev` checks if Docker is installed and running
2. Starts MongoDB container in the background
3. Waits for MongoDB to be healthy
4. Starts all application services

### Manual Control

```bash
# Start Docker services only
npm run dev:services

# Stop Docker services
npm run dev:services:stop

# View Docker logs
npm run dev:services:logs
```

See [Docker Services Guide](./docker-services.md) for detailed documentation.

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

### Object Storage (S3/Tigris)

**CMS (Payload)**: Automatically uses local file storage in development. Files
are stored in `apps/cms/public/media/` and served directly by Next.js.

To force S3 usage in development:

```bash
# .env
USE_S3_STORAGE=true
```

**Main App**: Uses custom S3 client with mock credentials:

```bash
# .env
AWS_ACCESS_KEY_ID="mock-access-key"
AWS_SECRET_ACCESS_KEY="mock-secret-key"
BUCKET_NAME="mock-bucket"
```

## Working Completely Offline

After initial setup, to work offline:

1. **Start Docker Desktop** (one-time per session)
2. **Run development**:

   ```bash
   npm run dev
   ```

3. **All services run locally**:
   - Main app: http://localhost:3001
   - Marketing site: http://localhost:3002
   - CMS: http://localhost:3003
   - Admin: http://localhost:3004
   - Prisma Studio: http://localhost:5555

## Troubleshooting Offline Development

### Docker Not Running

```
❌ Docker is not running.
   Please start Docker Desktop and try again.
```

**Solution**: Open Docker Desktop and wait for it to start.

### MongoDB Connection Failed

If CMS can't connect to MongoDB:

```bash
# Check Docker status
docker compose ps

# Restart MongoDB
docker compose restart mongodb

# View logs
npm run dev:services:logs
```

### Port Conflicts

If ports are already in use:

1. Check what's using the port:

   ```bash
   lsof -i :27017  # MongoDB
   lsof -i :3001   # Main app
   ```

2. Stop conflicting services or change ports in app configs

## Data Persistence

All data is stored locally and persists between sessions:

- **SQLite**: `packages/database/data.db`
- **MongoDB**: Docker volume `mongo-data`
- **Cache**: `other/cache.db`

To reset data:

```bash
# Reset SQLite
npm run db:reset

# Reset MongoDB
docker compose down -v
npm run dev:services
```

## CI/CD Considerations

While local development is offline-first, CI/CD pipelines require internet for:

- Installing dependencies
- Running tests
- Building Docker images
- Deploying to Fly.io

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
