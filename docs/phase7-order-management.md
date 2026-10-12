# Kanhaiya General Store — Phase 7: Order Management, Tracking & PDF Invoices

## 1. System Overview

Phase 7 delivers a production-grade order management, fulfillment lifecycle, and tracking system seamlessly integrated with the catalog, inventory, and checkout systems completed in Phases 1–6.

The system spans:

- **Backend (Node.js + Express + TypeScript + MongoDB Atlas)**:
  - Admin order queries with server-side pagination, regex search, multi-attribute filtering, and date ranges.
  - Strict order lifecycle transition state machine enforcing fulfillment-specific constraints (`DELIVERY` vs. `PICKUP`).
  - Audited manual WhatsApp QR payment verification and authorized COD collection.
  - Exact-once, atomic inventory restoration upon order cancellation.
  - In-memory/streamed PDF Retail Invoice generation via `pdfkit` styled with the KGS visual palette (`#174D3A`).
  - Customer order tracking timelines and secure guest token lookups.
  - Database-persisted customer notifications with fail-safe error isolation.
- **Admin App (Flutter / Dart)**:
  - Admin Order Management Dashboard (`AdminOrdersScreen`) with KPI metric cards, server-side filtering, and paginated order cards.
  - Detailed Order Screen (`AdminOrderDetailsScreen`) showing full historical snapshots, line items, customer details, transition action triggers, WhatsApp payment verification dialogs, COD collection, and invoice triggers.
- **Customer Web (React PWA + Vite)**:
  - Orders page (`OrdersPage.tsx`) with status badges, payment pills, interactive tracking modal with fulfillment timeline, store contact details, and client PDF download.
- **Customer Mobile (Flutter)**:
  - Dynamic `OrdersScreen` with order status pills, fulfillment modal with progress stepper, item breakdown, and invoice triggers.

---

## 2. Order Lifecycle & Allowed Transitions

Order statuses are strictly validated on the backend. Transitions depend on the order's `fulfillmentMethod`:

| Current Status | Allowed Next Statuses (`DELIVERY`) | Allowed Next Statuses (`PICKUP`) | Notes |
| :--- | :--- | :--- | :--- |
| `PLACED` | `CONFIRMED`, `CANCELLED` | `CONFIRMED`, `CANCELLED` | Initial status upon order creation. |
| `CONFIRMED` | `PREPARING`, `CANCELLED` | `PREPARING`, `CANCELLED` | Confirmed by store operator. |
| `PREPARING` | `OUT_FOR_DELIVERY`, `CANCELLED` | `READY_FOR_PICKUP`, `CANCELLED` | Inventory is picked & packed. **Pickup orders cannot transition to `OUT_FOR_DELIVERY`**. |
| `READY_FOR_PICKUP` | N/A | `COMPLETED`, `CANCELLED` | Customer notified to pick up order from store counter. |
| `OUT_FOR_DELIVERY` | `COMPLETED`, `CANCELLED` | N/A | Delivery partner is dispatched. |
| `COMPLETED` | *Terminal State* | *Terminal State* | Completed orders cannot be casually reopened. |
| `CANCELLED` | *Terminal State* | *Terminal State* | Consequential cancellation triggering inventory restoration. |

---

## 3. Inventory Restoration Rules (Exact-Once Guarantee)

1. **Deduction at Placement**:
   When an order is created, inventory is deducted atomically using MongoDB `$inc: { stockQuantity: -qty }` under check of sufficient stock.
2. **Cancellation with Stock Restoration**:
   - When an order transitions to `CANCELLED`, `OrderService.cancelOrder` checks `order.isInventoryRestored`.
   - If `false`, it increments `stockQuantity` back by the purchased quantity for each item and logs a compensating `StockMovement` of type `INCREASE` with reason `Order cancellation: <reason>`.
   - Sets `isInventoryRestored: true` atomically.
   - If `cancelOrder` is called again or retried, `order.isInventoryRestored === true` prevents duplicate increments.

---

## 4. Payment Verification & COD Collection

### Manual WhatsApp QR Payment

- Customer places order using `WHATSAPP_QR`. Initial payment status is `PENDING`.
- Customer contacts the store on WhatsApp with payment receipt/screenshot.
- **Security Rule**: The order is **never** automatically marked paid when WhatsApp is opened or screenshot submitted.
- The administrator checks the store's bank or UPI account.
- The administrator invokes `POST /api/v1/orders/admin/:id/verify-payment` providing an optional bank reference/UTR and internal audit notes.
- The order payment status is set to `PAID`, timestamped, associated with `admin.email`, and logged in `statusHistory`.

