import "server-only";
import { PAYPAL_API_BASE, PAYPAL_CLIENT_ID, PAYPAL_CURRENCY, PRICING, type BillingInterval } from "./config";

/**
 * Server-side PayPal REST helpers.
 *
 * Requires PAYPAL_CLIENT_SECRET. Without it the routes run in "client-only"
 * mode: the browser SDK still completes real payments, but the server cannot
 * independently verify captures — fine for early testing, NOT for production.
 */
const secret = process.env.PAYPAL_CLIENT_SECRET;
export const serverVerificationEnabled = Boolean(secret);

async function accessToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  return (await res.json()).access_token;
}

export async function createOrder(interval: BillingInterval, businessId: string) {
  const p = PRICING[interval];
  const token = await accessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: businessId,
        custom_id: `${businessId}:${interval}`,
        description: `KgweboOS ${p.label}`,
        amount: { currency_code: PAYPAL_CURRENCY, value: p.usd },
      }],
      payment_source: { paypal: { experience_context: { brand_name: "KgweboOS", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING" } } },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "create order failed");
  return data as { id: string; status: string };
}

export async function captureOrder(orderId: string) {
  const token = await accessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "capture failed");
  const pu = data.purchase_units?.[0];
  const cap = pu?.payments?.captures?.[0];
  return {
    id: data.id as string,
    status: data.status as string,
    captureId: cap?.id as string | undefined,
    amount: cap?.amount as { value: string; currency_code: string } | undefined,
    customId: (cap?.custom_id ?? pu?.custom_id) as string | undefined,
    payerEmail: data.payer?.email_address as string | undefined,
  };
}

/** Verifies a webhook signature with PayPal (requires PAYPAL_WEBHOOK_ID). */
export async function verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId || !secret) return false;
  const token = await accessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  const data = await res.json();
  return data.verification_status === "SUCCESS";
}
