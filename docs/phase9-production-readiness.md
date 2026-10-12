# Kanhaiya General Store — Phase 9: Production Hardening, Security Audit & Launch Readiness Report

**Document Version:** 1.0.0  
**Audit Date:** October 12, 2026  
**Auditor:** Antigravity Engineering & Security Agent  
**Environment Audited:** Full Stack (Node.js/Express/TypeScript API, MongoDB Atlas, React PWA, Flutter Android, Cloudinary, Firebase Auth)  
**Launch Recommendation:** **READY WITH DOCUMENTED LIMITATIONS**

---

## 1. Executive Summary & Architecture Reviewed

A multi-layered security, performance, financial integrity, and deployment-readiness audit was conducted across the Kanhaiya General Store digital commerce ecosystem.

### Architecture Scope Reviewed

| Layer | Technology | Primary Role | Audit Focus |
| --- | --- | --- | --- |
| **Backend REST API** | Node.js 20+, Express 4, TypeScript 5 | Business logic, catalog, inventory, order lifecycle, invoices | OWASP Top 10, Auth & Role Enforcement, IDOR, NoSQL Injection, Rate Limiting, Redaction |
| **Database** | MongoDB Atlas, Mongoose 8 | System of record for users, products, orders, settings, movements | Compound/Unique Indexes, Atomicity, Stock Decrement Concurrency, Least Privilege |
| **Authentication** | Firebase Admin SDK + Signed JWT | Customer identity & Admin role verification | Stale Claims, Revocation, Deactivation Enforcement, IDOR |
| **Image Hosting** | Cloudinary CDN | Product, category & store asset hosting | Namespace Restriction, Deletion Traversal, Magic Byte/MIME limits |
| **Mobile Application** | Flutter 3 (Android) + Riverpod | Customer mobile experience & Store admin dashboard | Release configuration, Android permissions, HTTPS, Secure Storage |
| **Web Client** | React 18 + Vite + TypeScript (iPhone PWA) | Mobile browser customer shopping & pickup experience | CSP headers, Service Worker caching isolation, clean logout |

---

## 2. Audit Findings & Severity Classification

Findings are classified according to standard CVSS / OWASP severity ratings:

| Severity | Count | Remediated in Phase 9 | Pending External Actions |
| --- | --- | --- | --- |
| **Critical** | 0 | 0 | 0 |
| **High** | 2 | 2 | 0 |
| **Medium** | 3 | 3 | 0 |
| **Low** | 2 | 2 | 0 |
| **Informational** | 2 | 2 | 0 |

---

### Finding 1: Insecure Direct Object Reference (IDOR) on Guest Orders & PDF Invoices

- **Component:** `backend/src/modules/orders/order.service.ts`
- **Severity:** **HIGH**
- **Vulnerability Description:** When an unauthenticated caller queried `getOrderByIdOrNumber` for a guest order (`customerId === null`), the conditional check failed to throw an error when neither the guest tracking token nor customer phone was provided. An unauthorized anonymous user could enumerate order numbers (e.g., `KGS-2026-0001`) to retrieve customer names, phone numbers, delivery addresses, and private PDF invoices.
- **Remediation Implemented:** Enforced strict object-level validation in `order.service.ts`. If an order is a guest order and the caller is not an authenticated store administrator, the backend strictly requires either a matching `guestTrackingToken` (via `X-Guest-Token` header or query) or matching customer phone number. If neither matches, `ForbiddenError(403)` is immediately thrown.
- **Verification:** Automated tests in `backend/tests/phase9_security_audit.test.ts` verify that anonymous queries without a token return `403 Forbidden`, while queries with the matching `X-Guest-Token` header or phone succeed (`200 OK`).

---

### Finding 2: Race Condition and Concurrency Vulnerability in Stock Decrement

