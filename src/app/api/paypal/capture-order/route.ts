import { NextResponse } from "next/server";
import { captureOrder, serverVerificationEnabled } from "@/lib/paypal/server";
import { PRICING, type BillingInterval } from "@/lib/paypal/config";

/**
 * POST { orderId, interval, businessId }
 * Captures the order server-side and returns the verified amount/months so the
 * client can only activate what PayPal actually charged.
 */
export async function POST(req: Request) {
  const { orderId, interval, businessId } = (await req.json().catch(() => ({}))) as { orderId?: string; interval?: BillingInterval; businessId?: string };
  if (!orderId || !interval || !PRICING[interval]) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  if (!serverVerificationEnabled) return NextResponse.json({ error: "server_mode_disabled" }, { status: 501 });
  try {
    const cap = await captureOrder(orderId);
    const expected = PRICING[interval];
    const ok = cap.status === "COMPLETED" && cap.amount?.value === expected.usd && cap.amount?.currency_code === "USD";
    if (!ok) return NextResponse.json({ error: "capture_mismatch", capture: cap }, { status: 409 });
    // TODO (Supabase): upsert subscriptions + insert payments_billing (idempotent on cap.captureId).
    return NextResponse.json({ ok: true, reference: cap.captureId ?? cap.id, months: expected.months, amountUSD: cap.amount!.value, amountBWP: expected.bwp, businessId, payerEmail: cap.payerEmail });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
