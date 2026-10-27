# Setu — Two-Sided Investor Networking & Live Upstox IPO Assistance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%20%7C%20TypeScript-green)](backend)
[![Frontend](https://img.shields.io/badge/Mobile%20%26%20Web-React%20Native%20%7C%20Expo%20SDK%2058-blue)](mobile)
[![Realtime](https://img.shields.io/badge/Realtime-Socket.IO-black)](backend)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Authoritative-brightgreen)](backend)
[![Upstox API](https://img.shields.io/badge/IPO%20Data-Upstox%20API%20v2%20Live-orange)](backend)

**Setu** (सेतु — "The Bridge") is a production-grade, two-sided fintech platform built with React Native (Expo) and Node.js. It facilitates lawful, transparent networking between retail investors and experienced Demat Account Holders for initial public offering (IPO) assistance and bidding guidance.

The platform integrates real-time Indian primary market offerings directly from the **Upstox IPO API v2**, strictly enforces **IPO-scoped isolation** for chats and connections, provides an auditable **commission configuration engine (0.0% to 50.0% in 2.5% steps)**, and adheres to statutory SEBI, ASBA, and UPI compliance rules.

---

## 📑 Table of Contents

1. [Architectural Overview](#-architectural-overview)
2. [Live Upstox IPO Integration](#-live-upstox-ipo-integration)
3. [Core Capabilities & Features](#-core-capabilities--features)
   - [Controlled Introductions (The Poke System)](#1-controlled-introductions-the-poke-system)
   - [IPO-Scoped Connections & Isolated Chat](#2-ipo-scoped-connections--isolated-chat)
   - [Commission Configuration Engine](#3-commission-configuration-engine)
   - [KYC Onboarding & Verification Desk](#4-kyc-onboarding--verification-desk)
   - [Administrator Compliance Console](#5-administrator-compliance-console)
4. [Technology Stack](#%EF%B8%8F-technology-stack)
5. [Database Architecture & Collections](#-database-architecture--collections)
6. [Security & Credentials Management](#-security--credentials-management)
7. [Environment Variables Reference](#-environment-variables-reference)
8. [Installation & Quick Start Guide](#-installation--quick-start-guide)
9. [Platform Administrator Credentials](#-platform-administrator-credentials)
10. [REST API Endpoints Reference](#-rest-api-endpoints-reference)
11. [Real-Time WebSocket Events (Socket.IO)](#-real-time-websocket-events-socketio)
12. [Automated Test Suites & Scripts](#-automated-test-suites--scripts)
13. [Statutory Compliance & Regulatory Rules](#-statutory-compliance--regulatory-rules)
14. [License](#-license)

---

## 🏛 Architectural Overview

Setu connects retail market participants through a multi-tier, secure architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Setu Mobile & Web Client (Expo)                      │
│   • Welcome & Auth Screens       • KYC Live Camera & Document Upload   │
│   • IPO Offering Selector Bar   • Discovery Grid & Poke Sender Sheet   │
│   • Request Inbox & Connection List • IPO-Scoped Real-Time Chat Rooms  │
│   • Commission Simulator        • Administrator Review Console         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTPS / WSS
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Node.js / Express Backend                         │
│   • Helmet, Strict CORS & Rate Limiting                                │
│   • JWT Auth & Refresh Rotation  • Socket.IO Real-Time Dispatcher      │
│   • Upstox IPO Sync Service     • Commission Validation Engine (2.5%)  │
│   • KYC Approval Workflow Engine • Comprehensive Security Audit Logger │
└──────────────────────┬───────────────────────────────┬─────────────────┘
                       │                               │
                       ▼                               ▼
       ┌───────────────────────────────┐  ┌───────────────────────────────┐
       │   MongoDB Authoritative Store │  │      Upstox API v2 Gateway    │
       │   • users                     │  │   • GET /v2/ipos?status=...   │
       │   • ipos (Live 58 Offerings)  │  │   • OAuth 2.0 Bearer Token    │
       │   • iposyncstates             │  │   • Statuses: open, upcoming, │
       │   • connections & pokerequests│  │     closed, listed            │
       │   • messages & auditlogs      │  │   • Rate Limiting Cooldown    │
       └───────────────────────────────┘  └───────────────────────────────┘
```

---

## 📡 Live Upstox IPO Integration

Setu synchronizes real Indian market IPO listings directly from the **Upstox IPO API v2** (`https://api.upstox.com/v2`), replacing local demo fixtures with live exchange data.

### 1. Integration Specifications
- **Provider Base URL**: `https://api.upstox.com/v2`
- **Listing Endpoint**: `GET /v2/ipos?status={status}&records=30`
- **Supported Query Statuses**: `open`, `upcoming`, `closed`, `listed` (queried concurrently and deduplicated by upstream `item.id`).
- **Authorization**: Bearer authentication via `process.env.UPSTOX_ACCESS_TOKEN`.
- **Zero Frontend Leakage**: All Upstox requests, endpoints, and credentials remain 100% on the backend. Frontend code never communicates with Upstox directly.

### 2. Status Normalization
Upstox lifecycle states are mapped strictly to Setu's 4 user-facing lifecycle statuses:

| Upstox Status | Setu Lifecycle Status | UI Badge Styling | Description |
| :--- | :--- | :--- | :--- |
| `upcoming` | **Upcoming** | Slate Blue (`#3B82F6`) | Issue announced; bidding opens soon |
| `open` | **Open** | Emerald Green (`#10B981`) | Currently accepting retail & HNI bids |
| `closed` | **Closed** | Amber Orange (`#F59E0B`) | Bidding period ended; allotment pending |
| `listed` | **Listed** | Indigo Purple (`#6366F1`) | Shares allotted and trading on NSE/BSE |

### 3. Reliability & Throttling
- **10-Second Abort Signal**: Every upstream HTTP call is bound to an `AbortSignal.timeout(10000)`.
- **15-Second Rate Limit Cooldown**: `UpstoxIpoService` enforces an in-memory throttle (`SYNC_COOLDOWN_MS = 15000`) to prevent `HTTP 429 Too Many Requests`.
- **Stale Data Fallback**: When upstream requests fail (network outage, invalid token, rate limiting), the database marks records as `isStale: true` while retaining the last successfully fetched catalog and updating `syncStatus: 'error'` with an explicit diagnostic message.
- **Reseeding Protection**: `adminSeed.ts` and `upstoxIpoService.ts` strictly guard against repopulating demo IPOs when verified live records or sync state exist.

### 4. Triggering Synchronization
- **Automated**: Runs in the background on server boot and repeats every 60 minutes (`IPO_SYNC_INTERVAL_MINUTES=60`).
- **Web UI**: Tap the **IPO Offering** selector below the header in the app, then click **Sync Now**.
- **REST API Endpoint**:
  ```bash
  curl -X POST http://localhost:5000/api/ipos/sync \
    -H "Content-Type: application/json" \
    -d '{"force": true}'
  ```

---

## 🌟 Core Capabilities & Features

### 1. Controlled Introductions (The Poke System)
- **Direct Messaging Prohibited Prior to Consent**: Unsolicited chat is strictly blocked.
- **Investor Flow**: Investor browses verified Demat account holders, reviews their published commission rates on profit, and initiates a **Poke** requesting the holder to apply for an IPO on their behalf. A confirmation sheet explains the terms and states that communication will only unlock upon holder acceptance. Pending requests can be cancelled at any time.
- **Demat Holder Flow**: Receives incoming Pokes in an inbox. Inspects the investor's profile, KYC status, and proposed terms. The holder can **Accept** (which locks the commission on listing profit terms, registers an active connection, and opens in-app chat) or **Decline** with an optional note.
- **Duplicate Prevention**: Backend constraints prevent sending multiple active requests between the same parties.
- **Guest Interception**: Guests previewing the application without login are prevented from sending or receiving Pokes until completing registration and KYC.

### 2. IPO-Scoped Connections & Isolated Chat
Every connection, poke, and chat room is scoped to a specific IPO:
- **Global IPO Selector Bar**: Prominently displayed beneath the top header across both Investor and Holder screens.
- **Strict Data Scoping**: Selecting an IPO (e.g., *Reliance Jio IPO*) dynamically filters requests, connections, chat rooms, and messages so that only interactions relevant to that specific offering are visible.
- **State Sanitization**: Switching IPOs instantly clears previous connection state to prevent cross-IPO data contamination.
- **System Compliance Pinned Messages**: Every chat room includes pinned reminders and an agreed terms header:
  > *"Compliance Reminder: All IPO applications must use authorized channels (ASBA/UPI/Broker). Never share trading credentials, bank OTPs, or UPI PINs."*

### 3. Commission on Profit Engine
- **Discrete 2.5% Steps**: Rates are strictly bounded between **0.0% and 50.0%** in 21 discrete 2.5% increments:
  `0.0%, 2.5%, 5.0%, 7.5%, 10.0%, 12.5%, 15.0%, 17.5%, 20.0%, 22.5%, 25.0%, 27.5%, 30.0%, 32.5%, 35.0%, 37.5%, 40.0%, 42.5%, 45.0%, 47.5%, 50.0%`
- **Commission on Listing Profit**: Demat account holders ask for a percentage commission on realized listing profits when applying for an IPO on behalf of the investor. No consultation or advisory fees are charged.
- **Interactive Listing Profit Calculator**: Live profit simulator calculates exact Demat Holder Commission (`Profit * Rate%`) and Investor Net Profit (`Profit - Commission`) in INR with decimal-safe calculations.
- **Immutable Audit Trail**: Any change to commission rates is stored in the `commissionhistories` collection with old rate, new rate, timestamp, and justification.

### 4. Mandatory KYC Onboarding & Guest Preview Mode
- **Guest Exploration Mode**: Unregistered or unauthenticated users can explore the app, view live Upstox IPOs, inspect verified Demat holders, and simulate commission earnings across both Investor and Demat Holder views. However, all active operations (sending Pokes, accepting requests, chatting, or publishing rates) require complete registration and KYC verification.
- **Mandatory KYC Upon Social Signup**: When users sign up via Google or Apple accounts, they are immediately directed to complete KYC. They are not permitted to log in to active platform features until identity verification documents (PAN, Aadhaar, Demat statement) are submitted and approved.
- **Three-Tier Verification**:
  1. `isEmailVerified` (via 6-digit OTP or OAuth verification).
  2. `isMobileVerified` (via SMS OTP simulation).
  3. `isKycVerified` (via document upload and admin compliance inspection).
- **Camera & Document Upload**: Live camera selfie capture with fallback document picker for Aadhaar and PAN cards.
- **Compliance Review Desk**: Pending applications appear in the Administrator Console for one-click verification or rejection with administrative notes.

### 5. Administrator Compliance Console
Accessible to authorized users (`primaryRole: 'admin'`):
- **Live Platform Metrics**: Real-time counters for registered users, active connections, pending KYC reviews, and platform average commission rates.
- **KYC Review Desk**: Detailed inspection modal displaying submitted Aadhaar/PAN document URLs, selfie images, and masked identity numbers.
- **Platform Audit Trail**: Searchable, tamper-evident log capturing authentication attempts, KYC reviews, pokes, and connection states.

---

## 🛠️ Technology Stack

| Domain | Technology | Version / Details |
| :--- | :--- | :--- |
| **Mobile & Web Frontend** | React Native (Expo) | SDK 58 |
| **Frontend Language** | TypeScript | Strict Mode |
| **State Management** | Zustand & TanStack Query | Client + Async Server State |
| **Icons & Media** | Universal SVG Icons (`react-native-svg`) | Vector Icons |
| **Backend Runtime** | Node.js | v24 LTS |
| **Backend Framework** | Express.js | v4.21 |
| **Real-Time Engine** | Socket.IO | v4.8 |
| **Database** | MongoDB | v8.0 / MongoDB Atlas |
| **ODM Layer** | Mongoose | v8.13 |
| **Validation** | Zod | v3.24 |
| **Security & Hashing** | BcryptJS & JSONWebToken (JWT) | Salt rounds: 10 |
| **HTTP Client** | Axios & Native Fetch | With timeout signals |

---

## 🗄 Database Architecture & Collections

MongoDB (`setu_database`) is the single authoritative persistence layer. All models are defined with TypeScript interfaces in [`backend/src/models/types.ts`](file:///e:/Projects/IPO/backend/src/models/types.ts) and Mongoose schemas in [`backend/src/models/mongooseModels.ts`](file:///e:/Projects/IPO/backend/src/models/mongooseModels.ts).

### Collections Summary

| Collection | Schema Model | Purpose |
| :--- | :--- | :--- |
| `users` | `MongoUserModel` | User identities, hashed passwords, roles (`investor`, `demat_holder`, `admin`), KYC data, and commission rates. |
| `ipos` | `MongoIpoModel` | Live Upstox IPO listings, normalized lifecycle statuses, verified flags, and sync timestamps. |
| `iposyncstates` | `MongoIpoSyncStateModel` | Singleton tracking provider sync metrics, freshness (`isStale`), error diagnostics, and offering counts. |
| `pokerequests` | `MongoPokeModel` | Controlled introductions between users scoped by `ipoId`, proposed commission terms, and statuses (`pending`, `accepted`, `rejected`, `cancelled`). |
| `connections` | `MongoConnectionModel` | Mutual partnerships created upon Poke acceptance, with agreed commission terms and IPO scoping. |
| `messages` | `MongoMessageModel` | Real-time chat messages between connected partners, system compliance announcements, read timestamps. |
| `commissionhistories`| `MongoCommissionModel` | Tamper-evident ledger of holder commission adjustments. |
| `notifications` | `MongoNotificationModel` | In-app notification feed for pokes, acceptances, and KYC status updates. |
| `auditlogs` | `MongoAuditModel` | Immutable administrative security audit trail tracking platform events, actor IDs, and IP addresses. |

---

## 🔒 Security & Credentials Management

1. **Backend-Only Environment Variables**:
   Sensitive credentials (`UPSTOX_ACCESS_TOKEN`, `JWT_SECRET`, `MONGODB_URI`) are loaded strictly on the backend and are never bundled into client-side code.
2. **Git Protection**:
   `backend/.env` is strictly excluded in `.gitignore`. Verified via `git check-ignore backend/.env`.
3. **Password Security**:
   All passwords are encrypted using `bcryptjs` with 10 salt rounds. Passwords are never returned in API responses.
4. **JWT Rotation**:
   Short-lived Access Tokens (15 minutes) and Refresh Tokens (7 days) with cryptographically secure revocation checks.
5. **Rate Limiting**:
   Express rate limiters protect both general API routes (300 requests per 15 min) and upstream Upstox synchronization (15-second throttle).
6. **Strict CORS Allowlist**:
   Configured in `backend/src/server.ts` to block cross-origin requests from unauthorized origins.

---

## ⚙️ Environment Variables Reference

Create a `backend/.env` file based on [`backend/.env.example`](file:///e:/Projects/IPO/backend/.env.example):

```env
# Server Configuration
PORT=5000
NODE_ENV=development
APP_NAME=Setu

# Security & CORS
CORS_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Database Configuration (Authoritative MongoDB)
MONGODB_URI=mongodb://127.0.0.1:27017/setu_database

# Upstox IPO Live API Configuration
UPSTOX_API_BASE_URL=https://api.upstox.com/v2
UPSTOX_ACCESS_TOKEN=your_upstox_access_token_here
IPO_SYNC_INTERVAL_MINUTES=60
IPO_STALE_THRESHOLD_MINUTES=120
UPSTOX_REQUEST_TIMEOUT_MS=10000
```

---

## 🚀 Installation & Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (Node v20+ recommended)
- **MongoDB**: Local MongoDB community server running on port `27017`, or a MongoDB Atlas connection string.
- **Package Manager**: `npm` (v9+) or `yarn`

### 2. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and insert your UPSTOX_ACCESS_TOKEN and MONGODB_URI

# Launch backend in development mode (with hot reloading via tsx)
npm run dev
```
Backend will start on `http://localhost:5000`. On boot, it automatically:
- Connects and verifies MongoDB.
- Ensures the default Administrator account exists.
- Executes the Upstox IPO synchronization engine.
- Initializes Socket.IO on port 5000.

### 3. Mobile & Web Frontend Setup
```bash
# Navigate to the mobile directory (in a separate terminal)
cd mobile

# Install dependencies
npm install

# Start the Expo development server in Web mode
npm run web
```
Open **[http://localhost:8081](http://localhost:8081)** in your browser. The app runs responsively in desktop browser view and inside an interactive mobile viewport.

---

## 👤 Platform Administrator Credentials

A verified administrator account is provisioned in MongoDB:

| Field | Value |
| :--- | :--- |
| **Email / Identifier** | `kuchbhi0804@gmail.com` |
| **Password** | `123456` |
| **Primary Role** | `admin` |
| **Full Name** | Setu Platform Administrator |
| **Verification** | Email, Mobile & KYC Verified |

*To access the Compliance Desk, log in with these credentials at [http://localhost:8081](http://localhost:8081).*

---

## 🔌 REST API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register a new Investor or Demat Holder. |
| `POST` | `/api/auth/login` | Authenticate with email/mobile and password. Returns JWT tokens. |
| `POST` | `/api/auth/verify-otp` | Verify 6-digit email OTP. |
| `POST` | `/api/auth/resend-otp` | Resend verification OTP code. |
| `POST` | `/api/auth/refresh` | Obtain a new access token using a valid refresh token. |
| `GET` | `/api/auth/me` | Fetch currently authenticated user profile. |

### IPO Listings & Synchronization (`/api/ipos`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/ipos` | Get all active, verified IPO offerings (filtered by `status`, excludes archived). |
| `GET` | `/api/ipos/:id` | Get details of a single IPO by ID. |
| `POST` | `/api/ipos/sync` | Trigger on-demand sync with Upstox API v2 (`{ "force": true }`). |
| `GET` | `/api/ipos/sync/status` | Get sync metadata (last synced timestamp, error state, freshness). |

### Pokes & Introductions (`/api/pokes`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/pokes` | Send a new Poke with proposed commission rate, basis, and `ipoId`. |
| `GET` | `/api/pokes` | Retrieve incoming and outgoing pokes (filter by `status` or `ipoId`). |
| `PUT` | `/api/pokes/:id/accept` | Accept a Poke: creates an active connection and unlocks in-app chat. |
| `PUT` | `/api/pokes/:id/reject` | Decline a Poke with an optional polite reason. |
| `PUT` | `/api/pokes/:id/cancel` | Withdraw an outgoing pending Poke. |

### Connections & Chat (`/api/connections`, `/api/chat`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/connections` | List active connections for current user (filterable by `ipoId`). |
| `GET` | `/api/connections/:id` | Get single connection details and agreed terms. |
| `GET` | `/api/chat/:connectionId` | Fetch message history for a connection. |
| `POST` | `/api/chat` | Send a new message to a connected partner. |
| `PUT` | `/api/chat/:connectionId/read` | Mark all unread messages as read. |

### Users & KYC (`/api/users`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/users/holders` | Discover Demat account holders with filters (city, category, rate). |
| `GET` | `/api/users/investors` | Discover retail investors. |
| `POST` | `/api/users/kyc` | Submit identity details, live selfie, and document proofs for review. |

### Commission Engine (`/api/commission`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `PUT` | `/api/commission` | Update default commission rate (validated for 0-50% in 2.5% steps). |
| `GET` | `/api/commission/history` | View auditable change history for user's commission rates. |
| `POST` | `/api/commission/calculate` | Compute commission on realized listing profit with net breakdown. |

### Admin Console (`/api/admin`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Aggregated platform statistics (users, pokes, connections, KYC). |
| `GET` | `/api/admin/kyc/pending` | Fetch KYC applications awaiting compliance review. |
| `PUT` | `/api/admin/kyc/:userId` | Approve or reject a user's KYC submission. |
| `GET` | `/api/admin/audit-logs` | Retrieve platform security audit trail. |

---

## ⚡ Real-Time WebSocket Events (Socket.IO)

Clients connect to `http://localhost:5000` with JWT authorization.

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join_room` | Client ➔ Server | `{ "roomId": "conn_..." }` | Join dedicated connection chat room. |
| `leave_room` | Client ➔ Server | `{ "roomId": "conn_..." }` | Leave connection chat room. |
| `send_message` | Client ➔ Server | `{ "connectionId": "...", "content": "..." }` | Send a chat message in real time. |
| `new_message` | Server ➔ Client | `Message` object | Broadcasted to room participants. |
| `typing_start` | Client ➔ Server | `{ "roomId": "conn_...", "userId": "..." }` | Trigger typing indicator. |
| `typing_stop` | Client ➔ Server | `{ "roomId": "conn_...", "userId": "..." }` | Dismiss typing indicator. |
| `new_poke` | Server ➔ Client | `PokeRequest` object | Notifies holder of incoming Poke. |
| `poke_updated` | Server ➔ Client | `PokeRequest` object | Notifies parties of Poke acceptance/rejection. |

---

## 🧪 Automated Test Suites & Scripts

Setu includes comprehensive automated verification suites:

### 1. Upstox Integration 14-Point Test Suite
Validates external API handling, normalization, rate-limiting, and error handling with a mocked network layer (offline-capable):
```bash
cd backend
npm.cmd exec tsx scripts/test-live-upstox-suite.ts
```
**Test Coverage (14/14 Passed)**:
1. Provider response normalization into 4 lifecycle states.
2. Missing token configuration handling.
3. Invalid or expired token (HTTP 401) handling.
4. Insufficient endpoint permissions (HTTP 403) handling.
5. Provider timeout (AbortSignal) and rate limiting (HTTP 429) handling.
6. Malformed provider response handling.
7. Empty provider response handling.
8. MongoDB upsert and duplicate prevention.
9. Failed sync preserving previously verified records.
10. Safe handling of seeded IPOs with dependent user records.
11. No accidental demo-data reseeding.
12. IPO dropdown loading, stale, and error states.
13. Isolation of connections and chats between different IPOs.
14. Confirmation that credentials never appear in frontend responses or logs.

### 2. Full Regression & Security Suite
Validates complete platform invariants, authorization, and data integrity:
```bash
cd backend
npm.cmd exec tsx scripts/verify-migration-and-security.ts
```
**Test Coverage (23/23 Passed)**:
- MongoDB authoritative persistence verification across all 9 collections.
- User authentication, password encryption, and JWT verification.
- 2.5% step commission validation (rejects non-multiples like 3.1%).
- Poke lifecycle state transitions.
- Chat encryption and message persistence.
- KYC submission and review desk lifecycle.

### 3. Utility Verification Scripts
- `npm.cmd exec tsx scripts/inspect-users.ts`: Lists all users, active connections, pokes, and live IPO counts in MongoDB.
- `npm.cmd exec tsx scripts/verify-admin.ts`: Verifies admin account credentials and password hash.
- `npm.cmd exec tsx scripts/remove-demo-accounts.ts`: Standalone migration script that safely purges demo accounts and demo connections.

---

## ⚖️ Statutory Compliance & Regulatory Rules

To maintain strict compliance with SEBI (Securities and Exchange Board of India), Indian Banking Regulations, and Stock Exchange guidelines:

1. **No Proxy Bidding**:
   Demat account holders cannot place IPO applications on behalf of investors using third-party funds or client credentials. Every application must originate from the applicant's own Demat/Bank account.
2. **Authorized ASBA/UPI Channels Only**:
   All monetary applications must be submitted directly through official Application Supported by Blocked Amount (ASBA) net banking portals, registered stock broker apps, or authorized UPI mandate requests.
3. **Never Share Credentials**:
   Users are prohibited from sharing trading passwords, Demat PINs, bank OTPs, or UPI security PINs. Pinned warnings enforce this in every chat room.
4. **Agreed Profit Commission Margins**:
   When an investor requests a Demat account holder to apply for an IPO on their behalf, the Demat account holder can specify a published commission on listing profit (0.0% to 50.0% in 2.5% increments). No upfront consultation or advisory fees are charged.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
