# Multi-Tenant CRM SaaS Platform

Production-ready modular CRM SaaS built with Next.js 15, Prisma, PostgreSQL (Supabase), and Auth.js.

## Features

- **Super Admin Portal** — Manage companies, subscriptions, module toggles, impersonation, analytics
- **Multi-Tenant Architecture** — Shared database with `companyId` isolation on all tenant data
- **25 Configurable Modules** — Leads, Contacts, Deals, Tasks, Calendar, Invoices, and more
- **RBAC** — Role-based permissions per company (Owner, Admin, Manager, Sales, Support, Marketing, Custom)
- **Feature Toggles** — Enable/disable modules per company from Super Admin
- **Custom Fields** — Dynamic fields for Leads, Contacts, Deals, Companies, Tickets
- **White Labeling** — Logo, brand color, display name per company
- **Workflow Automation** — Triggers and actions (email, task, webhook, field update)
- **AI Assistant** — OpenAI-powered CRM insights (when module enabled)
- **Billing** — PayPal + Paddle subscription integration with plan limits
- **Dashboards** — Executive, Sales, and Support dashboards

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, TypeScript, TailwindCSS, ShadCN UI |
| Backend | Next.js API Routes |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 7 |
| Auth | Auth.js v5 (JWT) — Email + Google OAuth |
| Payments | PayPal Subscriptions + Paddle Billing |
| AI | OpenAI API |
| Deploy | Vercel |

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` — Supabase pooler connection string
- `DIRECT_URL` — Supabase direct connection (for migrations)
- `AUTH_SECRET` / `NEXTAUTH_SECRET` — Random secret (`openssl rand -base64 32`)
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev

Optional:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`
- `PADDLE_API_KEY` / `PADDLE_WEBHOOK_SECRET`
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`

### 3. Database setup

```bash
npx prisma db push
npm run db:seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@crm.local | admin123 |
| Company Owner | demo@acme.local | admin123 |

Demo company: `/app/acme`

## Deployment (Vercel + Supabase)

1. Create a [Supabase](https://supabase.com) project
2. Copy `DATABASE_URL` (pooler, port 6543) and `DIRECT_URL` (port 5432)
3. Create a [Vercel](https://vercel.com) project and link this repo
4. Add all environment variables from `.env.example`
5. Configure Google OAuth redirect: `https://your-domain.com/api/auth/callback/google`
6. Set PayPal webhook: `https://your-domain.com/api/webhooks/paypal`
7. Set Paddle webhook: `https://your-domain.com/api/webhooks/paddle`
8. Deploy and run migrations:

```bash
npx prisma migrate deploy
npm run db:seed
```

9. For white-label custom domains, add domains in Vercel and set `Company.customDomain`

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, register
│   ├── (platform)/          # Super Admin portal
│   ├── (tenant)/app/[slug]/ # Company CRM app
│   └── api/
│       ├── auth/            # Auth.js + registration
│       ├── platform/        # Super Admin APIs
│       ├── v1/[tenantSlug]/ # Tenant-scoped module APIs
│       └── webhooks/        # PayPal + Paddle
├── components/
│   ├── ui/                  # ShadCN components
│   ├── shared/              # DataTable, ModulePage, CustomFields
│   └── tenant/              # Sidebar, theme
├── lib/
│   ├── auth/                # Auth.js config
│   ├── tenant/              # Tenant resolution, Prisma extension
│   ├── modules/             # Module registry + manifests
│   ├── permissions/         # RBAC
│   ├── billing/             # PayPal + Paddle providers
│   ├── automation/          # Workflow engine
│   └── ai/                  # OpenAI client
└── modules/                 # Module manifests (extensible)
prisma/
├── schema.prisma            # Full database schema (~50 models)
└── seed.ts                  # Modules, permissions, plans, demo data
```

## API Architecture

### Tenant APIs
```
GET/POST   /api/v1/{tenantSlug}/leads
GET/PATCH  /api/v1/{tenantSlug}/deals/{id}
POST       /api/v1/{tenantSlug}/deals/{id}/move
POST       /api/v1/{tenantSlug}/ai/chat
GET        /api/v1/{tenantSlug}/dashboard?type=executive
```

### Platform APIs (Super Admin)
```
GET/POST   /api/platform/companies
PATCH      /api/platform/companies/{id}/modules
POST       /api/platform/companies/{id}/impersonate
GET        /api/platform/analytics
```

## Security

- Tenant isolation via `companyId` on all queries
- API middleware chain: Auth → Tenant → Module → Permission
- Audit logs for admin actions and impersonation
- Plan limit enforcement on create operations
- Supabase RLS policies (see `prisma/migrations/rls_policies.sql`)

## License

Private — All rights reserved.
