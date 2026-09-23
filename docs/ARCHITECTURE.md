# KgweboOS architecture

**One-liner:** mobile-first, multi-tenant business OS for SMEs in Botswana. Free tier acquires; Premium (P47/month) monetises.

## Layers

```
src/app/            Next.js App Router
  page.tsx          Landing + pricing
  register/         Onboarding wizard (3 steps, starts 14-day Premium trial)
  (app)/            Authenticated shell (sidebar + bottom nav, offline banner, notifications)
    dashboard, customers, invoices, expenses, inventory, reports, assistant, billing, settings
  api/paypal/*      create-order, capture-order (server-verified), webhook (signature-verified)
src/lib/
  plans.ts          SINGLE SOURCE OF TRUTH for prices, limits, feature flags, plan matrix
  entitlements.ts   Resolves trial / active / grace / expired → effective plan; can() / withinLimit()
  store.ts          Local-first zustand store persisted to localStorage; queues pendingOps for sync
  assistant.ts      Offline rule-based "AI" over tenant data (LLM is an optional upgrade path)
  types.ts          Domain model (Business, Subscription, Customer, Product, Invoice, Expense …)
src/components/
  AppShell.tsx      Layout, nav, plan card, sync + notification indicators
  Paywall.tsx       <Gate feature>, <LimitGate limit>, <UpgradePrompt>, <SubscriptionBanner>
src/lib/firebase/
  client.ts         Firebase app/auth/Firestore (persistent offline cache); isFirebaseConfigured → local mode
  AuthProvider.tsx  Auth context; resolves user → business; attaches sync
  sync.ts           Store ⇄ Firestore: drains pendingOps, live snapshot listeners, invite acceptance
  admin.ts          Firebase Admin (server): activateSubscription (idempotent, transactional), revoke
  invites.ts        Team invites (matched by email on sign-in)
firestore.rules     Tenant isolation: membership doc required; subscription/billing writable by server only
```

## Multi-tenancy (Firebase)
* All tenant data lives under `businesses/{bid}/…`. Rules require `businesses/{bid}/members/{uid}` to exist for any read/write.
* Roles: owner/manager can update the business and invite; auditor is read-only; everyone else read/write tenant data.
* `meta/subscription` and `billing_payments` are **server-only writes** (Admin SDK from PayPal capture/webhook). A client can never grant itself Premium.

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
Two layers: the zustand store persists to `localStorage` and queues `pendingOps`; `sync.ts` drains them into
Firestore, which itself has persistent offline cache. Live `onSnapshot` listeners hydrate the store, so two phones
in the same business see each other's invoices in real time.

## Modes
* **Local mode** (no `NEXT_PUBLIC_FIREBASE_*`): no login, demo button on landing, data in browser only.
* **Firebase mode**: `/login` (email/password, Google) → `/register` business (if none) → dashboard with sync.

## Billing flow
register → trial → banner countdown → `/billing` → `<PayPalCheckout>` (PayPal button or Visa/Mastercard card fields)
→ `POST /api/paypal/create-order` (server, amount from `PRICING`) → buyer approves
→ `POST /api/paypal/capture-order` (server captures, checks amount === expected) → client `activatePremium()`
→ `POST /api/paypal/webhook` (PAYMENT.CAPTURE.COMPLETED / REFUNDED, signature-verified) reconciles the DB
→ active 30/365 days → reminder at T-3 → 5-day grace → downgrade.

Prices live in `plans.ts` (BWP) and are converted to USD in `lib/paypal/config.ts`.

## Next steps (Phase 1 → 3)
1. ~~Auth + sync~~ ✅ Firebase. Add phone OTP + MFA enrolment.
2. Set `PAYPAL_CLIENT_SECRET` + `PAYPAL_WEBHOOK_ID` + `FIREBASE_SERVICE_ACCOUNT_JSON` in hosting env.
3. Cloud Functions + Scheduler: recurring invoices, T-3 reminders, overdue marking, monthly AI credit reset.
4. LLM-backed assistant with per-tenant cost caps; receipt OCR.
5. PostHog events: activation (first invoice), premium conversion, churn.
