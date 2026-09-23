import { NextResponse } from "next/server";
import { createOrder, serverVerificationEnabled } from "@/lib/paypal/server";
import { PRICING, type BillingInterval } from "@/lib/paypal/config";

/** POST { interval: "monthly"|"annual", businessId } → { id } (PayPal order id) */
export async function POST(req: Request) {
  const { interval, businessId } = (await req.json().catch(() => ({}))) as { interval?: BillingInterval; businessId?: string };
  if (!interval || !PRICING[interval] || !businessId) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  if (!serverVerificationEnabled) return NextResponse.json({ error: "server_mode_disabled" }, { status: 501 });
  try {
    const order = await createOrder(interval, businessId);
    return NextResponse.json({ id: order.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
