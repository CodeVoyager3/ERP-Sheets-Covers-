# Sheets & Covers ERP

An ERP / e-commerce platform for a **sheet & cover manufacturing business**. It gives a small shop a single place to manage its catalog, take orders, track stock with an auditable ledger, run stage-gated production, keep a simplified double-entry finance book, and monitor staff activity.

The system is deliberately **not** micro-services, not event-driven, and not cloud-distributed. It is a **modular monolith**: one Express API, one PostgreSQL database, and one Next.js frontend. The goal is judgment over buzzwords — the architecture is as small as the problem allows while still enforcing real invariants (ledgers are append-only, order state is a machine, every mutation is validated and role-gated).

---

## Table of Contents

1. [Feature Highlights](#1-feature-highlights)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Repository Layout](#4-repository-layout)
5. [Data Model](#5-data-model)
6. [Backend Deep Dive](#6-backend-deep-dive)
7. [Frontend Deep Dive](#7-frontend-deep-dive)
8. [Core Business Workflows](#8-core-business-workflows)
9. [API Reference](#9-api-reference)
10. [Roles & Permissions](#10-roles--permissions)
11. [Getting Started](#11-getting-started)
12. [Demo Data & Credentials](#12-demo-data--credentials)
13. [Design Decisions & Trade-offs](#13-design-decisions--trade-offs)
14. [Known Limitations & Gaps](#14-known-limitations--gaps)
15. [Security Notes](#15-security-notes)
16. [Roadmap](#16-roadmap)
17. [Command Reference](#17-command-reference)
18. [Glossary](#18-glossary)

---

## 1. Feature Highlights

| Module | What it does |
|---|---|
| **Auth & Users** | Email/password login, bcrypt hashing, JWT sessions, first-run owner signup, owner-managed staff accounts, activate/deactivate and role changes. |
| **Products & BOM** | Product catalog with unique SKUs, selling price, and a Bill of Materials relating finished goods to raw components. Product detail computes material cost and gross margin. |
| **Orders** | Multi-line orders with a strict state machine: `PENDING → CONFIRMED → IN_PRODUCTION → DISPATCHED → DELIVERED` plus `CANCELLED`. Confirmation performs a single atomic transaction that deducts stock, posts finance entries, and queues production jobs. |
| **Inventory** | Append-only stock ledger. Current stock is always derived by summing ledger rows — never stored as a mutable column. Manual stock-in and adjustment with audit notes; per-product movement history. |
| **Production** | Two parallel concepts: auto-generated **stage-gate Production Jobs** (Queued → Cutting → Stitching → Quality Check → Completed) with an immutable "Product Passport" audit log, and manually planned **Work Orders** that add yield to stock on completion. |
| **Finance** | Simplified double-entry ledger with five accounts (`REVENUE`, `ACCOUNTS_RECEIVABLE`, `CASH`, `COGS`, `INVENTORY_VALUE`), live account balances, and a full journal view. |
| **Activity Log** | Cross-cutting append-only audit trail. Every meaningful mutation writes an `ActivityLog` row with actor, action, entity and a JSON detail snapshot. Owners can filter it per user. |
| **Dashboard** | KPI cards, revenue-over-time area chart, orders-by-status bar chart, and current-stock chart, all computed client-side from module APIs. |
| **Landing page** | Marketing hero at `/` with module navigation and sign-in entry point. |

---

## 2. Architecture

### 2.1 High-level

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (React 19 / Next 15)                 │
│                                                                     │
│  App Router pages ── AuthProvider (JWT in localStorage)             │
│         │                     │                                     │
│         └──────────► lib/api.ts fetch wrapper ── Bearer <JWT> ──────┼──┐
└─────────────────────────────────────────────────────────────────────┘  │
                                                                         │ HTTPS/JSON
┌─────────────────────────────────────────────────────────────────────┐  │
│                        Express 5 API (Node / TypeScript)            │◄─┘
│                                                                     │
│  app.ts                                                             │
│   ├── cors()                                                        │
│   ├── express.json()                                               │
│   └── /api ──► routes/index.ts ──► module routers                   │
│                                     │                               │
│        authenticate ──► requireRole ──► validate(Zod) ──► controller│
│                                                             │       │
│                                                          service    │
│                                                             │       │
│                                                          Prisma     │
└─────────────────────────────────────────────────────────────┼───────┘
                                                              │
                                                   ┌──────────▼────────┐
                                                   │   PostgreSQL      │
                                                   │  (Prisma Client   │
                                                   │   + pg adapter)   │
                                                   └───────────────────┘
```

### 2.2 The modular-monolith pattern

Each backend domain lives in `server/src/modules/<module>/` as a vertical slice:

```
<module>/
├── <module>.routes.ts      # HTTP surface: path + middleware chain
├── <module>.controller.ts  # Request/response translation only
├── <module>.service.ts     # Business logic + Prisma access + transactions
└── <module>.schema.ts      # Zod validation schemas (optional per module)
```

Responsibilities are strict:

- **Routes** decide *who may call what*, wiring `authenticate`, `requireRole`, and `validate`.
- **Controllers** extract `req.body`, `req.params`, and `req.user.userId`, call one service function, and shape the HTTP response. They never touch Prisma.
- **Services** own all business rules and all database access, including `prisma.$transaction(...)` boundaries. They are framework-agnostic and directly reusable/testable.
- **Schemas** are Zod contracts for request shapes (including `params`, `query`, `body`).

Every module is mounted under `/api` by `routes/index.ts`, and the global error handler is attached last in `app.ts`.

### 2.3 Request lifecycle

```
Incoming request
  → cors
  → express.json (parse body)
  → /api router
     → authenticate      (verify JWT, attach req.user = { userId, role })
     → requireRole(...)  (role gate, 403 on failure)
     → validate(schema)  (Zod parse, 400 with field-level details)
     → controller        (extract input, call service)
       → service         (business rules, prisma.$transaction)
     → res.json
  → errorHandler (central fallback for thrown errors)
```

---

## 3. Technology Stack

### Frontend (`client/`)

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS v4, `tw-animate-css`, OKLCH design tokens |
| Component system | shadcn/ui style primitives built on `radix-ui`, `class-variance-authority`, `tailwind-merge`, `clsx` |
| Icons | Hugeicons (`@hugeicons/react` + core-free-icons), plus a few Lucide icons in the landing hero |
| Charts | Recharts 2.15 |
| Animation | `motion` (Framer Motion successor) |
| Theming | `next-themes` (light/dark/system) |
| Notifications | `sonner` toasts |
| Validation | Zod 4 (available in client deps) |
| Data access | Native `fetch` via a single `lib/api.ts` wrapper; JWT in `localStorage` |

### Backend (`server/`)

| Concern | Choice |
|---|---|
| Runtime | Node.js, TypeScript (`ts-node` in dev, CommonJS output) |
| Web framework | Express 5 |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Database | PostgreSQL (`pg` Pool) |
| Validation | Zod 4 |
| Auth | `jsonwebtoken` (HS256, 1-day expiry) + `bcrypt` |
| CORS | `cors` (wide open in dev) |
| Config | `dotenv` |

### Tooling
- `nodemon` for watch-mode restarts.
- Prisma CLI driven by `prisma7.config.ts`.
- Generated Prisma client output is git-ignored at `server/src/generated/prisma`.

---

## 4. Repository Layout

```
Ecommerce/
├── PRD-sheet-cover-erp.md          # Original product requirements document
├── README.md                       # This file
├── client/                         # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout, metadata, Providers
│   │   │   ├── page.tsx            # Landing page (Hero)
│   │   │   ├── globals.css         # Tailwind v4 + design tokens
│   │   │   ├── login/page.tsx      # Login / first-owner signup
│   │   │   └── (dashboard)/        # Authenticated route group
│   │   │       ├── layout.tsx      # Sidebar + topbar + auth guard
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── products/page.tsx
│   │   │       ├── products/[id]/page.tsx
│   │   │       ├── orders/page.tsx
│   │   │       ├── orders/[id]/page.tsx
│   │   │       ├── inventory/page.tsx
│   │   │       ├── production/page.tsx
│   │   │       ├── production/jobs/[id]/page.tsx
│   │   │       ├── finance/page.tsx
│   │   │       └── users/page.tsx
│   │   ├── components/
│   │   │   ├── auth/auth-provider.tsx
│   │   │   ├── layout/ (sidebar, topbar, providers, theme)
│   │   │   ├── landing/hero.tsx
│   │   │   ├── status-badge.tsx
│   │   │   └── ui/ (shadcn-style primitives)
│   │   ├── hooks/use-mobile.ts
│   │   ├── lib/api.ts, utils.ts, hugeicons.ts
│   │   └── types/index.ts          # Shared DTO types
│   ├── .env.example
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   └── package.json
│
└── server/                         # Express API
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts                 # Rich demo dataset
    ├── src/
    │   ├── app.ts                  # Express app assembly
    │   ├── server.ts               # HTTP listen entry point
    │   ├── config/
    │   │   ├── env.ts              # (currently empty placeholder)
    │   │   └── prisma.ts           # PrismaClient + pg adapter singleton
    │   ├── lib/validate.ts         # Zod middleware factory
    │   ├── middleware/
    │   │   ├── auth.middleware.ts
    │   │   ├── rbac.middleware.ts
    │   │   └── error.middleware.ts
    │   ├── modules/
    │   │   ├── auth/ users/ products/ orders/
    │   │   ├── inventory/ production/ finance/ activityLog/
    │   └── routes/index.ts
    ├── prisma7.config.ts
    ├── nodemon.json
    ├── tsconfig.json
    └── package.json
```

---

## 5. Data Model

The Prisma schema (`server/prisma/schema.prisma`) defines a small, highly-related graph. Three modeling principles drive it:

1. **Append-only ledgers.** `StockLedgerEntry` and `LedgerEntry` are never updated or deleted. Balances are always derived by aggregation.
2. **State is typed.** `Order.status` and `ProductionJob.stage` are enums, and transitions are enforced in services rather than left to free-form strings.
3. **Every mutation leaves a trace.** `ActivityLog` is written from the same transaction as the change it describes.

### 5.1 Entities

| Model | Purpose | Key fields |
|---|---|---|
| `User` | Owner/staff account | `id`, `name`, `email @unique`, `passwordHash`, `role(OWNER\|STAFF)`, `isActive` |
| `ActivityLog` | Append-only audit trail | `userId`, `action`, `entityType`, `entityId`, `details Json?` |
| `Product` | Catalog item (raw material or finished good) | `id`, `sku @unique`, `name`, `price Decimal(10,2)` |
| `BomLine` | Bill-of-materials edge | `parentProductId`, `componentProductId`, `quantityRequired` |
| `Order` | Sales order header | `customerName`, `status`, `createdById`, timestamps |
| `OrderItem` | Order line | `orderId`, `productId`, `quantity Int`, `unitPrice Decimal` |
| `StockLedgerEntry` | Inventory movement | `productId`, `type`, `quantity Int`, `orderId?`, `userId`, `note?` |
| `LedgerEntry` | Accounting journal line | `orderId?`, `account`, `debit Decimal`, `credit Decimal`, `userId` |
| `ProductionJob` | Auto-generated stage-gate run | `orderId`, `productId`, `quantity`, `stage` |
| `ProductionStageLog` | Immutable stage transition | `productionJobId`, `stage`, `userId`, `note?` |
| `WorkOrder` | Manually planned manufacturing run | `productId`, `quantity`, `status(PLANNED\|COMPLETED)`, `createdById` |

### 5.2 Enums

```
Role               OWNER | STAFF
OrderStatus        PENDING | CONFIRMED | IN_PRODUCTION | DISPATCHED | DELIVERED | CANCELLED
StockMovementType  STOCK_IN | STOCK_OUT | ADJUSTMENT | PRODUCTION_YIELD
LedgerAccount      REVENUE | ACCOUNTS_RECEIVABLE | CASH | COGS | INVENTORY_VALUE
ProductionStage    QUEUED | CUTTING | STITCHING | QUALITY_CHECK | COMPLETED
WorkOrder.status   PLANNED | COMPLETED   (string field, not an enum)
```

### 5.3 Entity relationships

```
User 1──n Order (createdBy)
User 1──n StockLedgerEntry
User 1──n LedgerEntry
User 1──n ProductionStageLog
User 1──n ActivityLog
User 1──n WorkOrder (createdBy)

Product 1──n OrderItem
Product 1──n StockLedgerEntry
Product 1──n ProductionJob
Product 1──n WorkOrder
Product 1──n BomLine (as parentProduct)   ── finished good
Product 1──n BomLine (as componentProduct) ── raw material

Order 1──n OrderItem
Order 1──n StockLedgerEntry
Order 1──n LedgerEntry
Order 1──n ProductionJob

ProductionJob 1──n ProductionStageLog
```

> **Note:** the Prisma schema declares the datasource without an inline `url`; the connection string is supplied through `prisma7.config.ts` for CLI operations and through `DATABASE_URL` for the runtime driver adapter.

---

## 6. Backend Deep Dive

### 6.1 Application bootstrap

`server/src/app.ts` — tiny and explicit:

```ts
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);      // all module routers
app.use(errorHandler);        // central fallback
```

`server/src/server.ts` starts the listener on `process.env.PORT || 5000`.

### 6.2 Prisma client with the pg driver adapter

`server/src/config/prisma.ts` creates a single `PrismaClient` backed by a `pg` connection pool:

```ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
```

Using a driver adapter gives direct control over the Postgres pool rather than relying on Prisma's built-in engine connection handling.

### 6.3 Authentication middleware

`middleware/auth.middleware.ts` reads the `Authorization: Bearer <token>` header, verifies it against `JWT_SECRET`, and attaches the decoded payload (`{ userId, role }`) to `req.user`. Missing or invalid tokens get `401`.

### 6.4 RBAC middleware

`middleware/rbac.middleware.ts` exposes a factory:

```ts
export const requireRole = (...roles: string[]) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  }
  next();
};
```

Usage: `router.post('/', authenticate, requireRole('OWNER'), validate(schema), handler)`.

### 6.5 Validation middleware

`lib/validate.ts` accepts a Zod schema shaped as `{ body?, query?, params? }`, parses the request, and on failure returns a structured `400`:

```json
{
  "error": "Validation failed",
  "details": [{ "field": "body.price", "message": "Price must be greater than zero" }]
}
```

Because the middleware only validates (it does not reassign parsed/coerced values), controllers perform explicit conversions such as `Number(quantity)`.

### 6.6 Error handling

- Controllers use `try/catch` and respond with domain-appropriate status codes (`400`, `401`, `403`, `404`, `500`).
- `middleware/error.middleware.ts` is the final safety net: it logs and returns `{ error: message }` using `err.statusCode` when present, otherwise `500`.
- Service functions throw plain `Error`s with human-readable messages; controllers surface `error.message`.

### 6.7 Transactions

All multi-write operations run inside `prisma.$transaction(async (tx) => { ... })`:

- `orders.confirmOrder` — stock deductions + ledger pair + production jobs + status change + activity log.
- `orders.dispatchOrder` / `deliverOrder` / `cancelOrder` — status change + activity log.
- `inventory.manualStockAdjustment` — ledger row + activity log.
- `production.createWorkOrder` / `completeWorkOrder` / `advanceJobStage` — creation/status/yield + related rows.

If any step throws, the whole unit rolls back.

---

## 7. Frontend Deep Dive

### 7.1 App Router structure

- `/` — public landing page rendering `components/landing/hero.tsx`.
- `/login` — login and first-owner signup in one page (mode toggle).
- `(dashboard)/` — a **route group** whose `layout.tsx` is a client component acting as the auth guard. If there is no session once loading finishes, it redirects to `/login`. While loading it shows a branded skeleton (`SC`).
- All dashboard pages are **client components** (`"use client"`) that fetch from the API on mount and hold server data in local state.

### 7.2 Global providers

`components/layout/providers.tsx` composes:

```
ThemeProvider (next-themes: class strategy, system default)
└── TooltipProvider
    └── AuthProvider
        ├── {children}
        └── <Toaster /> (sonner)
```

### 7.3 Auth provider

`components/auth/auth-provider.tsx` exposes `{ user, loading, login, logout, isOwner }`:

- On mount, if a token exists it calls `GET /auth/me` to hydrate the session; failures clear the token.
- `login()` posts to `/auth/login`, stores the token with `setToken`, and stores the user.
- `logout()` clears the token, resets state, and routes to `/login`.
- `isOwner` gates owner-only UI (Finance, Users, and create/edit controls).

### 7.4 API client

`lib/api.ts` is the only place that talks to the backend:

- Resolves `NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api`).
- Automatically attaches `Authorization: Bearer <token>` from `localStorage`.
- Serializes JSON bodies and sets `Content-Type`.
- Throws a typed `ApiError(status, message, details)` on non-2xx responses.
- On `401` (for non-auth routes) it clears the token and hard-redirects to `/login`.

### 7.5 UI system

- `components/ui/` holds shadcn-style Radix primitives (dialog, sheet, select, table, tabs, switch, dropdown, tooltip, chart, sidebar, etc.).
- `components/status-badge.tsx` centralizes the color language for order statuses, work-order statuses, ledger accounts, production stages, and stock movement types.
- `lib/utils.ts` provides `cn()` plus `en-IN` INR currency and date/datetime formatters. Prisma `Decimal` values arrive as strings over JSON and are formatted at display time only.
- `lib/hugeicons.ts` re-exports the specific Hugeicons used across the app (keeps icon imports tree-shakeable and consistent).

### 7.6 Pages at a glance

| Route | Responsibility |
|---|---|
| `/dashboard` | Aggregates orders, stock, ledger and work orders into KPIs and charts. Gracefully tolerates non-owner access to finance (catches the 403). |
| `/products` | Catalog table with stock badges, product creation (owner), inline edit (owner), link to detail. |
| `/products/[id]` | Selling price, BOM material cost, gross margin %, available stock, BOM table, add-component dialog (owner). |
| `/orders` | Filterable order table, multi-line order creation dialog with running total, and per-row Confirm / Dispatch / Deliver / Cancel actions plus a quick-view sheet. |
| `/orders/[id]` | Lifecycle stepper, line items, stock-ledger deductions, finance journal entries, customer dossier, and action buttons. |
| `/inventory` | Ledger-derived stock levels with out/low stock badges, Stock In + Adjust dialogs (owner), and a movement-history sheet. |
| `/production` | Two tabs — Stage-Gate Jobs (filterable, advance action, passport link, UUID lookup) and Work Orders (create + complete). |
| `/production/jobs/[id]` | "Product Passport": visual stage stepper, immutable stage audit log, manufacturing dossier, advance action. |
| `/finance` | Five account cards with Dr/Cr balances, accounting position summary, and the full journal ledger with account filter. |
| `/users` | Staff table (role select, active switch) and the Audit Activity Log tab with per-user filtering. |

---

## 8. Core Business Workflows

### 8.1 Order lifecycle (state machine)

```
                   confirm
   PENDING ───────────────────► CONFIRMED ──────────► DISPATCHED ──► DELIVERED
      │                             │   ▲                 
      │ cancel                      │   └──── (IN_PRODUCTION allowed)
      ▼                             │ dispatch
   CANCELLED ◄──────────────────────┘ cancel
                    cancel (also from IN_PRODUCTION)
```

Allowed transitions, enforced in `orders.service.ts`:

| From | Action | To |
|---|---|---|
| `PENDING` | confirm | `CONFIRMED` |
| `CONFIRMED`, `IN_PRODUCTION` | dispatch | `DISPATCHED` |
| `DISPATCHED` | deliver | `DELIVERED` |
| `PENDING`, `CONFIRMED`, `IN_PRODUCTION` | cancel | `CANCELLED` |

`DISPATCHED` and `DELIVERED` orders can never be cancelled.

### 8.2 Order confirmation — the high-signal transaction

`PATCH /api/orders/:id/confirm` is the heart of the system. In one `$transaction` it:

1. Loads the order (with items) and asserts it is `PENDING`.
2. Computes `totalAmount = Σ(unitPrice × quantity)`.
3. For each item:
   - appends `StockLedgerEntry { type: STOCK_OUT, quantity: -qty, orderId, userId }`;
   - if the product has one or more `BomLine`s, creates a `ProductionJob { stage: QUEUED }`.
4. Posts the double-entry pair:
   - **Debit** `ACCOUNTS_RECEIVABLE` `totalAmount`
   - **Credit** `REVENUE` `totalAmount`
5. Sets `Order.status = CONFIRMED`.
6. Writes an `ActivityLog` (`action: "order_confirmed"`, with `{ totalAmount, itemsCount }`).

```
PATCH /orders/:id/confirm
        │
        ▼
┌───────────────────────── prisma.$transaction ─────────────────────────┐
│ validate PENDING                                                      │
│ for each item:                                                        │
│    └─ insert STOCK_OUT (-qty)                                         │
│    └─ if product.bomLines.length > 0 → insert ProductionJob(QUEUED)   │
│ insert LedgerEntry(AR debit = total)                                  │
│ insert LedgerEntry(REVENUE credit = total)                            │
│ update Order.status = CONFIRMED                                       │
│ insert ActivityLog(order_confirmed)                                   │
└───────────────────────────────────────────────────────────────────────┘
        │  (any failure → full rollback)
        ▼
   200 + updated order
```

### 8.3 Inventory — the append-only ledger

Current stock is **never** a column. It is derived:

```ts
const grouped = await prisma.stockLedgerEntry.groupBy({
  by: ['productId'],
  _sum: { quantity: true },
});
```

Movement types and their sign convention:

| Type | Direction | Created by |
|---|---|---|
| `STOCK_IN` | `+` | Manual restock, work-order completion |
| `STOCK_OUT` | `−` | Order confirmation |
| `ADJUSTMENT` | `±` | Owner reconciliation |
| `PRODUCTION_YIELD` | `+` | Stage-gate job reaching `COMPLETED` |

This gives a complete, replayable history: the API exposes `/inventory/:productId/movements` and the UI renders it in a side sheet with actor and note.

### 8.4 Production — stage-gate jobs and work orders

**Stage-gate Production Jobs** are created automatically on order confirmation when a product has a BOM.

```
QUEUED ─► CUTTING ─► STITCHING ─► QUALITY_CHECK ─► COMPLETED
                  (one step per advance call)
```

`PATCH /production/jobs/:id/advance`:

1. Loads the job and computes the next stage from the fixed sequence.
2. Rejects advancing past `COMPLETED` or from an unknown stage.
3. Updates `ProductionJob.stage`.
4. Inserts an immutable `ProductionStageLog { stage, userId, note }` (the "Product Passport").
5. If the new stage is `COMPLETED`, appends a `PRODUCTION_YIELD` stock entry for `job.quantity`.

**Work Orders** are a separate, manually planned track. `POST /production` creates a `PLANNED` work order; `PATCH /production/:id/complete` marks it `COMPLETED` and appends a `STOCK_IN` entry for the planned quantity.

### 8.5 Finance — simplified double-entry

Every financial fact is a row with a `debit` and/or `credit` against one of five accounts.

- Balances are aggregated per account:
  ```ts
  const grouped = await prisma.ledgerEntry.groupBy({
    by: ['account'],
    _sum: { debit: true, credit: true },
  });
  ```
- Balance convention: `REVENUE = credit − debit`; all other accounts `= debit − credit`.
- Order confirmation posts `AR (Dr) / REVENUE (Cr)`.
- The seed also demonstrates settlement (`CASH Dr / AR Cr`) and inventory valuation (`INVENTORY_VALUE Dr / CASH Cr`, `COGS Dr / INVENTORY_VALUE Cr`).

### 8.6 Activity logging

Writes to `ActivityLog` occur inside the same transaction as the action they describe. Actions currently emitted include:

`order_confirmed`, `order_dispatched`, `order_delivered`, `order_cancelled`, `stock_adjusted`, `work_order_created`, plus a seeded `system_initialized` and illustrative stage entries.

> The Production page reads stage-gate jobs directly from `GET /api/production/jobs` (with an optional `?stage=` filter), so every authenticated user sees the full list regardless of browser or role.

---

## 9. API Reference

Base URL: `/api`. All endpoints require a valid JWT unless marked **Public**. Errors are consistently `{ "error": string }` (validation errors add `details: [{ field, message }]`).

### 9.1 Auth — `/api/auth`

| Method | Path | Description | Access |
|---|---|---|---|
| POST | `/auth/signup` | Create the first owner account (disabled after any user exists) | Public |
| POST | `/auth/login` | Verify credentials, return `{ token, user }` | Public |
| GET | `/auth/me` | Current user profile (no password hash) | Auth |

### 9.2 Users — `/api/users`

| Method | Path | Description | Access |
|---|---|---|---|
| POST | `/users` | Create a staff/owner account (`name`, `email`, `password`, `role`; bcrypt-hashed) | OWNER |
| GET | `/users` | List users (no password hashes) | OWNER |
| PATCH | `/users/:id` | Update `role` and/or `isActive` | OWNER |
| GET | `/users/:id/activity` | Activity log for a specific user | OWNER |

`POST /users` is validated by `users.schema.ts` (Zod), rejects duplicate emails, and writes a `user_created` row to the `ActivityLog`.

### 9.3 Products — `/api/products`

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/products` | List products (newest first) | Auth |
| GET | `/products/:id` | Product detail including BOM lines with component products | Auth |
| POST | `/products` | Create a product (unique SKU) | OWNER |
| PATCH | `/products/:id` | Update name/price | OWNER |
| POST | `/products/:id/bom` | Add a BOM line (`componentId`, `quantity`) | OWNER |

### 9.4 Orders — `/api/orders`

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/orders` | List orders with items, products and creator | Auth |
| GET | `/orders/:id` | Order detail incl. stock movements, ledger entries, creator | Auth |
| POST | `/orders` | Create order in `PENDING` | Auth |
| PATCH | `/orders/:id/confirm` | Confirm (stock + ledger + production + status) | Auth |
| PATCH | `/orders/:id/dispatch` | `CONFIRMED`/`IN_PRODUCTION` → `DISPATCHED` | Auth |
| PATCH | `/orders/:id/deliver` | `DISPATCHED` → `DELIVERED` | Auth |
| PATCH | `/orders/:id/cancel` | Pre-dispatch → `CANCELLED` | Auth |

### 9.5 Inventory — `/api/inventory`

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/inventory/stock` | Ledger-derived current stock for every product | Auth |
| GET | `/inventory/:productId/movements` | Full movement history with actor | Auth |
| POST | `/inventory/stock-in` | Manual restock (`STOCK_IN`) | OWNER |
| POST | `/inventory/adjust` | Manual correction (`ADJUSTMENT`) | OWNER |

### 9.6 Production — `/api/production`

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/production` | List **work orders** with product | Auth |
| POST | `/production` | Create a work order (`PLANNED`) | OWNER (route lists `MANAGER` too, but that role does not exist) |
| PATCH | `/production/:id/complete` | Complete work order, adds stock | OWNER |
| GET | `/production/jobs` | List stage-gate jobs with product and order (`?stage=QUEUED` filters) | Auth |
| GET | `/production/jobs/:id` | Production job detail with product, stage logs and order | Auth |
| PATCH | `/production/jobs/:id/advance` | Advance stage (writes passport log; yields stock at completion) | OWNER |

### 9.7 Finance — `/api/finance`

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/finance/ledger` | All journal entries, newest first, with linked order | OWNER |
| GET | `/finance/summary` | Aggregated `{ account, debit, credit, balance }` per account | OWNER |

### 9.8 Activity Log — `/api/activity-logs`

| Method | Path | Description | Access |
|---|---|---|---|
| GET | `/activity-logs` | Full audit trail with actor, newest first | OWNER |

### 9.9 Example requests

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@sheetcover.com","password":"Password@123"}'

# Create an order
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"customerName":"Apex Fleet","items":[{"productId":"<uuid>","quantity":2,"unitPrice":2899}]}'

# Confirm it (deducts stock, posts ledger, queues production)
curl -X PATCH http://localhost:5000/api/orders/<orderId>/confirm \
  -H "Authorization: Bearer $TOKEN"
```

---

## 10. Roles & Permissions

| Capability | OWNER | STAFF |
|---|---|---|
| View dashboard, products, orders, inventory, production | ✅ | ✅ |
| Create/edit products, BOM | ✅ | ❌ |
| Create/confirm/dispatch/deliver/cancel orders | ✅ | ✅ |
| Stock In / Stock Adjust | ✅ | ❌ |
| Create/complete work orders, advance jobs | ✅ | ❌ |
| View finance ledger/summary | ✅ | ❌ (403) |
| Manage users & view activity log | ✅ | ❌ (403) |
| First-run signup | ✅ (only once) | — |

Frontend hides owner-only navigation and controls via `isOwner`; the backend independently enforces the same rules with `requireRole('OWNER')` — UI gating is convenience, not security.

---

## 11. Getting Started

### 11.1 Prerequisites

- **Node.js** 20+ (18 likely works; React 19 / Next 15 prefer modern Node).
- **PostgreSQL** 14+ running locally (the committed dev URL uses port `5433`).
- npm (or a compatible package manager).

### 11.2 Environment variables

**Backend — create `server/.env`:**

```env
DATABASE_URL="postgresql://<user>:<password>@127.0.0.1:5433/sheet_cover_erp?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=5000
```

> The repository currently contains a committed `server/.env` with local development values. Treat it as a local default only and replace the secret in any real deployment. Never commit production secrets.

**Frontend — create `client/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

(`client/.env.example` documents this.) If omitted, the client defaults to `http://localhost:5000/api`.

### 11.3 Install

```bash
# from the repository root
cd server
npm install

cd ../client
npm install
```

### 11.4 Prepare the database

```bash
cd server

# Generate the Prisma client
npx prisma generate

# Create/push the schema to PostgreSQL (no migration files are committed)
npx prisma db push

# Load the rich demo dataset (wipes existing rows first)
npx ts-node prisma/seed.ts
```

Alternative: run `npx prisma migrate dev --name init` if you prefer versioned migrations, then seed.

### 11.5 Run the apps

Open two terminals:

```bash
# Terminal 1 — API on http://localhost:5000
cd server
npm run dev

# Terminal 2 — web app on http://localhost:3000
cd client
npm run dev
```

Then open <http://localhost:3000>, sign in with a demo account, or use **Create owner account** if the database has no users.

### 11.6 Production build

```bash
cd client
npm run build
npm run start
```

The API runs in dev via `ts-node` (`npm run dev`); in production `npm run start` runs it under `tsx`. See [DEPLOY.md](DEPLOY.md) for the full Render + Vercel + Prisma Postgres guide.

---

## 12. Demo Data & Credentials

`server/prisma/seed.ts` wipes every table and builds a realistic dataset:

- **5 users** — 1 owner and 4 staff (all share the password `Password@123`):

  | Name | Email | Role |
  |---|---|---|
  | Rajesh Sharma | `owner@sheetcover.com` | OWNER |
  | Vikram Singh | `vikram@sheetcover.com` | STAFF |
  | Priya Patel | `priya@sheetcover.com` | STAFF |
  | Rahul Verma | `rahul@sheetcover.com` | STAFF |
  | Ananya Roy | `ananya@sheetcover.com` | STAFF |

- **10 products** — 6 raw materials (vinyl, foam, elastic, thread, piping) and 4 finished goods (sedan, SUV, hatchback, truck covers).
- **BOMs** for each finished good.
- **Opening inventory** across all 10 products.
- **6 orders** spanning `DELIVERED`, `DISPATCHED`, `IN_PRODUCTION`, `CONFIRMED`, `PENDING` (ready to confirm yourself) and `CANCELLED`, with matching stock and ledger entries.
- **3 production jobs** at different stages (one `STITCHING`, one `CUTTING`, one `COMPLETED` with yield) and full stage-passport histories.
- **2 work orders** (one `PLANNED`, one `COMPLETED` with stock yield).
- **Inventory valuation / COGS** journal entries and an audit activity log.

> The seeded emails still use the `sheetcover.com` domain; the web UI placeholders use `sheetsandcovers.com`. Both are demo values.

---

## 13. Design Decisions & Trade-offs

1. **Modular monolith over microservices.** At this scale a message queue, service mesh, or multiple deployables add operational cost with no business benefit. Modules are still isolated by folder and layered internally, so extraction remains possible if needed.
2. **Append-only ledgers for stock and finance.** Storing a mutable `quantity`/`balance` column invites drift and race conditions. Deriving by `SUM` is trivially correct and gives a free audit trail; the cost is aggregation work at read time, which is negligible at shop scale.
3. **Enforced state machines.** `OrderStatus` and `ProductionStage` are enums with transitions checked in services, preventing invalid jumps like `PENDING → DELIVERED` at the source of truth.
4. **Transactions around every multi-write.** Order confirmation alone touches five tables; wrapping it in `$transaction` guarantees "all or nothing" consistency.
5. **Validation at the edge with Zod.** Schemas live in the module, are reused by routes, and produce field-level error payloads the client can display.
6. **Stateless JWT auth.** No server session store; the token carries `userId` and `role`. Simple to scale horizontally, at the cost of revocation being limited to token expiry (1 day).
7. **A single fetch client on the frontend.** Every call goes through `lib/api.ts`, centralizing auth headers, JSON handling, typed errors, and the 401 redirect.
8. **shadcn-style UI on Radix + Tailwind v4.** Components are vendored into the repo, themeable through CSS custom properties, and use OKLCH color tokens — no heavyweight component library lock-in.
9. **Server-derived, client-rendered views.** The dashboard and module pages are client components fetching on mount. This keeps the API as the single source of truth and keeps pages simple, at the cost of no server-side data fetching/caching yet.
10. **Driver-adapter Prisma.** Using `PrismaPg` with a `pg` pool keeps connection management explicit and avoids an extra query engine layer.

---

## 14. Known Limitations & Gaps

These are real and worth knowing before contributing:

1. **`MANAGER` role does not exist.** Production routes call `requireRole('OWNER', 'MANAGER')`, but the `Role` enum only has `OWNER` and `STAFF`, so staff cannot manage production despite the UI sometimes implying shared access.
2. **No stock-availability check on order confirmation.** Confirmation will drive stock negative. There is also no BOM component consumption on confirmation — BOMs currently only decide whether a production job is created.
3. **`ActivityLog` coverage is partial.** Stage advances write `ProductionStageLog` but not `ActivityLog`, and `stock-in`/work-order completion do not all write activity rows.
4. **`addStockIn` lacks an activity-log write** while `manualStockAdjustment` has one — an inconsistency.
5. **`POST /inventory/adjust` reuses `stockInSchema`**, which requires a positive integer, so negative corrections are impossible through the API even though the `ADJUSTMENT` type is documented as signed.
6. **`server/src/config/env.ts` is empty** — environment variables are not centrally validated.
7. **No automated tests.** `server`'s `test` script is a placeholder and there is no client test runner, lint script, or CI workflow. `next.config.ts` ignores ESLint during builds.
8. **No Prisma migrations committed.** Schema changes currently rely on `prisma db push`.
9. **The "e-commerce" half is aspirational.** There is no public storefront/cart/checkout; the system is an internal ERP. Payment processing is explicitly out of scope.
10. **Dashboard finance data is silently dropped for staff** via `.catch(() => [])`, so a staff dashboard shows zero revenue/receivables by design.
11. **Single business / single location.** No multi-tenant or multi-warehouse support.

---

## 15. Security Notes

- Passwords are hashed with `bcrypt` (cost factor 10) and never returned by the API.
- JWTs are signed HS256 and expire in **1 day**; there is no refresh-token rotation.
- Tokens are stored in `localStorage`, which is readable by JavaScript and therefore exposed to XSS. A hardened deployment should prefer `httpOnly`, `Secure`, `SameSite` cookies (the PRD itself prefers cookies).
- By default `cors()` is wide open for local development; in production set `CORS_ORIGIN` (comma-separated allowed origins) to restrict it.
- `JWT_SECRET` and the development `DATABASE_URL` are present in `server/.env`. Rotate/remove these for any real environment and add `.env` to `.gitignore` (it already is in `server/.gitignore`, so ensure it is not force-added).
- Role checks are enforced server-side; the client-side `isOwner` gating is defense-in-depth only.
- There is no rate limiting, account lockout, password-reset flow, or input size limit beyond `express.json` defaults.

---

## 16. Roadmap

Suggested next steps, roughly in priority order:

1. Either introduce a real `MANAGER` role or drop the references to it.
2. Validate stock availability (and optionally explode BOM components) on order confirmation.
3. Write `ActivityLog` entries for every mutation for a complete audit trail.
4. Add migrations to version control and wire `prisma db seed`.
5. Introduce tests: service-level unit tests on the order/production state machines, plus API integration tests.
