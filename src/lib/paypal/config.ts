/**
 * PayPal configuration.
 *
 * PayPal does not process Botswana Pula (BWP), so Premium is billed in USD.
 * Prices below are the USD equivalents of P47 / P470 — update PAYPAL_FX_RATE
 * if the pula moves materially. The BWP price stays the marketing price.
 */
import { PREMIUM_PRICE_ANNUAL, PREMIUM_PRICE_MONTHLY } from "../plans";

export const PAYPAL_CLIENT_ID =
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ??
  "BAA0cnAMEPlE7x2eKZViIBux1-OzMicoUkJ3RvUHMe-YJrPqCUbIBFLrhv8VVPu9DQVfcZfqtu41cI06Sg";

export const PAYPAL_CURRENCY = "USD";
/** BWP per USD. Rounded conservatively so we never under-collect. */
export const BWP_PER_USD = Number(process.env.NEXT_PUBLIC_PAYPAL_FX_RATE ?? 13.4);

export function toUSD(bwp: number): string {
  return (bwp / BWP_PER_USD).toFixed(2);
}

export const PRICING = {
  monthly: { bwp: PREMIUM_PRICE_MONTHLY, usd: toUSD(PREMIUM_PRICE_MONTHLY), months: 1, label: "Premium – monthly" },
  annual: { bwp: PREMIUM_PRICE_ANNUAL, usd: toUSD(PREMIUM_PRICE_ANNUAL), months: 12, label: "Premium – annual (2 months free)" },
} as const;
export type BillingInterval = keyof typeof PRICING;

export const PAYPAL_ENV = (process.env.PAYPAL_ENV ?? "live") as "live" | "sandbox";
export const PAYPAL_API_BASE = PAYPAL_ENV === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
