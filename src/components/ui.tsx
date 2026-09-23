"use client";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: string; tone?: "default" | "good" | "bad" | "warn" }) {
  const tones = { default: "text-slate-900", good: "text-emerald-700", bad: "text-rose-700", warn: "text-amber-700" };
  return (
    <div className="card">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold", tones[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center py-12 text-center">
      <div className="text-base font-medium text-slate-800">{title}</div>
      {body && <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={cn("max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn-ghost -mr-2 p-2" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-800",
    sent: "bg-blue-100 text-blue-800",
    draft: "bg-slate-100 text-slate-700",
    overdue: "bg-rose-100 text-rose-800",
    void: "bg-slate-100 text-slate-500 line-through",
    active: "bg-emerald-100 text-emerald-800",
    trialing: "bg-amber-100 text-amber-800",
    past_due: "bg-rose-100 text-rose-800",
    expired: "bg-slate-100 text-slate-700",
    free: "bg-slate-100 text-slate-700",
  };
  return <span className={cn("badge capitalize", map[status] ?? "bg-slate-100 text-slate-700")}>{status.replace("_", " ")}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
