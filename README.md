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
| Billing | Free forever → contextual Premium paywall → **PayPal or Visa/Mastercard** (PayPal Card Fields) → server capture/verify → 30 days, grace period |
| Settings | Business + VAT profile, team invites & roles*, branding*, data export, audit log |

\* Premium-gated through the entitlements service (`src/lib/plans.ts`, `src/lib/entitlements.ts`).

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Click **"Try the demo salon"** on the landing page to load sample data, or register a business.
Premium is opt-in: new businesses start on Free and see an upgrade prompt only when they use a Premium feature or reach a Free-plan limit.

## Firebase setup (auth + cloud sync)

Without Firebase env vars the app runs in **local mode** (data only in the browser — good for demos).
To go multi-device / multi-user:

1. Create a project at console.firebase.google.com → add a **Web app** → copy the config into `.env.local` as `NEXT_PUBLIC_FIREBASE_*`.
2. **Authentication → Sign-in method**: enable *Email/Password* and *Google*.
3. **Firestore Database → Create** (production mode). Deploy rules & indexes:
   ```bash
   npx firebase-tools login
   npx firebase-tools use <project-id>
   npx firebase-tools deploy --only firestore
   ```
4. **Project settings → Service accounts → Generate new private key** → put the JSON (single line) in `FIREBASE_SERVICE_ACCOUNT_JSON`. This lets the PayPal capture/webhook routes write subscriptions server-side (clients can't — see rules).
5. Add your preview/production domain under **Authentication → Settings → Authorized domains**.

Data layout: `businesses/{bid}` → `members/`, `meta/subscription`, `billing_payments/`, `customers/`, `products/`, `stock_movements/`, `invoices/`, `payments/`, `expenses/`, `audit_logs/`. Plus top-level `users/{uid}` and `invites/`.

## Payments (PayPal)

Premium is paid through PayPal — either the PayPal wallet or **Visa / Mastercard** entered directly (PayPal Advanced Card Fields; card data never touches our servers).
PayPal doesn't settle in BWP, so the charge is made in USD at `NEXT_PUBLIC_PAYPAL_FX_RATE` (P47 ≈ $3.51).

| Env var | Purpose |
|---|---|
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Browser SDK (already set) |
| `PAYPAL_CLIENT_SECRET` | **Required for card payments** and server-side order create/capture |
| `PAYPAL_WEBHOOK_ID` | Verifies `POST /api/paypal/webhook` signatures |
| `PAYPAL_ENV` | `live` (default) or `sandbox` |

Without the secret, the PayPal button still works (client-side capture) but card fields are disabled and captures aren't server-verified.

## Stack
Next.js 14 · TypeScript · Tailwind · zustand (local-first, persisted) · PWA manifest · **Firebase** (Auth + Firestore with offline persistence, security rules in `firestore.rules`) · PayPal.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design, entitlement rules and roadmap.
