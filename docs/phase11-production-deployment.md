# Kanhaiya General Store — Phase 11: Production Deployment & Controlled Launch

**Document Version:** 1.0.0  
**Date:** October 12, 2026  
**Lead Engineer & DevOps Lead:** Antigravity Engineering & QA Agent  
**Target Environments:** Render (Backend API), Netlify / Vercel (Customer PWA), Google Play Console (Android App), MongoDB Atlas (Database)  
**Deployment Status:** **DEPLOYMENT PREPARED — NOT LIVE**

---

## 1. Executive Summary & Architecture Overview

Phase 11 finalizes the end-to-end production deployment architecture for the **Kanhaiya General Store** e-commerce platform following the successful completion and verification of Phases 1 through 10. All codebases, build artifacts, infrastructure blueprints, and security constraints have been tested and verified across all layers:

- **Backend API Service:** Node.js 20 LTS, Express, TypeScript, Mongoose ODM, PDFKit invoice generator, and Helmet security middleware. Hosted on **Render** (Singapore / `sin` region for minimal latency to India).
- **Customer Web Application (iPhone PWA):** React 18, TypeScript, Vite, Tailwind CSS, Workbox offline caching. Hosted on **Netlify** or **Vercel** with global CDN edge caching.
- **Android Mobile Application:** Flutter 3, Dart, Riverpod state management. Prepared for Google Play Internal Testing Track (`.aab`) and direct APK testing.
- **Database:** MongoDB Atlas M10+ replica set with TLS 1.2+ encryption in transit, disk encryption at rest, connection pooling, and continuous automated backup snapshots.
- **Authentication & Authorization:** Firebase Authentication integrated with server-side Admin SDK verification. Administrator privileges are strictly restricted to `kanhaiyaastore@gmail.com`.
- **Media Assets & Image Delivery:** Cloudinary CDN with transformations restricted to the `kanhaiya_store/` namespace.

---

## 2. Pre-Deployment Release Gate

The pre-deployment release gate validates that all critical security, financial, and quality requirements have passed before any live production traffic is allowed.

| Gate ID | Verification Item | Required Standard | Status | Evidence / Notes |
| --- | --- | --- | --- | --- |
| **GATE-01** | Phase 10 Automated Test Suite | 100% Pass Rate across all suites | **PASS** | 132/132 backend Vitest tests passed; 26/26 Flutter tests passed. |
| **GATE-02** | TypeScript & Static Analysis | Zero compile or type errors | **PASS** | `npx tsc --noEmit` clean (0 errors); `flutter analyze` clean (0 warnings). |
| **GATE-03** | PWA Production Bundle Build | Clean build under 250 KB JS | **PASS** | `vite build` completed: 105.7 KB JS / 1.61 KB CSS (gzipped). |
| **GATE-04** | Security Audit Findings | Zero Critical or High unresolved items | **PASS** | All Phase 9 vulnerabilities remediated (NoSQL sanitization, IDOR checks, CORS). |
| **GATE-05** | Financial & Inventory Integrity | Server-side price & stock recalculation | **PASS** | Client-manipulated prices/quantities rejected; atomic stock updates with rollback. |
| **GATE-06** | Administrator Authorization | Role strictly enforced on backend | **PASS** | Only `kanhaiyaastore@gmail.com` can perform admin tasks; non-admin calls return 403. |
| **GATE-07** | Invoice Access Control | Private order access restricted | **PASS** | Customers can only download their own invoices; guest orders require session tokens. |
| **GATE-08** | Environment Configuration | Secrets decoupled from source code | **PASS** | `.env.example` templates created for Backend & PWA; zero secrets committed. |
| **GATE-09** | Database Backup & Restore Plan | Documented point-in-time recovery | **PASS** | Atlas continuous backup & mongorestore procedures documented. |
| **GATE-10** | Android Signing & Packaging | Release configuration ready | **PASS** | `key.properties.example` created; `build.gradle.kts` release signing configured. |
| **GATE-11** | Live Hosting Credentials | Active Render, Atlas, Netlify tokens | **BLOCKED** | Live cloud account credentials must be provided by store owner to execute live push. |

---

## 3. Production Backend Deployment — Render

