"use client";
import { useState } from "react";
import { Check, ShieldCheck, CreditCard } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEntitlements } from "@/lib/useEntitlements";
import { ADDONS, PLAN_MATRIX, PREMIUM_PRICE_ANNUAL, PREMIUM_PRICE_MONTHLY, GRACE_PERIOD_DAYS } from "@/lib/plans";
import { PRICING, type BillingInterval } from "@/lib/paypal/config";
import { PayPalCheckout } from "@/components/PayPalCheckout";
import { PageHeader, Modal, StatusBadge } from "@/components/ui";
import { fmtDate, cn } from "@/lib/utils";

export default function Billing() {
  const { subscription, activatePremium, cancelPremium, simulateTrialEnd } = useStore();
  const ent = useEntitlements();
  const [open, setOpen] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const price = PRICING[interval];

  return (
    <div className="space-y-5">
      <PageHeader title="Billing" subtitle="Manage your KgweboOS subscription" />

      <div className="card flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2"><span className="text-lg font-semibold">{ent.effectivePlan === "premium" ? "Premium" : "Free plan"}</span><StatusBadge status={ent.status} /></div>
          <p className="text-sm text-slate-500">
            {ent.status === "trialing" && `Trial ends ${fmtDate(subscription!.trialEndsAt!)} (${ent.daysLeft} days). Upgrade any time — your paid period starts from today.`}
            {ent.status === "active" && `Premium until ${fmtDate(subscription!.currentPeriodEnd!)} · paid via PayPal${subscription?.payerEmail ? ` (${subscription.payerEmail})` : ""}. We'll remind you 3 days before it ends.`}
            {ent.status === "past_due" && `Your Premium period has ended. Access continues for ${ent.daysLeft} more days (grace period) — renew to keep everything.`}
            {(ent.status === "expired" || ent.status === "free") && "You're on Free: 2 users, 20 invoices/month, 100 customers, 50 products."}
          </p>
          {subscription?.lastPaymentRef && <p className="mt-1 text-xs text-slate-400">Last payment ref: {subscription.lastPaymentRef}</p>}
        </div>
        {ent.status === "active" ? (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setOpen(true)}>Extend / renew</button>
            <button className="btn-ghost" onClick={() => confirm("Cancel Premium? You'll keep access until the paid period ends.") && cancelPremium()}>Cancel</button>
          </div>
        ) : (
          <button className="btn-primary" onClick={() => setOpen(true)}><CreditCard size={16} /> Upgrade · P{PREMIUM_PRICE_MONTHLY}/mo</button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <div className="text-sm font-semibold text-slate-500">Free</div>
          <div className="mt-1 text-3xl font-bold">P0</div>
          <p className="mt-1 text-sm text-slate-500">Free forever. Great for getting started.</p>
        </div>
        <div className="card border-emerald-500 p-6 ring-2 ring-emerald-500">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-emerald-700">Premium</div>
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
              <button onClick={() => setInterval("monthly")} className={cn("rounded-md px-2 py-1", interval === "monthly" && "bg-white shadow-sm")}>Monthly</button>
              <button onClick={() => setInterval("annual")} className={cn("rounded-md px-2 py-1", interval === "annual" && "bg-white shadow-sm")}>Annual</button>
            </div>
          </div>
          <div className="mt-1 text-3xl font-bold">P{price.bwp}<span className="text-base font-normal text-slate-400">/{interval === "annual" ? "year" : "month"}</span></div>
          <p className="mt-1 text-xs text-slate-500">{interval === "annual" ? `Save P${PREMIUM_PRICE_MONTHLY * 12 - PREMIUM_PRICE_ANNUAL} — 2 months free` : `or P${PREMIUM_PRICE_ANNUAL}/year (2 months free)`} · ≈ ${price.usd} USD</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {["Unlimited invoices, customers & products", "Quotes & recurring invoices", "WhatsApp / SMS reminders", "Advanced reports & VAT", "500 AI credits / month", "10 users · multi-branch · custom branding"].map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{f}</li>)}
          </ul>
          <button className="btn-primary mt-4 w-full" onClick={() => setOpen(true)}>{ent.status === "active" ? "Extend Premium" : "Upgrade now"}</button>
          <p className="mt-2 text-center text-[11px] text-slate-400">Pay with Visa, Mastercard or PayPal</p>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-2">Feature</th><th className="px-4 py-2">Free</th><th className="px-4 py-2">Premium</th></tr></thead>
          <tbody>{PLAN_MATRIX.map((r) => <tr key={r.feature} className="border-t border-slate-100"><td className="px-4 py-2 font-medium">{r.feature}</td><td className="px-4 py-2 text-slate-500">{r.free}</td><td className="px-4 py-2 text-emerald-800">{r.premium}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold">Add-ons <span className="badge bg-slate-100 text-slate-500">coming soon</span></h2>
        <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">{ADDONS.map((a) => <li key={a.id} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"><span>{a.name}</span><span className="font-medium">P{a.price} <span className="text-xs font-normal text-slate-500">/ {a.unit}</span></span></li>)}</ul>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-400"><ShieldCheck size={16} className="shrink-0" /> Payments are processed by PayPal (PCI DSS Level 1). Charged in USD at the current pula rate. If a renewal is missed you get a {GRACE_PERIOD_DAYS}-day grace period before moving to Free — your data is never deleted.</div>

      {ent.status === "trialing" && <button className="btn-ghost text-xs text-slate-400" onClick={simulateTrialEnd}>Dev: simulate trial ending</button>}

      <Modal open={open} onClose={() => setOpen(false)} title="Upgrade to Premium">
        <div className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1 text-sm">
          {(["monthly", "annual"] as BillingInterval[]).map((k) => (
            <button key={k} onClick={() => setInterval(k)} className={cn("flex-1 rounded-lg py-1.5", interval === k ? "bg-white font-medium shadow-sm" : "text-slate-500")}>
              P{PRICING[k].bwp} / {k === "monthly" ? "month" : "year"}
            </button>
          ))}
        </div>
        {open && subscription && (
          <PayPalCheckout
            key={interval}
            interval={interval}
            businessId={subscription.businessId}
            onSuccess={(r) => { activatePremium(r.reference, r.months, r.interval, r.payerEmail); setOpen(false); }}
          />
        )}
      </Modal>
    </div>
  );
}
