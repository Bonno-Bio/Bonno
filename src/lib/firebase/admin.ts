import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin (server only). Uses FIREBASE_SERVICE_ACCOUNT_JSON — the
 * full service-account JSON as one line (or base64 with FIREBASE_SERVICE_ACCOUNT_B64).
 * When absent, server routes skip persistence (client keeps working).
 */
let app: App | null = null;

export function adminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_B64);
}

function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64 ?? "", "base64").toString("utf8");
  return JSON.parse(raw);
}

export function adminDb(): Firestore {
  if (!app) app = getApps()[0] ?? initializeApp({ credential: cert(credentials()) });
  return getFirestore(app);
}

/** Activate/extend a Premium subscription. Idempotent on payment reference. */
export async function activateSubscription(opts: { businessId: string; reference: string; months: number; interval: "monthly" | "annual"; amountUSD: string; amountBWP: number; payerEmail?: string }) {
  if (!adminConfigured()) return { persisted: false };
  const db = adminDb();
  const bizRef = db.doc(`businesses/${opts.businessId}`);
  const payRef = db.doc(`businesses/${opts.businessId}/billing_payments/${opts.reference}`);
  const subRef = db.doc(`businesses/${opts.businessId}/meta/subscription`);

  await db.runTransaction(async (tx) => {
    const [pay, sub] = await Promise.all([tx.get(payRef), tx.get(subRef)]);
    if (pay.exists) return; // already processed
    const now = new Date();
    const currentEnd = sub.exists && sub.data()?.currentPeriodEnd ? new Date(sub.data()!.currentPeriodEnd) : null;
    const base = currentEnd && currentEnd > now ? currentEnd : now;
    const end = new Date(base); end.setDate(end.getDate() + 30 * opts.months);

    tx.set(payRef, { ...opts, provider: "paypal", createdAt: FieldValue.serverTimestamp() });
    tx.set(subRef, {
      businessId: opts.businessId, plan: "premium", status: "active", provider: "paypal", interval: opts.interval,
      payerEmail: opts.payerEmail ?? null, lastPaymentRef: opts.reference, currentPeriodEnd: end.toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(bizRef.collection("audit_logs").doc(), { businessId: opts.businessId, actor: "paypal", action: "subscription.activated", entity: "subscription", entityId: opts.reference, createdAt: now.toISOString() });
  });
  return { persisted: true };
}

export async function revokeSubscription(businessId: string, reference: string, reason: string) {
  if (!adminConfigured()) return;
  const db = adminDb();
  await db.doc(`businesses/${businessId}/meta/subscription`).set({ status: "past_due", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection(`businesses/${businessId}/audit_logs`).add({ businessId, actor: "paypal", action: `subscription.${reason}`, entity: "subscription", entityId: reference, createdAt: new Date().toISOString() });
}
