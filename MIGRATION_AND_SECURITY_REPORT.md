# SETU — PRODUCTION DATABASE MIGRATION, DATA PRESERVATION & SECURITY HARDENING REPORT

**Author:** Senior Backend & Database Architect, DevSecOps Engineer  
**Date:** October 22, 2026  
**Status:** Cutover Complete — Authoritative MongoDB Persistence Active  

---

## 1. Executive Summary

Setu has been successfully migrated from local JSON file persistence (`backend/data/db.json`) to an enterprise-grade **MongoDB** architecture with native support for **MongoDB Atlas** and local MongoDB instances. 

All 10 non-negotiable requirements were strictly honored:
1. **Zero Data Loss:** 100% of existing Users, Pokes, Connections, Chat Messages, Commission Histories, Notifications, and Audit Logs were preserved with their exact custom string IDs (`usr_...`, `poke_...`, `conn_...`, `msg_...`).
2. **Password Compatibility:** Original bcrypt password hashes were preserved without re-hashing, enabling seamless authentication for all existing accounts.
3. **Golden Backup Preserved:** The original `backend/data/db.json` was kept untouched, with an identical SHA-256 checksum (`dc4589b696a9af82e24c00c42a44616ba4a7e3bc486df8e5fa9b29883baee867`), backed up both internally and in an external directory.
4. **Zero JSON Fallback in Production:** All production controllers, middleware, and Socket.IO services now communicate exclusively with MongoDB through `dbService`. If MongoDB is unreachable, the system fails safely and halts startup rather than silently writing to disk.
5. **Critical Security Hardening:** PII exposure (emails, phones, KYC details) has been eliminated via response DTO serialization allowlists. Hardcoded JWT fallback secrets have been eradicated with fail-fast production checks. CORS was restricted from wildcard `*` to an explicit allowlist. Frontend URLs and token storage were refactored for cross-platform security (native Expo SecureStore + web fallback).

---

## 2. Architecture Overview

```
                      +-----------------------------------+
                      |      Setu React Native Frontend   |
                      |  (Expo Web & Native Mobile Client)|
                      +-----------------+-----------------+
                                        |
                 HTTPS / WSS REST API   |   Socket.IO (JWT Authed)
                                        v
                      +-----------------+-----------------+
                      |     Express 5 / Node.js Backend   |
                      +-----------------+-----------------+
                                        |
     +-------------------+--------------+--------------+-------------------+
     |                   |                             |                   |
     v                   v                             v                   v
+----+----+         +----+----+                   +----+----+         +----+----+
| Auth &  |         | Public  |                   | Chat &  |         | Admin   |
| Session |         | Profile |                   | Pokes   |         | Inspect |
| Guard   |         | DTOs    |                   | Engine  |         | Auditing|
+----+----+         +----+----+                   +----+----+         +----+----+
     |                   |                             |                   |
     +-------------------+--------------+--------------+-------------------+
                                        |
                                        v
                      +-----------------+-----------------+
                      |     MongoDatabaseService Layer    |
                      |     (backend/src/services/dbService)
                      +-----------------+-----------------+
                                        |
                                        v
                      +-----------------+-----------------+
                      |     Mongoose Schemas & Indexes    |
                      |  (Users, Pokes, Conns, Msgs, etc.)|
                      +-----------------+-----------------+
                                        |
                                        v
                      +-----------------+-----------------+
                      |   MongoDB Atlas / Production DB   |
                      |  (setu_database - Authoritative)  |
                      +-----------------------------------+
```

---

## 3. Inventory of Modified & Created Files

### A. Newly Created Files
- `backend/.env.example` — Complete backend environment configuration template.
- `backend/.env` — Local development secrets and MongoDB URI (ignored by Git).
- `mobile/.env.example` — Frontend Expo environment configuration template.
- `mobile/.env` — Local Expo environment variables (ignored by Git).
- `backend/src/config/database.ts` — Resilient Mongoose connection manager with credential masking.
- `backend/src/services/dbService.ts` — Asynchronous MongoDB data access service for all 7 entities.
- `backend/src/utils/security.ts` — Cryptographic helpers (bcrypt comparison, SHA-256 refresh token hashing, JWT token generation).
- `backend/scripts/migrate-json-to-mongodb.ts` — CLI migration utility supporting `--dry-run` and `--execute`.
- `backend/scripts/verify-migration-and-security.ts` — Comprehensive automated 23-test verification suite.
- `mobile/src/services/storageAdapter.ts` — Platform-aware secure token storage adapter (Expo SecureStore on mobile, web storage fallback).

