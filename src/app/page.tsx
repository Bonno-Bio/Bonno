"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileText, Users, Receipt, Package, BarChart3, Sparkles, MessageCircle, ArrowRight } from "lucide-react";
import { PLAN_MATRIX, PREMIUM_PRICE_MONTHLY, PREMIUM_PRICE_ANNUAL, TRIAL_DAYS } from "@/lib/plans";
import { useStore, useHydrated } from "@/lib/store";
import { useAuth } from "@/lib/firebase/AuthProvider";

const MODULES = [
  { icon: FileText, title: "Invoices & quotes", body: "BURS-ready invoices with VAT, PDF export and payment tracking." },
  { icon: Users, title: "Customers (CRM)", body: "Every customer, contact and history in one place." },
  { icon: Receipt, title: "Expenses", body: "Snap receipts, categorise spend, see profit instantly." },
  { icon: Package, title: "Inventory & POS", body: "Stock levels, low-stock alerts and simple point of sale." },
  { icon: BarChart3, title: "Reports & VAT", body: "Sales, cash flow, profit and VAT summaries for your accountant." },
  { icon: Sparkles, title: "AI assistant", body: "Ask questions about your business in plain language." },
];

export default function Landing() {
  const hydrated = useHydrated();
  const business = useStore((s) => s.business);
  const loadDemo = useStore((s) => s.loadDemo);
  const auth = useAuth();
  const router = useRouter();
  const start = auth.mode === "firebase" ? "/login" : "/register";

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">K</div>
          <span className="text-lg font-bold">KgweboOS</span>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <a href="#pricing" className="btn-ghost hidden sm:inline-flex">Pricing</a>
          {hydrated && business ? (
            <Link href="/dashboard" className="btn-primary">Open dashboard</Link>
          ) : (
            <Link href={start} className="btn-primary">Start free</Link>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 text-center md:pt-20">
        <span className="badge bg-emerald-50 text-emerald-700">Built for small businesses in Botswana 🇧🇼</span>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
          Run your whole business from <span className="text-emerald-600">one dashboard</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Invoices, customers, expenses, stock and reports — on your phone, even offline.
          Free to start. Premium for just <b>P{PREMIUM_PRICE_MONTHLY}/month</b>.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={start} className="btn-primary px-6 py-3 text-base">Start free — {TRIAL_DAYS}-day Premium trial <ArrowRight size={18} /></Link>
          {auth.mode === "local" && (
            <button className="btn-secondary px-6 py-3 text-base" onClick={() => { loadDemo(); router.push("/dashboard"); }}>
              Try the demo salon
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">No card needed for the trial · Upgrade securely with PayPal or Visa / Mastercard</p>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <div key={m.title} className="card">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><m.icon size={20} /></div>
              <div className="font-semibold">{m.title}</div>
              <p className="mt-1 text-sm text-slate-500">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Simple pricing</h2>
        <p className="mt-2 text-center text-slate-500">Free forever to get started. Upgrade when you&apos;re ready.</p>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="card p-6">
            <div className="text-sm font-semibold text-slate-500">Free</div>
            <div className="mt-2 text-4xl font-bold">P0<span className="text-base font-normal text-slate-400">/month</span></div>
            <p className="mt-2 text-sm text-slate-500">For getting started: 2 users, 20 invoices/month, 100 customers, 50 products.</p>
            <Link href={start} className="btn-secondary mt-6 w-full">Start free</Link>
          </div>
          <div className="card border-emerald-500 p-6 ring-2 ring-emerald-500">
            <div className="flex items-center justify-between"><div className="text-sm font-semibold text-emerald-700">Premium</div><span className="badge bg-emerald-600 text-white">Most popular</span></div>
            <div className="mt-2 text-4xl font-bold">P{PREMIUM_PRICE_MONTHLY}<span className="text-base font-normal text-slate-400">/month</span></div>
            <p className="mt-1 text-xs text-slate-500">or P{PREMIUM_PRICE_ANNUAL}/year — 2 months free</p>
            <ul className="mt-4 space-y-2 text-sm">
              {["Unlimited invoices, customers & products", "Quotes & recurring invoices", "WhatsApp / SMS payment reminders", "Advanced reports, VAT & cash flow", "AI assistant — 500 credits/month", "Up to 10 users, multi-branch"].map((f) => (
                <li key={f} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{f}</li>
              ))}
            </ul>
            <Link href={start} className="btn-primary mt-6 w-full">Start {TRIAL_DAYS}-day free trial</Link>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Feature</th><th className="px-4 py-3">Free</th><th className="px-4 py-3">Premium P{PREMIUM_PRICE_MONTHLY}/mo</th></tr>
            </thead>
            <tbody>
              {PLAN_MATRIX.map((r) => (
                <tr key={r.feature} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium">{r.feature}</td>
                  <td className="px-4 py-2.5 text-slate-500">{r.free}</td>
                  <td className="px-4 py-2.5 text-emerald-800">{r.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        <div className="flex items-center justify-center gap-1"><MessageCircle size={14} /> Support via WhatsApp · Terms · Privacy · Botswana Data Protection Act compliant</div>
        <div className="mt-1">© {new Date().getFullYear()} KgweboOS</div>
      </footer>
    </div>
  );
}
