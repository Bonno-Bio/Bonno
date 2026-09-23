import "server-only";
import { FieldValue, type DocumentReference, type QuerySnapshot, type DocumentData } from "firebase-admin/firestore";
import { adminConfigured, adminDb } from "@/lib/firebase/admin";

const DAY = 86_400_000;
const REMINDER_GAP = 3 * DAY;
const REMINDER_LEAD = 3 * DAY;

type JobResult = { scanned: number; changed: number; skipped: number; details: string[] };
export type JobReport = { ranAt: string; persisted: boolean; overdue: JobResult; reminders: JobResult; recurring: JobResult; aiReset: JobResult; subscriptions: JobResult };

const empty = (): JobResult => ({ scanned: 0, changed: 0, skipped: 0, details: [] });

/**
 * Idempotent daily maintenance. It is intentionally provider-neutral: this
 * schedules reminders and creates notifications; an SMS/WhatsApp provider
 * can deliver them later without changing accounting records.
 */
export async function runBackgroundJobs(now = new Date()): Promise<JobReport> {
  const report: JobReport = { ranAt: now.toISOString(), persisted: adminConfigured(), overdue: empty(), reminders: empty(), recurring: empty(), aiReset: empty(), subscriptions: empty() };
  if (!adminConfigured()) return report;
  const db = adminDb();
  const businesses = await db.collection("businesses").get();
  report.overdue.scanned = businesses.size;

  for (const business of businesses.docs) {
    const [invoices, customers, , sub] = await Promise.all([
      business.ref.collection("invoices").get(), business.ref.collection("customers").get(), business.ref.collection("payments").get(), business.ref.collection("meta").doc("subscription").get(),
    ]);
    const customerById = new Map<string, DocumentData>(customers.docs.map((d) => [d.id, d.data()] as [string, DocumentData]));

    await markOverdue(business.ref, invoices, now, report.overdue);
    await scheduleReminders(business.ref, invoices, customerById, now, report.reminders);
    await generateRecurring(business.ref, invoices, now, report.recurring);
    await resetAiCredits(business.ref, now, report.aiReset);
    await scheduleSubscriptionReminder(business.ref, sub.data(), now, report.subscriptions);
  }
  return report;
}

async function markOverdue(biz: DocumentReference, invoices: QuerySnapshot<DocumentData>, now: Date, result: JobResult) {
  const batch = adminDb().batch();
  let writes = 0;
  for (const d of invoices.docs) {
    const x = d.data(); result.scanned++;
    if (x.kind === "invoice" && x.status === "sent" && x.dueDate && new Date(x.dueDate).getTime() < now.getTime()) {
      batch.update(d.ref, { status: "overdue", overdueAt: now.toISOString(), updatedAt: FieldValue.serverTimestamp() });
      batch.create(biz.collection("audit_logs").doc(), { businessId: biz.id, actor: "system", action: "invoice.marked_overdue", entity: "invoice", entityId: d.id, createdAt: now.toISOString() });
      writes++; result.changed++;
    }
  }
  if (writes) await batch.commit(); else result.skipped++;
}

async function scheduleReminders(biz: DocumentReference, invoices: QuerySnapshot<DocumentData>, customers: Map<string, DocumentData>, now: Date, result: JobResult) {
  for (const d of invoices.docs) {
    const x = d.data();
    if (x.kind !== "invoice" || !["sent", "overdue"].includes(x.status)) continue;
    result.scanned++;
    const customer = customers.get(x.customerId) ?? {};
    if (customer.reminderConsent === false) { result.skipped++; continue; }
    const due = new Date(x.dueDate).getTime();
    const dueForReminder = x.status === "overdue" ? now.getTime() : due - REMINDER_LEAD;
    if (now.getTime() < dueForReminder) continue;
    const recent = await biz.collection("reminders").where("invoiceId", "==", d.id).where("status", "==", "scheduled").get();
    const recentSent = await biz.collection("reminders").where("invoiceId", "==", d.id).orderBy("sentAt", "desc").limit(1).get();
    const last = recentSent.docs[0]?.data()?.sentAt;
    if (recent.size || (last && now.getTime() - new Date(last).getTime() < REMINDER_GAP)) { result.skipped++; continue; }
    const channel = customer.preferredReminderChannel ?? "whatsapp";
    const message = `Friendly payment reminder for invoice ${x.number}. Please contact the business if you need to arrange a payment date.`;
    await biz.collection("reminders").add({ businessId: biz.id, invoiceId: d.id, customerId: x.customerId, channel, message, sentAt: now.toISOString(), scheduledAt: now.toISOString(), status: "scheduled", createdAt: FieldValue.serverTimestamp() });
    result.changed++;
  }
}

async function generateRecurring(biz: DocumentReference, invoices: QuerySnapshot<DocumentData>, now: Date, result: JobResult) {
  for (const d of invoices.docs) {
    const x = d.data();
    if (x.kind !== "invoice" || !x.recurring || x.status === "void") continue;
    result.scanned++;
    const due = new Date(x.dueDate);
    if (due.getTime() > now.getTime()) continue;
    const next = new Date(due); if (x.recurring === "weekly") next.setDate(next.getDate() + 7); else next.setMonth(next.getMonth() + 1);
    const key = `rec_${d.id}_${next.toISOString().slice(0, 10)}`;
    const ref = biz.collection("invoices").doc(key);
    if ((await ref.get()).exists) { result.skipped++; continue; }
    await ref.create({ ...x, id: key, number: `${x.number}-R${next.toISOString().slice(0, 10).replaceAll("-", "")}`, issueDate: now.toISOString().slice(0, 10), dueDate: next.toISOString().slice(0, 10), status: "sent", recurring: null, recurringFromId: d.id, createdAt: now.toISOString(), updatedAt: FieldValue.serverTimestamp() });
    await d.ref.update({ dueDate: next.toISOString().slice(0, 10), lastGeneratedAt: now.toISOString(), updatedAt: FieldValue.serverTimestamp() });
    result.changed++;
  }
}

async function resetAiCredits(biz: DocumentReference, now: Date, result: JobResult) {
  const month = now.toISOString().slice(0, 7);
  const ref = biz.collection("meta").doc("usage");
  const snap = await ref.get(); result.scanned++;
  if (snap.data()?.aiCreditsMonth === month) { result.skipped++; return; }
  await ref.set({ aiCreditsUsed: 0, aiCreditsMonth: month, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); result.changed++;
}

async function scheduleSubscriptionReminder(biz: DocumentReference, sub: DocumentData | undefined, now: Date, result: JobResult) {
  if (!sub?.currentPeriodEnd || sub.status !== "active") return;
  result.scanned++;
  const end = new Date(sub.currentPeriodEnd).getTime();
  if (end < now.getTime() || end > now.getTime() + REMINDER_LEAD) { result.skipped++; return; }
  const key = `renewal_${sub.currentPeriodEnd.slice(0, 10)}`;
  const ref = biz.collection("notifications").doc(key);
  if ((await ref.get()).exists) { result.skipped++; return; }
  await ref.set({ businessId: biz.id, type: "subscription_renewal", title: "Premium renewal coming up", body: "Your Premium period ends in 3 days. Review billing to keep your tools active.", read: false, createdAt: now.toISOString() }); result.changed++;
}
