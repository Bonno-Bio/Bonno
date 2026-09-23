import { NextResponse } from "next/server";
import { captureOrder, serverVerificationEnabled } from "@/lib/paypal/server";
import { PRICING, type BillingInterval } from "@/lib/paypal/config";
import { activateSubscription } from "@/lib/firebase/admin";

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
    const reference = cap.captureId ?? cap.id;
    const bid = businessId ?? cap.customId?.split(":")[0];
    let persisted = false;
    if (bid) ({ persisted } = await activateSubscription({ businessId: bid, reference, months: expected.months, interval, amountUSD: cap.amount!.value, amountBWP: expected.bwp, payerEmail: cap.payerEmail }));
    return NextResponse.json({ ok: true, reference, months: expected.months, amountUSD: cap.amount!.value, amountBWP: expected.bwp, businessId: bid, payerEmail: cap.payerEmail, persisted });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
