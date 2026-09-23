"use client";
import { useState } from "react";
import {
  PayPalScriptProvider,
  PayPalButtons,
  PayPalCardFieldsProvider,
  PayPalCardFieldsForm,
  usePayPalCardFields,
} from "@paypal/react-paypal-js";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { PAYPAL_CLIENT_ID, PAYPAL_CURRENCY, PRICING, type BillingInterval } from "@/lib/paypal/config";
import { cn } from "@/lib/utils";

export interface PayPalSuccess {
  reference: string;
  months: number;
  interval: BillingInterval;
  payerEmail?: string;
}

interface Props {
  interval: BillingInterval;
  businessId: string;
  onSuccess: (r: PayPalSuccess) => void;
  onError?: (msg: string) => void;
}

/**
 * PayPal checkout: PayPal wallet button + Visa/Mastercard card fields.
 *
 * Preferred flow: orders are created & captured on the server
 * (/api/paypal/create-order, /api/paypal/capture-order) so we only activate
 * what PayPal actually charged. If PAYPAL_CLIENT_SECRET isn't configured yet
 * the server returns 501 and we fall back to client-side create/capture
 * (real charges, but unverified — for early testing only).
 */
export function PayPalCheckout({ interval, businessId, onSuccess, onError }: Props) {
  const price = PRICING[interval];
  const [tab, setTab] = useState<"paypal" | "card">("card");
  const [err, setErr] = useState<string | null>(null);
  const fail = (m: string) => { setErr(m); onError?.(m); };

  const createOrderServer = async (): Promise<string | null> => {
    const r = await fetch("/api/paypal/create-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ interval, businessId }) });
    if (r.status === 501) return null;
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "Could not start payment");
    return j.id as string;
  };

  const captureServer = async (orderId: string): Promise<PayPalSuccess | null> => {
    const r = await fetch("/api/paypal/capture-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, interval, businessId }) });
    if (r.status === 501) return null;
    const j = await r.json();
    if (!r.ok) throw new Error(j.error === "capture_mismatch" ? "Payment amount did not match. Please contact support." : j.error ?? "Payment could not be confirmed");
    return { reference: j.reference, months: j.months, interval, payerEmail: j.payerEmail };
  };

  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: PAYPAL_CURRENCY, intent: "capture", components: "buttons,card-fields", disableFunding: "paylater,credit" }}>
      <div className="space-y-3">
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between"><span>{price.label}</span><b>P{price.bwp}</b></div>
          <div className="mt-0.5 flex justify-between text-xs text-slate-500"><span>Charged in USD via PayPal</span><span>≈ ${price.usd} {PAYPAL_CURRENCY}</span></div>
        </div>

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-sm">
          <button onClick={() => setTab("card")} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5", tab === "card" ? "bg-white font-medium shadow-sm" : "text-slate-500")}><CreditCard size={15} /> Visa / Mastercard</button>
          <button onClick={() => setTab("paypal")} className={cn("flex-1 rounded-lg py-1.5", tab === "paypal" ? "bg-white font-medium shadow-sm" : "text-slate-500")}>PayPal</button>
        </div>

        {tab === "paypal" && (
          <PayPalButtons
            style={{ layout: "vertical", shape: "rect", label: "pay", height: 44 }}
            fundingSource="paypal"
            createOrder={async (_d, actions) => {
              setErr(null);
              const id = await createOrderServer();
              if (id) return id;
              return actions.order.create({ intent: "CAPTURE", purchase_units: [{ reference_id: businessId, custom_id: `${businessId}:${interval}`, description: `KgweboOS ${price.label}`, amount: { currency_code: PAYPAL_CURRENCY, value: price.usd } }] });
            }}
            onApprove={async (data, actions) => {
              try {
                const s = await captureServer(data.orderID);
                if (s) return onSuccess(s);
                const d = await actions.order?.capture();
                const cap = d?.purchase_units?.[0]?.payments?.captures?.[0];
                onSuccess({ reference: cap?.id ?? data.orderID, months: price.months, interval, payerEmail: d?.payer?.email_address });
              } catch (e) { fail((e as Error).message); }
            }}
            onError={(e) => fail(String((e as { message?: string })?.message ?? "PayPal error"))}
            onCancel={() => setErr("Payment cancelled.")}
          />
        )}

        {tab === "card" && (
          <PayPalCardFieldsProvider
            createOrder={async () => {
              setErr(null);
              const id = await createOrderServer();
              if (id) return id;
              throw new Error("Card payments need server verification. Ask the admin to set PAYPAL_CLIENT_SECRET, or pay with the PayPal button.");
            }}
            onApprove={async (data) => {
              try {
                const s = await captureServer(data.orderID);
                if (s) onSuccess(s);
              } catch (e) { fail((e as Error).message); }
            }}
            onError={(e) => fail(String((e as { message?: string })?.message ?? "Card error"))}
            style={{ input: { "font-size": "14px", "font-family": "system-ui, sans-serif", padding: "10px 12px" } }}
          >
            <PayPalCardFieldsForm />
            <CardSubmit label={`Pay P${price.bwp} (≈ $${price.usd})`} />
          </PayPalCardFieldsProvider>
        )}

        {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
        <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400"><ShieldCheck size={12} /> Card details go straight to PayPal (PCI DSS) — KgweboOS never sees them.</p>
      </div>
    </PayPalScriptProvider>
  );
}

function CardSubmit({ label }: { label: string }) {
  const { cardFieldsForm } = usePayPalCardFields();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-primary mt-2 w-full"
      disabled={busy || !cardFieldsForm}
      onClick={async () => {
        if (!cardFieldsForm) return;
        const state = await cardFieldsForm.getState();
        if (!state.isFormValid) return;
        setBusy(true);
        try { await cardFieldsForm.submit(); } finally { setBusy(false); }
      }}
    >
      {busy ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : label}
    </button>
  );
}
