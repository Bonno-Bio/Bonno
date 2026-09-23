"use client";
import Link from "next/link";
import { Plus, FileText, Users, Receipt, Package, AlertTriangle, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEntitlements } from "@/lib/useEntitlements";
import { invoiceTotals, isSameMonth, money, fmtDate } from "@/lib/utils";
import { PageHeader, Stat, StatusBadge } from "@/components/ui";

export default function Dashboard() {
  const { business, invoices, payments, expenses, customers, products } = useStore();
  const ent = useEntitlements();
  const vat = business?.vatRate ?? 0;

  const salesMonth = payments.filter((p) => isSameMonth(p.createdAt)).reduce((s, p) => s + p.amount, 0);
  const expMonth = expenses.filter((e) => isSameMonth(e.date)).reduce((s, e) => s + e.amount, 0);
  const outstanding = invoices.filter((i) => i.kind === "invoice" && (i.status === "sent" || i.status === "overdue")).reduce((s, i) => s + invoiceTotals(i, vat).total, 0);
  const overdue = invoices.filter((i) => i.kind === "invoice" && i.status === "overdue");
  const lowStock = products.filter((p) => p.trackStock && p.stockQty <= p.lowStockThreshold);
  const recent = invoices.slice(0, 5);
  const custById = Object.fromEntries(customers.map((c) => [c.id, c]));

  const quick = [
    { href: "/invoices?new=1", label: "New invoice", icon: FileText },
    { href: "/customers?new=1", label: "Add customer", icon: Users },
    { href: "/expenses?new=1", label: "Add expense", icon: Receipt },
    { href: "/inventory?new=1", label: "Add product", icon: Package },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={`Dumela, ${useStore.getState().user?.name.split(" ")[0] ?? ""} 👋`} subtitle={`Here's how ${business?.name} is doing this month.`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales this month" value={money(salesMonth)} tone="good" />
        <Stat label="Expenses this month" value={money(expMonth)} tone="bad" />
        <Stat label="Profit (cash)" value={money(salesMonth - expMonth)} tone={salesMonth - expMonth >= 0 ? "good" : "bad"} />
        <Stat label="Outstanding" value={money(outstanding)} hint={`${overdue.length} overdue`} tone={overdue.length ? "warn" : "default"} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {quick.map((q) => (
          <Link key={q.href} href={q.href} className="card flex items-center gap-3 py-3 hover:border-emerald-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><q.icon size={18} /></div>
            <span className="text-sm font-medium">{q.label}</span>
            <Plus size={16} className="ml-auto text-slate-300" />
          </Link>
        ))}
      </div>

      {(overdue.length > 0 || lowStock.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {overdue.length > 0 && (
            <div className="card border-rose-200 bg-rose-50">
              <div className="flex items-center gap-2 font-medium text-rose-800"><AlertTriangle size={16} /> {overdue.length} overdue invoice{overdue.length > 1 ? "s" : ""}</div>
              <ul className="mt-2 space-y-1 text-sm">
                {overdue.slice(0, 3).map((i) => (
                  <li key={i.id} className="flex justify-between"><span>{custById[i.customerId]?.name ?? "—"} · {i.number}</span><span className="font-medium">{money(invoiceTotals(i, vat).total)}</span></li>
                ))}
              </ul>
              <Link href="/invoices" className="mt-2 inline-block text-xs text-rose-700 underline">Send reminders →</Link>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="card border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 font-medium text-amber-800"><Package size={16} /> Low stock</div>
              <ul className="mt-2 space-y-1 text-sm">{lowStock.slice(0, 3).map((p) => <li key={p.id} className="flex justify-between"><span>{p.name}</span><span className="font-medium">{p.stockQty} left</span></li>)}</ul>
              <Link href="/inventory" className="mt-2 inline-block text-xs text-amber-700 underline">Manage stock →</Link>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Recent invoices & quotes</h2><Link href="/invoices" className="text-xs text-emerald-700">View all</Link></div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No invoices yet. Create your first one.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <div><div className="font-medium">{custById[i.customerId]?.name ?? "—"}</div><div className="text-xs text-slate-500">{i.number} · {fmtDate(i.issueDate)}</div></div>
                  <div className="text-right"><div className="font-medium">{money(invoiceTotals(i, vat).total)}</div><StatusBadge status={i.status} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-2 font-semibold">Plan usage</h2>
            <Usage label="Invoices this month" used={ent.usage.invoices_per_month} limit={ent.limitFor("invoices_per_month")} />
            <Usage label="Customers" used={ent.usage.customers} limit={ent.limitFor("customers")} />
            <Usage label="Products" used={ent.usage.products} limit={ent.limitFor("products")} />
            <Usage label="AI credits" used={ent.usage.ai_credits_per_month} limit={ent.limitFor("ai_credits_per_month")} />
            {ent.effectivePlan !== "premium" && <Link href="/billing" className="btn-primary mt-3 w-full text-xs">Unlock unlimited · P47/mo</Link>}
          </div>
          <Link href="/assistant" className="card flex items-center gap-3 hover:border-emerald-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Sparkles size={18} /></div>
            <div><div className="text-sm font-medium">Ask the AI assistant</div><div className="text-xs text-slate-500">&quot;Who owes me money?&quot;</div></div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit === Infinity;
  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs"><span className="text-slate-600">{label}</span><span className="text-slate-500">{used} / {unlimited ? "∞" : limit}</span></div>
      {!unlimited && <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${pct >= 90 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} /></div>}
    </div>
  );
}
