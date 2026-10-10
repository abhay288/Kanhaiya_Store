# Implementation Roadmap
## Kanhaiya General Store E-Commerce Platform

---

## Phase Breakdown Overview

| Phase | Milestone Name | Key Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Foundation, Architecture & UI Design System** | Monorepo structure, documentation, Material 3 design system, initial Flutter navigation (10 screens), React PWA foundation, Express backend foundation & health endpoint, test scaffolding. | **Current Phase** |
| **Phase 2** | **Authentication, User Profiles & Admin Role Engine** | Firebase Auth integration, Google Sign-In on Flutter & PWA, backend token validation, MongoDB User & Address management, protected Flutter Admin routing. | Up Next |
| **Phase 3** | **Catalog, Search & Cloudinary Media Pipeline** | Backend Category & Product CRUD, text search & category filters, Cloudinary upload module, Flutter & PWA product listing, category browse, and detail views. | Planned |
| **Phase 4** | **Cart, Checkout & Order State Machine** | Client-side reactive Cart (Riverpod / Context), address selection, COD & WhatsApp QR checkout, atomic stock reservation, order status timeline. | Planned |
| **Phase 5** | **Invoicing Engine & Notifications** | PDFKit invoice generation on delivery, protected invoice streaming, FCM push integration for Android, PWA Web Push notification handler, in-app notification center. | Planned |
| **Phase 6** | **Protected Flutter Admin Workspace** | Live order management dashboard, manual payment receipt approval for WhatsApp QR, inventory adjustment, order status updates, store settings toggle. | Planned |
| **Phase 7** | **Production Hardening, Testing & Deployment** | End-to-end integration tests, Render backend deployment, Netlify/Vercel PWA deployment, Android APK build verification, Lighthouse PWA audit, security audit. | Planned |

---

## Detailed Acceptance Gates for Next Phase (Phase 2)
1. Firebase project created with Google Sign-In enabled.
2. Flutter Google Sign-In working with SHA-1 fingerprints configured.
3. React PWA Google OAuth popup integration working.
4. Express backend verifying Firebase ID tokens via Firebase Admin SDK.
5. MongoDB User records provisioned automatically with default `customer` role and capability for manual role upgrade to `admin`.
