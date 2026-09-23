import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requirePlatformAdmin } from "@/lib/firebase/admin-auth";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request, "analyst"); const db = adminDb(); const now = Date.now(); const month = new Date(now - 30 * 86400000); const week = new Date(now - 7 * 86400000);
    const businesses = await db.collection("businesses").get(); let active30 = 0; let active7 = 0; let invoices = 0; let payments = 0; let customers = 0; let products = 0; let premium = 0; let free = 0; let revenue = 0; let failedJobs = 0; let syncFailures = 0;
    await Promise.all(businesses.docs.map(async (b) => { const [audit, inv, pays, cus, prod, sub] = await Promise.all([b.ref.collection("audit_logs").where("createdAt", ">=", month.toISOString()).limit(500).get(), b.ref.collection("invoices").get(), b.ref.collection("payments").get(), b.ref.collection("customers").get(), b.ref.collection("products").get(), b.ref.collection("meta").doc("subscription").get()]); const activity = audit.docs.map(d => String(d.data().createdAt ?? "")); if (activity.some(x => new Date(x).getTime() >= month.getTime())) active30++; if (activity.some(x => new Date(x).getTime() >= week.getTime())) active7++; invoices += inv.size; payments += pays.size; customers += cus.size; products += prod.size; const sd = sub.data(); if (sd?.plan === "premium") premium++; else free++; revenue += pays.docs.reduce((n, d) => n + Number(d.data().amountBWP ?? 0), 0); syncFailures += audit.docs.filter(d => String(d.data().action).includes("sync.failed")).length; }));
    const jobs = await db.collection("job_runs").orderBy("startedAt", "desc").limit(100).get(); failedJobs = jobs.docs.filter(d => d.data().status === "failed").length;
    return NextResponse.json({ generatedAt: new Date().toISOString(), businesses: businesses.size, active30, active7, invoices, payments, customers, products, premium, free, revenue, conversion: businesses.size ? Math.round((premium / businesses.size) * 100) : 0, failedJobs, syncFailures });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Analytics unavailable" }, { status: 401 }); }
}
