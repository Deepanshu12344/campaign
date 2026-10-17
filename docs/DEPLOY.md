# Deploying Campaigns API to Production on Render

This guide provides exact, click-by-click instructions for deploying the **Campaigns API** backend to [Render](https://render.com) using pooled PostgreSQL database connections, Supabase Storage for persistent file uploads, safe idempotent database seeding, automated smoke testing, and zero-downtime health checking.

---

## Architecture Overview

```
                                      ┌──────────────────────────────────────────┐
                                      │              Render Web Service          │
┌───────────────────────────┐         │                                          │
│   Mobile App (Expo Go)    │────────▶│  Node 22 Express Server (dist/index.js)  │
│  or Web Browser Client    │  HTTPS  │  • Trust proxy enabled                   │
└───────────────────────────┘         │  • Helmet + Rate Limiting                │
                                      │  • CORS from ALLOWED_ORIGINS             │
                                      │  • In-process background worker          │
                                      └───────┬──────────────────────────┬───────┘
                                              │                          │
                                   DATABASE_URL (port 6543)    Supabase Storage API
                                   DIRECT_URL   (port 5432)              │
                                              ▼                          ▼
                                      ┌───────────────┐          ┌───────────────┐
                                      │   PostgreSQL  │          │  Bucket CDN   │
                                      │   (Supabase)  │          │(campaign-upld)│
                                      └───────────────┘          └───────────────┘
```

---

## 1. Prerequisites

Before starting, ensure you have:
1. **GitHub Account**: Repository containing this monorepo pushed to GitHub.
2. **Supabase Account**: A free project at [supabase.com](https://supabase.com) (provides Postgres database and storage bucket).
3. **Render Account**: A free account at [render.com](https://render.com).

---

## 2. Step 1: Set Up Supabase (Database & Storage)

### A. Obtain Database Connection Strings
1. In your Supabase Dashboard, select your project.
2. Click the **Connect** button in the top navigation bar (or navigate to **Project Settings** → **Database**).
3. Under **Connection string**:
   - **Pooled connection string (`DATABASE_URL`)**:
     - Select **Transaction** mode (Port `6543`).
     - Check the box for **Use connection pooling**.
     - Format: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`
   - **Direct connection string (`DIRECT_URL`)**:
     - Select **Session** mode or direct connection (Port `5432`).
     - Format: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`
   - *Replace `[PASSWORD]` with your actual database password.*

### B. Create Storage Bucket for Uploads (Production Default)
1. In the left navigation of your Supabase Dashboard, click **Storage**.
2. Click **New bucket**.
3. **Name**: Enter `campaign-uploads`.
4. **Public bucket**: Toggle to **ON** (ensures campaign hero covers and advertising media are publicly accessible via Supabase CDN URLs).
5. **Allowed MIME types**: Leave blank or set to `image/*` (accepts JPEG, PNG, WebP).
6. **File size limit**: Set to `5 MB` (matching platform maximum file size).
7. Click **Save**.
8. Retrieve API credentials:
   - Navigate to **Project Settings** → **API**.
   - Copy the **Project URL** (e.g., `https://abcdefgh.supabase.co`) → this is `SUPABASE_URL`.
   - Under **Project API keys**, reveal and copy the `service_role` key (secret) → this is `SUPABASE_SERVICE_ROLE_KEY`.

> [!NOTE]
> Supabase Storage is the default storage driver in production. If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are unset, the API falls back to local disk (`./uploads`). If the local disk is not writable in an ephemeral container, the server starts up normally without crashing, and any file upload requests return **HTTP 503 Service Unavailable** with an actionable message while all other API endpoints remain fully functional.

---

## 3. Step 2: Deploy Web Service on Render

### Option A: 1-Click Blueprint Deploy (`render.yaml`)
1. In the Render Dashboard, click **New +** → **Blueprint**.
2. Connect your GitHub repository.
3. Render detects `render.yaml` automatically and configures:
   - **Service Name**: `campaigns-api`
   - **Runtime**: Node
   - **Plan**: Free
   - **Build Command**: `npm install && npm run build --workspace=apps/api && npm run db:migrate:prod --workspace=apps/api`
   - **Start Command**: `npm run start --workspace=apps/api`
   - **Health Check Path**: `/health`
4. Enter your secret environment variables when prompted (see table below).
5. Click **Apply**.

---

### Option B: Manual Web Service Setup
1. In the Render Dashboard, click **New +** → **Web Service**.
2. Select **Build and deploy from a Git repository** and select your repository.
3. Configure the following fields:
   - **Name**: `campaigns-api` (or your preferred name)
   - **Region**: Choose the region closest to your Supabase project (e.g., `Oregon`, `Frankfurt`)
   - **Branch**: `main`
   - **Root Directory**: leave blank (monorepo root)
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build --workspace=apps/api && npm run db:migrate:prod --workspace=apps/api
     ```
   - **Start Command**:
     ```bash
     npm run start --workspace=apps/api
     ```
   - **Plan**: `Free`
4. Click **Advanced** and set:
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: `Yes`

---

## 4. Step 3: Configure Environment Variables

In the **Environment** tab of your Render service, add the following key-value pairs:

| Environment Variable | Value / Description | Required? |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | **Yes** |
| `PORT` | `10000` (Render default) | **Yes** |
| `DATABASE_URL` | Your Supabase pooled URL (port 6543 with `?pgbouncer=true`) | **Yes** |
| `DIRECT_URL` | Your Supabase direct URL (port 5432) | **Yes** |
| `JWT_SECRET` | A secure random 32+ character string | **Yes** |
| `ALLOWED_ORIGINS` | Comma-separated allowed web origins (leave blank for mobile-only) | Optional |
| `GEMINI_API_KEY` | Your Google Gemini API key for ad copy & story assist | Optional |
| `UPLOADS_DIR` | `./uploads` (Resolved relative to app directory; never root `/`) | Optional (defaults to `./uploads`) |
| `SUPABASE_URL` | `https://[PROJECT_REF].supabase.co` | **Recommended for production** |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret service role API key | **Recommended for production** |
| `SUPABASE_STORAGE_BUCKET` | `campaign-uploads` | Optional (defaults to `campaign-uploads`) |
| `SUPABASE_BUCKET` | `campaign-uploads` | Optional (backward-compatible alias) |

Click **Save Changes**. Render will automatically trigger an initial deployment.

---

## 5. Step 4: Seed the Database

Once the deploy completes and migrations have applied:

1. In Render, navigate to your web service and click the **Shell** tab (or connect via SSH).
2. Run the safe production seed command:
   ```bash
   npm run db:seed:prod --workspace=apps/api
   ```
   - If the database is empty, it will seed all 5 demo users, 13 campaigns across 10 categories, and exact contribution records.
   - If the database already contains records, it safely aborts to protect data.
3. *To force-reset the demo database at any time:*
   ```bash
   npm run db:seed:prod --workspace=apps/api -- --force
   ```
   *(The in-app "Reset demo data" button in Admin Reviewer Control also executes this reset).*

---

## 6. Step 5: Run Smoke Verification

Run the included automated smoke test script against your newly deployed service:

```bash
# From your local terminal
./scripts/smoke.sh https://<your-service-name>.onrender.com
```

Expected output:
```
================================================================
  Running Smoke Tests Against: https://campaigns-api.onrender.com
================================================================

1. Health Check Endpoint (/health)...
 [PASS] Health check returns status ok (HTTP 200)
2. Platform Estimates Configuration (/api/v1/config/estimates)...
 [PASS] Platform estimates return fee and reach math (HTTP 200)
3. Public Campaigns Feed (/api/v1/campaigns)...
 [PASS] Campaigns feed returns list of campaigns (HTTP 200)
4. Authentication Sign-In (/api/v1/auth/sign-in)...
 [PASS] Creator sign-in succeeds with valid JWT (HTTP 200)
5. Single Campaign Detail (/api/v1/campaigns/:id)...
 [PASS] Fetches single campaign by ID (HTTP 200)
6. Transparent Contribution Quote Calculation (/api/v1/campaigns/:id/quote)...
 [PASS] Quote calculates exact breakdown: 90% ad budget ($22.50), 10% fee ($2.50), processing fee ($1.03) (HTTP 200)

================================================================
  Smoke Test Results: 6/6 passed
  Status: ALL CHECKS PASSED
================================================================
```

---

## 7. Step 6: Connect the Mobile App

1. In `apps/mobile/.env`, set `EXPO_PUBLIC_API_URL` to your deployed API:
   ```env
   EXPO_PUBLIC_API_URL=https://<your-service-name>.onrender.com/api/v1
   ```
2. Start the mobile app:
   ```bash
   npm run dev:mobile
   ```

### Cold-Start Behavior on Free Hosting
Render free-tier web services spin down after 15 minutes of inactivity. The first incoming request takes **30 to 60 seconds** to wake the instance:
- `apps/mobile` is pre-configured with a **60-second request timeout** (instead of standard 10s).
- After **8 seconds** of waiting, the mobile app automatically displays a non-blocking toast/banner:
  > **Waking up the server...**
  > Free tier instances take a moment to spin up
- Skeletons continue loading gracefully until the server responds.

---

## 8. Keeping the Service Warm Before a Demo

To prevent cold starts during a live demonstration:

### Method A: One-Minute Pre-Warm Ping
5 minutes before your demo, run this from your terminal:
```bash
curl -s https://<your-service-name>.onrender.com/health
```
Once you receive `{"status":"ok"}`, the server is warm and subsequent requests respond in under **100ms** for the next 15 minutes.

### Method B: Free Automated Keep-Warm Pingers
Use a free monitoring service like [UptimeRobot](https://uptimerobot.com) or [Cron-Job.org](https://cron-job.org):
- **URL**: `https://<your-service-name>.onrender.com/health`
- **Interval**: Every 10 minutes
- **Method**: `GET`
- *Note: Render free tier grants 750 free instance hours per month, sufficient to run one warm service continuously throughout the month.*

---

## 9. Rollback Procedure

If a deployed build introduces an issue:
1. In the Render Dashboard, click your service.
2. Navigate to the **Events** or **Deploys** tab.
3. Find the last known successful deploy.
4. Click the three dots (`...`) next to that deploy and select **Rollback to this deploy**.
5. Render immediately restores the previous build container.
