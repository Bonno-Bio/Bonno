# KgweboOS

**Run your whole business from one dashboard.**

Mobile-first, multi-tenant business operating system for small and medium businesses in Botswana.
Free to start · Premium **P47/month** (or P470/year).

## MVP modules (this repo)

| Module | What's in |
|---|---|
| Dashboard | Sales / expenses / profit / outstanding, alerts, quick actions, plan usage |
| Customers (CRM) | Contacts, amount owed, one-tap WhatsApp |
| Invoices & quotes | Line items, 14% VAT (BURS), numbering, print-to-PDF, record payment, WhatsApp reminders*, quotes* & recurring*, quote→invoice |
| Expenses | Categories, receipt photo, monthly breakdown, receipt OCR* |
| Inventory & POS | Products/services, stock levels, movements, low-stock alerts, quick-sale POS* |
| Reports | 6-month sales vs expenses, P&L*, VAT summary*, top customers/products*, CSV export* |
| AI assistant | Works offline on your data; 5 credits free / 500 Premium |
| Billing | 14-day trial → paywall → Orange Money / MyZaka / Smega / card / EFT → webhook → 30 days, grace period |
| Settings | Business + VAT profile, team invites & roles*, branding*, data export, audit log |

\* Premium-gated through the entitlements service (`src/lib/plans.ts`, `src/lib/entitlements.ts`).

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Click **"Try the demo salon"** on the landing page to load sample data, or register a business.
On `/billing` there's a *"Dev: simulate trial ending"* button to see the Free-plan limits kick in.

## Stack
Next.js 14 · TypeScript · Tailwind · zustand (local-first, persisted) · PWA manifest · Supabase schema with RLS (`supabase/migrations`).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design, entitlement rules and roadmap.
