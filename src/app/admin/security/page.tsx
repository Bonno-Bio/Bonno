"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { multiFactor, PhoneAuthProvider, PhoneMultiFactorGenerator, RecaptchaVerifier } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/AuthProvider";

export default function AdminSecurity() {
  const { fbUser } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const enrolled = Boolean(fbUser && multiFactor(fbUser).enrolledFactors.length > 0);

  const sendCode = async () => {
    if (!fbUser || !phone) return;
    setBusy(true); setMessage("");
    try {
      const verifier = new RecaptchaVerifier(firebaseAuth(), "admin-recaptcha", { size: "invisible" });
      const session = await multiFactor(fbUser).getSession();
      const provider = new PhoneAuthProvider(firebaseAuth());
      setVerificationId(await provider.verifyPhoneNumber({ phoneNumber: phone, session }, verifier));
      setMessage("Verification code sent.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not send code."); }
    finally { setBusy(false); }
  };

  const enroll = async () => {
    if (!fbUser || !verificationId || !code) return;
    setBusy(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      await multiFactor(fbUser).enroll(PhoneMultiFactorGenerator.assertion(credential), "Platform administrator phone");
      await fbUser.getIdToken(true);
      setMessage("MFA enrolled. Refresh your sign-in before opening Admin again.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not enroll MFA."); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center text-slate-100">
      <div className="w-full max-w-md space-y-5">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-400"><ArrowLeft size={15} /> Admin dashboard</Link>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <ShieldCheck className="text-emerald-400" size={28} />
          <h1 className="mt-3 text-xl font-bold">Administrator MFA</h1>
          <p className="mt-2 text-sm text-slate-400">A second factor is mandatory before platform data and billing controls can be accessed.</p>
          {enrolled ? <div className="mt-5 rounded-xl bg-emerald-950 p-3 text-sm text-emerald-200">MFA is enrolled on this account.</div> : (
            <div className="mt-5 space-y-3">
              <label className="text-xs text-slate-400">Administrator phone number<input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" placeholder="+267 …" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              <div id="admin-recaptcha" />
              <button className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm" disabled={busy || !phone} onClick={() => void sendCode()}>Send verification code</button>
              {verificationId && <><input className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white" placeholder="SMS code" value={code} onChange={(e) => setCode(e.target.value)} /><button className="w-full rounded-xl border border-emerald-700 px-3 py-2 text-sm text-emerald-300" disabled={busy || !code} onClick={() => void enroll()}>Enable MFA</button></>}
            </div>
          )}
          {message && <p className="mt-4 text-sm text-amber-200">{message}</p>}
        </div>
      </div>
    </div>
  );
}