### B. Modified Files
- `backend/src/config/index.ts` — Added production validation for JWT/Refresh secrets, parsed CORS origins array, and MongoDB URI validation.
- `backend/src/models/mongooseModels.ts` — Enhanced all 7 Mongoose models with explicit string `_id`, virtual `id`, `.toJSON` transforms, and comprehensive compound indexes.
- `backend/src/server.ts` — Refactored startup lifecycle to mandate MongoDB connection, removed JSON seeding, configured strict CORS allowlist for Express and Socket.IO, and added database status to `/health`.
- `backend/src/middleware/auth.ts` — Converted `authenticate` middleware to async MongoDB user lookup with active user state check.
- `backend/src/services/socketService.ts` — Converted connection validation to async MongoDB query.
- `backend/src/controllers/authController.ts` — Refactored to async `dbService`, implemented SHA-256 hashed refresh token persistence and rotation.
- `backend/src/controllers/userController.ts` — Refactored to async `dbService`, implemented `toPublicProfileDTO` allowlist strictly excluding emails, phones, and KYC details on public discovery endpoints.
- `backend/src/controllers/pokeController.ts` — Refactored to async `dbService`, implemented atomic compare-and-swap acceptance to prevent double-connection race conditions.
- `backend/src/controllers/connectionController.ts` — Refactored to async `dbService` with async partner and message population.
- `backend/src/controllers/chatController.ts` — Refactored to async `dbService` ensuring messages are persisted in MongoDB before Socket.IO broadcasting.
- `backend/src/controllers/commissionController.ts` — Refactored to async `dbService` with audit logging and rate validation.
- `backend/src/controllers/notificationController.ts` — Refactored to async `dbService` with persistent read state.
- `backend/src/controllers/adminController.ts` — Refactored to async `dbService` and added `getConnectionMessagesForAdmin` with mandatory audit logging.
- `backend/src/routes/adminRoutes.ts` — Added `GET /connections/:connectionId/messages`.
- `backend/src/services/storage.ts` — Added `@deprecated` header, completely decoupled from production runtime.
- `mobile/src/services/api.ts` — Replaced hardcoded localhost URL with dynamic environment resolution; integrated `SecureStorage`.
- `mobile/src/services/socket.ts` — Replaced hardcoded localhost URL with dynamic environment resolution.
- `.gitignore` — Added `.env`, `.env.*`, `backend/backups/`, and `*.backup.json` to prevent accidental credential or data leakage.

---

## 4. Database Schemas, Validation & Indexes

All models support Setu's canonical string IDs (`usr_...`, `poke_...`, `conn_...`, etc.):

| Entity | Collection | Key Fields | Production Indexes |
|---|---|---|---|
| **User** | `users` | `_id`, `email`, `mobileNumber`, `password`, `primaryRole`, `defaultCommissionRate`, `isKycVerified`, `kycDetails`, `refreshToken` | `{ email: 1 }` (unique), `{ mobileNumber: 1 }` (unique), `{ primaryRole: 1, isAvailable: 1 }`, `{ defaultCommissionRate: 1 }` |
| **PokeRequest** | `pokerequests` | `_id`, `senderId`, `recipientId`, `status`, `proposedCommissionRate`, `commissionBasis`, `agreedCommissionRate` | `{ senderId: 1, recipientId: 1 }`, `{ status: 1 }`, `{ createdAt: -1 }` |
| **Connection** | `connections` | `_id`, `userAId`, `userBId`, `pokeRequestId`, `agreedCommissionRate`, `agreedCommissionBasis`, `status`, `blockedById` | `{ userAId: 1, userBId: 1 }`, `{ pokeRequestId: 1 }`, `{ status: 1 }` |
| **Message** | `messages` | `_id`, `connectionId`, `senderId`, `receiverId`, `content`, `type`, `metadata`, `readAt` | `{ connectionId: 1, createdAt: 1 }`, `{ receiverId: 1, readAt: 1 }` |
| **CommissionHistory** | `commissionhistories` | `_id`, `holderId`, `previousRate`, `newRate`, `basis`, `targetApplicantId`, `changedById`, `reason`, `timestamp` | `{ holderId: 1, timestamp: -1 }`, `{ targetApplicantId: 1 }` |
| **Notification** | `notifications` | `_id`, `userId`, `title`, `message`, `type`, `referenceId`, `isRead`, `createdAt` | `{ userId: 1, isRead: 1 }`, `{ createdAt: -1 }` |
| **AuditLog** | `auditlogs` | `_id`, `actorId`, `action`, `details`, `ipAddress`, `timestamp` | `{ actorId: 1 }`, `{ action: 1 }`, `{ timestamp: -1 }` |

