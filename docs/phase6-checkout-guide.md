# Kanhaiya General Store — Phase 6: Checkout & Order Placement System

## 1. Overview & Architecture

Phase 6 implements an authoritative, secure order placement and checkout subsystem across the Kanhaiya General Store technology stack:
- **Backend:** Node.js, Express, TypeScript, Mongoose (MongoDB Atlas)
- **iPhone PWA:** React 18, TypeScript, Vite, Vanilla CSS
- **Android App:** Flutter 3, Dart, Riverpod state management

### Customer Checkout Flow
```
Product Catalog → Cart → Checkout → Delivery/Pickup Choice → Contact & Address → Payment Method → Authoritative Review → Place Order → Order Confirmation Screen
```

---

## 2. Authoritative Price, Total & Inventory Strategy

### Authoritative Backend Validation
Clients never submit prices, discounts, subtotal, delivery fees, or final totals.
1. The client sends `{ items: [{ productId, quantity }], fulfillmentMethod, paymentMethod, customerName, customerPhone, deliveryAddress }`.
2. The backend fetches active products directly from MongoDB.
3. It validates that each product is **published** (`isPublished: true`) and **in stock** (`stockQuantity >= requestedQuantity`).
4. Unit price (`sellingPrice`), MRP, and line subtotals are recalculated exclusively from trusted database values.
5. Minimum order value (configurable, default ₹100) is enforced.
6. Local delivery fee is recalculated on the backend:
   - ₹0 for In-Store Pickup
   - ₹0 for orders meeting the Free Delivery Threshold (default ₹500)
   - Standard delivery fee (default ₹30) for orders below threshold

### Inventory Consistency & Compensating Rollback
- Inventory is decremented **only upon approved order placement**. Viewing items or adding to cart never reserves or locks inventory.
- For every product in the order, stock is deducted atomically:
  ```ts
  product.stockQuantity -= requestedQuantity;
  if (product.stockQuantity <= 0) product.isAvailable = false;
  await product.save();
  ```
- An audit `StockMovement` is recorded with `adjustmentType: 'ORDER_FULFILLMENT'`.
- If order document creation or any step fails, a compensating transaction restores each modified product's stock and deletes created movements:
  ```ts
  for (const item of updatedProducts) {
    await Product.findByIdAndUpdate(item.id, { stockQuantity: item.originalStock, isAvailable: true });
  }
  ```

### Idempotency Protection
- Requests accept an optional `idempotencyKey` (UUID generated on client).
- If a submission with the same idempotency key is received again (e.g. user double-taps "Place Order"), the server returns the existing order record without double-decrementing inventory or duplicating orders.

---

## 3. Order Data Model & Lifecycle

### Order Schema (`backend/src/models/order.model.ts`)
- `orderNumber`: Human-readable identifier format `KGS-YYYYMM-XXXX` (e.g., `KGS-202610-4821`).
- `customerId`: ObjectId referencing customer `User`, or `null` for guest checkouts.
- `customerName`: String (required).
- `customerPhone`: 10-digit Indian phone (validated with `/^[6-9]\d{9}$/`).
- `customerEmail`: Optional email address.
- `fulfillmentMethod`: `DELIVERY` or `PICKUP`.
- `deliveryAddress`: Immutable snapshot of house number, street, landmark, city, state, PIN code, and instructions.
- `pickupDetails`: Snapshot of store name, address, phone, and counter instructions.
- `items`: Immutable snapshots containing `productId`, `name`, `unit`, `packSize`, `sellingPrice`, `mrp`, `quantity`, `lineSubtotal`.
- `subtotal`: Authoritative items subtotal.
- `deliveryFee`: Authoritative delivery fee.
- `totalAmount`: `subtotal + deliveryFee`.
- `paymentMethod`: `COD` or `WHATSAPP_QR`.
- `paymentStatus`: Initial status is always `PENDING`.
- `orderStatus`: Initial status is always `PLACED`.
- `idempotencyKey`: Unique duplicate protection token.
- `whatsappPaymentUrl`: Prefilled WhatsApp URL when `WHATSAPP_QR` is selected.

### Status Transitions
- **Payment Status:** `PENDING` → `PAID` (or `FAILED`)
  - COD and WhatsApp QR always create orders as `PENDING`.
  - Payment is verified manually by store admins upon collection or delivery.
- **Order Status:** `PLACED` → `CONFIRMED` → `PACKED` → `READY_FOR_PICKUP` / `OUT_FOR_DELIVERY` → `DELIVERED` / `PICKED_UP` (or `CANCELLED`).

---

## 4. Fulfillment & Delivery Service Area Configuration

Configured via `StoreSettings` model (`backend/src/models/storeSettings.model.ts`):
- `storeName`: "Kanhaiya General Store"
- `storePhone`: "+919876543210"
- `storeWhatsapp`: "+919876543210"
- `storeAddress`: "House 42, Main Bazar, Near City Post Office, New Delhi - 110001"
- `pickupInstructions`: "Orders are packed and kept ready at the store counter. Please share your Order Number when collecting."
- `serviceablePincodes`: Array of supported Indian PIN codes (default: `['110001', '110002', '110003', '110006', '110084']`).
- `standardDeliveryFee`: ₹30.
- `freeDeliveryThreshold`: ₹500.
- `minOrderValue`: ₹100.
- `estimatedDeliveryWindow`: "Same-day delivery within 2-4 hours".
- `isDeliveryEnabled`: Boolean switch. If `false`, delivery is paused and customers must select Store Pickup.
- `isWhatsappQrEnabled`: Boolean switch enabling Manual WhatsApp QR payments.

---

## 5. Security & Authorization

- **Optional & Authenticated Checkout:** Supports both guest checkout and authenticated checkout without forcing accounts.
- **Object-Level Security:** For authenticated customer orders (`order.customerId`), viewing details requires that the requesting customer owns the order or is an `ADMIN`. Other customers receive `403 Forbidden`.
- **Saved Address Security:** Authenticated customers can perform CRUD operations on their saved addresses (`/api/v1/addresses`). Users cannot access or modify addresses belonging to another user.
- **No Public Payment Overrides:** Only authorized admin endpoints can update `paymentStatus`.
- **Validation:** Strict Indian phone number regex (`/^[6-9]\d{9}$/`) and PIN code regex (`/^\d{6}$/`) on both client and server.

---

## 6. Testing Instructions

### Backend Vitest Suite
Run the full test suite including Phase 6 tests:
```bash
cd backend
npm test
# Run Phase 6 tests specifically:
npx vitest run tests/phase6_checkout.test.ts
```
Expected result: **All 6 test files pass (74/74 tests)**.

### React iPhone PWA
Compile TypeScript and production bundle:
```bash
cd apps/customer_pwa
npm run build
```
Expected result: **Exit code 0, 0 errors**.

### Flutter Android App
Run analysis and unit/widget test suite:
```bash
cd apps/customer_flutter
flutter analyze
flutter test
```
Expected result: **No issues found, 16/16 tests pass**.
