"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2, Camera, ScanLine } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { uploadBusinessDocument } from "@/lib/firebase/storage";
import { useEntitlements } from "@/lib/useEntitlements";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/types";
import { fmtDate, money, todayISO, isSameMonth } from "@/lib/utils";
import { PageHeader, Modal, Field, Empty, Stat } from "@/components/ui";
import { UpgradePrompt } from "@/components/Paywall";

export default function Page() {
  return <Suspense><Expenses /></Suspense>;
}

function Expenses() {
  const params = useSearchParams();
  const { expenses, addExpense, deleteExpense } = useStore();
  const auth = useAuth();
  const ent = useEntitlements();
  const [open, setOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptStoragePath, setReceiptStoragePath] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [f, setF] = useState({ category: "Other" as ExpenseCategory, amount: "", vendor: "", date: todayISO(), note: "", receiptUrl: "" });
  useEffect(() => { if (params.get("new")) setOpen(true); }, [params]);

  const monthTotal = expenses.filter((e) => isSameMonth(e.date)).reduce((s, e) => s + e.amount, 0);
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ c, v: expenses.filter((e) => e.category === c && isSameMonth(e.date)).reduce((s, e) => s + e.amount, 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);

  const onReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setReceiptFile(file);
    setReceiptStoragePath("");
    setF((x) => ({ ...x, receiptUrl: url, vendor: x.vendor || file.name.replace(/\.[^.]+$/, "") }));
    const bid = useStore.getState().business?.id;
    if (isFirebaseConfigured && auth.fbUser && bid) { setUploadingReceipt(true); void uploadBusinessDocument(bid, file).then((result) => { setF((x) => ({ ...x, receiptUrl: result.url })); setReceiptStoragePath(result.storagePath); }).catch(() => undefined).finally(() => setUploadingReceipt(false)); }
  };

  const runOcr = async () => {
    if (!receiptFile || !auth.fbUser || !useStore.getState().business) return;
    setOcrBusy(true);
    try { const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(receiptFile); }); const token = await auth.fbUser.getIdToken(); const r = await fetch("/api/ocr/receipt", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ businessId: useStore.getState().business?.id, imageDataUrl: dataUrl, mimeType: receiptFile.type }) }); const d = await r.json(); if (!r.ok) { alert(d.error); return; } setF((x) => ({ ...x, amount: d.amount != null ? String(d.amount) : x.amount, vendor: d.vendor || x.vendor, date: d.date || x.date, note: `${x.note ? `${x.note} · ` : ""}OCR confidence ${Math.round((d.confidence ?? 0) * 100)}%` })); } catch { alert("Could not read receipt."); } finally { setOcrBusy(false); }
  };

  const submit = () => {
    if (!f.amount) return;
    addExpense({ ...f, amount: +f.amount, receiptStoragePath: receiptStoragePath || undefined, retentionUntil: f.receiptUrl ? new Date(new Date().setFullYear(new Date().getFullYear() + 7)).toISOString() : undefined });
    setF({ category: "Other", amount: "", vendor: "", date: todayISO(), note: "", receiptUrl: "" }); setReceiptFile(null); setReceiptStoragePath("");
    setOpen(false);
  };

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Track spend to see real profit" action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Add</button>} />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="This month" value={money(monthTotal)} tone="bad" />
        <div className="card">
          <div className="text-xs font-medium text-slate-500">Top categories</div>
          <ul className="mt-1 space-y-0.5 text-xs">{byCat.slice(0, 3).map((x) => <li key={x.c} className="flex justify-between"><span>{x.c}</span><span className="font-medium">{money(x.v)}</span></li>)}{byCat.length === 0 && <li className="text-slate-400">—</li>}</ul>
        </div>
      </div>

      {expenses.length === 0 ? (
        <Empty title="No expenses yet" body="Log rent, stock, airtime and transport so your profit is accurate." action={<button className="btn-primary" onClick={() => setOpen(true)}>Add expense</button>} />
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => (
            <li key={e.id} className="card flex items-center gap-3">
              {e.receiptUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={e.receiptUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">{e.category[0]}</div>}
              <div className="min-w-0 flex-1"><div className="truncate font-medium">{e.vendor || e.category}</div><div className="text-xs text-slate-500">{e.category} · {fmtDate(e.date)}{e.note && ` · ${e.note}`}</div></div>
              <div className="font-semibold">{money(e.amount)}</div>
              <button className="btn-ghost p-1.5 text-rose-600" onClick={() => deleteExpense(e.id)}><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add expense">
        <div className="space-y-3">
          <Field label="Amount (P) *"><input className="input text-lg" type="number" step="0.01" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} autoFocus /></Field>
          <Field label="Category">
            <div className="flex flex-wrap gap-1.5">{EXPENSE_CATEGORIES.map((c) => <button key={c} onClick={() => setF({ ...f, category: c })} className={`rounded-full border px-3 py-1 text-xs ${f.category === c ? "border-emerald-600 bg-emerald-50 font-medium" : "border-slate-200"}`}>{c}</button>)}</div>
          </Field>
          <Field label="Vendor / paid to"><input className="input" value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Note"><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          </div>
          <Field label="Receipt photo">
            <label className="btn-secondary w-full cursor-pointer"><Camera size={16} /> {uploadingReceipt ? "Uploading receipt…" : f.receiptUrl ? "Receipt attached ✓" : "Attach / take photo"}<input type="file" accept="image/*" capture="environment" className="hidden" onChange={onReceipt} /></label>
          </Field>
          {ent.can("receipt_ocr") ? (
            <button className="btn-ghost w-full text-xs" disabled={!f.receiptUrl} onClick={() => void runOcr()}><ScanLine size={14} /> {ocrBusy ? "Reading receipt…" : "Auto-fill from receipt (OCR)"}</button>
          ) : (
            <div className="text-center text-xs text-slate-400">Receipt OCR auto-fill is a <UpgradePrompt inline reason="" /> feature</div>
          )}
          <button className="btn-primary w-full" onClick={submit} disabled={!f.amount || uploadingReceipt}>Save expense</button>
        </div>
      </Modal>
    </div>
  );
}
