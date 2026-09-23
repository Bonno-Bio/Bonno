"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useEntitlements } from "@/lib/useEntitlements";
import { PageHeader, Field, StatusBadge } from "@/components/ui";
import { Check, X, ShieldAlert } from "lucide-react";
import { UpgradePrompt } from "@/components/Paywall";
import { fmtDate } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { syncBridge } from "@/lib/firebase/bridge";
import { createInvite } from "@/lib/firebase/invites";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { uploadBusinessDocument } from "@/lib/firebase/storage";

const ROLES: { id: Role; label: string; desc: string; premium?: boolean }[] = [
  { id: "owner", label: "Owner / Admin", desc: "Full access incl. billing" },
  { id: "manager", label: "Manager", desc: "Everything except billing & deleting the business" },
  { id: "accountant", label: "Accountant", desc: "Invoices, expenses, reports", premium: true },
  { id: "salesperson", label: "Salesperson", desc: "Customers, invoices, POS", premium: true },
  { id: "staff", label: "Staff", desc: "POS and own tasks only", premium: true },
  { id: "auditor", label: "External auditor", desc: "Read-only reports", premium: true },
];

export default function Settings() {
  const { business, user, auditLogs, approvals, pendingOps, resolveApproval } = useStore();
  const ent = useEntitlements();
  const auth = useAuth();
  const [b, setB] = useState({ name: business?.name ?? "", phone: business?.phone ?? "", email: business?.email ?? "", address: business?.address ?? "", vatNumber: business?.vatNumber ?? "", cipaNumber: business?.cipaNumber ?? "", tradeLicenseNumber: business?.tradeLicenseNumber ?? "", taxClearanceExpiry: business?.taxClearanceExpiry ?? "", logoUrl: business?.logoUrl ?? "", brandColor: business?.brandColor ?? "#047857", vat: (business?.vatRate ?? 0) > 0 });
  const [invite, setInvite] = useState({ email: "", role: "manager" as Role });
  const [saved, setSaved] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const save = () => {
    useStore.setState({ business: { ...business!, name: b.name, phone: b.phone, email: b.email, address: b.address, vatNumber: b.vat ? b.vatNumber : undefined, cipaNumber: b.cipaNumber || undefined, tradeLicenseNumber: b.tradeLicenseNumber || undefined, taxClearanceExpiry: b.taxClearanceExpiry || undefined, logoUrl: b.logoUrl || undefined, brandColor: b.brandColor || undefined, vatRate: b.vat ? 0.14 : 0 } });
    useStore.getState().log("business.updated", "business", business?.id);
    syncBridge.onBusinessUpdated?.(useStore.getState().business!);
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  };

  const sendInvite = async () => {
    if (!invite.email || !business) return;
    useStore.getState().log("user.invited", "user", invite.email);
    if (auth.mode === "firebase") {
      await createInvite(business.id, business.name, invite.email, invite.role);
      useStore.getState().notify("Invite created", `${invite.email} can now sign in with this email and will join ${business.name} as ${invite.role}.`);
    } else {
      useStore.getState().notify("Invite (local mode)", `Invites are delivered once Firebase is connected.`);
    }
    setInvite({ email: "", role: "manager" });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" />

      <section className="card space-y-3">
        <h2 className="font-semibold">Business profile</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Business name"><input className="input" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={b.phone} onChange={(e) => setB({ ...b, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="input" value={b.email} onChange={(e) => setB({ ...b, email: e.target.value })} /></Field>
          <Field label="Address"><input className="input" value={b.address} onChange={(e) => setB({ ...b, address: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={b.vat} onChange={(e) => setB({ ...b, vat: e.target.checked })} /> VAT registered with BURS (14%)</label>
        {b.vat && <Field label="VAT number"><input className="input" value={b.vatNumber} onChange={(e) => setB({ ...b, vatNumber: e.target.value })} /></Field>}
        <button className="btn-primary" onClick={save}>{saved ? "Saved ✓" : "Save changes"}</button>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Team & roles</h2><span className="text-xs text-slate-500">{ent.usage.users} / {ent.limitFor("users")} users</span></div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-800">{user?.name[0]}</div><div><div className="font-medium">{user?.name}</div><div className="text-xs text-slate-500">{user?.email}</div></div><span className="badge ml-auto bg-emerald-100 text-emerald-800">Owner</span></div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input className="input" placeholder="teammate@email.com" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          <select className="input" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as Role })}>
            {ROLES.filter((r) => r.id !== "owner").map((r) => <option key={r.id} value={r.id} disabled={!!r.premium && !ent.can("advanced_roles")}>{r.label}{r.premium && !ent.can("advanced_roles") ? " 🔒" : ""}</option>)}
          </select>
          <button className="btn-primary" onClick={sendInvite} disabled={!invite.email || !ent.withinLimit("users", ent.usage.users)}>Invite</button>
        </div>
        {!ent.can("advanced_roles") && <p className="text-xs text-slate-500">Free includes Owner + Manager. Accountant, Salesperson, Staff and Auditor roles are <UpgradePrompt inline reason="" />.</p>}
        <ul className="grid gap-1 text-xs text-slate-500 sm:grid-cols-2">{ROLES.map((r) => <li key={r.id}><b className="text-slate-700">{r.label}</b> — {r.desc}</li>)}</ul>
      </section>

      <section className="card space-y-3">
        <div><h2 className="font-semibold">BURS readiness</h2><p className="text-xs text-slate-500">Prepare your records while official electronic invoicing specifications are validated. This is a readiness checklist, not a BURS certification.</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="CIPA registration number"><input className="input" value={b.cipaNumber} onChange={(e) => setB({ ...b, cipaNumber: e.target.value })} placeholder="Optional" /></Field><Field label="Trade licence number"><input className="input" value={b.tradeLicenseNumber} onChange={(e) => setB({ ...b, tradeLicenseNumber: e.target.value })} placeholder="Optional" /></Field><Field label="Tax clearance expiry"><input className="input" type="date" value={b.taxClearanceExpiry} onChange={(e) => setB({ ...b, taxClearanceExpiry: e.target.value })} /></Field></div>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">{[
          [!!business?.name, "Business identity recorded"], [!!business?.vatNumber || !b.vat, "VAT profile completed or marked non-VAT"], [!!business?.cipaNumber, "CIPA number recorded"], [!!business?.tradeLicenseNumber, "Trade licence recorded"], [!!business?.taxClearanceExpiry, "Tax clearance expiry recorded"], [true, "Structured invoice export available"], [true, "Seven-year retention metadata enabled"],
        ].map(([ok, label]) => <li key={String(label)} className={`rounded-lg px-3 py-2 ${ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{ok ? "✓" : "○"} {label}</li>)}</ul>
        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Record retention: documents are designed to remain accessible for <b>7 years</b> from creation. This workspace’s retention horizon is <b>{business ? new Date(new Date(business.createdAt).setFullYear(new Date(business.createdAt).getFullYear() + 7)).toLocaleDateString("en-GB") : "—"}</b>. Delete/export policies should be reviewed with your accountant.</div>
        <button className="btn-primary" onClick={save}>{saved ? "Saved ✓" : "Save compliance details"}</button>
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Branding {!ent.can("custom_branding") && "🔒"}</h2>
        {ent.can("custom_branding") ? <div className="space-y-3"><p className="text-sm text-slate-500">Upload your logo and choose the colour used on server-generated PDFs.</p><div className="flex gap-2"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} /><input className="h-10 w-14 rounded border" type="color" value={b.brandColor} onChange={(e) => setB({ ...b, brandColor: e.target.value })} /></div><button className="btn-secondary" disabled={!logoFile || uploadingLogo || !business} onClick={async () => { if (!logoFile || !business) return; setUploadingLogo(true); const result = await uploadBusinessDocument(business.id, logoFile); setB({ ...b, logoUrl: result.url }); setUploadingLogo(false); }}> {uploadingLogo ? "Uploading…" : "Upload logo"}</button>{b.logoUrl && <img src={b.logoUrl} alt="Business logo" className="h-12 max-w-32 object-contain" />}<button className="btn-primary" onClick={save}>{saved ? "Saved ✓" : "Save branding"}</button></div> : <p className="text-sm text-slate-500">Remove &quot;Generated with KgweboOS&quot; from invoices and add your logo with <UpgradePrompt inline reason="" />.</p>}
      </section>

      <section className="card">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Data & sync</h2><StatusBadge status={pendingOps.length ? "sent" : "paid"} /></div>
        <p className="mt-1 text-sm text-slate-500">{pendingOps.length} change{pendingOps.length === 1 ? "" : "s"} waiting to sync. Data is stored on this device and encrypted in transit when synced. Your business owns its data — export any time.</p>
        <button className="btn-secondary mt-2" onClick={() => { const blob = new Blob([JSON.stringify(useStore.getState(), null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "kgweboos-export.json"; a.click(); }}>Export all data (JSON)</button>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Approval queue</h2><span className="badge bg-amber-100 text-amber-800">{approvals.filter((a) => a.status === "pending").length} pending</span></div>
        {approvals.filter((a) => a.status === "pending").length ? <ul className="space-y-2">{approvals.filter((a) => a.status === "pending").slice(0, 20).map((a) => <li key={a.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><div className="flex items-start gap-2"><ShieldAlert size={16} className="mt-0.5 text-amber-700" /><div className="min-w-0 flex-1"><div className="font-medium capitalize">{a.action.replaceAll("_", " ")}</div><div className="text-xs text-slate-600">{a.reason} · requested by {a.requestedBy}</div><div className="mt-2 flex gap-1"><button className="btn-primary px-2 py-1 text-xs" onClick={() => resolveApproval(a.id, "approved")}><Check size={13} /> Approve</button><button className="btn-ghost px-2 py-1 text-xs text-rose-700" onClick={() => resolveApproval(a.id, "rejected")}><X size={13} /> Reject</button></div></div></div></li>)}</ul> : <p className="text-sm text-slate-500">No sensitive actions are waiting for approval.</p>}
      </section>

      <section className="card">
        <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Audit exceptions</h2><span className="text-xs text-slate-500">Unresolved warnings</span></div>
        <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto text-xs">{auditLogs.filter((l) => l.exception && !l.resolvedAt).slice(0, 30).map((l) => <li key={l.id} className="flex justify-between py-2"><span><b className="text-amber-700">{l.action}</b> <span className="text-slate-400">{l.entityId}</span></span><span className="text-slate-400">{fmtDate(l.createdAt)}</span></li>)}{!auditLogs.some((l) => l.exception && !l.resolvedAt) && <li className="py-2 text-slate-400">No unresolved exceptions.</li>}</ul>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Audit log</h2>
        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto text-xs">
          {auditLogs.slice(0, 50).map((l) => <li key={l.id} className="flex justify-between py-1.5"><span><b>{l.action}</b> <span className="text-slate-400">{l.entityId}</span></span><span className="text-slate-400">{l.actor} · {fmtDate(l.createdAt)}</span></li>)}
          {!auditLogs.length && <li className="py-3 text-slate-400">No activity yet.</li>}
        </ul>
      </section>
    </div>
  );
}
