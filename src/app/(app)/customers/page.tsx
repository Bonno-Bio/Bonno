"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Phone, Mail, Trash2, MessageCircle, CalendarClock, History } from "lucide-react";
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
  const { customers, invoices, business, addCustomer, updateCustomer, deleteCustomer, reminders } = useStore();
  const ent = useEntitlements();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState<(typeof customers)[number] | null>(null);
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
                    <button className="btn-ghost p-1.5" onClick={() => setManage(c)} title="Collections"><CalendarClock size={16} /></button>
                    <button className="btn-ghost p-1.5 text-rose-600" onClick={() => confirm(`Delete ${c.name}?`) && deleteCustomer(c.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!manage} onClose={() => setManage(null)} title={`Collections · ${manage?.name ?? ""}`}>
        {manage && <CollectionPanel customer={manage} reminders={reminders.filter((r) => r.customerId === manage.id)} onSave={(patch) => { updateCustomer(manage.id, patch); setManage({ ...manage, ...patch }); }} />}
      </Modal>

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


function CollectionPanel({ customer, reminders, onSave }: { customer: { id: string; phone?: string; email?: string; preferredReminderChannel?: "whatsapp" | "sms" | "email" | "phone"; reminderConsent?: boolean; promiseToPayDate?: string; promiseToPayNote?: string; escalationLevel?: 0 | 1 | 2 | 3 }; reminders: { id: string; channel: string; sentAt: string; outcome?: string }[]; onSave: (patch: Record<string, unknown>) => void }) {
  const [channel, setChannel] = useState(customer.preferredReminderChannel ?? "whatsapp");
  const [consent, setConsent] = useState(customer.reminderConsent ?? true);
  const [promise, setPromise] = useState(customer.promiseToPayDate ?? "");
  const [note, setNote] = useState(customer.promiseToPayNote ?? "");
  const [level, setLevel] = useState(customer.escalationLevel ?? 0);
  const save = () => onSave({ preferredReminderChannel: channel, reminderConsent: consent, promiseToPayDate: promise || undefined, promiseToPayNote: note || undefined, escalationLevel: level });
  return <div className="space-y-4">
    <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="font-medium">Collection preferences</div><p className="mt-1 text-xs text-slate-500">Choose a respectful channel and record consent before sending automated reminders.</p></div>
    <Field label="Preferred reminder channel"><select className="input" value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="email">Email</option><option value="phone">Phone call</option></select></Field>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Customer has agreed to payment reminders</label>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Promise-to-pay date"><input className="input" type="date" value={promise} onChange={(e) => setPromise(e.target.value)} /></Field><Field label="Escalation stage"><select className="input" value={level} onChange={(e) => setLevel(Number(e.target.value) as 0 | 1 | 2 | 3)}><option value={0}>Friendly · first reminder</option><option value={1}>Second reminder</option><option value={2}>Manager follow-up</option><option value={3}>Formal escalation</option></select></Field></div>
    <Field label="Promise-to-pay note"><textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Will pay after month-end stock sale" /></Field>
    <button className="btn-primary w-full" onClick={save}>Save collection plan</button>
    <div><h3 className="flex items-center gap-2 text-sm font-medium"><History size={15} /> Reminder history</h3>{reminders.length ? <ul className="mt-2 divide-y divide-slate-100 text-xs">{reminders.slice(0, 8).map((r) => <li key={r.id} className="flex justify-between py-2"><span>{r.channel} reminder{r.outcome ? ` · ${r.outcome}` : ""}</span><span className="text-slate-400">{new Date(r.sentAt).toLocaleDateString("en-GB")}</span></li>)}</ul> : <p className="mt-2 text-xs text-slate-400">No reminders recorded yet.</p>}</div>
  </div>;
}
