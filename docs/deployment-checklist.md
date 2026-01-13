# Complete Epic Stack Deployment Guide

Deploy your entire Epic Stack monorepo to production with this comprehensive
checklist-based guide.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Website       │    │   Main App      │    │   Admin App     │    │   CMS App       │
│ (Cloudflare     │    │ (Fly.io)        │    │ (Fly.io)        │    │ (Fly.io)        │
│  Pages)         │    │                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         │                       └───────┬───────────────┘                       │
         │                               │                                       │
         └───────────────────────────────┼───────────────────────────────────────┘
                                         │
                         ┌─────────────────┐              ┌─────────────────┐
                         │ SQLite Database │              │    MongoDB      │
                         │ (Fly.io LiteFS) │              │    (Atlas)      │
                         │ Main/Admin Apps │              │   CMS Data      │
                         └─────────────────┘              └─────────────────┘
```

**Applications to Deploy:**

- **Website**: Cloudflare Pages (Astro) - Already configured ✅
- **Main App**: Fly.io (`epic-startup`) - SQLite + LiteFS
- **Admin App**: Fly.io (`epic-startup-admin`) - Shared SQLite
- **CMS App**: Fly.io (`epic-startup-cms`) - MongoDB Atlas

---

## 📋 Pre-Deployment Checklist

### Prerequisites

- [ ] **Fly.io CLI** installed and authenticated (`flyctl auth login`)
- [ ] **GitHub repository** with monorepo structure
- [ ] **MongoDB Atlas account** (free tier available)
- [ ] **Cloudflare account** (for website deployment)
- [ ] **Node.js 22+** installed locally

### Required Accounts

- [ ] **Fly.io account** with organization set up
- [ ] **MongoDB Atlas account** created
- [ ] **GitHub Actions** access to repository
- [ ] **Cloudflare Pages** connected to repository

---

## 🗄️ Step 1: Database Setup

### MongoDB Atlas Setup (for CMS)

- [ ] **1.1** Log in to [MongoDB Atlas](https://www.mongodb.com/atlas)
- [ ] **1.2** Create new project: "Epic Startup CMS"
- [ ] **1.3** Create M0 Sandbox cluster (free tier)
  - [ ] Choose region closest to your Fly.io region
  - [ ] Name: `epic-startup-cms`
- [ ] **1.4** Create database user
  - [ ] Username: `cms-user`
  - [ ] Generate secure password (save it!)
  - [ ] Privileges: "Read and write to any database"
- [ ] **1.5** Configure network access
  - [ ] Add IP: `0.0.0.0/0` (allow from anywhere)
- [ ] **1.6** Get connection string
  - [ ] Go to Clusters → Connect → Connect your application
  - [ ] Copy connection string
  - [ ] Replace `<password>` with actual password
  - [ ] Save for later:
        `mongodb+srv://cms-user:PASSWORD@epic-startup-cms.xxxxx.mongodb.net/?retryWrites=true&w=majority`

---

## 🚀 Step 2: Create Fly.io Applications

### Create All Applications

- [ ] **2.1** Create main app (production)
  ```bash
  flyctl apps create epic-startup --org your-org-name
  ```
- [ ] **2.2** Create main app (staging)
  ```bash
  flyctl apps create epic-startup-staging --org your-org-name
  ```
- [ ] **2.3** Create admin app (production)
  ```bash
  flyctl apps create epic-startup-admin --org your-org-name
  ```
- [ ] **2.4** Create admin app (staging)
  ```bash
  flyctl apps create epic-startup-admin-staging --org your-org-name
  ```
- [ ] **2.5** Create CMS app (production)
  ```bash
  flyctl apps create epic-startup-cms --org your-org-name
  ```
- [ ] **2.6** Create CMS app (staging)
  ```bash
  flyctl apps create epic-startup-cms-staging --org your-org-name
  ```

### Verify Applications Created

- [ ] **2.7** List all apps to verify
  ```bash
  flyctl apps list
  ```
  Should show 6 apps: main, admin, cms (each with production + staging)

---

