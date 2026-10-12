# Kanhaiya General Store — Phase 8: Analytics, Reports, Customer Management & Store Settings

## 1. System Overview

Phase 8 introduces enterprise-grade business analytics, multi-dimensional store reporting, customer lifetime spend management, configurable store operating policies, and secure data exports.

The implementation spans:
- **Backend (Node.js + Express + TypeScript + MongoDB Atlas)**:
  - Aggregation engine for overview KPIs, sales trends, product rankings, inventory alerts, customer lifetime values, and order/payment breakdowns.
  - Business timezone-aware date range calculator (`Asia/Kolkata` / IST UTC+05:30).
  - Secure CSV export service with Spreadsheet Formula Injection mitigation and UTF-8 BOM.
  - Protected store configuration endpoints (`GET /api/v1/admin/settings`, `PATCH /api/v1/admin/settings`).
- **Admin App (Flutter / Dart + Riverpod)**:
  - `AdminAnalyticsDashboardScreen`: Date-filtered KPI summary cards, revenue charts, and channel breakdowns.
  - `AdminReportsScreen`: Tabbed deep-dive reports (Product performance, Stock replenishment & expiry tracking, Collections audit) with one-click CSV downloads.
  - `AdminCustomersScreen`: Customer directory with search, spend totals, order counts, and interactive customer profile dialogs.
  - `AdminStoreSettingsScreen`: Granular controls for business profile, fulfillment rules, checkout toggles, notifications, and invoice prefixes/GSTIN.
  - `AdminDashboardScreen`: Live store pulse counters connected to real-time aggregation data.

---

## 2. Metric Definitions & Calculation Rules

| Metric | Definition | Exclusion / Treatment Rules |
| :--- | :--- | :--- |
| **Gross Order Value** | Total monetary value of orders placed in period. | Orders with status `CANCELLED` are **strictly excluded**. |
| **Verified Collected Payments** | Actual funds confirmed in the store's bank or UPI accounts. | Only orders with `paymentStatus: 'PAID'` are counted. Pending WhatsApp QR receipts or uncollected COD orders are **excluded**. |
| **Pending Payments** | Outstanding customer payables. | Sum of `totalAmount` for non-cancelled orders where `paymentStatus: 'PENDING'` (categorized into Pending WhatsApp QR vs Uncollected COD). |
| **Average Order Value (AOV)** | `Gross Order Value / Eligible Orders Count`. | Cancelled orders are excluded from both numerator and denominator. |
| **Low-Stock Count** | Active items at risk of running out. | Published products where `stockQuantity <= lowStockThreshold && stockQuantity > 0`. |
| **Out-of-Stock Count** | Active items unavailable for purchase. | Published products where `stockQuantity <= 0`. |
| **Refund Total** | Sum of refunded or partially refunded amounts. | Orders in `REFUNDED` or `PARTIALLY_REFUNDED`. |

---

## 3. Date & Timezone Handling

- **Timezone**: Configured to Indian Standard Time (`Asia/Kolkata`, UTC+05:30).
- **Day Boundaries**:
  - `startDate`: Start of wall-clock day (`00:00:00.000` IST = previous UTC day `18:30:00.000`).
  - `endDate`: End of wall-clock day (`23:59:59.999` IST = current UTC day `18:29:59.999`).
- **Supported Range Presets**:
  - `today`: Current day from 00:00:00 IST to 23:59:59 IST.
  - `yesterday`: Previous day 00:00:00 IST to 23:59:59 IST.
  - `last7days`: Rolling 7 days up to end of today.
  - `last30days`: Rolling 30 days up to end of today.
  - `thismonth`: 1st day of current month up to today.
  - `lastmonth`: 1st day to last day of previous month.
  - `custom`: Explicit `startDate` and `endDate` boundaries.

---

## 4. Customer Management & Privacy Policy

1. **Registered Customers vs Guest Purchasers**:
   - Registered users: Linked via `User` account (`role: 'CUSTOMER'`). Displays verified name, email, registered date, total spend, and order history.
   - Guest shoppers: Linked via `customerPhone` where `customerId` is null. Displayed with a clear `GUEST` badge and formatted identifier (e.g. `Guest (3344)`).