---

## 5. Security Hardening Summary

| Vulnerability Identified in Audit | Remediated Status | Implementation Details |
|---|---|---|
| **Public PII Leakage** (`GET /api/users/holders` exposed emails and phone numbers) | **FIXED** | Implemented `toPublicProfileDTO()` allowlist serialization in `userController.ts`. Responses strictly contain display name, avatar, bio, city, region, verified status, and published rates. |
| **Hardcoded JWT Signing Secrets** | **FIXED** | Configured `backend/src/config/index.ts` to enforce minimum 32-character high-entropy secrets. Application halts at startup in production if secrets are missing or predictable. |
| **Plaintext Refresh Tokens in Database** | **FIXED** | Refresh tokens are now hashed using SHA-256 before storage in MongoDB. Stored hashes prevent token theft even if database read access is compromised. |
| **Permissive Wildcard CORS** (`origin: true`) | **FIXED** | Replaced with strict CORS origin validator supporting `CORS_ORIGINS` allowlist for Express and Socket.IO. Unauthorized browser origins are blocked. |
| **Hardcoded Localhost URLs in Mobile App** | **FIXED** | Centralized in `resolveApiBaseUrl()` and `resolveSocketBaseUrl()`. Supports `EXPO_PUBLIC_API_URL`, local network discovery for physical devices, and production domains. |
| **Insecure Token Storage in Mobile App** | **FIXED** | Implemented `SecureStorage` adapter using `expo-secure-store` (hardware-backed Keystore/Keychain on mobile) with memory cache for zero-latency HTTP interceptors. |
| **Unauthorized Admin Chat Access** | **FIXED** | Created `GET /api/admin/connections/:connectionId/messages` requiring admin role and logging an immutable `ADMIN_CHAT_INSPECTED` audit log entry with administrator ID and stated reason. |
| **Concurrent Poke Acceptance Collision** | **FIXED** | Implemented `acceptPokeConditionally` in `dbService.ts` using atomic CAS (`findOneAndUpdate` matching `{ status: 'pending' }`). Prevents duplicate connection creation. |

---

## 6. Migration Execution & Verification Report

### Pre-Migration JSON Source Checksum
- **File:** `backend/data/db.json`
- **File Size:** 18,654 bytes
- **SHA-256 Checksum:** `dc4589b696a9af82e24c00c42a44616ba4a7e3bc486df8e5fa9b29883baee867`
- **Backup Locations:**
  - `backend/backups/db.backup.2026-10-22T10-55-33-929Z.json`
  - External artifact backup in persistent IDE brain directory.

### Migration Summary
```
================================================================
POST-MIGRATION SOURCE RECORD VERIFICATION:
  Users:                Source=7  | Preserved in Mongo=7  (100%)
  Pokes:                Source=4  | Preserved in Mongo=4  (100%)
  Connections:          Source=1  | Preserved in Mongo=1  (100%)
  Messages:             Source=3  | Preserved in Mongo=3  (100%)
  Commission Histories: Source=1  | Preserved in Mongo=1  (100%)
  Notifications:        Source=3  | Preserved in Mongo=3  (100%)
  Audit Logs:           Source=13 | Preserved in Mongo=13 (100%)
================================================================
```

