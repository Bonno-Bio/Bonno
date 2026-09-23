"use client";
import { useState } from "react";
import { Check, Smartphone, CreditCard, Landmark, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEntitlements } from "@/lib/useEntitlements";
import { ADDONS, PLAN_MATRIX, PREMIUM_PRICE_ANNUAL, PREMIUM_PRICE_MONTHLY, GRACE_PERIOD_DAYS } from "@/lib/plans";
import { PageHeader, Modal, Field, StatusBadge } from "@/components/ui";
import { fmtDate, cn } from "@/lib/utils";
import type { Subscription } from "@/lib/types";

const PROVIDERS: { id: NonNullable<Subscription["provider"]>; label: string; icon: typeof Smartphone; hint: string }[] = [
  { id: "orange_money", label: "Orange Money", icon: Smartphone, hint: "Approve the prompt on your phone" },
  { id: "myzaka", label: "MyZaka (Mascom)", icon: Smartphone, hint: "Approve the prompt on your phone" },
  { id: "smega", label: "Smega (BTC)", icon: Smartphone, hint: "Approve the prompt on your phone" },
  { id: "card", label: "Debit / credit card", icon: CreditCard, hint: "Visa, Mastercard — handled by our PCI-compliant provider" },
  { id: "bank_transfer", label: "Bank transfer / EFT", icon: Landmark, hint: "Activates once we match your reference" },
];

export default function Billing() {
  const { subscription, activatePremium, cancelPremium, simulateTrialEnd } = useStore();
  const ent = useEntitlements();
  const [open, setOpen] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [provider, setProvider] = useState<NonNullable<Subscription["provider"]>>("orange_money");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const price = annual ? PREMIUM_PRICE_ANNUAL : PREMIUM_PRICE_MONTHLY;

  const pay = async () => {
    setBusy(true);
    // In production: POST /api/billing/checkout → provider → webhook → subscription active.
    const res = await fetch("/api/billing/webhook", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "payment.succeeded", provider, amount: price, currency: "BWP", businessId: subscription?.businessId, simulated: true }),
    }).then((r) => r.json()).catch(() => ({ reference: `SIM-${Date.now().toString(36).toUpperCase()}` }));
    activatePremium(provider, res.reference, annual ? 12 : 1);
    setBusy(false); setOpen(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Billing" subtitle="Manage your KgweboOS subscription" />

      <div className="card flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2"><span className="text-lg font-semibold">{ent.effectivePlan === "premium" ? "Premium" : "Free plan"}</span><StatusBadge status={ent.status} /></div>
          <p className="text-sm text-slate-500">
            {ent.status === "trialing" && `Trial ends ${fmtDate(subscription!.trialEndsAt!)} (${ent.daysLeft} days). Upgrade any time — you won't be charged until then.`}
            {ent.status === "active" && `Renews ${fmtDate(subscription!.currentPeriodEnd!)} via ${subscription?.provider?.replace("_", " ")}. We'll remind you 3 days before.`}
            {ent.status === "past_due" && `Payment failed or is late. Premium stays on for ${ent.daysLeft} more days, then you'll move to Free.`}
            {(ent.status === "expired" || ent.status === "free") && "You're on Free: 2 users, 20 invoices/month, 100 customers, 50 products."}
          </p>
        </div>
        {ent.effectivePlan === "premium" && ent.status === "active" ? (
          <button className="btn-secondary" onClick={() => confirm("Cancel Premium? You'll keep access until the period ends.") && cancelPremium()}>Cancel</button>
        ) : (
          <button className="btn-primary" onClick={() => setOpen(true)}>Upgrade · P{PREMIUM_PRICE_MONTHLY}/mo</button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <div className="text-sm font-semibold text-slate-500">Free</div>
          <div className="mt-1 text-3xl font-bold">P0</div>
          <p className="mt-1 text-sm text-slate-500">Free forever. Great for getting started.</p>
        </div>
        <div className="card border-emerald-500 p-6 ring-2 ring-emerald-500">
          <div className="flex items-center justify-between"><div className="text-sm font-semibold text-emerald-700">Premium</div>
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs"><button onClick={() => setAnnual(false)} className={cn("rounded-md px-2 py-1", !annual && "bg-white shadow-sm")}>Monthly</button><button onClick={() => setAnnual(true)} className={cn("rounded-md px-2 py-1", annual && "bg-white shadow-sm")}>Annual</button></div></div>
          <div className="mt-1 text-3xl font-bold">P{price}<span className="text-base font-normal text-slate-400">/{annual ? "year" : "month"}</span></div>
          <p className="mt-1 text-xs text-slate-500">{annual ? `Save P${PREMIUM_PRICE_MONTHLY * 12 - PREMIUM_PRICE_ANNUAL} — 2 months free` : `or P${PREMIUM_PRICE_ANNUAL}/year (2 months free)`}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {["Unlimited invoices, customers & products", "Quotes & recurring invoices", "WhatsApp / SMS reminders", "Advanced reports & VAT", "500 AI credits / month", "10 users · multi-branch · custom branding"].map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{f}</li>)}
          </ul>
          <button className="btn-primary mt-4 w-full" onClick={() => setOpen(true)} disabled={ent.status === "active"}>{ent.status === "active" ? "You're on Premium" : "Upgrade now"}</button>
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

      <div className="flex items-start gap-2 text-xs text-slate-400"><ShieldCheck size={16} className="shrink-0" /> Card details are handled by our payment provider (PCI DSS) — we never store them. Failed renewals get a {GRACE_PERIOD_DAYS}-day grace period before downgrading to Free.</div>

      {ent.status === "trialing" && (
        <button className="btn-ghost text-xs text-slate-400" onClick={simulateTrialEnd}>Dev: simulate trial ending</button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`Upgrade to Premium · P${price}`}>
        <div className="space-y-3">
          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <button key={p.id} onClick={() => setProvider(p.id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left", provider === p.id ? "border-emerald-600 bg-emerald-50" : "border-slate-200")}>
                <p.icon size={20} className="text-slate-600" /><div><div className="text-sm font-medium">{p.label}</div><div className="text-xs text-slate-500">{p.hint}</div></div>
              </button>
            ))}
          </div>
          {["orange_money", "myzaka", "smega"].includes(provider) && <Field label="Mobile money number"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+267 7X XXX XXX" /></Field>}
          {provider === "bank_transfer" && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Pay P{price} to <b>KgweboOS (Pty) Ltd</b>, FNB Botswana, Acc 62xxxxxxx, Ref <b>{subscription?.businessId.slice(-6).toUpperCase()}</b>. Activates automatically when matched.</div>}
          <button className="btn-primary w-full" onClick={pay} disabled={busy}>{busy ? "Waiting for confirmation…" : `Pay P${price} ${annual ? "for 12 months" : "for 30 days"}`}</button>
          <p className="text-center text-[11px] text-slate-400">Sandbox mode — payment is simulated and confirmed via the webhook endpoint.</p>
        </div>
      </Modal>
    </div>
  );
}
