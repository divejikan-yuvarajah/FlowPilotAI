# FlowPilot AI 🚀

<div align="center">

### The AI CFO for Sri Lankan SMEs
**Predict. Protect. Optimize.**

[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

<br/>

[🌐 Live Demo](https://flowpilot-ai.vercel.app) · [📹 Video Walkthrough](#) · [📄 Documentation](#) · [🐛 Report Bug](https://github.com/yourusername/flowpilotai/issues)

<br/>

> Built for **Cursor Colombo 24H Buildathon** · Seylan Bank API Track 🏆

</div>

---

## 📌 The Problem

Every day, **300,000 Sri Lankan SME owners** run their businesses financially blind.

- They check their bank balance on the Seylan mobile app every morning
- They find out about cash crises **22 days too late**
- They lose **LKR 12 billion every year** to overdue payments
- They cannot afford a CFO (costs LKR 300,000–800,000 per month)
- They use Excel spreadsheets and guesswork

**FlowPilot AI changes this.** For LKR 4,900 per month, every Sri Lankan SME gets a real-time AI-powered CFO that predicts problems, recovers payments, and acts — automatically.

---

## ✨ What is FlowPilot AI?

FlowPilot AI is a **real-time financial operating system** built specifically for Sri Lankan SMEs. It connects to your Seylan Bank account and runs **6 AI engines** that work together to keep your business financially healthy.

```
┌─────────────────────────────────────────────────────────────┐
│                    FlowPilot AI                             │
│                                                             │
│  💰 Live Balance  →  🧠 AI Analysis  →  ⚡ Auto Actions    │
│                                                             │
│  Seylan APIs  +  OpenAI GPT-4o  +  Mastercard MPGS        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Features

### 🏠 War Room Dashboard
Your complete financial command center — one glance tells you everything.
- Live cash position from Seylan Bank (real-time)
- Runway counter in days (color-coded by severity)
- Business Health Score (0–100)
- AI Morning Brief — 5 priorities, generated every morning at 8 AM
- Critical actions list with one-click execution

### 📡 Overdue Radar
Never miss a payment again.
- All overdue invoices ranked by recovery priority
- Client Trust Score (0–100) based on payment history
- Default probability percentage per invoice
- Invoice Health Grade (A / B / C / D / F)
- One-click recovery action

### 🤖 AI Recovery Center *(Multilingual)*
AI-drafted collection messages in **3 languages**.
- **Stage 1** — Warm reminder (friendly tone)
- **Stage 2** — Firm + flexible (professional tone)
- **Stage 3** — Formal demand (legal tone)
- Languages: **English · සිංහල · தமிழ்**
- Embedded JustPay + Mastercard payment links
- Send directly via WhatsApp

### ⚡ Stress Test Simulator
Model worst-case scenarios in real time.
- Toggle client defaults to see impact instantly
- Expense shock slider (+50%)
- Revenue shock slider (-50%)
- AI-generated 5-step survival plan
- Crisis banner activates when runway < 7 days

### 💳 AI CFO Dashboard
Executive-level financial intelligence.
- 90-day burn rate trend chart
- Expense breakdown by 9 categories
- AI recommendations (Urgent / Important / Suggested)
- Anomaly detection on all expenses
- LPOPP statutory payment tracker

### 🏢 Supplier Trust Mirror
Track both sides of your money flow.
- Reliability score per supplier
- Worsening relationship alerts
- CEFTS payment suggestions
- AI relationship health analysis

### 💬 AI Financial Assistant
Ask anything about your business in plain English.
- "How is Nexus Traders performing?"
- "What changed this week?"
- "What should I focus on today?"
- Grounded in your real Supabase data (not general knowledge)

### 🔔 Smart Notifications
Never miss a critical event.
- Real-time in-app notification bell
- Email alerts (HTML templates via Resend)
- Invoice paid celebrations (confetti + sound)
- Daily CFO briefing emails at 8 AM

---

## 🏦 Seylan Bank API Integration

FlowPilot AI integrates all **6 Seylan Bank APIs**:

| API | Status | Used For |
|---|---|---|
| **Balance Inquiry** | ✅ Live | Real-time cash position in topnav + War Room |
| **Transaction History** | ✅ Live | Transaction Feed + AI expense analysis |
| **CEFTS Transfer** | ✅ Live | Interbank payments from Payments Hub |
| **Internal Transfer** | ✅ Live | Intra-Seylan payments |
| **JustPay** | 🔄 Ready | Payment links in recovery messages |
| **LankaQR / Merchant QR** | 🔄 Ready | QR code invoice payments |

**+ Mastercard Payment Gateway (MPGS)** — Accept card payments from any Visa/Mastercard client worldwide via Hosted Checkout.

> ✅ Live = Connected to Seylan sandbox, real API calls at every demo touchpoint  
> 🔄 Ready = Production-ready code, full architecture in place

---

## 🤖 AI Integration

| Engine | Role | Model |
|---|---|---|
| **Payment Prediction** | Forecasts when each invoice will be paid | GPT-4o |
| **Anomaly Detection** | Flags unusual expenses vs 30-day baseline | GPT-4o |
| **AI Recovery** | Drafts tone-calibrated collection messages | GPT-4o |
| **Trust Scoring** | Live 0–100 reliability score per client | GPT-4o |
| **AI CFO Advisor** | Daily briefings + prioritized recommendations | GPT-4o |
| **Expense Intelligence** | Auto-classifies spend + detects leakage | GPT-4o |

**All AI responses are cached** by `(user_id, model, input_hash)` — the same question never costs two API calls. The first daily brief is generated at 8 AM; subsequent views return the cached version at <100ms.

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router) — React Server Components, route handlers
- **TypeScript** (strict mode) — type safety across client and server
- **Tailwind CSS** + **shadcn/ui** — production-quality components
- **Framer Motion** — spring animations for financial counters
- **Recharts** — cash flow charts and expense visualizations
- **Zustand** — global UI state (stress test, crisis mode)
- **TanStack Query** — server state + Supabase Realtime sync

### Backend
- **Next.js Route Handlers** — all API logic server-side, no Express needed
- **Supabase** — PostgreSQL + Auth + Realtime + Row Level Security
- **Zod** — validation on every API route input and AI output
- **Vercel Cron** — scheduled jobs (daily brief at 8 AM, rule evaluation)

### AI & Intelligence
- **OpenAI GPT-4o** — powers all 6 AI engines
- **OpenAI API** — structured JSON outputs, prompt caching
- **Custom engines** — trust scoring, runway projection, reconciliation (pure TypeScript)

### Payments & Banking
- **Seylan Bank API** (sandbox) — balance, transactions, CEFTS, internal transfer
- **Mastercard MPGS** — Hosted Checkout card payment acceptance
- **Resend** — transactional email notifications

### Infrastructure
- **Vercel** — zero-config deployment, edge functions, auto-scaling
- **Supabase** (Singapore region) — closest to Sri Lanka, ~80ms latency
- **Google OAuth** — one-click sign in via Supabase Auth

---

## 🗄️ Database Schema

11 Postgres tables with Row Level Security (every query filtered by `auth.uid()`):

```
users              → business profiles, alert thresholds, plan tier
clients            → client trust scores, payment history
invoices           → status, health grade, risk score, recovery messages
transactions       → Seylan transaction feed, reconciliation, anomaly flags
payments           → CEFTS, MPGS card payments initiated from FlowPilot
suppliers          → supplier reliability scores, obligations
supplier_obligations → what we owe suppliers, payment schedule
expense_baselines  → 30/60/90 day averages per vendor/category
automation_rules   → 12 IF→THEN rule definitions
alert_log          → notification history, rule triggers, outcomes
cfo_briefs         → daily AI briefings, cached recommendations
ai_cache           → cached AI responses by input hash, with TTL
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have these installed:

```bash
node --version    # v20.0.0 or higher
npm --version     # v9.0.0 or higher
```

You will also need accounts at:
- [Supabase](https://supabase.com) — free tier works
- [OpenAI](https://platform.openai.com) — API key needed
- [Vercel](https://vercel.com) — for deployment
- [Resend](https://resend.com) — for email notifications (optional)

### Installation

**Step 1 — Clone the repository**

```bash
git clone https://github.com/yourusername/flowpilotai.git
cd flowpilotai
```

**Step 2 — Install dependencies**

```bash
npm install
```

**Step 3 — Set up environment variables**

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your values (see [Environment Variables](#-environment-variables) below).

**Step 4 — Set up the database**

1. Create a new Supabase project at [supabase.com](https://supabase.com) (select **Singapore** region)
2. Go to **SQL Editor** in your Supabase dashboard
3. Run the schema migration:

```bash
# Copy the contents of supabase/migrations/001_schema.sql
# Paste into Supabase SQL Editor → Run
```

4. Run the RLS policies:

```bash
# Copy the contents of supabase/migrations/002_rls.sql
# Paste into Supabase SQL Editor → Run
```

**Step 5 — Configure Supabase Auth**

1. Supabase Dashboard → Authentication → Providers → Email → Enable, turn OFF "Confirm email"
2. Authentication → URL Configuration → Site URL: `http://localhost:3000`

*(Optional) For Google Sign-In:*
1. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com)
2. Supabase → Authentication → Providers → Google → paste Client ID + Secret

**Step 6 — Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the FlowPilot AI landing page.

**Step 7 — Seed demo data**

After signing up, the onboarding page has a "Skip to dashboard" button that calls:

```bash
POST http://localhost:3000/api/seed
```

This creates 3 demo clients, 8 invoices, 84 transactions, 4 suppliers, 12 automation rules, and pre-warms the AI cache.

---

## 🔑 Environment Variables

Create a `.env.local` file in the root directory:

```env
# ─── Supabase ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ─── OpenAI ────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ─── Seylan Bank Sandbox ───────────────────────────────────────
# Provided by Cursor Buildathon / Seylan Bank team
SEYLAN_API_BASE_URL=http://34.21.206.87:3000
SEYLAN_API_KEY=your-seylan-api-key
SEYLAN_MODE=live                          # 'live' or 'simulator'
SEYLAN_TEST_SOURCE_ACCOUNT=064000012548001
SEYLAN_TEST_INTERNAL_DEST=001213437904100
SEYLAN_TEST_CEFTS_DEST_ACCOUNT=12345678
SEYLAN_TEST_CEFTS_DEST_BANK=6990
SEYLAN_REQUEST_TIMEOUT_MS=20000

# ─── Mastercard Payment Gateway (MPGS) ─────────────────────────
# Provided by Seylan Bank team
MPGS_BASE_URL=https://test-seylan.mtf.gateway.mastercard.com
MPGS_API_VERSION=73
MPGS_MERCHANT_ID=TESTCURSOR2
MPGS_API_PASSWORD=your-mpgs-api-password
MPGS_RETURN_URL_BASE=http://localhost:3000
MPGS_CURRENCY=LKR

# ─── Email Notifications (Resend) ──────────────────────────────
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=FlowPilot AI <onboarding@resend.dev>

# ─── Admin Panel ───────────────────────────────────────────────
NEXT_PUBLIC_ADMIN_USER_ID=your-supabase-user-uuid
```

> ⚠️ **Never commit `.env.local` to Git.** It is already in `.gitignore`.

---

## 📁 Project Structure

```
flowpilotai/
├── src/
│   ├── app/
│   │   ├── (marketing)/          # Landing page
│   │   ├── (auth)/               # Sign in / Sign up
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (app)/                # Protected dashboard routes
│   │   │   ├── war-room/         # Home dashboard ⭐
│   │   │   ├── cfo/              # AI CFO Dashboard
│   │   │   ├── overdue/          # Overdue Radar ⭐
│   │   │   ├── recovery/[id]/    # AI Recovery Center ⭐
│   │   │   ├── simulator/        # Stress Test ⭐
│   │   │   ├── suppliers/        # Supplier Trust Mirror
│   │   │   ├── expenses/         # Expense Intelligence
│   │   │   ├── payments/         # Payments Hub
│   │   │   ├── transactions/     # Transaction Feed
│   │   │   ├── timeline/         # Cash Flow Timeline
│   │   │   ├── automation/       # Rules Builder
│   │   │   ├── settings/         # Settings & Profile
│   │   │   └── admin/            # Admin Panel (admin only)
│   │   ├── api/
│   │   │   ├── ai/               # AI engine routes
│   │   │   ├── seylan/           # Seylan Bank API routes
│   │   │   ├── payments/mpgs/    # MPGS card payment routes
│   │   │   ├── suppliers/        # Supplier CRUD
│   │   │   ├── notifications/    # Notification management
│   │   │   ├── settings/         # Settings API
│   │   │   ├── cron/             # Scheduled jobs
│   │   │   └── seed/             # Demo data seeder
│   │   ├── auth/callback/        # OAuth callback handler
│   │   └── pay/[invoiceId]/      # Public payment page (no auth)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── charts/               # Recharts wrappers
│   │   ├── widgets/              # Dashboard widgets
│   │   ├── layout/               # Sidebar, topnav, notifications
│   │   ├── invoices/             # Invoice-specific components
│   │   └── ai/                   # AI insight cards
│   ├── lib/
│   │   ├── supabase/             # Server + client instances
│   │   ├── openai/               # OpenAI client + prompts
│   │   ├── seylan/               # Seylan API client + simulator
│   │   ├── mpgs/                 # MPGS payment client
│   │   ├── engines/              # Trust, runway, health, anomaly
│   │   ├── notifications/        # Email templates (Resend)
│   │   └── env.ts                # Zod-validated environment
│   ├── hooks/                    # Custom React hooks
│   └── store/                    # Zustand state stores
├── supabase/
│   └── migrations/               # SQL schema + RLS policies
├── public/                       # Static assets
├── .env.example                  # Environment variable template
├── tailwind.config.ts            # FlowPilot design tokens
├── vercel.json                   # Cron job configuration
└── next.config.mjs
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  BROWSER (Next.js React Client)                               │
│  Tailwind + shadcn/ui · Recharts · Framer Motion · Zustand   │
└────────────────────┬─────────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼─────────────────────────────────────────┐
│  NEXT.JS API ROUTES (Vercel Serverless)                       │
│  /api/ai/* · /api/seylan/* · /api/payments/mpgs/*            │
│  /api/suppliers/* · /api/notifications/* · /api/cron/*       │
│  Auth middleware refreshes Supabase session on every request  │
└────┬──────────────┬──────────────┬──────────────┬────────────┘
     │              │              │              │
┌────▼───┐   ┌──────▼──┐   ┌──────▼──┐   ┌──────▼──┐
│SUPABASE│   │  OPENAI  │   │ SEYLAN  │   │  MPGS   │
│Postgres│   │ GPT-4o   │   │ Sandbox │   │Mastercard│
│ + RLS  │   │ 6 engines│   │ 4 live  │   │ Hosted  │
│ + Auth │   │ + cache  │   │ APIs    │   │ Checkout│
│+Realtime   └──────────┘   └─────────┘   └─────────┘
└────────┘
```

### Data Flow — Core Recovery Loop

1. SME owner opens **Overdue Radar** → sees Nexus Traders, 11 days late, LKR 185,000
2. Clicks **"Recover"** → navigates to Recovery Center
3. API calls **OpenAI GPT-4o** with invoice + client context → returns staged recovery strategy
4. Owner selects **"සිංහල"** (Sinhala) → GPT-4o translates the message
5. Owner taps **"Open in WhatsApp"** → wa.me deeplink with pre-filled message
6. Client receives message, clicks **card payment link**
7. Client lands on `/pay/[invoiceId]` (public, no login needed)
8. API calls **MPGS** → creates a Mastercard checkout session
9. Client enters card details on **Mastercard's secure page**
10. MPGS redirects back → server verifies payment
11. Invoice marked **paid** in Supabase → **Realtime push** to owner's browser
12. 🎉 Confetti fires, toast: *"INV-2047 paid — LKR 185,000 received"*

---

## 🔒 Security

- **Authentication** — Supabase Auth with HTTP-only secure cookies (no localStorage tokens)
- **Multi-tenancy** — PostgreSQL Row Level Security on all 11 tables. Every query filtered by `auth.uid() = user_id`
- **No secrets on the client** — All API keys stay in server-side `process.env`. Never in `NEXT_PUBLIC_` prefix.
- **Input validation** — Zod schema validation on every API route before any database access
- **AI output validation** — Zod parsing on all GPT-4o JSON responses before persistence
- **Card data** — Never stored or seen by FlowPilot. Goes directly to Mastercard's PCI-DSS infrastructure via MPGS Hosted Checkout
- **SQL injection** — Structurally impossible via Supabase's parameterized query builder

---

## 🧪 Demo Test Accounts

For testing card payments via MPGS sandbox:

| Card Type | Number | Expiry | CVV |
|---|---|---|---|
| **Mastercard** | `5123 4500 0000 0008` | `05/30` | `100` |
| **Visa** | `4111 1111 1111 1111` | `05/30` | `100` |
| **Visa (decline)** | `4000 0000 0000 0002` | `05/30` | `100` |

For Seylan sandbox:
- Source account: `064000012548001`
- CEFTS destination: `12345678` (bank `6990`)

---

## 📦 Deployment

### Deploy to Vercel (recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repository directly at [vercel.com](https://vercel.com) for automatic deployments on every push to `main`.

**After deploying, update these:**
1. Supabase → Authentication → URL Configuration → add your Vercel URL
2. Vercel → Environment Variables → add all variables from `.env.local`
3. Google Cloud Console → OAuth Redirect URIs → add your Vercel URL + `/auth/callback`

### Vercel Cron (auto-configured)

`vercel.json` already configures the daily brief cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-rules",
      "schedule": "30 2 * * *"
    }
  ]
}
```

This runs daily at **08:00 AM Sri Lanka time** (02:30 UTC).

---

## 🎬 Demo Video

[▶️ Watch the 2.5-minute demo](#)

Demo walkthrough covers:
1. War Room — live Seylan balance + AI morning brief
2. Overdue Radar — trust scoring, ranked recovery list
3. Recovery Center — multilingual AI message (Sinhala) + WhatsApp
4. Card payment — Mastercard Hosted Checkout end-to-end
5. Stress Test — runway simulation with AI survival plan
6. AI Assistant — natural language financial queries

---

## 👥 Team

| Name | Role | Built |
|---|---|---|
| **[Name 1]** | Lead Architect & Frontend | War Room, Recovery Center, Stress Test, AI Assistant, Deployment |
| **[Name 2]** | Backend & Infrastructure | Supabase schema, AI engines, Seylan API, MPGS, Seed route |
| **[Name 3]** | Content & UI Lead | Landing page, Sinhala/Tamil content, mobile QA, stub pages |
| **[Name 4]** | Demo Director & Documentation | README, submission document, pitch deck, demo script, video |

---

## 📊 Business Model

| Plan | Price (LKR/mo) | Target |
|---|---|---|
| Starter | 2,900 | Sole proprietors |
| **Growth** ⭐ | **4,900** | **1–10 employees (main market)** |
| Business | 9,900 | 10–50 employees |
| Enterprise | 24,900 | 50+ employees |

**Market:** 300,000+ formally registered Sri Lankan SMEs · LKR 235M+ ARR potential at 40,000 Seylan customers.

---

## 🗺️ Roadmap

- ✅ **v1.0** (Buildathon) — 20 pages, 4 live Seylan APIs, MPGS card payments, OpenAI 6 engines, multilingual
- 🔜 **v1.1** (0–3 months) — Full JustPay integration, Merchant QR, mobile PWA, 100 paying SMEs
- 🔜 **v1.5** (3–6 months) — Multi-user teams, accountant portal, SME loan pre-qualification via Seylan
- 🔜 **v2.0** (6–12 months) — Multi-bank support (HNB, Sampath), fraud detection, 1,000+ SMEs

---

## 🤝 Acknowledgments

- **[Cursor Colombo](https://cursor.com)** — for organizing the 24H Buildathon
- **[Seylan Bank](https://seylan.lk)** — for API access and the MPGS payment gateway
- **[OpenAI](https://openai.com)** — GPT-4o powering all 6 AI engines
- **[Supabase](https://supabase.com)** — backend, auth, and real-time infrastructure
- **[Vercel](https://vercel.com)** — deployment and edge functions
- **[shadcn/ui](https://ui.shadcn.com)** — beautiful component library

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ in 24 hours · Cursor Colombo Buildathon**

[🌐 Live Demo](https://flowpilotai-opal.vercel.app/) · [📹 Video](#) · [📄 Docs](#)

*FlowPilot AI — The AI CFO every Sri Lankan SME deserves.*

</div>
