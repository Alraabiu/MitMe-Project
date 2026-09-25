# MitMe — Connect. Meet. Share.

MitMe is an original, production-oriented communication and collaboration
platform. It ships as a **full-stack monorepo** with:

- **Web** — React 18 + Vite + TypeScript
- **Mobile** — React Native + Expo
- **API** — Node.js 20+ + Express 5 + MongoDB/Mongoose 8
- **Realtime** — Socket.IO 4 (with JWT auth, per-room permission checks)
- **Media** — WebRTC signaling by default, SFU-ready abstraction (LiveKit / mediasoup)
- **Storage** — Pluggable private object storage (S3-compatible)
- **Auth** — JWT access + rotating refresh tokens persisted as MongoDB sessions

MitMe is designed so that local development runs on your laptop while every
external dependency (SFU, storage, email, SMS, push) is isolated behind a
provider interface. You can ship to production by swapping providers — not by
rewriting the app.

---

## Table of Contents

1. [Feature Matrix](#feature-matrix)
2. [Architecture](#architecture)
3. [Repository Layout](#repository-layout)
4. [Requirements](#requirements)
5. [Quick Start](#quick-start)
6. [Environment Configuration](#environment-configuration)
7. [Running the Stack](#running-the-stack)
8. [Testing](#testing)
9. [Security Model](#security-model)
10. [Realtime Protocol](#realtime-protocol)
11. [Media Abstraction](#media-abstraction)
12. [Storage Abstraction](#storage-abstraction)
13. [Production Checklist](#production-checklist)
14. [Deployment](#deployment)
15. [Operations & Observability](#operations--observability)
16. [Contributing](#contributing)
17. [License](#license)

---

## Feature Matrix

| Domain | Capability | Status |
|---|---|---|
| **Auth** | Register / login (email, username, or phone) | ✅ |
| | JWT access tokens (15 min) | ✅ |
| | Rotating refresh tokens persisted as sessions | ✅ |
| | Device tracking (user-agent, IP, device name) | ✅ |
| | Session pruning (`MAX_SESSIONS_PER_USER`) | ✅ |
| | TTL auto-expiry of stale sessions | ✅ |
| | Refresh-token rotation with reuse detection | ✅ |
| **Users** | Profile view/update (`displayName`, `bio`, `avatarUrl`, `phone`) | ✅ |
| | User search (name or username, min 2 chars, regex-safe) | ✅ |
| | Presence (`online`, `away`, `dnd`, `offline`) | ✅ |
| | Roles (`user`, `moderator`, `admin`) | ✅ |
| **Contacts** | Send / accept / reject / remove requests | ✅ |
| | Idempotent upserts on accept | ✅ |
| | Partial unique index prevents duplicate pending requests | ✅ |
| **Conversations** | 1:1 and group conversations | ✅ |
| | Membership enforcement on read & write | ✅ |
| | Message history with pagination (`limit`, max 100) | ✅ |
| | Realtime delivery over Socket.IO (`message:new`) | ✅ |
| | Typing indicators | ✅ |
| **Meetings** | Create / list / get / join / leave / update | ✅ |
| | Collision-resistant 6-byte join codes (retry loop) | ✅ |
| | Role model: `host`, `cohost`, `participant` | ✅ |
| | Waiting room, whiteboard, chat, screen-share toggles | ✅ |
| | Auto-`ended` when last participant leaves a `live` meeting | ✅ |
| | SFU-ready media handshake response | ✅ |
| **Whiteboard** | Per-meeting canvas with multiple pages | ✅ |
| | Event persistence in MongoDB (`stroke`, arbitrary types) | ✅ |
| | Realtime broadcast via `whiteboard:event` | ✅ |
| | `everyone` / `restricted` editing modes | ✅ |
| **Notifications** | List, mark-as-read, mark-all-as-read | ✅ |
| **Admin** | Stats (users, live meetings, audit count) | ✅ |
| | User listing (paginated, 200 max) | ✅ |
| | Status changes with audit logging | ✅ |
| **Realtime** | JWT-authenticated Socket.IO namespace | ✅ |
| | Room membership verified before join | ✅ |
| | User-scoped direct signaling (`meeting:signal`) | ✅ |
| | Presence broadcast on connect/disconnect | ✅ |
| **Web UI** | Responsive dashboard, sidebar, topbar | ✅ |
| | Auth (login + register) | ✅ |
| | Meetings list, meeting room, controls | ✅ |
| | Whiteboard panel with pointer events | ✅ |
| | Messages, contacts, settings, admin | ✅ |
| **Mobile (Expo)** | Dashboard, chats, meetings, profile | ✅ |
| | Deep-linkable meeting join codes | ✅ |
| **Theming** | Dark / light / system | ✅ |
| **Security** | Helmet, CORS allowlist, request IDs | ✅ |
| | Global rate limit (`/api` scoped) | ✅ |
| | Auth-specific rate limit (20/min) | ✅ |
| | Zod validation on every mutating route | ✅ |
| | Centralized error handler with request ID correlation | ✅ |

---

## Architecture