### Automated Integration Test Suite Results (`verify-migration-and-security.ts`)
```
================================================================
🧪 SETU PRODUCTION MIGRATION, INTEGRITY & SECURITY TEST SUITE
================================================================
📁 SUITE 1: Source JSON Preservation & Integrity
  [✅ PASS] Original db.json unchanged with exact SHA-256 checksum -> Calculated: dc4589b696a9af82...
🍃 SUITE 2: MongoDB Persistence & Record Counts
  [✅ PASS] Users count is at least 7 -> Found: 7
  [✅ PASS] Pokes count is at least 4 -> Found: 4
  [✅ PASS] Connections count is at least 1 -> Found: 1
  [✅ PASS] Messages count is at least 3 -> Found: 3
  [✅ PASS] Commission entries count is at least 1 -> Found: 1
  [✅ PASS] Notifications count is at least 3 -> Found: 3
  [✅ PASS] Audit logs count is at least 13 -> Found: 17
🩺 SUITE 3: Server Health & Live Connection
  [✅ PASS] API responds healthy with MongoDB database connected -> App: Setu, Database: connected
🔑 SUITE 4: Authentication & Session Security
  [✅ PASS] Holder can login with existing password without re-hashing -> User: Rajesh Sharma
  [✅ PASS] Investor can login with existing password -> User: Arjun Kapoor
  [✅ PASS] Admin can login with administrator password -> Role: admin
  [✅ PASS] Invalid password safely rejected with 401 -> Status: 401
  [✅ PASS] Refresh token exchange generates new valid session token -> New Token issued: Yes
🛡️ SUITE 5: Privacy Protection & Public Data Sanitization
  [✅ PASS] Public /api/users/holders strictly conceals email, mobile, password, and KYC -> Checked 3 profiles; Leaks found: 0
  [✅ PASS] Public profile by ID strictly conceals private contact information -> Name: Rajesh Sharma, Email field present: false
🔒 SUITE 6: Object-Level Authorization & Access Control
  [✅ PASS] Investor denied access to admin audit logs with 403 -> Status: 403
  [✅ PASS] Investor denied commission configuration with 403 -> Status: 403
💬 SUITE 7: Chat Persistence & Audited Administrative Access
  [✅ PASS] Participant can retrieve persistent chat history from MongoDB -> Retrieved 3 messages
  [✅ PASS] Non-admin denied access to admin chat review with 403 -> Status: 403
  [✅ PASS] Admin can review chat under regulatory audit policy with audit logging -> Audit Action: ADMIN_CHAT_INSPECTED, Reason: Automated Regulatory Inspection
💼 SUITE 8: Commission Validation & Calculation Engine
  [✅ PASS] Valid 2.5% increment commission calculated accurately (7.5% on 15,000 = 1,125) -> Fee: 1125, Total: 16125
  [✅ PASS] Non-2.5% step rate safely rejected with 400 -> Status: 400

================================================================
📊 TEST EXECUTION SUMMARY: 23/23 PASSED (0 FAILED)
================================================================
```

---

## 7. MongoDB Atlas Configuration & Setup Guide

To transition this deployment from local MongoDB to MongoDB Atlas in production:

### Step 1: Create MongoDB Atlas Project and Cluster
1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click **New Project** and name it `Setu-Production`.
3. Click **Create Deployment** -> Select **M0 (Free)** or **M10+ (Dedicated)**.
4. Select the cloud provider and region closest to your application server (e.g., AWS `ap-south-1` Mumbai).

### Step 2: Database User Provisioning
1. Under **Security** -> **Database Access**, click **Add New Database User**.
2. Authentication Method: **Password**.
3. Username: `setu_app_user`.
4. Generate a strong password (minimum 24 characters).
5. Database User Privileges: Select **Read and write to any database** (or restrict to `setu_database`).
6. Click **Add User**.

### Step 3: Network Access (IP Access List)
1. Under **Security** -> **Network Access**, click **Add IP Address**.
2. **Security Principle:** Do NOT use `0.0.0.0/0` unless temporarily diagnosing development.
3. Enter the static outbound IP address of your production backend server (e.g., AWS Elastic IP, DigitalOcean Droplet IP).
4. For local testing, click **Add Current IP Address**.

