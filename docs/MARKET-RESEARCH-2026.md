# KgweboOS market research and product thesis

**Research date:** 23 September 2026  
**Market:** Botswana first; Southern Africa expansion later

## What the research says

- Botswana's mobile-money market is large and familiar: reported transaction value reached P33.5 billion in the year to March 2024, with Orange Money, MyZaka, Smega and Poso Money in-market. This makes a card-only collection strategy a serious local adoption risk; PayPal remains the current subscription rail, but customer-payment collection should be designed for local rails.
- Botswana is moving toward electronic VAT invoicing / Electronic Fiscal Devices. Public 2025–2026 reporting places the planned rollout around March 2026, while technical specifications and the exact approved-provider model remain unclear. We should build a compliance-ready invoice model now without claiming BURS certification until an official API/specification is available.
- Local SMME research repeatedly identifies weak record keeping, limited management skills, poor market access and limited finance as connected problems. A ledger alone is not compelling enough: the product must turn records into actions (collect money, restock, prepare a tender pack, prove revenue).
- African bookkeeping products have found that credit/readiness is a powerful reason for merchants to keep records. The safe KgweboOS version is a lender-neutral “business health / finance readiness” export, not lending or a credit promise.
- Research on accounting software highlights silent operational blockers: high infrastructure cost, unreliable power/connectivity, cybercrime/fraud concerns, data loss, consultant dependence and training burden. Offline-first, low-bandwidth flows, audit history, backups and role separation are core product features, not extras.

## Pain points we will solve

### Visible pain
1. Invoices are late, wrong or never followed up.
2. Owners do not know today's cash position, profit or stock exposure.
3. VAT records and supporting documents are scattered.
4. Staff can sell, discount or receive cash without a reliable trail.
5. Business records are not ready when a bank, accountant, tender or funder asks.

### Silent pain
1. **Owner anxiety:** a dashboard that shows sales but not money actually collected creates false confidence. We need cash-in, cash-out, receivables and upcoming obligations in one “safe to spend” view.
2. **Trust leakage:** shared passwords and unlogged edits hide discounts, deleted invoices and stock shrinkage. Add role-based approvals, immutable audit events and daily exception alerts.
3. **Connectivity fear:** owners avoid cloud tools when a failed connection can stop a sale. Keep the sale/invoice/receipt path offline and synchronise safely later.
4. **Compliance uncertainty:** businesses hear about EFD/e-invoicing but do not know what to do today. Add a readiness checklist, VAT number validation fields, invoice sequence controls, exportable records and a clearly labelled “BURS integration pending official specification” state.
5. **Proof-of-business gap:** informal and early-stage businesses cannot easily demonstrate consistent turnover. Generate a shareable, tamper-evident monthly business summary with source records and accountant export.
6. **Collections discomfort:** owners do not want to harass customers. Use polite, localised reminder templates, consent/preferences, promise-to-pay dates and escalation rules.
7. **Growth fragmentation:** WhatsApp, notebooks, tills and bank/mobile-money messages disagree. Make one transaction timeline and allow attachment of proof, while avoiding unsafe automatic bank assumptions.
8. **Fear of lock-in:** free users leave when they feel trapped. Keep Free useful, make Premium contextual, and provide export/delete controls.

## Product decisions

### 1. Free forever, contextual Premium
New customers now start on **Free**, with no trial countdown and no card request. Premium appears at the moment of value: quotes, recurring invoices, OCR, advanced reports, reminders, advanced roles, multi-branch and API access. The prompt explains the exact benefit and keeps existing data safe.

### 2. “Money clarity” as the home screen
Prioritise four questions over vanity metrics:

- What came in today?
- What is still owed, and who should I remind?
- What must I pay soon?
- Can I afford to restock or withdraw money?

### 3. Compliance-ready, not compliance-claiming
Add an invoice compliance profile, configurable tax rates, sequential invoice numbers, credit-note support, seven-year archive policy, original-document attachments and structured export. Keep BURS transmission behind a provider adapter until BURS publishes final technical requirements and approves the route.

### 4. Botswana-native payments roadmap
PayPal remains the subscription provider for now. For merchant collections, design a provider interface for Orange Money, MyZaka, Smega, EFT and card so payment methods can be added without rewriting invoices or reconciliation. Never mark a payment paid from a screenshot alone; use reference, amount, method, date and optional proof with a clear verification status.

### 5. Trust and resilience by default
Offline queue, conflict-safe sync, per-business isolation, least-privilege roles, audit trail, export, restore testing, suspicious activity flags and transparent status pages should ship before “AI magic”. AI must cite the underlying records it used and never invent tax or financial advice.

## Build sequence

1. **Now:** remove trial (done), contextual paywalls, free-plan onboarding, research-backed copy, cash/receivables dashboard cards, payment-method abstraction, invoice compliance profile.
2. **Next:** recurring jobs, overdue/reminder workflow, promise-to-pay, receipt/document attachments, audit exceptions and monthly business-health export.
3. **Pilot:** interview 10–15 Botswana businesses across salon, retail, contractor, service and informal trade; measure time-to-first-invoice, first payment recorded, 30-day retention, collection rate and support questions.
4. **Before claims:** validate BURS EFD/e-invoicing specification with BURS or an authorised provider; validate mobile-money commercial/API access with each operator.

## Sources consulted

- BOCRA/mobile-money reporting via Mmegi and The Voice BW (2023–2025)
- Botswana VAT/EFD analysis from Andersen Botswana, ClearTax and EDICOM (2025–2026)
- Botswana SMME market-access research (ResearchGate / cited local studies)
- UNCDF and Disrupt Africa case studies on OZÉ's recordkeeping-to-finance insight
- TechCrunch reporting on Kippa and African merchant bookkeeping
- Sage and SME accounting research on late invoices, infrastructure, fraud, data loss and training barriers

These sources are directional market research, not legal or tax advice. Product and compliance claims require validation with BURS, payment operators and a Botswana accountant before launch.
