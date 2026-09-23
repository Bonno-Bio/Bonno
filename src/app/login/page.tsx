"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { Field } from "@/components/ui";

export default function Login() {
  const auth = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Local mode has no login — go straight to register
  useEffect(() => { if (auth.mode === "local") router.replace("/register"); }, [auth.mode, router]);
  // Already signed in → route
  useEffect(() => {
    if (auth.ready && auth.fbUser) router.replace(auth.businessId ? "/dashboard" : "/register");
  }, [auth.ready, auth.fbUser, auth.businessId, router]);

  const run = async (fn: () => Promise<void>) => {
    setErr(null); setMsg(null); setBusy(true);
    try { await fn(); } catch (e) { setErr(friendly((e as { code?: string }).code)); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">K</div>
          <span className="text-lg font-bold">KgweboOS</span>
        </Link>
        <div className="card p-6">
          <h1 className="text-xl font-semibold">{mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}</h1>
          <p className="mb-4 text-sm text-slate-500">{mode === "signin" ? "Sign in to your business dashboard." : mode === "signup" ? "Free forever · upgrade only when you need Premium tools." : "We'll email you a reset link."}</p>

          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            if (mode === "signin") run(() => auth.signInEmail(f.email, f.password));
            else if (mode === "signup") run(() => auth.signUpEmail(f.name, f.email, f.password));
            else run(async () => { await auth.resetPassword(f.email); setMsg("Reset link sent — check your email."); });
          }}>
            {mode === "signup" && <Field label="Your name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>}
            <Field label="Email"><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></Field>
            {mode !== "reset" && <Field label="Password"><input className="input" type="password" minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></Field>}
            {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
            {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{msg}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</button>
          </form>

          {mode !== "reset" && (
            <>
              <div className="my-4 flex items-center gap-2 text-xs text-slate-400"><div className="h-px flex-1 bg-slate-200" />or<div className="h-px flex-1 bg-slate-200" /></div>
              <button className="btn-secondary w-full" disabled={busy} onClick={() => run(auth.signInGoogle)}>
                <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>
                Continue with Google
              </button>
            </>
          )}

          <div className="mt-4 text-center text-xs text-slate-500">
            {mode === "signin" && <>No account? <button className="text-emerald-700 underline" onClick={() => setMode("signup")}>Sign up free</button> · <button className="underline" onClick={() => setMode("reset")}>Forgot password?</button></>}
            {mode === "signup" && <>Already have an account? <button className="text-emerald-700 underline" onClick={() => setMode("signin")}>Sign in</button></>}
            {mode === "reset" && <button className="underline" onClick={() => setMode("signin")}>Back to sign in</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function friendly(code?: string): string {
  switch (code) {
    case "auth/invalid-credential": case "auth/wrong-password": case "auth/user-not-found": return "Email or password is incorrect.";
    case "auth/email-already-in-use": return "An account with this email already exists. Sign in instead.";
    case "auth/weak-password": return "Password must be at least 6 characters.";
    case "auth/invalid-email": return "That email address doesn't look right.";
    case "auth/popup-closed-by-user": return "Google sign-in was closed.";
    case "auth/network-request-failed": return "Network error — check your connection.";
    default: return "Something went wrong. Please try again.";
  }
}
