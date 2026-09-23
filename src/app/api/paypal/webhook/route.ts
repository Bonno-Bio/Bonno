import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/paypal/server";

/**
 * PayPal webhook. Subscribe to: PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.REFUNDED,
 * PAYMENT.CAPTURE.DENIED. Set PAYPAL_WEBHOOK_ID from the PayPal dashboard.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const valid = await verifyWebhook(req.headers, raw);
  if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  const event = JSON.parse(raw) as { event_type: string; resource?: { id?: string; custom_id?: string; amount?: { value: string } } };
  const [businessId, interval] = (event.resource?.custom_id ?? "").split(":");
  switch (event.event_type) {
    case "PAYMENT.CAPTURE.COMPLETED":
      // TODO (Supabase): activate subscription for businessId (idempotent on resource.id).
      break;
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.DENIED":
      // TODO (Supabase): mark subscription past_due / revoke period.
      break;
  }
  return NextResponse.json({ ok: true, type: event.event_type, businessId, interval });
}