## 💾 Step 3: Set Up Storage

### Create Volumes for Main/Admin Apps (SQLite + LiteFS)

- [ ] **3.1** Main app production volume
  ```bash
  flyctl volumes create data --region sjc --size 3 --app epic-startup
  ```
- [ ] **3.2** Main app staging volume
  ```bash
  flyctl volumes create data --region sjc --size 3 --app epic-startup-staging
  ```
- [ ] **3.3** Admin app production volume
  ```bash
  flyctl volumes create data --region sjc --size 3 --app epic-startup-admin
  ```
- [ ] **3.4** Admin app staging volume
  ```bash
  flyctl volumes create data --region sjc --size 3 --app epic-startup-admin-staging
  ```

### Note: CMS Apps Don't Need Volumes

CMS apps use MongoDB Atlas (cloud database), so no local volumes needed.

---

## 🔗 Step 4: Configure Database Coordination

### Set Up Consul for Main/Admin Apps

- [ ] **4.1** Attach Consul to main app (production)
  ```bash
  flyctl consul attach --app epic-startup
  ```
- [ ] **4.2** Attach Consul to main app (staging)
  ```bash
  flyctl consul attach --app epic-startup-staging
  ```
- [ ] **4.3** Attach Consul to admin app (production)
  ```bash
  flyctl consul attach --app epic-startup-admin
  ```
- [ ] **4.4** Attach Consul to admin app (staging)
  ```bash
  flyctl consul attach --app epic-startup-admin-staging
  ```

### Verify Consul Setup

- [ ] **4.5** Check Consul status
  ```bash
  flyctl consul show --app epic-startup
  ```

---

## 🔐 Step 5: Configure Environment Variables

### Main App Environment Variables

#### Production Main App

- [ ] **5.1** Set main app production secrets
  ```bash
  flyctl secrets set \
    SESSION_SECRET="$(openssl rand -hex 32)" \
    ENCRYPTION_KEY="$(openssl rand -hex 32)" \
    SSO_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
    INTEGRATION_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
    DATABASE_URL="file:/litefs/data/sqlite.db" \
    CACHE_DATABASE_URL="file:/litefs/data/cache.db" \
    INTERNAL_COMMAND_TOKEN="$(openssl rand -hex 32)" \
    --app epic-startup
  ```

#### Staging Main App

- [ ] **5.2** Set main app staging secrets
  ```bash
  flyctl secrets set \
    SESSION_SECRET="$(openssl rand -hex 32)" \
    ENCRYPTION_KEY="$(openssl rand -hex 32)" \
    SSO_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
    INTEGRATION_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
    DATABASE_URL="file:/litefs/data/sqlite.db" \
    CACHE_DATABASE_URL="file:/litefs/data/cache.db" \
    INTERNAL_COMMAND_TOKEN="$(openssl rand -hex 32)" \
    --app epic-startup-staging
  ```

### Admin App Environment Variables

#### Production Admin App

- [ ] **5.3** Set admin app production secrets (use same secrets as main app)
  ```bash
  flyctl secrets set \
    SESSION_SECRET="$(flyctl secrets list --app epic-startup | grep SESSION_SECRET | awk '{print $2}')" \
    ENCRYPTION_KEY="$(flyctl secrets list --app epic-startup | grep ENCRYPTION_KEY | awk '{print $2}')" \
    SSO_ENCRYPTION_KEY="$(flyctl secrets list --app epic-startup | grep SSO_ENCRYPTION_KEY | awk '{print $2}')" \
    INTEGRATION_ENCRYPTION_KEY="$(flyctl secrets list --app epic-startup | grep INTEGRATION_ENCRYPTION_KEY | awk '{print $2}')" \
    DATABASE_URL="file:/litefs/data/sqlite.db" \
    CACHE_DATABASE_URL="file:/litefs/data/cache.db" \
    INTERNAL_COMMAND_TOKEN="$(openssl rand -hex 32)" \
    --app epic-startup-admin
  ```

#### Staging Admin App

