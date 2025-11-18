#!/bin/bash

# Setup Analytics Database Script
#
# This script sets up the PostgreSQL analytics database for the Epic Stack.
# It handles database creation, migrations, and initial data sync.
#
# Usage:
#   ./scripts/setup-analytics-db.sh [--local|--production]
#
# Options:
#   --local       Setup local PostgreSQL using Docker (default)
#   --production  Use existing PostgreSQL from ANALYTICS_DATABASE_URL

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Default mode
MODE="local"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --local)
            MODE="local"
            shift
            ;;
        --production)
            MODE="production"
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Usage: $0 [--local|--production]"
            exit 1
            ;;
    esac
done

print_info "Starting analytics database setup in ${MODE} mode..."

# Step 1: Check dependencies
print_info "Checking dependencies..."

if ! command -v docker &> /dev/null && [ "$MODE" = "local" ]; then
    print_error "Docker is required for local setup but not installed."
    print_info "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed."
    exit 1
fi

print_success "Dependencies check passed"

# Step 2: Setup PostgreSQL (local mode only)
if [ "$MODE" = "local" ]; then
    print_info "Setting up local PostgreSQL with Docker..."

    # Check if container already exists
    if docker ps -a --format '{{.Names}}' | grep -q '^epic-analytics$'; then
        print_warning "Container 'epic-analytics' already exists"

        # Check if it's running
        if docker ps --format '{{.Names}}' | grep -q '^epic-analytics$'; then
            print_info "Container is already running"
        else
            print_info "Starting existing container..."
            docker start epic-analytics
        fi
    else
        print_info "Creating new PostgreSQL container..."
        docker run --name epic-analytics \
            -e POSTGRES_PASSWORD=epicpassword \
            -e POSTGRES_DB=analytics \
            -e POSTGRES_USER=epic \
            -p 5432:5432 \
            -d postgres:16-alpine

        print_success "PostgreSQL container created"
        print_info "Waiting for PostgreSQL to be ready..."
        sleep 5
    fi

    # Test connection
    if docker exec epic-analytics pg_isready -U epic > /dev/null 2>&1; then
        print_success "PostgreSQL is ready"
    else
        print_error "PostgreSQL failed to start"
        exit 1
    fi

    # Set environment variable for local setup
    export ANALYTICS_DATABASE_URL="postgresql://epic:epicpassword@localhost:5432/analytics?schema=public"

    # Update .env file
    if [ -f "apps/app/.env" ]; then
        if grep -q "ANALYTICS_DATABASE_URL=" apps/app/.env; then
            # Update existing line
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|ANALYTICS_DATABASE_URL=.*|ANALYTICS_DATABASE_URL=\"postgresql://epic:epicpassword@localhost:5432/analytics?schema=public\"|" apps/app/.env
            else
                # Linux
                sed -i "s|ANALYTICS_DATABASE_URL=.*|ANALYTICS_DATABASE_URL=\"postgresql://epic:epicpassword@localhost:5432/analytics?schema=public\"|" apps/app/.env
            fi
        else
            # Add new line
            echo 'ANALYTICS_DATABASE_URL="postgresql://epic:epicpassword@localhost:5432/analytics?schema=public"' >> apps/app/.env
        fi
        print_success "Updated apps/app/.env with analytics database URL"
    fi

    print_success "Local PostgreSQL setup complete"
    print_info "Connection string: postgresql://epic:epicpassword@localhost:5432/analytics"
fi

# Step 3: Check environment variable
print_info "Checking ANALYTICS_DATABASE_URL..."

if [ -z "$ANALYTICS_DATABASE_URL" ]; then
    if [ -f "apps/app/.env" ] && grep -q "ANALYTICS_DATABASE_URL=" apps/app/.env; then
        export ANALYTICS_DATABASE_URL=$(grep "ANALYTICS_DATABASE_URL=" apps/app/.env | cut -d '=' -f2- | tr -d '"')
    fi
fi

if [ -z "$ANALYTICS_DATABASE_URL" ]; then
    print_error "ANALYTICS_DATABASE_URL is not set"
    print_info "Please set it in your .env file or environment"
    exit 1