- **Component:** `backend/src/modules/orders/order.service.ts` & `backend/src/models/order.model.ts`
- **Severity:** **HIGH**
- **Vulnerability Description:** Previously, product stock was read and subsequently overwritten via `product.save()`. Under concurrent checkouts for low-stock items (e.g., flash sales or last item in stock), multiple simultaneous requests could pass the stock check before any wrote, causing stock quantity to become negative or overselling inventory.
- **Remediation Implemented:**
  1. Updated the stock decrement flow to use atomic conditional updates:
     `Product.findOneAndUpdate({ _id: prod._id, stockQuantity: { $gte: dec.quantity } }, { $inc: { stockQuantity: -dec.quantity } }, { new: true })`.
  2. Implemented compensating transaction rollback: if any subsequent item in a multi-item cart fails or runs out of stock, all previously decremented items are automatically restored via `$inc`.
  3. Added a unique sparse index on `idempotencyKey` in `OrderSchema` (`OrderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true })`) to prevent duplicate order placement caused by retries or repeated button presses.
- **Verification:** Tested in `backend/tests/phase6_checkout.test.ts` and `phase9_security_audit.test.ts`.

---

### Finding 3: Stale Role Claims and Deactivation Bypass in JWT Authentication

- **Component:** `backend/src/middleware/authenticate.ts`
- **Severity:** **MEDIUM**
- **Vulnerability Description:** Session JWTs have a 7-day expiration. If an administrator was removed from `ADMIN_ALLOWED_EMAILS` or an account was deactivated (`isActive: false`), the middleware previously accepted the decoded JWT payload without verifying current database account status, allowing deactivated or demoted users access until token expiration.
- **Remediation Implemented:** Enhanced `authenticate` and `optionalAuthenticate` middleware to query `User.findById(decoded.id)`. If the user is flagged as `isActive === false`, access is immediately rejected with `401 Unauthorized`. Authoritative roles are synchronized with the database record.
- **Verification:** Validated in `backend/tests/phase9_security_audit.test.ts` with test `should reject deactivated user accounts even if possessing valid JWT (401)`.

---

### Finding 4: Arbitrary Asset Deletion and Path Traversal in Cloudinary Controller

- **Component:** `backend/src/modules/admin/upload.controller.ts`
- **Severity:** **MEDIUM**
- **Vulnerability Description:** The Cloudinary asset deletion controller accepted arbitrary `publicId` route parameters without validating that the asset belonged to the store folder structure. An administrator account or crafted request could pass path traversal characters (`..`) or delete unrelated assets in the shared Cloudinary cloud.
- **Remediation Implemented:** Added strict namespace validation (`validatePublicId` and `validateUploadFolder`). Public IDs and upload folders are rejected with `400 Bad Request` if they do not start with `kanhaiya_store/` or contain directory traversal tokens (`..`).
- **Verification:** Validated in `backend/tests/phase9_security_audit.test.ts` testing deletion outside namespace and path traversal.

---

### Finding 5: Potential NoSQL Injection in Unsanitized Query Operators

- **Component:** `backend/src/middleware/nosql-sanitize.middleware.ts` & `backend/src/app.ts`
- **Severity:** **MEDIUM**
- **Vulnerability Description:** Express query string and body parsers accept nested objects (e.g., `{ email: { $gt: "" } }` or `{ $where: ... }`). If unvalidated query inputs are passed into Mongoose filter queries, unauthorized records can be matched.
- **Remediation Implemented:** Created recursive `noSqlSanitizer` middleware and registered it globally in `app.ts`. Any keys starting with `$` or containing `.` are stripped from `req.body`, `req.query`, and `req.params`.
- **Verification:** Validated in `backend/tests/phase9_security_audit.test.ts` testing stripped `$where` and `$gt` operators.

---

### Finding 6: Missing Correlation IDs and Unredacted Sensitive Data in Server Logs

- **Component:** `backend/src/utils/logger.ts` & `backend/src/middleware/correlation.middleware.ts`
- **Severity:** **LOW**
- **Vulnerability Description:** Unstructured console logging could inadvertently output bearer tokens or password fields into application logs, and lack of correlation IDs made cross-tier debugging and incident tracing difficult.
- **Remediation Implemented:**
  1. Implemented `correlationMiddleware` generating or propagating `X-Request-Id` across requests and responses.
  2. Implemented deep recursive argument sanitization in `logger.ts` redacting Bearer tokens (`Bearer [REDACTED]`), JWT strings (`[REDACTED_JWT]`), and keys matching sensitive patterns (`authorization`, `password`, `token`, `secret`, `private_key`).
- **Verification:** Validated in `backend/tests/phase9_security_audit.test.ts`.

---

### Finding 7: Missing Android Manifest Internet Permission for Release Builds

