import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requirePlatformAdmin, requireSupportGrant, writePlatformAudit } from "@/lib/firebase/admin-auth";

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const admin = await requirePlatformAdmin(request, "support");
    await requireSupportGrant(request, admin, context.params.id);
    const ref = adminDb().doc(`businesses/${context.params.id}`); const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [members, subscription, payments, audit] = await Promise.all([ref.collection("members").get(), ref.collection("meta").doc("subscription").get(), ref.collection("billing_payments").orderBy("createdAt", "desc").limit(50).get(), ref.collection("audit_logs").orderBy("createdAt", "desc").limit(50).get()]);
    return NextResponse.json({ business: { id: snap.id, ...snap.data() }, members: members.docs.map((d) => ({ id: d.id, ...d.data() })), subscription: subscription.data() ?? { plan: "free", status: "free" }, payments: payments.docs.map((d) => ({ id: d.id, ...d.data() })), audit: audit.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch { return NextResponse.json({ error: "Admin service unavailable" }, { status: 401 }); }
}

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const admin = await requirePlatformAdmin(request, "billing"); const body = await request.json() as { action?: "grant_premium" | "revoke_premium"; reason?: string; days?: number };
    if (!body.action || !body.reason) return NextResponse.json({ error: "action and reason are required" }, { status: 400 });
    const ref = adminDb().doc(`businesses/${context.params.id}/meta/subscription`); const current = (await ref.get()).data() ?? {};
    if (body.action === "grant_premium") { const end = new Date(); end.setDate(end.getDate() + Math.max(1, body.days ?? 30)); await ref.set({ ...current, businessId: context.params.id, plan: "premium", status: "active", currentPeriodEnd: end.toISOString(), manualOverride: true, manualReason: body.reason }, { merge: true }); }
    else await ref.set({ ...current, businessId: context.params.id, plan: "free", status: "free", currentPeriodEnd: null, manualOverride: true, manualReason: body.reason }, { merge: true });
    await writePlatformAudit(admin, `subscription.${body.action}`, context.params.id, { reason: body.reason, days: body.days ?? null });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e instanceof Error && e.message === "FORBIDDEN" ? "Billing admin required" : "Admin service unavailable" }, { status: 403 }); }
}
