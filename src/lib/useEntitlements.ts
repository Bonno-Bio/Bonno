"use client";
import { useMemo } from "react";
import { useStore } from "./store";
import { getEntitlements, type Entitlements } from "./entitlements";
import type { Subscription } from "./types";

const FREE_SUB: Subscription = { businessId: "", plan: "free", status: "free" };

/** Entitlements + live usage counters for the current tenant. */
export function useEntitlements(): Entitlements & {
  usage: { users: number; invoices_per_month: number; customers: number; products: number; ai_credits_per_month: number; branches: number };
} {
  const sub = useStore((s) => s.subscription);
  const customers = useStore((s) => s.customers.length);
  const products = useStore((s) => s.products.length);
  const invoices = useStore((s) => s.invoices);
  const ai = useStore((s) => s.aiCreditsUsed);

  return useMemo(() => {
    const ent = getEntitlements(sub ?? FREE_SUB);
    const now = new Date();
    const invoicesThisMonth = invoices.filter((i) => {
      const d = new Date(i.createdAt);
      return i.kind === "invoice" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    return {
      ...ent,
      usage: { users: 1, invoices_per_month: invoicesThisMonth, customers, products, ai_credits_per_month: ai, branches: 1 },
    };
  }, [sub, customers, products, invoices, ai]);
}