fi

print_success "ANALYTICS_DATABASE_URL is configured"

# Step 4: Generate Prisma client
print_info "Generating analytics Prisma client..."
cd packages/prisma
npm run analytics:generate
print_success "Prisma client generated"

# Step 5: Run migrations
print_info "Running database migrations..."
npm run analytics:migrate:deploy
print_success "Migrations completed"

cd ../..

# Step 6: Initial data sync (optional)
read -p "$(echo -e ${YELLOW}"Do you want to run initial data sync? This will populate analytics data. (y/N): "${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Running initial data sync..."
    print_warning "This may take a few minutes depending on your data volume..."

    # Check if Trigger.dev is configured
    if [ -z "$TRIGGER_API_KEY" ] && [ -z "$TRIGGER_SECRET_KEY" ]; then
        print_warning "Trigger.dev is not configured. Skipping automated sync."
        print_info "You can run sync jobs manually later using:"
        print_info "  npm run trigger:dev"
        print_info "  Then trigger the jobs from the Trigger.dev dashboard"
    else
        # Try to trigger sync jobs
        print_info "Triggering sync jobs..."

        # This would require Trigger.dev CLI setup
        print_warning "Please run sync jobs manually from Trigger.dev dashboard:"
        print_info "  1. analytics-sync-organization-metrics"
        print_info "  2. analytics-sync-user-metrics"
        print_info "  3. analytics-sync-daily-metrics"
    fi
else
    print_info "Skipping initial data sync"
    print_info "You can run sync jobs later from the Trigger.dev dashboard"
fi

# Step 7: Verify setup
print_info "Verifying setup..."

# Create a simple verification script
cat > /tmp/verify-analytics.js << 'EOF'
const { PrismaClient: AnalyticsPrismaClient } = require('./packages/prisma/generated/analytics');

async function verify() {
  const client = new AnalyticsPrismaClient({
    datasources: {
      db: {
        url: process.env.ANALYTICS_DATABASE_URL
      }
    }
  });

  try {
    await client.$connect();
    console.log('✓ Successfully connected to analytics database');

    // Check if tables exist
    const result = await client.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      LIMIT 5
    `;

    console.log('✓ Found tables:', result.map(r => r.table_name).join(', '));

    await client.$disconnect();
    return true;
  } catch (error) {
    console.error('✗ Failed to connect:', error.message);
    process.exit(1);
  }
}

verify();
EOF

# Run verification
if node /tmp/verify-analytics.js 2>/dev/null; then
    print_success "Analytics database setup verified!"
else
    print_warning "Could not verify connection automatically"
    print_info "Please test manually: npm run analytics:push"
fi

# Cleanup
rm -f /tmp/verify-analytics.js

# Final instructions
echo ""
print_success "=========================================="
print_success "Analytics Database Setup Complete!"
print_success "=========================================="
echo ""
print_info "Next steps:"
echo ""
print_info "1. Start your application:"
echo "   npm run dev"
echo ""
print_info "2. Start Trigger.dev for background jobs:"
echo "   npm run trigger:dev"
echo ""
print_info "3. View analytics data:"
echo "   Check the Trigger.dev dashboard for sync job status"
echo ""

if [ "$MODE" = "local" ]; then
    print_info "4. Connect to PostgreSQL:"
    echo "   docker exec -it epic-analytics psql -U epic -d analytics"
    echo ""
    print_info "5. Stop PostgreSQL (when done):"
    echo "   docker stop epic-analytics"
    echo ""
fi

print_info "Documentation:"
print_info "  docs/hybrid-database-architecture.md"
echo ""

# Print connection info for easy copying
if [ "$MODE" = "local" ]; then
    echo "=========================================="
    print_info "Local PostgreSQL Connection Info:"
    echo "=========================================="
    echo "Host:     localhost"
    echo "Port:     5432"
    echo "Database: analytics"
    echo "User:     epic"
    echo "Password: epicpassword"
    echo ""
    echo "Connection String:"
    echo "postgresql://epic:epicpassword@localhost:5432/analytics"
    echo "=========================================="
fi
