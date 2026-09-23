"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Phone, Mail, Trash2, MessageCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEntitlements } from "@/lib/useEntitlements";
import { invoiceTotals, money } from "@/lib/utils";
import { PageHeader, Modal, Field, Empty } from "@/components/ui";
import { UpgradePrompt } from "@/components/Paywall";
import { upgradeReason } from "@/lib/entitlements";

export default function Page() {
  return <Suspense><Customers /></Suspense>;
}

function Customers() {
  const params = useSearchParams();
  const { customers, invoices, business, addCustomer, deleteCustomer } = useStore();
  const ent = useEntitlements();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", email: "", notes: "" });

  useEffect(() => { if (params.get("new")) setOpen(true); }, [params]);

  const canAdd = ent.withinLimit("customers", ent.usage.customers);
  const list = customers.filter((c) => (c.name + c.phone + c.email).toLowerCase().includes(q.toLowerCase()));
  const vat = business?.vatRate ?? 0;
  const owed = (id: string) => invoices.filter((i) => i.customerId === id && i.kind === "invoice" && (i.status === "sent" || i.status === "overdue")).reduce((s, i) => s + invoiceTotals(i, vat).total, 0);

  const submit = () => {
    if (!f.name) return;
    addCustomer(f);
    setF({ name: "", phone: "", email: "", notes: "" });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} / ${ent.limitFor("customers") === Infinity ? "∞" : ent.limitFor("customers")}`}
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Add</button>}
      />
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        <input className="input pl-9" placeholder="Search customers" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <Empty title="No customers yet" body="Add your customers so you can invoice them in two taps." action={<button className="btn-primary" onClick={() => setOpen(true)}>Add customer</button>} />
      ) : (
        <ul className="space-y-2">
          {list.map((c) => {
            const o = owed(c.id);
            const wa = c.phone?.replace(/\D/g, "");
            return (
              <li key={c.id} className="card flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-800">{c.name[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                    {c.phone && <span className="flex items-center gap-1"><Phone size={12} />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail size={12} />{c.email}</span>}
                  </div>
                </div>
                <div className="text-right">
                  {o > 0 ? <div className="text-sm font-medium text-amber-700">{money(o)} owed</div> : <div className="text-xs text-slate-400">Settled</div>}
                  <div className="mt-1 flex justify-end gap-1">
                    {wa && <a className="btn-ghost p-1.5" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" title="WhatsApp"><MessageCircle size={16} /></a>}
                    <button className="btn-ghost p-1.5 text-rose-600" onClick={() => confirm(`Delete ${c.name}?`) && deleteCustomer(c.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add customer">
        {!canAdd ? (
          <UpgradePrompt reason={upgradeReason("customers")} />
        ) : (
          <div className="space-y-3">
            <Field label="Name *"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
            <Field label="Phone"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+267 …" /></Field>
            <Field label="Email"><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Notes"><input className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
            <button className="btn-primary w-full" onClick={submit} disabled={!f.name}>Save customer</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
