# IPO CONNECT — Two-Sided Investor Networking & IPO Assistance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%20%7C%20TypeScript-green)](backend)
[![Frontend](https://img.shields.io/badge/Mobile-React%20Native%20%7C%20Expo%20SDK%2058-blue)](mobile)
[![Realtime](https://img.shields.io/badge/Realtime-Socket.IO-black)](backend)

**IPO CONNECT** is a production-oriented, two-sided mobile and web platform that connects individual retail investors with experienced Demat Account Holders through a controlled request-and-acceptance system called **Poke**.

The application is built with a restrained, trustworthy fintech design language, end-to-end data persistence, real-time messaging, a strict commission configuration engine (0% to 50% in 2.5% increments), and full compliance safeguards in alignment with SEBI, broker, and UPI regulations.

---

## 🌟 Key Capabilities

### 1. Controlled Introduction: The "Poke" System
- **Investor**: Discovers verified Demat account holders, reviews published advisory terms, and initiates a **Poke**. A confirmation sheet clearly outlines that a chat will only be unlocked after the recipient accepts. Pending requests can be cancelled at any time.
- **Demat Account Holder**: Receives incoming Pokes in an inbox. Inspects the investor profile, reviews the proposed commission terms, and can either **Accept** (which locks the terms, registers an active connection, and opens in-app chat) or **Decline** with an optional polite note.
- **Duplicate Prevention**: Backend controls prevent duplicate active requests or redundant connections.

### 2. Commission Configuration Engine
- Dedicated commission engine module adhering to the 21 discrete values in **exact 2.5% increments** between **0.0% and 50.0%**:
  `0.0%, 2.5%, 5.0%, 7.5%, 10.0%, 12.5%, 15.0%, 17.5%, 20.0%, 22.5%, 25.0%, 27.5%, 30.0%, 32.5%, 35.0%, 37.5%, 40.0%, 42.5%, 45.0%, 47.5%, 50.0%`
- **Transparent Base**: Rates apply solely to documented advisory or technical assistance service bases (never on IPO investment capital or profit-sharing).
- **Interactive Controls**: Step increment buttons (`-2.5%` / `+2.5%`), visual progress indicator, and quick-select chips (`0%`, `2.5%`, `5%`, `7.5%`, `10%`, `15%`, `20%`, `25%`, `35%`, `50%`).
- **Live Fee Simulator**: Computes exact advisory fee and effective total in INR with decimal-safe calculations.
- **Auditable History**: Logs previous rate, new rate, calculation basis, timestamp, and revision reasons.

### 3. Real-Time Chat & Statutory Safeguards
- Real-time messaging powered by **Socket.IO** and persistent REST storage.
- Pinned banner at the top of every conversation displaying the mutually agreed commission rate and basis.
- Statutory reminder banner in every chat room:
  > *"Compliance Reminder: All IPO bids must be placed via official ASBA/UPI channels. Never share Demat passwords, bank OTPs, or UPI PINs."*
- Typing indicators, read receipts, and block/disconnect controls.

### 4. Verification & Trust (KYC)
- Visual trust status: Email Verified, Mobile Verified, and Demat/Identity KYC Verified with green shield checkmark.
- Demat account holders can submit masked holding statements (NSDL/CDSL) or Client Master Sheets for compliance inspection.

### 5. Compliance & Administrative Console
- Live platform analytics: total registered users, investors, demat holders, pending KYC reviews, active connections, and platform average commission rate.
- Interactive KYC Queue workbench for compliance officers to inspect masked document references and approve or reject submissions.
- Comprehensive platform audit trail logging authentication, pokes, connections, and commission changes.

---

## 🎨 Visual Design & Color Palette

Built with a clean, trustworthy fintech aesthetic:

| Token | Hex Value | Usage |
|---|---|---|
| **Primary Navy** | `#14263D` | Brand identity, primary headers, active tabs |
| **Primary Action Blue** | `#315EF7` | Primary buttons, Poke CTA, links |
| **Background** | `#F7F9FC` | App background |
| **Surface** | `#FFFFFF` | Cards, modals, containers |
| **Primary Text** | `#172033` | Body titles and headings |
| **Secondary Text** | `#758096` | Subtitles, timestamps, placeholders |
| **Border** | `#E6EAF0` | Separators and input borders |
| **Success** | `#16865C` | Verified badges, accepted status |
| **Warning** | `#D98A16` | Pending reviews, cautionary alerts |
| **Error** | `#D94343` | Decline buttons, error banners |
| **Subtle Blue** | `#EDF2FF` | Highlight cards, active role pills |

---

## 🛠️ Technology Stack

### Mobile & Web Application (`/mobile`)
- **Framework**: React Native with Expo SDK 58 (runs on Android, iOS, and Web)
- **Language**: TypeScript
- **State Management**: TanStack Query (server state & caching) + Zustand (client state & auth)
- **Components**: Custom, accessible design system with universal SVG icons
- **Styling**: Vanilla React Native StyleSheet with unified theme tokens

### Backend API (`/backend`)
- **Runtime**: Node.js v24 + TypeScript (`tsx`)
- **Framework**: Express with Helmet, CORS, Morgan logger, and Rate Limiting
- **Realtime**: Socket.IO
- **Database**: Mongoose (MongoDB Atlas / local) + Dual-Engine High-Resilience disk-backed JSON persistence (`backend/data/db.json`)
- **Security**: JWT (Access Token + Refresh Token rotation), Bcrypt password hashing, Zod schema validation

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js >= 18 (Node 24 recommended)
- npm >= 9

### 2. Run the Backend API
```bash
cd backend
npm install
npm run dev
```
The backend starts on `http://localhost:5000` with Socket.IO and seeds realistic demo accounts automatically.

### 3. Run the Mobile / Web Application
```bash
cd mobile
npm install
npm run web
```
Open `http://localhost:8081` in your browser. The app runs with an authentic smartphone device frame on desktop and adapts responsively to mobile screens!

---

## 👥 Demo Accounts (Pre-Seeded)

For immediate testing, use any of these pre-configured accounts:

| Role | Email / Identifier | Password | Key Characteristics |
|---|---|---|---|
| **Demat Holder** | `rajesh.sharma@demat.in` | `Password123!` | Mumbai, 6+ yrs exp, Verified Demat KYC, 5.0% commission |
| **Demat Holder** | `priya.patel@demat.in` | `Password123!` | Ahmedabad, 4 yrs exp, Verified Demat KYC, 7.5% commission |
| **Demat Holder** | `vikram.mehta@demat.in` | `Password123!` | Bengaluru, 3 yrs exp, KYC Pending, 2.5% commission |
| **Investor** | `arjun.kapoor@investor.in` | `Password123!` | Pune, 1-2 yrs exp, Connected with Rajesh Sharma |
| **Investor** | `neha.verma@investor.in` | `Password123!` | New Delhi, Beginner, Pending poke sent |
| **Admin Desk** | `compliance.admin@ipoconnect.in` | `AdminSecure2025!` | Platform Compliance & KYC Review Desk |

*Tip: The Welcome screen also includes one-click demo login buttons for instant access.*

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register new Investor or Demat Holder |
| `POST` | `/api/auth/login` | Login and receive JWT access + refresh tokens |
| `GET` | `/api/auth/me` | Current authenticated user profile |
| `GET` | `/api/users/holders` | Search and filter Demat account holders |
| `GET` | `/api/users/investors` | Discover eligible retail investors |
| `POST` | `/api/users/kyc` | Submit masked identity or Demat holding proofs |
| `POST` | `/api/pokes` | Send a new Poke request with proposed terms |
| `GET` | `/api/pokes` | Get user's incoming and outgoing pokes |
| `PUT` | `/api/pokes/:id/accept` | Accept Poke with agreed commission terms |
| `PUT` | `/api/pokes/:id/reject` | Decline Poke with optional reason |
| `PUT` | `/api/pokes/:id/cancel` | Withdraw pending Poke request |
| `GET` | `/api/connections` | Active partnerships with partner profiles |
| `GET` | `/api/chat/:connectionId` | Fetch message history for active connection |
| `POST` | `/api/chat` | Send real-time message to connected partner |
| `PUT` | `/api/commission` | Configure holder default commission rate (0-50% in 2.5% steps) |
| `GET` | `/api/commission/history` | Auditable commission rate change log |
| `POST` | `/api/commission/calculate` | Decimal-safe fee calculator with statutory disclaimers |
| `GET` | `/api/notifications` | User notification feed |
| `GET` | `/api/admin/stats` | Administrative platform metrics |
| `PUT` | `/api/admin/kyc/:userId` | Review and verify or reject user KYC |
| `GET` | `/api/admin/audit-logs` | Platform security and activity audit trail |

---

## 🔒 Security & Regulatory Rules
1. **No Proxy Bidding**: Demat account holders cannot place IPO applications on behalf of investors using third-party funds or credentials.
2. **Authorized Channels Only**: Applications must be made directly through ASBA bank portals, UPI payment requests, or SEBI-registered brokers.
3. **No Profit-Sharing**: Commissions apply solely to documented advisory or technical consulting service bases.

---

## 📄 License
This project is licensed under the MIT License.