- [ ] **5.4** Set admin app staging secrets (use same secrets as staging main
      app)
  ```bash
  flyctl secrets set \
    SESSION_SECRET="$(flyctl secrets list --app epic-startup-staging | grep SESSION_SECRET | awk '{print $2}')" \
    ENCRYPTION_KEY="$(flyctl secrets list --app epic-startup-staging | grep ENCRYPTION_KEY | awk '{print $2}')" \
    SSO_ENCRYPTION_KEY="$(flyctl secrets list --app epic-startup-staging | grep SSO_ENCRYPTION_KEY | awk '{print $2}')" \
    INTEGRATION_ENCRYPTION_KEY="$(flyctl secrets list --app epic-startup-staging | grep INTEGRATION_ENCRYPTION_KEY | awk '{print $2}')" \
    DATABASE_URL="file:/litefs/data/sqlite.db" \
    CACHE_DATABASE_URL="file:/litefs/data/cache.db" \
    INTERNAL_COMMAND_TOKEN="$(openssl rand -hex 32)" \
    --app epic-startup-admin-staging
  ```

### CMS App Environment Variables

#### Production CMS App

- [ ] **5.5** Set CMS production secrets (use MongoDB connection string from
      Step 1.6)
  ```bash
  flyctl secrets set \
    DATABASE_URI="mongodb+srv://cms-user:YOUR_PASSWORD@epic-startup-cms.xxxxx.mongodb.net/epic-cms-prod?retryWrites=true&w=majority" \
    PAYLOAD_SECRET="$(openssl rand -hex 32)" \
    NEXT_PUBLIC_SERVER_URL="https://epic-startup-cms.fly.dev" \
    CRON_SECRET="$(openssl rand -hex 32)" \
    PREVIEW_SECRET="$(openssl rand -hex 32)" \
    WEB_APP_URL="https://epic-startup.me" \
    NEXT_PUBLIC_WEB_APP_URL="https://epic-startup.me" \
    USE_S3_STORAGE="false" \
    --app epic-startup-cms
  ```

#### Staging CMS App

- [ ] **5.6** Set CMS staging secrets
  ```bash
  flyctl secrets set \
    DATABASE_URI="mongodb+srv://cms-user:YOUR_PASSWORD@epic-startup-cms.xxxxx.mongodb.net/epic-cms-staging?retryWrites=true&w=majority" \
    PAYLOAD_SECRET="$(openssl rand -hex 32)" \
    NEXT_PUBLIC_SERVER_URL="https://epic-startup-cms-staging.fly.dev" \
    CRON_SECRET="$(openssl rand -hex 32)" \
    PREVIEW_SECRET="$(openssl rand -hex 32)" \
    WEB_APP_URL="https://epic-startup-staging.fly.dev" \
    NEXT_PUBLIC_WEB_APP_URL="https://epic-startup-staging.fly.dev" \
    USE_S3_STORAGE="false" \
    --app epic-startup-cms-staging
  ```

### Verify Environment Variables

- [ ] **5.7** Check secrets are set correctly
  ```bash
  flyctl secrets list --app epic-startup
  flyctl secrets list --app epic-startup-admin
  flyctl secrets list --app epic-startup-cms
  ```

---

## 🔧 Step 6: Configure GitHub Actions

### Set Up GitHub Secrets

- [ ] **6.1** Get Fly.io API token
  ```bash
  flyctl auth token
  ```
- [ ] **6.2** Add GitHub repository secrets
  - Go to GitHub → Repository → Settings → Secrets and variables → Actions
  - [ ] Add `FLY_API_TOKEN` (from step 6.1)
  - [ ] Add `SENTRY_AUTH_TOKEN` (optional, for error tracking)

### Verify GitHub Actions Configuration

- [ ] **6.3** Check `.github/workflows/deploy.yml` includes all apps
  - [ ] `container-app` job exists
  - [ ] `container-admin` job exists
  - [ ] `container-cms` job exists
  - [ ] `deploy-app` job exists
  - [ ] `deploy-admin` job exists
  - [ ] `deploy-cms` job exists
  - [ ] `affected` job detects changes for all apps