### Step 4: Connection String Retrieval
1. Under **Deployments** -> **Database**, click **Connect** on your cluster.
2. Select **Drivers** -> Driver: **Node.js**, Version: **5.5 or later**.
3. Copy the SRV connection string:
   ```
   mongodb+srv://setu_app_user:<password>@setu-cluster.mongodb.net/setu_database?retryWrites=true&w=majority&appName=SetuBackend
   ```

### Step 5: Configure Backend Production Environment
In your production backend `.env`:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://setu_app_user:YourStrongPasswordHere@setu-cluster.mongodb.net/setu_database?retryWrites=true&w=majority&appName=SetuBackend
JWT_SECRET=production-secret-must-be-random-at-least-32-characters-long!
REFRESH_TOKEN_SECRET=production-refresh-secret-must-be-random-at-least-32-chars!
CORS_ORIGINS=https://setu.yourdomain.com,https://admin.setu.yourdomain.com
FRONTEND_URL=https://setu.yourdomain.com
```

### Step 6: Import Data to Atlas
Run the deterministic migration script against Atlas:
```bash
# 1. Preview with dry run
npx tsx scripts/migrate-json-to-mongodb.ts --dry-run

# 2. Execute import
npx tsx scripts/migrate-json-to-mongodb.ts --execute

# 3. Verify data integrity and security
npx tsx scripts/verify-migration-and-security.ts
```

---

## 8. Backup, Restoration & Rollback Strategy

### Backup Procedures
1. **Continuous Atlas Backups:** Enable Atlas Cloud Backups (Point-in-Time Restore) in the cluster settings.
2. **Scheduled Logical Dump:**
   ```bash
   mongodump --uri="mongodb+srv://setu_app_user:password@setu-cluster.mongodb.net/setu_database" --out=./backups/mongodump_$(date +%Y%m%d_%H%M%S)
   ```

### Restoration Procedure
To restore a snapshot into MongoDB Atlas:
```bash
mongorestore --uri="mongodb+srv://setu_app_user:password@setu-cluster.mongodb.net/setu_database" --drop ./backups/mongodump_YYYYMMDD_HHMMSS/setu_database
```

### Emergency Rollback Procedure
If an unforeseen emergency requires reverting prior to database cutover:
1. Stop backend services.
2. The golden original JSON database is preserved unchanged at `backend/data/db.json` and in `backend/backups/`.
3. Verify file hash against `dc4589b696a9af82e24c00c42a44616ba4a7e3bc486df8e5fa9b29883baee867`.
4. Point backend to previous release tag.

---

## 9. Implementation Checklist & Verification Matrix

- [x] **Phase 0:** Audit & Golden Backup with SHA-256 verification (`dc4589b696...`).
- [x] **Phase 1:** Environment configuration templates (`backend/.env.example`, `mobile/.env.example`).
- [x] **Phase 2:** Mongoose models with explicit string `_id`, virtuals, and indexes.
- [x] **Phase 3:** Migration script supporting `--dry-run` and deterministic `--execute`.
- [x] **Phase 4:** Live MongoDB data import completed and validated.
- [x] **Phase 5:** 100% of controllers migrated from `storage.*` to `dbService`. Zero controllers reference `db.json`.
- [x] **Phase 6:** Public profile PII leaks fixed via `toPublicProfileDTO`.
- [x] **Phase 7:** Hardcoded JWT signing secrets replaced with production-enforced environment variables.
- [x] **Phase 8:** Refresh tokens hashed with SHA-256 before database storage.
- [x] **Phase 9:** CORS allowlist configured for Express and Socket.IO.
- [x] **Phase 10:** Frontend environment URLs dynamic, `SecureStorage` adapter active.
- [x] **Phase 11:** Audited administrative chat inspection implemented and logged.
- [x] **Phase 12:** 23/23 automated regression and security tests passing.
- [x] **Phase 13:** Frontend verified in real browser, confirming live dashboard rendering and login.
