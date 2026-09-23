"use client";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { useEntitlements } from "@/lib/useEntitlements";
import { upgradeReason } from "@/lib/entitlements";
import { PREMIUM_PRICE_MONTHLY, type Feature, type Limit } from "@/lib/plans";
import type { ReactNode } from "react";

/** Wraps premium-only UI. Renders an upgrade prompt when the feature isn't entitled. */
export function Gate({ feature, children, inline }: { feature: Feature; children: ReactNode; inline?: boolean }) {
  const ent = useEntitlements();
  if (ent.can(feature)) return <>{children}</>;
  return <UpgradePrompt reason={upgradeReason(feature)} inline={inline} />;
}

/** Checks a numeric limit; children render only while usage < limit. */
export function LimitGate({ limit, children }: { limit: Limit; children: ReactNode }) {
  const ent = useEntitlements();
  if (ent.withinLimit(limit, ent.usage[limit])) return <>{children}</>;
  return <UpgradePrompt reason={upgradeReason(limit)} />;
}

export function UpgradePrompt({ reason, inline }: { reason: string; inline?: boolean }) {
  if (inline) {
    return (
      <Link href="/billing" className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100">
        <Lock size={12} /> Premium
      </Link>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-center">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Lock size={18} /></div>
      <p className="text-sm font-medium text-slate-800">{reason}</p>
      <p className="mt-1 text-xs text-slate-500">Upgrade to Premium for P{PREMIUM_PRICE_MONTHLY}/month to unlock unlimited use.</p>
      <Link href="/billing" className="btn-primary mt-3"><Sparkles size={16} /> Upgrade to Premium</Link>
    </div>
  );
}

/** Small banner shown at the top of the app during trial / grace / after expiry. */
export function SubscriptionBanner() {
  const ent = useEntitlements();
  if (ent.status === "trialing") {
    return (
      <Banner tone="amber">
        Premium trial · <b>{ent.daysLeft} day{ent.daysLeft === 1 ? "" : "s"} left</b>. <Link href="/billing" className="underline">Upgrade for P{PREMIUM_PRICE_MONTHLY}/month</Link> to keep everything.
      </Banner>
    );
  }
  if (ent.status === "past_due") {
    return (
      <Banner tone="rose">
        Payment overdue · Premium stays on for <b>{ent.daysLeft} more day{ent.daysLeft === 1 ? "" : "s"}</b> (grace period). <Link href="/billing" className="underline">Pay now</Link>.
      </Banner>
    );
  }
  if (ent.status === "expired") {
    return (
      <Banner tone="slate">
        You&apos;re on the Free plan. <Link href="/billing" className="underline">Upgrade for P{PREMIUM_PRICE_MONTHLY}/month</Link> to unlock reports, quotes, WhatsApp reminders and AI.
      </Banner>
    );
  }
  return null;
}

function Banner({ tone, children }: { tone: "amber" | "rose" | "slate"; children: ReactNode }) {
  const t = { amber: "bg-amber-50 text-amber-900 border-amber-200", rose: "bg-rose-50 text-rose-900 border-rose-200", slate: "bg-slate-100 text-slate-700 border-slate-200" }[tone];
  return <div className={`border-b px-4 py-2 text-center text-xs ${t}`}>{children}</div>;
}
