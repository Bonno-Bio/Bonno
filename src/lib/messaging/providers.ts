import type { DeliveryResult, MessageInput } from "./types";

export async function sendMessage(input: MessageInput): Promise<DeliveryResult> {
  if (input.channel === "whatsapp") return sendWhatsApp(input);
  if (input.channel === "sms") return sendSms(input);
  return { ok: false, provider: "manual", status: "failed", retryable: false, error: "This channel requires a manual contact workflow." };
}

async function sendWhatsApp(input: MessageInput): Promise<DeliveryResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN; const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { ok: false, provider: "whatsapp_cloud", status: "failed", retryable: false, error: "WhatsApp provider is not configured." };
  try { const r = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: input.to.replace(/\D/g, ""), type: "text", text: { preview_url: false, body: input.body } }) }); const d = await r.json() as { messages?: { id: string }[]; error?: { message?: string } }; if (!r.ok) return { ok: false, provider: "whatsapp_cloud", status: "failed", retryable: r.status >= 500 || r.status === 429, error: d.error?.message ?? `WhatsApp HTTP ${r.status}` }; return { ok: true, provider: "whatsapp_cloud", status: "sent", retryable: false, providerMessageId: d.messages?.[0]?.id }; } catch (e) { return { ok: false, provider: "whatsapp_cloud", status: "failed", retryable: true, error: e instanceof Error ? e.message : "Network error" }; }
}

async function sendSms(input: MessageInput): Promise<DeliveryResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID; const token = process.env.TWILIO_AUTH_TOKEN; const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return { ok: false, provider: "twilio_sms", status: "failed", retryable: false, error: "SMS provider is not configured." };
  try { const body = new URLSearchParams({ To: input.to, From: from, Body: input.body }); const auth = Buffer.from(`${sid}:${token}`).toString("base64"); const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body }); const d = await r.json() as { sid?: string; message?: string; code?: number }; if (!r.ok) return { ok: false, provider: "twilio_sms", status: "failed", retryable: r.status >= 500 || r.status === 429, error: d.message ?? `SMS HTTP ${r.status}` }; return { ok: true, provider: "twilio_sms", status: "sent", retryable: false, providerMessageId: d.sid }; } catch (e) { return { ok: false, provider: "twilio_sms", status: "failed", retryable: true, error: e instanceof Error ? e.message : "Network error" }; }
}
