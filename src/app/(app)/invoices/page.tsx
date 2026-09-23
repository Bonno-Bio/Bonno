"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2, Printer, MessageCircle, CheckCircle2, ArrowRightLeft, Repeat } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEntitlements } from "@/lib/useEntitlements";
import { addDays, fmtDate, invoiceTotals, money, todayISO, uid } from "@/lib/utils";
import type { DocKind, Invoice, LineItem, PaymentMethod } from "@/lib/types";
import { PageHeader, Modal, Field, Empty, StatusBadge } from "@/components/ui";
import { UpgradePrompt } from "@/components/Paywall";
import { upgradeReason } from "@/lib/entitlements";
import { cn } from "@/lib/utils";

export default function Page() {
  return <Suspense><Invoices /></Suspense>;
}

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "cash", label: "Cash" }, { id: "card", label: "Visa / Mastercard" }, { id: "paypal", label: "PayPal" },
  { id: "bank_transfer", label: "Bank transfer" }, { id: "other", label: "Other" },
];

function Invoices() {
  const params = useSearchParams();
  const { invoices, customers, business, recordPayment, addReminder, deleteInvoice, requestApproval, updateInvoice, convertQuoteToInvoice, notify } = useStore();
  const ent = useEntitlements();
  const [tab, setTab] = useState<DocKind>("invoice");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Invoice | null>(null);
  const [pay, setPay] = useState<Invoice | null>(null);
  const vat = business?.vatRate ?? 0;
  const custById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);

  useEffect(() => { if (params.get("new")) setOpen(true); }, [params]);

  // Auto-mark overdue
  useEffect(() => {
    const t = todayISO();
    invoices.forEach((i) => { if (i.kind === "invoice" && i.status === "sent" && i.dueDate < t) updateInvoice(i.id, { status: "overdue" }); });
  }, [invoices, updateInvoice]);

  const list = invoices.filter((i) => i.kind === tab);

  const sendReminder = (i: Invoice) => {
    const c = custById[i.customerId];
    const phone = c?.phone?.replace(/\D/g, "");
    const t = invoiceTotals(i, vat).total;
    const msg = encodeURIComponent(`Dumela ${c?.name ?? ""}, friendly reminder from ${business?.name}: invoice ${i.number} for ${money(t)} was due ${fmtDate(i.dueDate)}. Thank you!`);
    if (!c?.reminderConsent && c?.reminderConsent !== undefined) { notify("Reminder not sent", "This customer has not consented to reminders."); return; }
    window.open(`https://wa.me/${phone ?? ""}?text=${msg}`, "_blank");
    addReminder({ invoiceId: i.id, customerId: i.customerId, channel: "whatsapp", message: decodeURIComponent(msg), outcome: "opened" });
    notify("Reminder recorded", `WhatsApp reminder opened for ${i.number}.`);
  };

  return (
    <div>
      <PageHeader title="Invoices & Quotes" subtitle={`${ent.usage.invoices_per_month} / ${ent.limitFor("invoices_per_month") === Infinity ? "∞" : ent.limitFor("invoices_per_month")} invoices this month`}
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New</button>} />

      <div className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1 text-sm">
        {(["invoice", "quote"] as DocKind[]).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={cn("flex-1 rounded-lg py-1.5 capitalize", tab === k ? "bg-white font-medium shadow-sm" : "text-slate-500")}>{k}s {k === "quote" && !ent.can("quotes") && "🔒"}</button>
        ))}
      </div>

      {tab === "quote" && !ent.can("quotes") ? (
        <UpgradePrompt reason={upgradeReason("quotes")} />
      ) : list.length === 0 ? (
        <Empty title={`No ${tab}s yet`} body={tab === "invoice" ? "Create a BURS-compliant invoice in under a minute." : "Quotes can be converted to invoices in one tap."} action={<button className="btn-primary" onClick={() => setOpen(true)}>New {tab}</button>} />
      ) : (
        <ul className="space-y-2">
          {list.map((i) => {
            const t = invoiceTotals(i, vat);
            return (
              <li key={i.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <button className="min-w-0 text-left" onClick={() => setView(i)}>
                    <div className="truncate font-medium">{custById[i.customerId]?.name ?? "—"}</div>
                    <div className="text-xs text-slate-500">{i.number} · Due {fmtDate(i.dueDate)} {i.recurring && <span className="ml-1 inline-flex items-center gap-0.5"><Repeat size={10} />{i.recurring}</span>}</div>
                  </button>
                  <div className="text-right"><div className="font-semibold">{money(t.total)}</div><StatusBadge status={i.status} /></div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <button className="btn-secondary px-2 py-1 text-xs" onClick={() => setView(i)}><Printer size={14} /> PDF</button>
                  {i.kind === "invoice" && i.status !== "paid" && i.status !== "void" && (
                    <>
                      <button className="btn-secondary px-2 py-1 text-xs" onClick={() => setPay(i)}><CheckCircle2 size={14} /> Record payment</button>
                      {ent.can("whatsapp_reminders") ? (
                        <button className="btn-secondary px-2 py-1 text-xs" onClick={() => sendReminder(i)}><MessageCircle size={14} /> WhatsApp reminder</button>
                      ) : <UpgradePrompt inline reason="" />}
                    </>
                  )}
                  {i.kind === "quote" && i.status !== "void" && (
                    <button className="btn-secondary px-2 py-1 text-xs" onClick={() => { const inv = convertQuoteToInvoice(i.id); if (inv) { setTab("invoice"); notify("Quote converted", `${i.number} → ${inv.number}`); } }}><ArrowRightLeft size={14} /> Convert to invoice</button>
                  )}
                  <button className="btn-ghost ml-auto px-2 py-1 text-xs text-rose-600" onClick={() => { if (!confirm(i.status === "draft" ? "Delete draft?" : "Request approval to void this invoice?")) return; if (i.status === "draft") deleteInvoice(i.id); else requestApproval({ action: "void_invoice", entity: "invoice", entityId: i.id, reason: `Void ${i.number} for ${custById[i.customerId]?.name ?? "customer"}` }); }}><Trash2 size={14} />{i.status !== "draft" && " Request void"}</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NewDocModal open={open} onClose={() => setOpen(false)} defaultKind={tab} />

      <Modal open={!!pay} onClose={() => setPay(null)} title={`Record payment · ${pay?.number}`}>
        {pay && <PayForm inv={pay} vat={vat} onDone={(m, ref) => { recordPayment({ invoiceId: pay.id, amount: invoiceTotals(pay, vat).total, method: m, reference: ref }); setPay(null); }} />}
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.number ?? ""} wide>
        {view && <DocPreview inv={view} />}
      </Modal>
    </div>
  );
}

function PayForm({ inv, vat, onDone }: { inv: Invoice; vat: number; onDone: (m: PaymentMethod, ref: string, proofUrl?: string) => void }) {
  const [m, setM] = useState<PaymentMethod>("cash");
  const [ref, setRef] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  return (
    <div className="space-y-3">
      <div className="text-2xl font-semibold">{money(invoiceTotals(inv, vat).total)}</div>
      <Field label="Payment method">
        <div className="grid grid-cols-2 gap-2">{METHODS.map((x) => <button key={x.id} onClick={() => setM(x.id)} className={cn("rounded-xl border px-3 py-2 text-sm", m === x.id ? "border-emerald-600 bg-emerald-50 font-medium" : "border-slate-200")}>{x.label}</button>)}</div>
      </Field>
      <Field label="Reference (optional)"><input className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. OM-88213" /></Field>
      <Field label="Payment proof link (optional)"><input className="input" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="Photo/receipt URL" /><p className="mt-1 text-[11px] text-slate-500">Proof is marked pending until reviewed.</p></Field>
      <button className="btn-primary w-full" onClick={() => onDone(m, ref, proofUrl || undefined)}>Mark as paid</button>
    </div>
  );
}

function NewDocModal({ open, onClose, defaultKind }: { open: boolean; onClose: () => void; defaultKind: DocKind }) {
  const { customers, products, business, addInvoice, addCustomer } = useStore();
  const ent = useEntitlements();
  const vat = business?.vatRate ?? 0;
  const [kind, setKind] = useState<DocKind>(defaultKind);
  const [customerId, setCustomerId] = useState("");
  const [newCust, setNewCust] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ id: uid(), description: "", qty: 1, unitPrice: 0, taxable: vat > 0 }]);
  const [dueDays, setDueDays] = useState(7);
  const [recurring, setRecurring] = useState<"" | "monthly" | "weekly">("");
  const [notes, setNotes] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  useEffect(() => { setKind(defaultKind); }, [defaultKind, open]);

  const totals = invoiceTotals({ items }, vat);
  const limitHit = kind === "invoice" && !ent.withinLimit("invoices_per_month", ent.usage.invoices_per_month);
  const quoteLocked = kind === "quote" && !ent.can("quotes");

  const setItem = (id: string, patch: Partial<LineItem>) => setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const pickProduct = (id: string, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (p) setItem(id, { productId, description: p.name, unitPrice: p.price });
  };

  const submit = (status: Invoice["status"]) => {
    let cid = customerId;
    if (!cid && newCust) cid = addCustomer({ name: newCust }).id;
    if (!cid) return;
    const today = todayISO();
    addInvoice({ kind, customerId: cid, items: items.filter((i) => i.description), issueDate: today, dueDate: addDays(today, dueDays), status, notes, discountAmount: discountAmount || undefined, discountReason: discountReason || undefined, recurring: recurring || null });
    setItems([{ id: uid(), description: "", qty: 1, unitPrice: 0, taxable: vat > 0 }]); setCustomerId(""); setNewCust(""); setNotes(""); setDiscountAmount(0); setDiscountReason(""); setRecurring("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`New ${kind}`} wide>
      {limitHit ? <UpgradePrompt reason={upgradeReason("invoices_per_month")} /> : quoteLocked ? <UpgradePrompt reason={upgradeReason("quotes")} /> : (
        <div className="space-y-4">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-sm">
            {(["invoice", "quote"] as DocKind[]).map((k) => <button key={k} onClick={() => setKind(k)} className={cn("flex-1 rounded-lg py-1.5 capitalize", kind === k ? "bg-white font-medium shadow-sm" : "text-slate-500")}>{k}</button>)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer">
              <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">— select or type new —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            {!customerId && <Field label="Or new customer name"><input className="input" value={newCust} onChange={(e) => setNewCust(e.target.value)} placeholder="Walk-in customer" /></Field>}
          </div>

          <div>
            <label className="label">Items</label>
            <div className="space-y-2">
              {items.map((i) => (
                <div key={i.id} className="grid grid-cols-12 gap-2">
                  {products.length > 0 && (
                    <select className="input col-span-12 sm:col-span-3" value={i.productId ?? ""} onChange={(e) => pickProduct(i.id, e.target.value)}>
                      <option value="">Product…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                  <input className={cn("input col-span-12", products.length ? "sm:col-span-4" : "sm:col-span-7")} placeholder="Description" value={i.description} onChange={(e) => setItem(i.id, { description: e.target.value })} />
                  <input className="input col-span-3 sm:col-span-1" type="number" min={1} value={i.qty} onChange={(e) => setItem(i.id, { qty: +e.target.value })} />
                  <input className="input col-span-5 sm:col-span-2" type="number" min={0} step="0.01" placeholder="Price" value={i.unitPrice || ""} onChange={(e) => setItem(i.id, { unitPrice: +e.target.value })} />
                  <div className="col-span-3 flex items-center justify-end gap-1 text-sm sm:col-span-2">
                    <span className="font-medium">{money(i.qty * i.unitPrice)}</span>
                    <button className="btn-ghost p-1 text-rose-500" onClick={() => setItems(items.filter((x) => x.id !== i.id))} disabled={items.length === 1}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-ghost mt-2 text-xs" onClick={() => setItems([...items, { id: uid(), description: "", qty: 1, unitPrice: 0, taxable: vat > 0 }])}><Plus size={14} /> Add line</button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Due in (days)"><input className="input" type="number" value={dueDays} onChange={(e) => setDueDays(+e.target.value)} /></Field>
            <Field label={`Recurring ${ent.can("recurring_invoices") ? "" : "🔒"}`}>
              <select className="input" disabled={!ent.can("recurring_invoices")} value={recurring} onChange={(e) => setRecurring(e.target.value as typeof recurring)}>
                <option value="">No</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Discount (BWP)"><input className="input" type="number" min="0" value={discountAmount || ""} onChange={(e) => setDiscountAmount(Number(e.target.value))} placeholder="0" /></Field><Field label="Discount reason"><input className="input" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="Optional explanation" /></Field></div>
          <Field label="Notes"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms…" /></Field>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
            {vat > 0 && <div className="flex justify-between text-slate-500"><span>VAT {Math.round(vat * 100)}%</span><span>{money(totals.vat)}</span></div>}
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Total</span><span>{money(totals.total)}</span></div>
          </div>

          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => submit("draft")} disabled={!(customerId || newCust)}>Save draft</button>
            <button className="btn-primary flex-1" onClick={() => submit(kind === "invoice" ? "sent" : "sent")} disabled={!(customerId || newCust) || totals.total <= 0}>{kind === "invoice" ? "Issue invoice" : "Send quote"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DocPreview({ inv }: { inv: Invoice }) {
  const { business, customers, payments } = useStore();
  const ent = useEntitlements();
  const c = customers.find((x) => x.id === inv.customerId);
  const vat = business?.vatRate ?? 0;
  const t = invoiceTotals(inv, vat);
  const paid = payments.filter((p) => p.invoiceId === inv.id);
  return (
    <div>
      <div id="print-doc" className="rounded-xl border border-slate-200 p-5 text-sm">
        <div className="flex justify-between">
          <div>
            <div className="text-lg font-bold">{business?.name}</div>
            <div className="text-xs text-slate-500">{business?.address}<br />{business?.phone} · {business?.email}</div>
            {business?.vatNumber && <div className="text-xs text-slate-500">VAT No: {business.vatNumber}</div>}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold uppercase text-emerald-700">{inv.kind === "invoice" ? (vat > 0 ? "Tax Invoice" : "Invoice") : "Quotation"}</div>
            <div className="text-xs">{inv.number}</div>
            <div className="text-xs text-slate-500">Issued {fmtDate(inv.issueDate)}<br />{inv.kind === "invoice" ? "Due" : "Valid until"} {fmtDate(inv.dueDate)}</div>
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-500">Bill to</div>
        <div className="font-medium">{c?.name}</div>
        <div className="text-xs text-slate-500">{c?.phone} {c?.email}</div>
        <table className="mt-4 w-full">
          <thead><tr className="border-b text-left text-xs text-slate-500"><th className="py-1">Description</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{inv.items.map((i) => <tr key={i.id} className="border-b border-slate-100"><td className="py-1.5">{i.description}</td><td className="text-right">{i.qty}</td><td className="text-right">{money(i.unitPrice)}</td><td className="text-right">{money(i.qty * i.unitPrice)}</td></tr>)}</tbody>
        </table>
        <div className="ml-auto mt-3 w-56 space-y-0.5">
          <div className="flex justify-between"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
          {vat > 0 && <div className="flex justify-between"><span>VAT {Math.round(vat * 100)}%</span><span>{money(t.vat)}</span></div>}
          <div className="flex justify-between border-t pt-1 font-bold"><span>Total</span><span>{money(t.total)}</span></div>
          {paid.length > 0 && <div className="flex justify-between text-emerald-700"><span>Paid</span><span>{money(paid.reduce((s, p) => s + p.amount, 0))}</span></div>}
        </div>
        {inv.notes && <div className="mt-4 text-xs text-slate-500">{inv.notes}</div>}
        <div className="mt-6 text-center text-[10px] text-slate-400">{ent.can("custom_branding") ? "" : "Generated with KgweboOS · kgwebo.os"}</div>
      </div>
      <button className="btn-primary mt-3 w-full" onClick={() => window.print()}><Printer size={16} /> Print / Save as PDF</button>
      <style jsx global>{`@media print { body * { visibility: hidden; } #print-doc, #print-doc * { visibility: visible; } #print-doc { position: fixed; inset: 0; border: 0; } }`}</style>
    </div>
  );
}
