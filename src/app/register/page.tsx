"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { Field } from "@/components/ui";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { useEffect } from "react";

const INDUSTRIES = [
  "Salon / Barber", "Retail shop", "Restaurant / Café", "Consultant / Freelancer", "Contractor / Workshop",
  "Pharmacy / Clinic", "Agro-business", "Transport", "Cleaning services", "Other",
];

export default function Register() {
  const router = useRouter();
  const register = useStore((s) => s.registerBusiness);
  const auth = useAuth();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "", email: "", phone: "", business: "", industry: INDUSTRIES[0], address: "", vatNumber: "", vatRegistered: false });
  useEffect(() => {
    if (auth.mode !== "firebase" || !auth.ready) return;
    if (!auth.fbUser) { router.replace("/login"); return; }
    if (auth.businessId) { router.replace("/dashboard"); return; }
    setF((x) => ({ ...x, name: x.name || auth.fbUser?.displayName || "", email: x.email || auth.fbUser?.email || "" }));
    setStep((s) => (s === 0 && auth.fbUser?.email ? 1 : s));
  }, [auth.mode, auth.ready, auth.fbUser, auth.businessId, router]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  const submit = () => {
    register(
      { name: f.business, industry: f.industry, phone: f.phone, email: f.email, address: f.address, vatNumber: f.vatRegistered ? f.vatNumber : undefined, vatRate: f.vatRegistered ? 0.14 : 0 },
      { name: f.name, email: f.email },
    );
    router.push("/dashboard");
  };

  const steps = ["About you", "Your business", "Tax"];
  const canNext = step === 0 ? f.name && f.email : step === 1 ? f.business : true;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">K</div>
          <span className="text-lg font-bold">KgweboOS</span>
        </Link>
        <div className="card p-6">
          <div className="mb-5 flex gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full ${i <= step ? "bg-emerald-600" : "bg-slate-200"}`} />
                <div className={`mt-1 text-[11px] ${i === step ? "text-emerald-700" : "text-slate-400"}`}>{s}</div>
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-3">
              <h1 className="text-xl font-semibold">Create your free account</h1>
              <p className="text-sm text-slate-500">Free forever. Premium appears when you need more powerful tools.</p>
              <Field label="Your name"><input className="input" value={f.name} onChange={set("name")} placeholder="Neo Moeng" /></Field>
              <Field label="Email"><input className="input" type="email" value={f.email} onChange={set("email")} placeholder="you@example.com" /></Field>
              <Field label="Phone (WhatsApp)"><input className="input" value={f.phone} onChange={set("phone")} placeholder="+267 71 234 567" /></Field>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-3">
              <h1 className="text-xl font-semibold">Tell us about your business</h1>
              <Field label="Business name"><input className="input" value={f.business} onChange={set("business")} placeholder="Neo's Salon" /></Field>
              <Field label="Industry">
                <select className="input" value={f.industry} onChange={set("industry")}>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select>
              </Field>
              <Field label="Address (shown on invoices)"><input className="input" value={f.address} onChange={set("address")} placeholder="Plot 1234, Gaborone" /></Field>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <h1 className="text-xl font-semibold">VAT settings</h1>
              <p className="text-sm text-slate-500">If you&apos;re registered with BURS for VAT, we&apos;ll add 14% VAT to invoices and show your VAT number.</p>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.vatRegistered} onChange={set("vatRegistered")} /> My business is VAT registered</label>
              {f.vatRegistered && <Field label="VAT number"><input className="input" value={f.vatNumber} onChange={set("vatNumber")} placeholder="e.g. V123456789" /></Field>}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button>
            {step < 2 ? (
              <button className="btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Next <ArrowRight size={16} /></button>
            ) : (
              <button className="btn-primary" onClick={submit}>Open my dashboard <ArrowRight size={16} /></button>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">By continuing you agree to the Terms of Service and Privacy Policy. Your business owns its data.</p>
      </div>
    </div>
  );
}
