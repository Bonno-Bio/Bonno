import type { ReminderChannel } from "@/lib/types";
export type DeliveryStatus = "scheduled" | "sending" | "sent" | "delivered" | "failed" | "skipped_opt_out";
export type ProviderName = "whatsapp_cloud" | "twilio_sms" | "manual";
export interface DeliveryResult { ok: boolean; provider: ProviderName; providerMessageId?: string; status: DeliveryStatus; retryable: boolean; error?: string; }
export interface MessageInput { to: string; body: string; channel: ReminderChannel; }