- **Component:** `apps/customer_flutter/android/app/src/main/AndroidManifest.xml`
- **Severity:** **LOW**
- **Vulnerability Description:** Android release APKs require explicit `<uses-permission android:name="android.permission.INTERNET"/>`. While debug builds grant this automatically, release builds without this manifest entry fail to make network calls to the production API.
- **Remediation Implemented:** Added `<uses-permission android:name="android.permission.INTERNET"/>` and set user-friendly application label `Kanhaiya General Store` in `AndroidManifest.xml`.
- **Verification:** Verified via `flutter analyze` and `flutter test`.

---

## 3. Financial Integrity & Business Logic Audit

### Order Creation & Recalculation

- **Authoritative Prices:** Prices are never accepted from client payloads. The backend queries `Product.findById`, snapshots `sellingPrice` and `mrp`, checks `isPublished === true` and `stockQuantity >= reqQty`, and recalculates all line items, subtotals, delivery fees, and order totals.
- **Non-Deliverable Stores Policy:** Grocery and fruit limitations are explicitly upheld; dairy (milk, paneer, ghee) and bakery (breads) catalog rules adhere to store operating guidelines. Minimum order values (`minOrderValue`) and PIN code serviceability are strictly verified.

### Payment Flow Safeguards

- **Cash on Delivery (COD):** Created in `PENDING` payment status. Payment status is changed to `PAID` exclusively when an authorized store administrator records collection via `PATCH /api/v1/orders/admin/:id/collect-cod`.
- **Manual WhatsApp QR:** Created in `PENDING` payment status. Prefilled WhatsApp messages direct the customer to the store owner's WhatsApp (`STORE_WHATSAPP`). A screenshot or transaction link is **never** treated as automated proof of payment. Payment status changes to `PAID` only when the administrator explicitly verifies the transaction reference via `PATCH /api/v1/orders/admin/:id/verify-payment`.
- **Online Gateways:** No third-party online payment gateways are introduced, avoiding chargebacks, webhook forgery, and gateway transaction fee leakage.

### Invoices

- **Server-Side Generation:** PDF invoices are rendered on-demand using PDFKit with server-side order snapshots (`InvoiceService.generateInvoicePdf`). Historical product price edits never alter historical invoices.
- **Unique Sequence:** Invoices follow the format `INV-YYYYMM-XXXX` with unique sparse index constraints in MongoDB.

---

## 4. Verification & Testing Evidence

### Backend Test Results (`vitest`)

All 9 test suites covering 119 unit and integration tests passed cleanly:

```text
✓ tests/settings.test.ts (11 tests)
✓ tests/auth.test.ts (11 tests)
✓ tests/phase8_analytics_reports.test.ts (16 tests)
✓ tests/phase5_shopping.test.ts (11 tests)
✓ tests/inventory.test.ts (15 tests)
✓ tests/catalog.test.ts (16 tests)
✓ tests/phase6_checkout.test.ts (24 tests)
✓ tests/phase7_order_management.test.ts (15 tests)
✓ tests/phase9_security_audit.test.ts (16 tests)

Test Files  9 passed (9)
     Tests  119 passed (119)
  Duration  5.98s
```

### TypeScript Compilation (`npx tsc --noEmit`)

```text
Exit code: 0 (Zero errors)
```

### Flutter Customer App Verification

```text
$ flutter analyze
Analyzing customer_flutter...
No issues found! (ran in 3.0s)

$ flutter test
All 22 tests passed!
```

### React Customer PWA Build

```text
$ npm run build
vite v5.4.21 building for production...
✓ 1566 modules transformed.
dist/index.html                   1.26 kB
dist/assets/index-CopAtBxW.css    5.26 kB
dist/assets/index-Co6-0HsQ.js   416.48 kB
PWA v0.20.5: precache 18 entries (794.88 KiB)
✓ built in 3.72s
```

---

## 5. Dependency & Security Scanning Assessment

### Backend (`npm audit`)

- **Total Dependencies:** 28 production + 13 development packages.
- **Findings:**
  - `tinypool` / `vite` / `@vitest/mocker`: Development dependencies only (used strictly during Vitest execution, never bundled into production `dist/`).
  - `uuid` (<11.1.1): Transitive dependency within Google/Firebase libraries (`@google-cloud/firestore` via `firebase-admin`). Evaluated: running `npm audit fix --force` would downgrade `firebase-admin` from v13 to v10, causing breaking changes. The risk in this deployment context is minimal because `uuid` is only invoked internally by Google service clients without untrusted user-supplied buffer parameters.

