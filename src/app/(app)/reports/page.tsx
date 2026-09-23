"use client";
import { useMemo } from "react";
import { Download } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEntitlements } from "@/lib/useEntitlements";
import { invoiceTotals, money } from "@/lib/utils";
import { PageHeader, Stat } from "@/components/ui";
import { Gate } from "@/components/Paywall";

export default function Reports() {
  const { invoices, payments, expenses, customers, products, business } = useStore();
  const ent = useEntitlements();
  const vat = business?.vatRate ?? 0;

  const data = useMemo(() => {
    const months: { key: string; label: string; sales: number; expenses: number; vatOut: number }[] = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - k);
      const key = d.toISOString().slice(0, 7);
      months.push({ key, label: d.toLocaleDateString("en-GB", { month: "short" }), sales: 0, expenses: 0, vatOut: 0 });
    }
    const byKey = Object.fromEntries(months.map((m) => [m.key, m]));
    payments.forEach((p) => { const m = byKey[p.createdAt.slice(0, 7)]; if (m) m.sales += p.amount; });
    expenses.forEach((e) => { const m = byKey[e.date.slice(0, 7)]; if (m) m.expenses += e.amount; });
    invoices.filter((i) => i.kind === "invoice" && i.status === "paid").forEach((i) => { const m = byKey[i.issueDate.slice(0, 7)]; if (m) m.vatOut += invoiceTotals(i, vat).vat; });
    return months;
  }, [payments, expenses, invoices, vat]);

  const totalSales = data.reduce((s, m) => s + m.sales, 0);
  const totalExp = data.reduce((s, m) => s + m.expenses, 0);
  const max = Math.max(1, ...data.map((m) => Math.max(m.sales, m.expenses)));
  const cur = data[data.length - 1];

  const custById = Object.fromEntries(customers.map((c) => [c.id, c.name]));
  const topCustomers = Object.entries(
    invoices.filter((i) => i.kind === "invoice" && i.status === "paid").reduce<Record<string, number>>((acc, i) => { acc[i.customerId] = (acc[i.customerId] ?? 0) + invoiceTotals(i, vat).total; return acc; }, {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const topProducts = Object.entries(
    invoices.filter((i) => i.kind === "invoice" && i.status === "paid").flatMap((i) => i.items).reduce<Record<string, number>>((acc, li) => { acc[li.description] = (acc[li.description] ?? 0) + li.qty * li.unitPrice; return acc; }, {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const receivables = invoices.filter((i) => i.kind === "invoice" && (i.status === "sent" || i.status === "overdue")).reduce((s, i) => s + invoiceTotals(i, vat).total, 0);

  const exportCSV = () => {
    const rows = [["Month", "Sales", "Expenses", "Profit", "VAT output"], ...data.map((m) => [m.key, m.sales.toFixed(2), m.expenses.toFixed(2), (m.sales - m.expenses).toFixed(2), m.vatOut.toFixed(2)])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `kgweboos-report-${cur.key}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" subtitle="Last 6 months" action={ent.can("advanced_reports") ? <button className="btn-secondary" onClick={exportCSV}><Download size={16} /> CSV</button> : undefined} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales (6 mo)" value={money(totalSales)} tone="good" />
        <Stat label="Expenses (6 mo)" value={money(totalExp)} tone="bad" />
        <Stat label="This month profit" value={money(cur.sales - cur.expenses)} tone={cur.sales - cur.expenses >= 0 ? "good" : "bad"} />
        <Stat label="Receivables" value={money(receivables)} tone="warn" />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Sales vs expenses</h2>
        <div className="flex h-40 items-end gap-2">
          {data.map((m) => (
            <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 130 }}>
                <div className="w-1/3 rounded-t bg-emerald-500" style={{ height: `${(m.sales / max) * 100}%` }} title={money(m.sales)} />
                <div className="w-1/3 rounded-t bg-rose-400" style={{ height: `${(m.expenses / max) * 100}%` }} title={money(m.expenses)} />
              </div>
              <div className="text-[11px] text-slate-500">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-slate-500"><span><span className="mr-1 inline-block h-2 w-2 rounded bg-emerald-500" />Sales</span><span><span className="mr-1 inline-block h-2 w-2 rounded bg-rose-400" />Expenses</span></div>
      </div>

      <Gate feature="advanced_reports">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card">
            <h2 className="mb-2 font-semibold">Profit & loss</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500"><th>Month</th><th className="text-right">Sales</th><th className="text-right">Expenses</th><th className="text-right">Profit</th></tr></thead>
              <tbody>{data.map((m) => <tr key={m.key} className="border-t border-slate-100"><td className="py-1.5">{m.label}</td><td className="text-right">{money(m.sales)}</td><td className="text-right">{money(m.expenses)}</td><td className={`text-right font-medium ${m.sales - m.expenses >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{money(m.sales - m.expenses)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="card">
            <h2 className="mb-2 font-semibold">VAT summary (BURS)</h2>
            {vat === 0 ? <p className="text-sm text-slate-500">Your business is not VAT registered. Enable VAT in Settings if you register with BURS.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-500"><th>Month</th><th className="text-right">Output VAT</th></tr></thead>
                <tbody>{data.map((m) => <tr key={m.key} className="border-t border-slate-100"><td className="py-1.5">{m.label}</td><td className="text-right">{money(m.vatOut)}</td></tr>)}</tbody>
              </table>
            )}
          </div>
          <div className="card">
            <h2 className="mb-2 font-semibold">Top customers</h2>
            <ul className="space-y-1 text-sm">{topCustomers.map(([id, v]) => <li key={id} className="flex justify-between"><span>{custById[id] ?? "—"}</span><span className="font-medium">{money(v)}</span></li>)}{!topCustomers.length && <li className="text-slate-400">No paid invoices yet</li>}</ul>
          </div>
          <div className="card">
            <h2 className="mb-2 font-semibold">Top products / services</h2>
            <ul className="space-y-1 text-sm">{topProducts.map(([n, v]) => <li key={n} className="flex justify-between"><span>{n}</span><span className="font-medium">{money(v)}</span></li>)}{!topProducts.length && <li className="text-slate-400">No sales yet</li>}</ul>
          </div>
        </div>
      </Gate>
      <p className="text-xs text-slate-400">{products.length} products · {customers.length} customers · {invoices.length} documents</p>
    </div>
  );
}