2. **Privacy & Security Constraints**:
   - Access is restricted exclusively to authenticated administrators (`authenticate` + `authorizeAdmin`).
   - Sensitive tokens, password hashes, and internal credentials are never returned.
   - Customers are not automatically merged solely based on matching names.

---

## 5. Store Settings Schema

Settings are persisted in MongoDB via `StoreSettings` and validated on update:

- **Business Profile**: Store Name, Primary Phone, WhatsApp Number, Physical Address, Support Email, Support Phone, Support Hours, Counter Operating Hours.
- **Fulfillment**:
  - `isDeliveryEnabled` & `isPickupEnabled` toggles.
  - `serviceablePincodes`: Array of 6-digit Indian PIN codes.
  - `standardDeliveryFee`: Base fee for orders below threshold.
  - `freeDeliveryThreshold`: Free delivery threshold (e.g. ₹500).
  - `minOrderValue`: Minimum order amount (e.g. ₹100).
  - `pickupInstructions`: Store counter collection instructions.
- **Checkout & Payments**:
  - `isCodEnabled` & `isWhatsappQrEnabled` toggles.
  - `storeUpiId`: VPA for QR code generation.
  - `paymentInstructions`: Customer instructions for UPI payment.
  - `orderPolicies`: Store return and grocery warranty policy.
- **Notifications**:
  - `adminOrderAlertsEnabled`, `lowStockAlertsEnabled`, `customerStatusNotificationsEnabled`.
- **Invoices**:
  - `invoicePrefix`: Sequential numbering prefix (default `'INV'`).
  - `gstin`: Valid Indian GST Identification Number (optional).

---

## 6. Secure Data Export (CSV)

- **Formula Injection Mitigation**:
  Any cell starting with spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) is safely prefixed with a single quote (`'`), neutralizing executable command risks in Microsoft Excel, Google Sheets, and LibreOffice.
- **Encoding**: UTF-8 Byte Order Mark (`\uFEFF`) is prepended to ensure currency symbols (`₹`) and Unicode text render cleanly across all spreadsheet software.
- **Endpoints**:
  - `GET /api/v1/admin/reports/export/sales`
  - `GET /api/v1/admin/reports/export/orders`
  - `GET /api/v1/admin/reports/export/products`
  - `GET /api/v1/admin/reports/export/inventory`
  - `GET /api/v1/admin/reports/export/customers`

---

## 7. API Endpoints Reference

All endpoints under `/api/v1/admin` require a valid Firebase ID token with administrative role:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/admin/analytics/overview` | Dashboard summary KPIs with date filtering |
| `GET` | `/api/v1/admin/analytics/sales` | Sales time-series, channel and payment breakdowns |
| `GET` | `/api/v1/admin/reports/products` | Bestsellers, revenue rankings, zero sales items |
| `GET` | `/api/v1/admin/reports/inventory` | Stock levels, replenishment suggestions, expiry batches |
| `GET` | `/api/v1/admin/reports/orders` | Orders & payments status breakdowns |
| `GET` | `/api/v1/admin/reports/export/:reportType` | Export filtered dataset to CSV |
| `GET` | `/api/v1/admin/customers` | Customer directory with search, total spend & order count |
| `GET` | `/api/v1/admin/customers/:id` | Customer profile details and lifetime order history |
| `GET` | `/api/v1/admin/settings` | Retrieve complete store operating configuration |
| `PATCH` | `/api/v1/admin/settings` | Update store policies, delivery fees & payment rules |

---

## 8. Verification & Test Execution Results

- **Backend Test Suite (`backend/tests/phase8_analytics_reports.test.ts`)**:
  - 14/14 Phase 8 test cases passed.
  - All **8 test suites passed** (103/103 total backend tests).
  - TypeScript strict compilation: `npx tsc --noEmit` exited with code 0.
- **Flutter Customer & Admin Application (`apps/customer_flutter`)**:
  - `flutter analyze`: **No issues found** (0 errors, 0 warnings).
  - `flutter test`: **22/22 tests passed** (including Phase 8 domain tests).
- **React Customer PWA (`apps/customer_pwa`)**:
  - `npm run build`: Exited with code 0.