### Configuration Blueprint (`render.yaml`)

The backend API is configured as a persistent web service via Render Blueprint specifications located at [`render.yaml`](file:///e:/Kanhaiya%20Store%20App/render.yaml) and [`backend/render.yaml`](file:///e:/Kanhaiya%20Store%20App/backend/render.yaml).

```yaml
version: "1"
services:
  - type: web
    name: kanhaiya-store-api
    runtime: node
    region: singapore
    plan: starter
    rootDir: backend
    buildCommand: npm ci && npm run build
    startCommand: npm start
    healthCheckPath: /api/v1/health
    autoDeploy: true
```

### Build & Runtime Execution

- **Node.js Engine:** Node.js 20.x LTS.
- **Build Command:** `npm ci && npm run build` (runs TypeScript compiler `tsc`, generating `backend/dist`).
- **Start Command:** `npm start` (executes `node dist/server.js`).
- **Port Binding:** Dynamically binds to `process.env.PORT` (Render default is `10000`, local fallback is `5000`).

### Production Environment Variables (Render Dashboard)

Configure the following variables securely in the **Environment** tab of the Render service dashboard:

| Variable Name | Required Value / Format | Exposure Level | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | `production` | Server-only | Enables production logging and strict error masking. |
| `PORT` | `5000` | Server-only | Application listen port. |
| `MONGODB_URI` | `mongodb+srv://kanhaiya_user:<PASSWORD>@cluster0.mongodb.net/kanhaiya_store_prod?retryWrites=true&w=majority` | Server-only | Atlas production connection string. |
| `CORS_ORIGIN` | `https://kanhaiyastore.com,https://kanhaiya-store.netlify.app` | Server-only | Comma-separated list of authorized web origins. |
| `JWT_SECRET` | 64+ char random hex string | Server-only | Cryptographic key for signing customer and guest session JWTs. |
| `ADMIN_ALLOWED_EMAILS` | `kanhaiyaastore@gmail.com` | Server-only | Authoritative administrator email allowlist. |
| `FIREBASE_PROJECT_ID` | `kanhaiya-store-prod` | Server-only | Google Cloud / Firebase Project ID. |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk@kanhaiya-store-prod.iam.gserviceaccount.com` | Server-only | Service account client email. |
| `FIREBASE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` | Server-only | Service account private key formatted with literal `\n`. |
| `CLOUDINARY_CLOUD_NAME` | `kanhaiya-store` | Server-only | Production Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | `<CLOUDINARY_KEY>` | Server-only | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | `<CLOUDINARY_SECRET>` | Server-only | Cloudinary API secret. |
| `STORE_NAME` | `Kanhaiya General Store` | Server-only | Authoritative business trading name. |
| `STORE_PHONE` | `+919876543210` | Server-only | Primary contact phone number. |
| `STORE_WHATSAPP` | `+919876543210` | Server-only | WhatsApp ordering and payment confirmation number. |
| `STORE_UPI_ID` | `kanhaiyastore@upi` | Server-only | UPI VPA for manual payment receipts. |

### Health Check & Redaction Protections

The backend exposes two health endpoints:

- `GET /api/v1/health`
- `GET /health` (root alias for cloud load balancers)

Both endpoints return:

```json
{
  "success": true,
  "message": "Kanhaiya General Store API is healthy",
  "data": {
    "status": "ok",
    "timestamp": "2026-10-12T16:15:00.000Z",
    "uptimeSeconds": 1420,
    "database": "connected",
    "environment": "production",
    "version": "1.0.0"
  }
}
```

**Security Rule:** Health check responses strictly redact database connection strings, credentials, and service accounts.

### Graceful Shutdown & Connection Pooling

The backend handles termination signals (`SIGTERM` and `SIGINT`):

1. Stops accepting new inbound HTTP requests.
2. Waits up to 10 seconds for in-flight requests to complete.
3. Disconnects cleanly from MongoDB via `mongoose.disconnect()`.
4. Exits with code `0`.
5. Connection pool is configured with `maxPoolSize: 10`, `minPoolSize: 2`, and `serverSelectionTimeoutMS: 5000` to prevent socket exhaustion on shared Atlas clusters.

---

## 4. MongoDB Atlas Production Configuration

### Cluster Specifications

- **Tier:** Dedicated M10 cluster (or higher) recommended for production workloads; M0/M2 for staging verification.
- **Region:** AWS `ap-south-1` (Mumbai) or GCP `asia-south1` (Mumbai) for ultra-low latency (< 15ms) to India.
- **Database Name:** `kanhaiya_store_prod` (isolated from `kanhaiya_store_dev` and `kanhaiya_store_test`).

### Least-Privilege Database User

Create a dedicated database user specifically for the Render backend service:

- **Username:** `app_backend_prod`
- **Authentication Method:** SCRAM-SHA-256 with a 32-character random password.
- **Database Privileges:** `readWrite` on database `kanhaiya_store_prod` only. Do **NOT** assign `atlasAdmin` or cluster-wide roles.

### Network Access Restrictions

1. **Static IP Configuration (Preferred):** If using Render's Static Outbound IP add-on, whitelist only those specific IP addresses in Atlas **Network Access**.
2. **Dynamic Cloud Hosting Rule:** If using standard Render instances where outbound IPs are dynamic, add `0.0.0.0/0` with compensating controls:
   - Strong, rotated database user password.
   - Enforce TLS 1.2+ encryption for all incoming connections.
   - IP access comment: `Render API Backend (Compensated via SCRAM-SHA-256 + TLS)`.

### Production Indexes & Unique Constraints

Ensure all schema indexes are built before routing customer traffic:

- `products`: `{ slug: 1 }` (unique), `{ category: 1 }`, `{ isPublished: 1 }`, `{ name: "text", description: "text" }`.
- `categories`: `{ slug: 1 }` (unique), `{ order: 1 }`.
- `orders`: `{ orderNumber: 1 }` (unique), `{ customerId: 1 }`, `{ paymentStatus: 1 }`, `{ orderStatus: 1 }`, `{ createdAt: -1 }`.
- `stock_movements`: `{ productId: 1, createdAt: -1 }`.
- `inventory_alerts`: `{ productId: 1, isResolved: 1 }`.
- `users`: `{ firebaseUid: 1 }` (unique), `{ email: 1 }`.
- `idempotency`: `{ idempotencyKey: 1 }` (unique, TTL 24h).

### Prohibited Operations

- **Never** execute `npm run seed` against the production database.
- **Never** drop collections or run destructive schema alterations without a pre-migration backup.
- **Never** write synthetic or mock test transactions to `kanhaiya_store_prod`.

### Backup Schedule & Disaster Recovery

- **Continuous Backup:** Atlas Cloud Backups enabled with continuous snapshot retention (7 days daily, 4 weeks weekly).
- **Manual Snapshot Before Deployment:** Click **Clusters** $\rightarrow$ **Backup** $\rightarrow$ **Take Snapshot Now** before executing any production schema change.
- **Restoration Runbook:**
  1. Go to **Database** $\rightarrow$ **Backup** in the Atlas Console.
  2. Select the desired restore snapshot point.
  3. Select **Restore to a New Cluster** (e.g. `kanhaiya-store-restored-temp`).
  4. Validate collection count and financial integrity on the temporary cluster.
  5. Update the `MONGODB_URI` environment variable in Render to point to the restored cluster only after full validation.

---

## 5. Production Frontend Deployment — Netlify or Vercel

The customer-facing React PWA is located in [`apps/customer_pwa`](file:///e:/Kanhaiya%20Store%20App/apps/customer_pwa) and is pre-configured for deployment to Netlify or Vercel.

### Deployment Configuration Files

1. **Netlify Manifest ([`apps/customer_pwa/netlify.toml`](file:///e:/Kanhaiya%20Store%20App/apps/customer_pwa/netlify.toml)):**
   - Configures build command `npm run build` and publish directory `dist`.
   - Injects security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
   - Injects cache headers: `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`.
   - Forces no-cache on `/sw.js` and `/registerSW.js` to ensure immediate service worker updates.
2. **Netlify SPA Redirects ([`apps/customer_pwa/public/_redirects`](file:///e:/Kanhaiya%20Store%20App/apps/customer_pwa/public/_redirects)):**
   - `/* /index.html 200` ensures direct URL access and browser refreshes on sub-routes (`/cart`, `/orders`, `/categories`) resolve without 404 errors.
3. **Vercel Manifest ([`apps/customer_pwa/vercel.json`](file:///e:/Kanhaiya%20Store%20App/apps/customer_pwa/vercel.json)):**
   - Provides equivalent routing rewrites and security header rules for teams selecting Vercel.

### PWA Environment Variables

Configure in the Netlify / Vercel dashboard:

| Variable | Production Value | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `https://api.kanhaiyastore.com/api/v1` | Points frontend fetch calls to production backend. |
| `VITE_USE_MOCK_ONLY` | `false` | Disables mock repository mode; connects to real live API. |

### Caching & Security Protections

- **Workbox Configuration:** Pre-caches static assets (`.js`, `.css`, `.png`, `.svg`, `index.html`).
- **Private Data Isolation:** `navigateFallbackDenylist: [/^\/api\//]` prevents any client-side routing fallback from masking API requests.
- **No Secret Exposure:** Verified that zero database strings, private keys, or admin secrets exist in `import.meta.env` or the compiled JavaScript bundle.

---

## 6. Domain, DNS and HTTPS Configuration

### Hostname Architecture

| Hostname | Target Service | Hosting Provider | DNS Record Type | Target Value |
| --- | --- | --- | --- | --- |
| `kanhaiyastore.com` | Customer Web App (Apex) | Netlify / Vercel | `A` or `ALIAS` / `ANAME` | Netlify Apex IP (`75.2.60.5`) or host CNAME |
| `www.kanhaiyastore.com` | Customer Web App (Subdomain) | Netlify / Vercel | `CNAME` | `kanhaiya-store.netlify.app` |
| `api.kanhaiyastore.com` | Backend REST API | Render | `CNAME` | `kanhaiya-store-api.onrender.com` |

### DNS & SSL/TLS Verification Steps

1. In the domain registrar (e.g., Cloudflare, GoDaddy, Namecheap):
   - Add `CNAME` for `api` pointing to the Render service URL.
   - Add `CNAME` for `www` pointing to the Netlify / Vercel site URL.
   - Set up root domain forwarding or `ALIAS` record for `kanhaiyastore.com`.
2. **SSL/TLS Certificates:** Both Render and Netlify/Vercel provision automated, free Let's Encrypt SSL/TLS certificates and renew them automatically every 90 days.
3. **HTTPS Redirection:** Automatic HTTP $\rightarrow$ HTTPS redirection is enabled by default across both hosts.
4. **CORS Alignment:** Ensure `CORS_ORIGIN` in Render contains the exact final domain: `https://kanhaiyastore.com,https://www.kanhaiyastore.com`.

---

## 7. Firebase Production Configuration

### Project Settings

- **Production Project:** Dedicated Google Cloud / Firebase project (e.g., `kanhaiya-store-prod`).
- **Web App Settings:** Register web application in Firebase Console $\rightarrow$ Project Settings.
- **Authorized Domains:** Add `kanhaiyastore.com`, `www.kanhaiyastore.com`, and the Netlify/Vercel subdomain to **Authentication** $\rightarrow$ **Settings** $\rightarrow$ **Authorized Domains**.

### Admin SDK & Role Enforcement

- **Service Account Key:** Generate a new private key from **Project Settings** $\rightarrow$ **Service Accounts** $\rightarrow$ **Generate New Private Key**.
- **Server-Side Storage:** Store strictly in Render environment variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).
- **Role Boundary:** The backend checks the user's verified Firebase email against `ADMIN_ALLOWED_EMAILS`. Only `kanhaiyaastore@gmail.com` receives the `ADMIN` role. Regular Google Sign-In users and anonymous users receive the `CUSTOMER` role.
- **Guest Browsing Preservation:** Guest browsing and order placement via mobile number do not require Google login.

---

## 8. Cloudinary Production Configuration

### Asset Management & Namespace Protection

- **Cloud Name:** Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in Render.
- **Namespace Boundary:** The backend strictly restricts uploads and asset deletions to the `kanhaiya_store/products` and `kanhaiya_store/categories` folders.
- **HTTPS Image Delivery:** All uploaded image URLs are served over HTTPS with automatic format and quality optimization (`f_auto,q_auto`).
- **Fallback Behavior:** If an image fails to load or is missing, the frontend displays fallback grocery category icons.

---

## 9. Store Configuration & Business Readiness

The following authoritative operational parameters are hardcoded and verified in store settings:

- **Store Name:** Kanhaiya General Store
- **Store Tagline:** Fresh Essentials & Daily Groceries at Wholesale Rates
- **Physical Address:** Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh
- **Store Contact Phone:** `+91 9936269347`
- **WhatsApp Support & Orders:** `+91 9936269347`
- **Store UPI ID:** `kanhaiyastore@upi`
- **FSSAI Number:** `12722046000057`
- **GSTIN / UIN:** `09ANBPL4077E1Z1`
- **PAN / IT No:** `ANBPL4077E`
- **State Name & Code:** Uttar Pradesh (Code: 09)
- **Allowed Payment Methods:**
  1. **Cash on Delivery (COD):** Handled as pay-at-counter in-store pickup or local handover.
  2. **Manual WhatsApp QR:** Customer transfers via UPI and sends screenshot; store admin confirms via `/verify-payment`.
- **Invoices:** Invoices generate sequential invoice numbers (`INV-YYYYMM-XXXX`) displaying store address, FSSAI No., GSTIN, PAN, and State code.

---

## 10. Android Release Preparation

The Flutter application is located in [`apps/customer_flutter`](file:///e:/Kanhaiya%20Store%20App/apps/customer_flutter).

### App Identity & Manifest

- **Package / Application ID:** `com.kanhaiya.store.customer_flutter`
- **Launcher Label:** `Kanhaiya General Store`
- **Permissions:** `<uses-permission android:name="android.permission.INTERNET"/>` in [`AndroidManifest.xml`](file:///e:/Kanhaiya%20Store%20App/apps/customer_flutter/android/app/src/main/AndroidManifest.xml).
- **Target SDK:** Android 34 (Android 14).
- **Min SDK:** Android 21 (Lollipop).

### Production Signing Configuration

Release signing is configured in [`apps/customer_flutter/android/app/build.gradle.kts`](file:///e:/Kanhaiya%20Store%20App/apps/customer_flutter/android/app/build.gradle.kts) to automatically read from `key.properties`:

1. Generate an upload keystore:

   ```bash
   keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```

2. Copy the template [`apps/customer_flutter/android/key.properties.example`](file:///e:/Kanhaiya%20Store%20App/apps/customer_flutter/android/key.properties.example) to `key.properties`:

   ```properties
   storePassword=YOUR_SECURE_KEYSTORE_PASSWORD
   keyPassword=YOUR_SECURE_KEY_PASSWORD
   keyAlias=upload
   storeFile=upload-keystore.jks
   ```

3. Build the Google Play Android App Bundle (`.aab`):

   ```bash
   cd apps/customer_flutter
   flutter build appbundle --release \
     --dart-define=API_BASE_URL=https://api.kanhaiyastore.com/api/v1 \
     --dart-define=USE_MOCK_REPO=false
   ```

4. Build a direct test APK for internal sideload testing:

   ```bash
   flutter build apk --release \
     --dart-define=API_BASE_URL=https://api.kanhaiyastore.com/api/v1 \
     --dart-define=USE_MOCK_REPO=false
   ```

---

## 11. Controlled Rollout Strategy

A staged rollout minimizes risk by verifying each component before routing user traffic:

```mermaid
graph TD
  A[Step 1: Deploy Backend to Render] --> B[Step 2: Verify Health Check & Atlas DB]
  B --> C[Step 3: Verify Firebase Admin Auth]
  C --> D[Step 4: Deploy PWA to Netlify Preview]
  D --> E[Step 5: Run Automated Smoke Tests]
  E --> F[Step 6: Map Custom Domains]
  F --> G[Step 7: Sideload & Test Android APK]
  G --> H[Step 8: Upload AAB to Play Console Internal Track]
  H --> I[Step 9: Enable Customer Ordering]
  I --> J[Step 10: 24h Monitoring & Alerting]
```

1. **Step 1 — Deploy Backend to Render:** Deploy the Node.js API with production environment variables.
2. **Step 2 — Verify Health Check & Atlas DB:** Verify `GET /api/v1/health` returns `status: "ok"` and `database: "connected"`.
3. **Step 3 — Verify Firebase Admin Auth:** Test admin login with `kanhaiyaastore@gmail.com` to confirm token verification.
4. **Step 4 — Deploy PWA to Netlify Preview:** Deploy frontend to a staging URL (e.g. `kanhaiya-store-preview.netlify.app`).
5. **Step 5 — Run Automated Smoke Tests:** Execute `node backend/scripts/smoke-test.mjs <STAGING_URL>` to confirm API functionality.
6. **Step 6 — Map Custom Domains:** Point `kanhaiyastore.com` and `api.kanhaiyastore.com` to production hosts.
7. **Step 7 — Sideload & Test Android APK:** Test the release APK on physical Android test devices.
8. **Step 8 — Upload AAB to Google Play Console:** Upload `.aab` to the Internal Testing track with authorized store testers.
9. **Step 9 — Enable Customer Ordering:** Verify store open/closed status and allow live orders.
10. **Step 10 — Monitor Initial 24 Hours:** Watch server error rates, database connection counts, and log streams.

---

## 12. Production Smoke Tests

### Automated Pre-Flight & Post-Deployment Script

An automated smoke test runner is provided at [`backend/scripts/smoke-test.mjs`](file:///e:/Kanhaiya%20Store%20App/backend/scripts/smoke-test.mjs). It can be executed against any environment:

```bash
# Test local instance:
npm run smoke-test

# Test live production instance:
node backend/scripts/smoke-test.mjs https://api.kanhaiyastore.com
```

### Manual Verification Checklist

#### Backend API Verification

- [ ] `GET /api/v1/health` returns HTTP 200 with `database: "connected"`.
- [ ] `GET /health` root alias returns HTTP 200.
- [ ] `GET /api/v1/products` returns published items without requiring authentication.
- [ ] `GET /api/v1/categories` returns active category list.
- [ ] `GET /api/v1/admin/analytics/overview` returns HTTP 401/403 for unauthenticated or non-admin users.
- [ ] `GET /api/v1/orders/ORD-NONEXISTENT/invoice` returns HTTP 401/403 without valid credentials.
- [ ] Responses contain `X-Request-Id` and `X-Content-Type-Options: nosniff`.
- [ ] Server logs do not expose `MONGODB_URI`, passwords, or tokens.

#### Customer Web App (PWA) Verification

- [ ] Home page loads over HTTPS with zero console errors.
- [ ] Product categories and listings display correct prices and stock status.
- [ ] Cart updates correctly and persists across page reloads.
- [ ] Direct navigation to `/cart` and `/categories` works without 404 errors.
- [ ] PWA install prompt / Add to Home Screen functions correctly on mobile Safari and Chrome.
- [ ] Offline indicator displays appropriately when network connection is severed.

#### Android Mobile Application Verification

- [ ] Release APK / AAB installs and launches cleanly on Android 12, 13, and 14.
- [ ] Splash screen shows "Kanhaiya General Store" branding.
- [ ] Catalog browsing, search, and category filtering operate smoothly.
- [ ] Google Sign-In functions for `kanhaiyaastore@gmail.com` and displays admin controls.
- [ ] Order placement generates a confirmed order number.
- [ ] Invoice download renders PDF without crashing.

---

## 13. Monitoring, Alerting & Incident Response

### Core Metrics to Monitor

1. **API Service Health (Render):**
   - HTTP 5xx error rate (alert if > 1% over 5 minutes).
   - CPU utilization (alert if sustained > 80%).
   - Memory usage (alert if > 450 MB on Starter 512 MB plan).
   - Request latency p95 (alert if > 1,500 ms).
2. **Database Health (MongoDB Atlas):**
   - Active connections (alert if > 80% of cluster limit).
   - Replica set state changes (primary election events).
   - Disk IOPS and storage utilization.
3. **Synthetic Uptime Monitoring:**
   - Configure a free external monitor (e.g. UptimeRobot, BetterStack) to ping `https://api.kanhaiyastore.com/api/v1/health` every 60 seconds.

### Incident Response Playbooks

#### Scenario 1: Database Connectivity Loss

1. Check MongoDB Atlas cluster status at `status.mongodb.com`.
2. Verify Render IP access in Atlas **Network Access**.
3. Check Render logs for `MongooseServerSelectionError`.
4. If cluster is unreachable, restart Render service to re-initialize connection pool.

#### Scenario 2: Secret Compromise (e.g. JWT_SECRET or Cloudinary Key)

1. Immediately generate a new secret in the provider dashboard.
2. Update the environment variable in the Render Dashboard.
3. Trigger a manual deploy in Render (`Deploy latest commit`).
4. Invalidate existing user sessions (customers will seamlessly re-authenticate on next request).

#### Scenario 3: Stock Inconsistency / Double Deduction

1. Inspect the `stock_movements` collection filtered by `productId` to trace all decrements and restorations.
2. Execute an audit adjustment through the Admin Inventory screen with reason `AUDIT_CORRECTION`.
3. Verify that the order's `isInventoryRestored` flag is correctly set.

---

## 14. Backup, Rollback & Disaster Recovery

### Rollback Runbooks

#### Backend Rollback (Render)

1. Open the Render Dashboard $\rightarrow$ Select `kanhaiya-store-api`.
2. Navigate to **Events** or **Deploy History**.
3. Locate the previous stable deployment commit.
4. Click the three dots $\dots$ and select **Rollback to this deploy**.
5. Service will revert within 60–90 seconds with zero downtime.

#### Frontend Rollback (Netlify / Vercel)

1. Open the Netlify / Vercel Dashboard $\rightarrow$ Select project.
2. Navigate to **Deploys**.
3. Select the previous production deploy.
4. Click **Publish Deploy**.
5. CDN caches will update globally within seconds.

#### Database Rollback (MongoDB Atlas)

1. Open MongoDB Atlas $\rightarrow$ **Clusters** $\rightarrow$ **Backup**.
2. Select the restore point prior to the incident.
3. Restore into a new temporary cluster to verify data integrity before switching connection strings.

---

## 15. Post-Deployment Verification & Handover

### Summary of Deployment Artifacts

- **Backend Blueprint:** [`render.yaml`](file:///e:/Kanhaiya%20Store%20App/render.yaml) & [`backend/render.yaml`](file:///e:/Kanhaiya%20Store%20App/backend/render.yaml)
- **Frontend SPA Config:** [`apps/customer_pwa/netlify.toml`](file:///e:/Kanhaiya%20Store%20App/apps/customer_pwa/netlify.toml), [`apps/customer_pwa/vercel.json`](file:///e:/Kanhaiya%20Store%20App/apps/customer_pwa/vercel.json), [`apps/customer_pwa/public/_redirects`](file:///e:/Kanhaiya%20Store%20App/apps/customer_pwa/public/_redirects)
- **Frontend Environment Template:** [`apps/customer_pwa/.env.example`](file:///e:/Kanhaiya%20Store%20App/apps/customer_pwa/.env.example)
- **Android Signing Template:** [`apps/customer_flutter/android/key.properties.example`](file:///e:/Kanhaiya%20Store%20App/apps/customer_flutter/android/key.properties.example)
- **Automated Smoke Test Runner:** [`backend/scripts/smoke-test.mjs`](file:///e:/Kanhaiya%20Store%20App/backend/scripts/smoke-test.mjs)
- **QA & Testing Report:** [`docs/phase10-qa-release-report.md`](file:///e:/Kanhaiya%20Store%20App/docs/phase10-qa-release-report.md)

---

## 16. Final Deployment Status Recommendation

### Final Status: **DEPLOYMENT PREPARED — NOT LIVE**

**Rationale:**  
All codebases, build pipelines, release gates, configuration manifests, and automated smoke test suites are 100% prepared and verified locally and in CI. The system is completely ready for production launch. Because actual cloud deployment credentials (Render API token, Netlify/Vercel auth, and live MongoDB Atlas cluster credentials) are external user secrets and must not be committed to source control, the physical push to live cloud hosting can be triggered immediately by the project owner following the step-by-step instructions in this document.