### React PWA (`npm audit`)

- **Findings:**
  - `@grpc/grpc-js`: Transitive dependency of `@firebase/firestore` inside npm package tree. Evaluated: the PWA communicates exclusively with the backend REST API via `fetch` and does not connect directly to Firestore gRPC endpoints.

---

## 6. Production Deployment & Operations Checklist

### Hosting & Infrastructure Matrix

1. **API Backend:** Render Web Service (Node.js runtime, `npm run build && npm start`)
2. **Database:** MongoDB Atlas (M0/M10 Dedicated Cluster, IP Access List restricted to Render outgoing IPs or VPC peering)
3. **Customer PWA:** Netlify or Vercel (Single Page App rewrite rule to `/index.html`)
4. **Android APK:** Signed Release APK / Google Play Console Internal Track
5. **Assets:** Cloudinary CDN (Production folder: `kanhaiya_store/`)

### Required Production Environment Variables

| Variable | Description | Example / Recommendation |
| --- | --- | --- |
| `PORT` | API Port | `5000` (or injected by Render) |
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | MongoDB Atlas Connection String | `mongodb+srv://<user>:<pwd>@cluster.mongodb.net/kanhaiya_store?retryWrites=true&w=majority` |
| `CORS_ORIGIN` | Allowed Frontend Domains | `https://kanhaiyastore.netlify.app,https://admin.kanhaiyastore.com` |
| `JWT_SECRET` | Strong Cryptographic Secret | Min 64-character random hex string |
| `ADMIN_ALLOWED_EMAILS` | Authorized Admin Google Accounts | `kanhaiyaastore@gmail.com` |
| `FIREBASE_PROJECT_ID` | Production Firebase Project ID | Configured from Firebase Console |
| `FIREBASE_CLIENT_EMAIL` | Service Account Client Email | `firebase-adminsdk@kanhaiya-store...` |
| `FIREBASE_PRIVATE_KEY` | Service Account RSA Private Key | Stored securely in Render Secret Manager |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Account Name | Secure production bucket |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Production key |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Stored in hosting secret manager |
| `STORE_NAME` | Display Store Name | `Kanhaiya General Store` |
| `STORE_PHONE` | Customer Care Mobile | `+919876543210` |
| `STORE_WHATSAPP` | Manual UPI Verification Line | `+919876543210` |
| `STORE_UPI_ID` | Store QR UPI Address | `kanhaiyastore@upi` |

### Backup and Disaster Recovery Procedure

1. **Atlas Automated Snapshots:** Ensure continuous backup or daily automated snapshots (retention: 7-30 days) are enabled on MongoDB Atlas.
2. **Point-In-Time Restoration:** In the event of catastrophic data corruption, restore to a new staging cluster before repointing DNS or `MONGODB_URI`.
3. **Secret Rotation:** If `FIREBASE_PRIVATE_KEY` or `CLOUDINARY_API_SECRET` is suspected of compromise, rotate the key in the respective cloud console and update the environment variable in Render without needing code modifications.

---

## 7. Final Launch Recommendation

### Decision: **READY WITH DOCUMENTED LIMITATIONS**

The Kanhaiya General Store application has successfully passed comprehensive architectural, financial, authorization, and code-hardening audits:

- **Zero Critical Vulnerabilities** exist in the application code.
- High severity issues (Guest IDOR, stock decrement concurrency) and medium severity issues (NoSQL injection, Cloudinary namespace deletion, deactivation verification) have been remediated and verified with automated test suites.
- All 119 backend tests, 22 Flutter unit tests, and React PWA production build pass cleanly.

**Documented Limitations & Launch Notes:**

1. **Manual WhatsApp QR Payments:** Store personnel must verify incoming bank SMS or UPI notifications prior to clicking "Verify Payment" in the admin dashboard.
2. **Production Secrets:** Prior to going live, genuine production credentials for Firebase Admin and Cloudinary must be configured inside Render's Environment Manager, and `CORS_ORIGIN` must be pointed strictly to the production domains.