---

## 🚢 Step 7: Deploy to Staging

### Initial Staging Deployment

- [ ] **7.1** Commit all changes
  ```bash
  git add .
  git commit -m "feat: configure deployment for all apps"
  ```
- [ ] **7.2** Push to dev branch (triggers staging deployment)
  ```bash
  git checkout dev
  git push origin dev
  ```

### Monitor Staging Deployment

- [ ] **7.3** Watch GitHub Actions workflow
  - Go to GitHub → Actions tab
  - Monitor the deployment progress
- [ ] **7.4** Check individual app logs
  ```bash
  flyctl logs --app epic-startup-staging
  flyctl logs --app epic-startup-admin-staging
  flyctl logs --app epic-startup-cms-staging
  ```

### Verify Staging Apps

- [ ] **7.5** Check app status
  ```bash
  flyctl status --app epic-startup-staging
  flyctl status --app epic-startup-admin-staging
  flyctl status --app epic-startup-cms-staging
  ```
- [ ] **7.6** Get staging URLs
  ```bash
  flyctl info --app epic-startup-staging
  flyctl info --app epic-startup-admin-staging
  flyctl info --app epic-startup-cms-staging
  ```

---

## 🧪 Step 8: Test Staging Environment

### Test Main App

- [ ] **8.1** Visit main app URL
- [ ] **8.2** Test user registration/login
- [ ] **8.3** Create test data
- [ ] **8.4** Verify database operations work

### Test Admin App

- [ ] **8.5** Visit admin app URL
- [ ] **8.6** Login with same credentials as main app
- [ ] **8.7** Verify shared data appears from main app
- [ ] **8.8** Create admin-specific data

### Test CMS App

- [ ] **8.9** Visit CMS admin: `https://epic-startup-cms-staging.fly.dev/admin`
- [ ] **8.10** Complete CMS setup wizard
- [ ] **8.11** Create test content (posts, pages)
- [ ] **8.12** Test API endpoints:
      `https://epic-startup-cms-staging.fly.dev/api/posts`

### Test Database Sharing (Main/Admin)

- [ ] **8.13** Create data in main app
- [ ] **8.14** Verify data appears in admin app
- [ ] **8.15** Create data in admin app
- [ ] **8.16** Verify data appears in main app

### Test LiteFS Coordination

- [ ] **8.17** Check which app is primary
  ```bash
  flyctl ssh console --app epic-startup-staging
  curl http://localhost:20202/debug
  ```
- [ ] **8.18** Verify database replication is working

---

## 🚀 Step 9: Deploy to Production

### Production Deployment

- [ ] **9.1** Merge dev to main (triggers production deployment)
  ```bash
  git checkout main
  git merge dev
  git push origin main
  ```

### Monitor Production Deployment

- [ ] **9.2** Watch GitHub Actions workflow
- [ ] **9.3** Check production app logs
  ```bash
  flyctl logs --app epic-startup
  flyctl logs --app epic-startup-admin
  flyctl logs --app epic-startup-cms
  ```

### Verify Production Apps

- [ ] **9.4** Check all apps are running
  ```bash
  flyctl status --app epic-startup
  flyctl status --app epic-startup-admin
  flyctl status --app epic-startup-cms
  ```
- [ ] **9.5** Get production URLs
  ```bash
  flyctl info --app epic-startup
  flyctl info --app epic-startup-admin
  flyctl info --app epic-startup-cms
  ```

---

## ✅ Step 10: Final Verification

### Test Production Environment

- [ ] **10.1** Test main app functionality
- [ ] **10.2** Test admin app functionality
- [ ] **10.3** Test CMS app functionality
- [ ] **10.4** Verify database sharing between main/admin
- [ ] **10.5** Test CMS API endpoints
- [ ] **10.6** Verify all apps can handle traffic

### Performance Checks

- [ ] **10.7** Check app response times
- [ ] **10.8** Monitor resource usage
  ```bash
  flyctl metrics --app epic-startup
  flyctl metrics --app epic-startup-admin
  flyctl metrics --app epic-startup-cms
  ```