### Cash on Delivery (COD) Collection

- Initial payment status is `PENDING`.
- Staff receives cash at pickup counter or upon doorstep delivery.
- The administrator invokes `POST /api/v1/orders/admin/:id/collect-cod`.
- Payment status transitions to `PAID` with audit entry `COD_COLLECTED`.

---

## 5. Professional PDF Invoice Generation

- Invoices are generated server-side using `pdfkit`.
- **Branding & Visuals**:
  - Store Name: **Kanhaiya General Store**
  - Primary Color: `#174D3A` (Forest Green)
  - Accent Color: `#C58B43` (Restrained Gold)
  - Text & Borders: `#262B29` (Charcoal) & `#DCE7DE` (Sage)
- **Content Fields**:
  - Unique sequential invoice number: `INV-YYYYMM-XXXX`.
  - Order Number, Invoice Date, Fulfillment Type (`HOME DELIVERY` / `STORE PICKUP`).
  - Bill To / Ship To customer details (Name, Phone, Delivery Address).
  - Itemized table with Item Description, Brand, Pack Size/Unit, Unit Selling Price, Quantity, Line Subtotal.
  - Subtotal, Delivery Fee, and Final Payable Total.
  - Payment Method and Payment Status badge (`PAID` in green or `PAYMENT PENDING` in gold).
- **Tax Configuration**:
  - Missing GSTIN / tax details generate a valid **Commercial Retail Invoice & Receipt** without inventing fictitious GST numbers or HSN codes.
  - Compliant for grocery retail billing.
- **Security**:
  - Object-level authorization ensures only administrators and the owning customer (or guest with valid token) can download the invoice.
  - Streamed directly with headers `Content-Type: application/pdf` and `Content-Disposition: inline; filename=invoice-<number>.pdf`.

---

## 6. Customer & Guest Tracking Security

1. **Authenticated Customers**:
   - Access limited to their own orders (`customerRef` matches `req.user.uid`).
   - Private timeline displays safe events: `PLACED`, `CONFIRMED`, `PREPARING`, `OUT_FOR_DELIVERY` / `READY_FOR_PICKUP`, `COMPLETED`, `CANCELLED`.
2. **Guest Order Access**:
   - Guest orders receive a cryptographically random `guestTrackingToken` upon placement.
   - Endpoint: `GET /api/v1/orders/:idOrNumber/tracking?token=<guestTrackingToken>`.
   - Sequential order numbers cannot be guessed to expose private customer information.

---

## 7. API Endpoints Reference

### Admin Order Endpoints (Requires Admin Token)

- `GET /api/v1/orders/admin/metrics` — Dashboard KPI counters.
- `GET /api/v1/orders/admin/all` — Paginated list with search, status filters, fulfillment filters, date range.
- `GET /api/v1/orders/admin/:id` — Full order details with audit trail.
- `PATCH /api/v1/orders/admin/:id/status` — Advance order status (`{ status, notes }`).
- `POST /api/v1/orders/admin/:id/verify-payment` — Verify WhatsApp QR payment (`{ paymentReference, notes }`).
- `POST /api/v1/orders/admin/:id/collect-cod` — Record COD cash received (`{ notes }`).
- `POST /api/v1/orders/admin/:id/cancel` — Cancel order and restore inventory (`{ reason }`).

### Customer & Tracking Endpoints

- `GET /api/v1/orders/my` — Authenticated customer order history.
- `GET /api/v1/orders/:idOrNumber` — Order details with authorization check.
- `GET /api/v1/orders/:idOrNumber/tracking` — Customer-safe fulfillment timeline.
- `GET /api/v1/orders/:idOrNumber/invoice` — Download PDF Retail Invoice.
- `GET /api/v1/notifications` — Customer notification list.
- `PATCH /api/v1/notifications/:id/read` — Mark notification read.

---

## 8. Verification & Test Summary

- **Backend Tests (`backend/tests/phase7_order_management.test.ts`)**:
  - 15/15 Phase 7 test cases passed.
  - All 89/89 total backend tests passed across all 7 suites (`catalog`, `inventory`, `checkout`, `phase7_order_management`, etc.).
  - TypeScript strict compilation: `tsc --noEmit` exited with code 0.
- **Customer React PWA (`apps/customer_pwa`)**:
  - `npm run build` executed successfully without errors (`tsc && vite build` built in 3.76s).
- **Flutter Customer & Admin Application (`apps/customer_flutter`)**:
  - `flutter analyze` passed with 0 errors and 0 warnings.
  - `flutter test` passed with all 18/18 tests passing.
