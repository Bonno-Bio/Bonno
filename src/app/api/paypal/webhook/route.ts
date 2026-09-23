import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/paypal/server";
import { activateSubscription, revokeSubscription } from "@/lib/firebase/admin";
import { PRICING, type BillingInterval } from "@/lib/paypal/config";

/**
 * PayPal webhook. Subscribe to: PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.REFUNDED,
 * PAYMENT.CAPTURE.DENIED. Set PAYPAL_WEBHOOK_ID from the PayPal dashboard.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const valid = await verifyWebhook(req.headers, raw);
  if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  const event = JSON.parse(raw) as { event_type: string; resource?: { id?: string; custom_id?: string; amount?: { value: string; currency_code: string }; payer?: { email_address?: string } } };
  const [businessId, interval] = (event.resource?.custom_id ?? "").split(":") as [string?, BillingInterval?];
  const ref = event.resource?.id ?? "";
  if (businessId && interval && PRICING[interval]) {
    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
        if (event.resource?.amount?.value === PRICING[interval].usd)
          await activateSubscription({ businessId, reference: ref, months: PRICING[interval].months, interval, amountUSD: event.resource.amount.value, amountBWP: PRICING[interval].bwp, payerEmail: event.resource?.payer?.email_address });
        break;
      case "PAYMENT.CAPTURE.REFUNDED":
        await revokeSubscription(businessId, ref, "refunded"); break;
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.REVERSED":
        await revokeSubscription(businessId, ref, "reversed"); break;
    }
  }
  return NextResponse.json({ ok: true, type: event.event_type, businessId, interval });
}