### Security Verification

- [ ] **10.9** Verify HTTPS is working on all apps
- [ ] **10.10** Check that database connections are secure
- [ ] **10.11** Verify environment variables are not exposed

---

## 🔧 Step 11: Optional Configuration

### Custom Domains (Optional)

- [ ] **11.1** Add custom domain to main app
  ```bash
  flyctl certs create yourdomain.com --app epic-startup
  ```
- [ ] **11.2** Add custom domain to admin app
  ```bash
  flyctl certs create admin.yourdomain.com --app epic-startup-admin
  ```
- [ ] **11.3** Add custom domain to CMS app
  ```bash
  flyctl certs create cms.yourdomain.com --app epic-startup-cms
  ```

### Scaling (Optional)

- [ ] **11.4** Scale main app for high availability
  ```bash
  flyctl scale count 2 --app epic-startup
  ```
- [ ] **11.5** Keep admin and CMS on single instances (typically sufficient)

### Monitoring Setup (Optional)

- [ ] **11.6** Set up Fly.io monitoring alerts
  ```bash
  flyctl alerts create --app epic-startup
  ```

---

## 📊 Deployment Summary

### Applications Deployed

✅ **Website**: Cloudflare Pages (Astro)  
✅ **Main App**: `epic-startup` + `epic-startup-staging`  
✅ **Admin App**: `epic-startup-admin` + `epic-startup-admin-staging`  
✅ **CMS App**: `epic-startup-cms` + `epic-startup-cms-staging`

### Database Architecture

✅ **Main/Admin Apps**: Shared SQLite with LiteFS replication  
✅ **CMS App**: MongoDB Atlas (separate database)

### Deployment Pipeline

✅ **Staging**: Automatic deployment on push to `dev` branch  
✅ **Production**: Automatic deployment on push to `main` branch

---

## 💰 Cost Breakdown

| Service              | Monthly Cost | Notes                  |
| -------------------- | ------------ | ---------------------- |
| **Fly.io Apps**      | $15-30       | 6 small instances      |
| **MongoDB Atlas**    | $0           | M0 Sandbox (free tier) |
| **Cloudflare Pages** | $0           | Free tier              |
| **Total**            | **$15-30**   | Very cost effective    |

---

## 🛠️ Troubleshooting Checklist

### If Apps Won't Start

- [ ] Check logs: `flyctl logs --app [app-name]`
- [ ] Verify environment variables are set
- [ ] Check Dockerfile builds locally
- [ ] Verify volumes are attached (main/admin apps only)

### If Database Sharing Doesn't Work

- [ ] Verify Consul is attached to both main/admin apps
- [ ] Check both apps use same Consul key in litefs.yml
- [ ] Monitor LiteFS logs for coordination issues
- [ ] Verify volumes are properly mounted

### If CMS Won't Connect to MongoDB

- [ ] Test MongoDB connection string locally
- [ ] Verify MongoDB Atlas network access settings
- [ ] Check DATABASE_URI environment variable
- [ ] Verify MongoDB user permissions

### If Deployments Fail

- [ ] Check GitHub Actions logs
- [ ] Verify FLY_API_TOKEN is set in GitHub secrets
- [ ] Ensure all fly.toml files are correct
- [ ] Check Docker build context in workflows

---

## 🎉 Success!

**Congratulations!** You've successfully deployed your complete Epic Stack to
production:

🌐 **Website**: Fast static site on Cloudflare's global CDN  
⚡ **Main App**: Scalable React Router app with SQLite  
🔧 **Admin App**: Powerful admin interface sharing the same data  
📝 **CMS**: Flexible content management with MongoDB

Your applications are now running in production with:

- ✅ Automatic deployments via GitHub Actions
- ✅ Separate staging and production environments
- ✅ Shared database between main and admin apps
- ✅ Scalable, cost-effective infrastructure
- ✅ Global CDN for fast content delivery

**Next Steps**: Monitor your applications, set up custom domains, and start
building amazing features! 🚀
