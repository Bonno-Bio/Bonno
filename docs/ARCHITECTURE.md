# KgweboOS architecture

**One-liner:** mobile-first, multi-tenant business OS for SMEs in Botswana. Free tier acquires; Premium (P47/month) monetises.

## Layers

```
src/app/            Next.js App Router
  page.tsx          Landing + pricing
  register/         Onboarding wizard (3 steps, starts 14-day Premium trial)
  (app)/            Authenticated shell (sidebar + bottom nav, offline banner, notifications)
    dashboard, customers, invoices, expenses, inventory, reports, assistant, billing, settings
  api/billing/webhook   Payment-provider webhook (signature check → activate subscription)
src/lib/
  plans.ts          SINGLE SOURCE OF TRUTH for prices, limits, feature flags, plan matrix
  entitlements.ts   Resolves trial / active / grace / expired → effective plan; can() / withinLimit()
  store.ts          Local-first zustand store persisted to localStorage; queues pendingOps for sync
  assistant.ts      Offline rule-based "AI" over tenant data (LLM is an optional upgrade path)
  types.ts          Domain model (Business, Subscription, Customer, Product, Invoice, Expense …)
src/components/
  AppShell.tsx      Layout, nav, plan card, sync + notification indicators
  Paywall.tsx       <Gate feature>, <LimitGate limit>, <UpgradePrompt>, <SubscriptionBanner>
supabase/migrations Postgres schema with business_id on every table + RLS policies
```

## Multi-tenancy
* Every row has `business_id`. RLS policy `is_member(business_id)` enforces isolation at the DB.
* `subscriptions` / `payments_billing` are writable only by the service role (webhooks), never by clients.

## Entitlements
All premium checks go through `getEntitlements(subscription)`:

| status     | effective plan | notes |
|------------|----------------|-------|
| trialing   | premium        | 14 days from registration |
| active     | premium        | until `current_period_end` |
| past_due   | premium        | 5-day grace after period end |
| expired    | free           | limits enforced, data kept |

UI uses `useEntitlements()`; server routes should call the same function with the DB subscription row before mutating.

## Offline-first
The store persists to `localStorage` and records every mutation in `pendingOps`. A sync adapter
(`src/lib/sync/supabase.ts`, next step) replays these against Supabase when online and reconciles by `id`.

## Billing flow
register → trial → banner countdown → `/billing` → choose Orange Money / MyZaka / Smega / card / EFT
→ provider → `POST /api/billing/webhook` → subscription active 30 days → reminder at T-3 → grace → downgrade.

## Next steps (Phase 1 → 3)
1. Supabase Auth (email/phone OTP + 2FA) and the sync adapter.
2. Real payment provider integration (Paygate/DPO) + webhook HMAC verification.
3. Background jobs: recurring invoices, T-3 reminders, overdue marking, monthly AI credit reset.
4. LLM-backed assistant with per-tenant cost caps; receipt OCR.
5. PostHog events: activation (first invoice), premium conversion, churn.
