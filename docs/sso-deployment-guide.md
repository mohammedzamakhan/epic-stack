# SSO Deployment Guide

This guide covers the deployment and production setup of the SSO authentication
system.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Security Configuration](#security-configuration)
- [Performance Optimization](#performance-optimization)
- [Monitoring and Logging](#monitoring-and-logging)
- [High Availability Setup](#high-availability-setup)
- [Backup and Recovery](#backup-and-recovery)
- [Maintenance Procedures](#maintenance-procedures)

## Prerequisites

### System Requirements

**Minimum Requirements**:

- Node.js 18+ or compatible runtime
- Database: SQLite (development) or PostgreSQL/MySQL (production)
- Memory: 2GB RAM minimum, 4GB recommended
- Storage: 10GB minimum for logs and cache
- Network: HTTPS-enabled domain with valid SSL certificate

**Recommended Production Setup**:

- Load balancer with SSL termination
- Database cluster with read replicas
- Redis for session storage and caching
- Monitoring and logging infrastructure
- Backup and disaster recovery systems

### Dependencies

Ensure the following packages are installed:

```json
{
	"remix-auth": "^3.6.0",
	"remix-auth-oauth2": "^1.11.1",
	"drizzle-orm": "latest",
	"crypto": "built-in"
}
```

## Environment Configuration

### Required Environment Variables

Create a `.env` file with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/database"

# Encryption Keys
ENCRYPTION_SECRET="your-32-character-encryption-key"
SSO_MASTER_KEY="your-sso-specific-encryption-key"

# Application Settings
BASE_URL="https://your-domain.com"
NODE_ENV="production"

# Session Configuration
SESSION_SECRET="your-session-secret-key"

# SSO Feature Flags
SSO_ENABLED="true"
SSO_DEBUG="false"

# Cache Configuration
CACHE_TTL_CONFIG="300000"    # 5 minutes
CACHE_TTL_STRATEGY="600000"  # 10 minutes
CACHE_TTL_ENDPOINT="1800000" # 30 minutes

# Connection Pool Settings
CONNECTION_POOL_MAX_SIZE="10"
CONNECTION_TIMEOUT="30000"   # 30 seconds

# Health Check Settings
HEALTH_CHECK_INTERVAL="1800000" # 30 minutes
PERIODIC_VALIDATION="true"

# Audit Logging
AUDIT_LOG_RETENTION_DAYS="90"
AUDIT_LOG_LEVEL="info"
```

### Security Environment Variables

```bash
# Encryption Keys (Generate with: openssl rand -hex 32)
ENCRYPTION_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
SSO_MASTER_KEY="z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1"

# Session Security
SESSION_SECRET="your-unique-session-secret-minimum-32-characters"

# HTTPS Configuration
FORCE_HTTPS="true"
SECURE_COOKIES="true"

# CORS Settings
CORS_ORIGIN="https://your-domain.com"
```

### Optional Environment Variables

```bash
# Redis Configuration (if using Redis for caching)
REDIS_URL="redis://localhost:6379"

# Monitoring
MONITORING_ENABLED="true"
METRICS_ENDPOINT="/metrics"

# Rate Limiting
RATE_LIMIT_ENABLED="true"
RATE_LIMIT_MAX_REQUESTS="100"
RATE_LIMIT_WINDOW_MS="900000" # 15 minutes

# Logging
LOG_LEVEL="info"
LOG_FORMAT="json"
LOG_FILE="/var/log/app/sso.log"
```

## Database Setup

### Database Migration

Run the database migrations to create SSO tables:

```bash
# Install dependencies
npm install

# Generate the Drizzle migration
npx drizzle-kit generate

# Run migrations
npm run db:migrate:deploy

# Verify migration
npm run db:studio
```

### Database Indexes

Ensure the following indexes exist for optimal performance:

```sql
-- SSO Configuration indexes
CREATE INDEX IF NOT EXISTS "SSOConfiguration_organizationId_idx" ON "SSOConfiguration"("organizationId");
CREATE INDEX IF NOT EXISTS "SSOConfiguration_isEnabled_idx" ON "SSOConfiguration"("isEnabled");
CREATE INDEX IF NOT EXISTS "SSOConfiguration_lastTested_idx" ON "SSOConfiguration"("lastTested");

-- SSO Session indexes
CREATE INDEX IF NOT EXISTS "SSOSession_ssoConfigId_idx" ON "SSOSession"("ssoConfigId");
CREATE INDEX IF NOT EXISTS "SSOSession_providerUserId_idx" ON "SSOSession"("providerUserId");
CREATE INDEX IF NOT EXISTS "SSOSession_tokenExpiresAt_idx" ON "SSOSession"("tokenExpiresAt");

-- Audit Log indexes
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
```

### Database Connection Pool

Configure connection pooling for production:

```javascript
// packages/database/src/schema.ts
// Configure the SQLite connection in the Drizzle database client.
// Connection pool settings belong in the deployment environment.
```

### Database Backup

Set up automated backups:

```bash
#!/bin/bash
# backup-sso-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/sso"
DB_NAME="your_database"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DATABASE_URL > $BACKUP_DIR/sso_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/sso_backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: sso_backup_$DATE.sql.gz"
```

## Security Configuration

### SSL/TLS Setup

Ensure HTTPS is properly configured:

```nginx
# nginx configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall Configuration

Configure firewall rules:

```bash
# Allow HTTPS traffic
sudo ufw allow 443/tcp

# Allow SSH (if needed)
sudo ufw allow 22/tcp

# Allow application port (if not behind reverse proxy)
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
```

### Key Management

Secure encryption key management:

```bash
# Generate encryption keys
openssl rand -hex 32 > /etc/app/encryption.key
openssl rand -hex 32 > /etc/app/sso-master.key

# Set proper permissions
chmod 600 /etc/app/*.key
chown app:app /etc/app/*.key

# Use in environment
export ENCRYPTION_SECRET=$(cat /etc/app/encryption.key)
export SSO_MASTER_KEY=$(cat /etc/app/sso-master.key)
```

## Performance Optimization

### Caching Configuration

Configure caching for optimal performance:

```javascript
// Cache configuration
const cacheConfig = {
	configurations: {
		ttl: 5 * 60 * 1000, // 5 minutes
		maxSize: 100,
	},
	strategies: {
		ttl: 10 * 60 * 1000, // 10 minutes
		maxSize: 100,
	},
	endpoints: {
		ttl: 30 * 60 * 1000, // 30 minutes
		maxSize: 100,
	},
}
```

### Connection Pool Optimization

Optimize HTTP connection pooling:

```javascript
// Connection pool settings
const poolConfig = {
	maxPoolSize: 10,
	connectionTimeout: 30000,
	idleTimeout: 60000,
	keepAlive: true,
}
```

### Database Optimization

Optimize database queries:

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "SSOConfiguration" WHERE "organizationId" = $1;

-- Update table statistics
ANALYZE "SSOConfiguration";
ANALYZE "SSOSession";
ANALYZE "AuditLog";
```

### Memory Management

Configure memory limits:

```bash
# Node.js memory settings
export NODE_OPTIONS="--max-old-space-size=2048"

# Process monitoring
pm2 start app.js --name sso-app --max-memory-restart 1G
```

## Monitoring and Logging

### Health Check Endpoints

Set up monitoring for health check endpoints:

```bash
# System health check
curl -f https://your-domain.com/api/health/sso || exit 1

# Configuration validation
curl -X POST -f https://your-domain.com/api/sso/health \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "configurationId=$CONFIG_ID" || exit 1
```

### Log Configuration

Configure structured logging:

```javascript
// Logging configuration
const logConfig = {
	level: process.env.LOG_LEVEL || 'info',
	format: 'json',
	transports: [
		{
			type: 'file',
			filename: '/var/log/app/sso.log',
			maxSize: '100MB',
			maxFiles: 10,
		},
		{
			type: 'console',
			format: 'simple',
		},
	],
}
```

### Metrics Collection

Set up metrics collection:

```javascript
// Metrics to collect
const metrics = {
	sso_authentication_total: 'Counter for SSO authentication attempts',
	sso_authentication_success_total:
		'Counter for successful SSO authentications',
	sso_authentication_duration_seconds:
		'Histogram of SSO authentication duration',
	sso_configuration_test_total: 'Counter for configuration tests',
	sso_cache_hit_ratio: 'Gauge for cache hit ratio',
	sso_active_sessions: 'Gauge for active SSO sessions',
}
```

### Alerting Rules

Configure alerting:

```yaml
# Prometheus alerting rules
groups:
  - name: sso_alerts
    rules:
      - alert: SSOAuthenticationFailureRate
        expr:
          rate(sso_authentication_total[5m]) -
          rate(sso_authentication_success_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High SSO authentication failure rate'

      - alert: SSOConfigurationDown
        expr: up{job="sso-health-check"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'SSO configuration health check failing'
```

## High Availability Setup

### Load Balancer Configuration

Configure load balancing:

```nginx
# nginx load balancer
upstream sso_backend {
    server app1.internal:3000;
    server app2.internal:3000;
    server app3.internal:3000;

    # Health check
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    location / {
        proxy_pass http://sso_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Health check
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    }
}
```

### Session Storage

Configure shared session storage:

```javascript
// Redis session storage
const sessionConfig = {
	store: new RedisStore({
		host: process.env.REDIS_HOST,
		port: process.env.REDIS_PORT,
		password: process.env.REDIS_PASSWORD,
		db: 0,
		ttl: 24 * 60 * 60, // 24 hours
	}),
}
```

### Database Clustering

Set up database clustering:

```bash
# PostgreSQL cluster setup
# Primary database
postgresql://primary.db.internal:5432/app

# Read replicas
postgresql://replica1.db.internal:5432/app
postgresql://replica2.db.internal:5432/app
```

## Backup and Recovery

### Backup Strategy

Implement comprehensive backup:

```bash
#!/bin/bash
# Full backup script

# Database backup
pg_dump $DATABASE_URL > /backups/db/sso_$(date +%Y%m%d).sql

# Configuration backup
tar -czf /backups/config/sso_config_$(date +%Y%m%d).tar.gz \
  /etc/app/ \
  /var/log/app/

# Upload to cloud storage
aws s3 cp /backups/ s3://your-backup-bucket/sso/ --recursive
```

### Recovery Procedures

Document recovery procedures:

```bash
# Database recovery
psql $DATABASE_URL < /backups/db/sso_20231201.sql

# Configuration recovery
tar -xzf /backups/config/sso_config_20231201.tar.gz -C /

# Restart services
systemctl restart app
systemctl restart nginx
```

### Disaster Recovery

Plan for disaster recovery:

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Backup Frequency**: Daily full, hourly incremental
4. **Geographic Distribution**: Multi-region backups
5. **Testing**: Monthly recovery drills

## Maintenance Procedures

### Regular Maintenance Tasks

Schedule regular maintenance:

```bash
# Weekly maintenance script
#!/bin/bash

# Update database statistics
psql $DATABASE_URL -c "ANALYZE;"

# Clean up old audit logs
psql $DATABASE_URL -c "DELETE FROM \"AuditLog\" WHERE \"createdAt\" < NOW() - INTERVAL '90 days';"

# Clean up expired SSO sessions
psql $DATABASE_URL -c "DELETE FROM \"SSOSession\" WHERE \"tokenExpiresAt\" < NOW();"

# Restart application to clear memory
systemctl restart app

# Check system health
curl -f https://your-domain.com/api/health/sso
```

### Security Updates

Keep dependencies updated:

```bash
# Check for security updates
npm audit

# Update dependencies
npm update

# Run security scan
npm audit fix

# Test after updates
npm test
```

### Performance Monitoring

Monitor performance metrics:

```bash
# Database performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE application_name LIKE '%sso%';"

# Application metrics
curl https://your-domain.com/metrics

# System resources
htop
iostat
```

### Capacity Planning

Plan for capacity growth:

1. **Monitor Growth Trends**:
   - User authentication volume
   - Database size growth
   - Memory usage patterns

2. **Scale Indicators**:
   - Response time > 2 seconds
   - CPU usage > 80%
   - Memory usage > 85%
   - Database connections > 80% of pool

3. **Scaling Actions**:
   - Horizontal scaling: Add more application instances
   - Vertical scaling: Increase server resources
   - Database scaling: Add read replicas
   - Cache scaling: Implement Redis cluster

This deployment guide ensures a robust, secure, and scalable SSO implementation
suitable for production environments.
