# Kanhaiya General Store E-Commerce Platform
> A production-oriented, cost-efficient omnichannel grocery & retail e-commerce platform for neighborhood essentials, flours, grains, dals, oils, spices, and personal care.

---

## 1. Monorepo Overview

This repository is organized as a clean, modular monorepo supporting three complementary client and server systems:

```
kanhaiya-store/
├── apps/
│   ├── customer_flutter/        # Customer Android App & Protected Admin Workspace (Flutter + Riverpod + GoRouter)
│   └── customer_pwa/            # Customer iPhone & Web Storefront (React 18 + TypeScript + Vite + PWA)
├── backend/                     # Secure REST API Server (Node.js + Express + TypeScript + Mongoose)
├── packages/
│   └── api-contracts/           # Shared TypeScript Data Types & DTO Interfaces
├── docs/
│   ├── architecture.md          # Architectural Overview, Sequence Diagrams & Component Matrix
│   ├── database-design.md       # MongoDB Atlas Schemas, Indexes & Relationships
│   ├── api-spec.yaml            # OpenAPI 3.0 REST Specification
│   ├── security-plan.md         # Zero-Trust Security, Inventory Locking & Rate Limiting
│   └── implementation-roadmap.md# Phase-by-phase development roadmap
├── README.md
└── .gitignore
```

---

## 2. Technology Stack & Cost-Efficiency Model

| Touchpoint | Technologies | Rationale / Budget Strategy |
| :--- | :--- | :--- |
| **Android App** | Flutter 3.x, Riverpod 3.x, GoRouter, Dio, Material 3 | Single performant codebase for Android devices with offline caching. |
| **iPhone / Web PWA** | React, TypeScript, Vite, Workbox PWA | Mobile-first Safari/iOS installable PWA saving Apple Developer account fees ($99/yr) during Phase 1. |
| **Admin Workspace** | Embedded in Flutter App | **Housed inside the existing customer app** behind cryptographic backend verification, eliminating multi-app overhead. |
| **Backend API** | Node.js, Express, TypeScript, Zod, Helmet | Stateless REST API deployable on Render free/starter tiers. |
| **Database** | MongoDB Atlas | Free M0 sandbox for development and early testing. |
| **Authentication** | Firebase Auth (Google Sign-In) | Free up to 50,000 MAUs; zero credential liabilities on local servers. |
| **Media Hosting** | Cloudinary | Free tier covers 25GB managed media transformation and delivery. |
| **Payment Flow** | Cash on Delivery (COD) & WhatsApp QR / UPI | **Zero payment gateway commissions** (saves 2–3% transaction fees). |

---

## 3. Getting Started & Local Development

### Prerequisites
- Node.js `v20+` & npm `v10+`
- Flutter SDK `3.24+` (Dart 3.x)
- Git

---

### Step 1: Backend API Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment (copy template)
cp .env.example .env

# 3. Run unit & integration tests
npm run test

# 4. Start development server
npm run dev
```

The backend starts on `http://localhost:5000` with health check at:
`http://localhost:5000/api/v1/health`

---

### Step 2: React PWA Setup (iPhone & Mobile Web)

```bash
cd apps/customer_pwa

# 1. Install dependencies
npm install

# 2. Run PWA storefront in development
npm run dev

# 3. Build production PWA bundle (with service worker & manifest)
npm run build
```

The storefront starts on `http://localhost:5173`.

---

### Step 3: Flutter Customer Android App Setup

```bash
cd apps/customer_flutter

# 1. Resolve Dart dependencies
flutter pub get

# 2. Run static analysis
flutter analyze

# 3. Run widget tests
flutter test

# 4. Launch on Android Emulator or Connected Device
flutter run
```

---

## 4. Admin Access & Zero-Trust Authorization Design

The Store Admin Dashboard is **not** a separate application; it is a protected interface inside the Flutter application.

### Strict Verification Workflow:
1. User clicks **"Sign In with Google"** in the app.
2. Firebase Authentication returns a cryptographically signed `idToken`.
3. The Flutter client passes the token to backend endpoint `POST /api/v1/auth/google`.
4. The backend verifies the token using Firebase Admin SDK and retrieves the user record from MongoDB Atlas.
5. The role (`customer` or `admin`) is determined **server-side only**.
6. Client-supplied headers, query parameters, or local flags are never trusted.
7. The Flutter app's `routerProvider` conditionally enables the admin dashboard link and guards `/admin` routes.
8. Every administrative API endpoint independently verifies the token and enforces the `admin` role via middleware.

---

## 5. Implementation Roadmap Status

- [x] **Phase 1: Project Foundation, Architecture & UI Design System** (Completed)
- [ ] **Phase 2: Authentication, User Profiles & Admin Role Engine** (Next)
- [ ] **Phase 3: Catalog, Search & Cloudinary Media Pipeline**
- [ ] **Phase 4: Cart, Checkout & Order State Machine**
- [ ] **Phase 5: Invoicing Engine (PDFKit) & Push Notifications (FCM / Web Push)**
- [ ] **Phase 6: Live Protected Flutter Admin Workspace**
- [ ] **Phase 7: Hardening, Deployment & Storefront Launch**
