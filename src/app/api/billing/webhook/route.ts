import { NextResponse } from "next/server";

/**
 * Payment provider webhook (Paygate / DPO / Flutterwave / mobile money).
 *
 * Production flow:
 *  1. Verify the provider signature (HMAC) using PAYMENT_WEBHOOK_SECRET.
 *  2. Look up the pending checkout by provider reference.
 *  3. Upsert `subscriptions` for the business: status=active,
 *     current_period_end = now + 30 days (or 365 for annual).
 *  4. Write an audit log + send receipt (email/WhatsApp).
 *  5. Return 200 quickly; retry-safe (idempotent on reference).
 *
 * In sandbox mode (no secret configured) we accept simulated events so the
 * UI flow can be exercised end-to-end.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;

  if (secret) {
    const sig = req.headers.get("x-signature");
    if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 401 });
    // TODO: verify HMAC(sig, rawBody, secret) per provider docs.
  } else if (!body.simulated) {
    return NextResponse.json({ error: "webhook secret not configured" }, { status: 503 });
  }

  if (body.event !== "payment.succeeded") {
    return NextResponse.json({ ok: true, ignored: body.event });
  }

  const reference = body.reference ?? `${String(body.provider ?? "PAY").toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;

  // TODO (Supabase): await supabase.from("subscriptions").upsert({...}).
  return NextResponse.json({ ok: true, reference, businessId: body.businessId, amount: body.amount, currency: body.currency ?? "BWP" });
}
