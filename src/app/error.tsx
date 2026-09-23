"use client";
import { useEffect } from "react";
import Link from "next/link";
import { captureException } from "@/lib/monitoring";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { captureException(error, { digest: error.digest, surface: "app_error_boundary" }); }, [error]);
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><div className="card max-w-md text-center"><h1 className="text-xl font-semibold">Something went wrong</h1><p className="mt-2 text-sm text-slate-500">Your data is safe. Try again or return to the dashboard.</p><div className="mt-5 flex justify-center gap-2"><button className="btn-primary" onClick={() => reset()}>Try again</button><Link className="btn-secondary" href="/dashboard">Dashboard</Link></div></div></div>;
}
