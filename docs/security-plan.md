# Security Architecture & Hardening Plan
## Kanhaiya General Store E-Commerce Platform

---

## 1. Zero Trust Principles

1. **Client Untrusted by Default**:
   - Every price, discount, delivery fee, and tax is computed **server-side**. The client may not submit price totals or order subtotals.
   - User identity is authenticated via Firebase ID tokens cryptographically checked by the backend. Client-submitted user IDs or roles (`role: "admin"`) are strictly ignored.
2. **Role Enforcement**:
   - Roles (`customer`, `admin`, `store_manager`) are read from MongoDB.
   - Admin routes in the Flutter application are gated on the client for UX, but **enforced cryptographically by middleware** on the backend.
3. **No Direct Database Exposure**:
   - Neither the Flutter client nor the React PWA ever connects directly to MongoDB Atlas or any database port. All operations pass through authenticated REST endpoints.

---

## 2. Secrets Management & Credential Isolation

- **Frontend Applications (Flutter & React PWA)**:
  - May contain public identifiers only (`FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `CLOUDINARY_CLOUD_NAME`).
  - **NEVER** include Cloudinary API Secret, Firebase Service Account private keys, MongoDB connection strings, or JWT encryption secrets.
- **Backend Application**:
  - Environment variables loaded securely from `.env` (development) or encrypted platform variables (Render in production).
  - Strict verification on startup using Zod: the server refuses to bind if essential secrets are missing or malformed.
- **Repository Safety**:
  - `.gitignore` configured at the root to disallow `.env`, `*.pem`, `service-account.json`, and keystore files.
  - `.env.example` templates committed with dummy placeholders only.

---

## 3. Order & Inventory Protection

- **Atomic Inventory Updates**:
  - Orders execute MongoDB atomic operators (`$inc: { stockQuantity: -quantity }`) guarded with conditions (`stockQuantity: { $gte: quantity }`).
  - Prevents race conditions and duplicate order placement from double-tapping checkout.
- **Idempotency Keys**:
  - Checkout submissions can supply an idempotency key to prevent accidental double-billing or duplicate order creation on cellular network lag.

---

## 4. Network & Middleware Defense

- **Helmet**: Secures HTTP response headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy).
- **CORS Allowlist**: Explicit domains only (e.g. `localhost:5173`, `kanhaiyastore.com`). Wildcards (`*`) disallowed in production.
- **Rate Limiting**: Standard endpoints rate-limited to 100 requests per 15 minutes per IP; sensitive endpoints (auth exchange, checkout) throttled to 10 requests per 15 minutes.
- **Zod Request Validation**: Malformed JSON, prototype pollution keys (`__proto__`), or unwanted fields are stripped and rejected before reaching handlers.

---

## 5. Audit Logging & Record Preservation

- Financial, order, and invoice records are never permanently hard-deleted.
- Cancellations retain timestamps, cancel reasons, and responsible actor (`cancelledBy`).
- PDF invoices are generated deterministically based on immutable order snapshots.
