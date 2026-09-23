import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { adminDb } from "@/lib/firebase/admin";
import { requireBusinessMember } from "@/lib/firebase/admin-auth";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: { id: string } }) { const bid = new URL(request.url).searchParams.get("businessId"); if (!bid) return NextResponse.json({ error: "businessId is required" }, { status: 400 }); try { await requireBusinessMember(request, bid); const invs = await adminDb().collection(`businesses/${bid}/invoices`).get(); const invoice = invs.docs.find(d => (d.data().attachments ?? []).some((a: {id:string}) => a.id === context.params.id)); const attachment = invoice?.data().attachments?.find((a: {id:string}) => a.id === context.params.id); if (!attachment?.storagePath) return NextResponse.json({ error: "Attachment not found" }, { status: 404 }); const [url] = await getStorage().bucket().file(attachment.storagePath).getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1000 }); return NextResponse.redirect(url); } catch { return NextResponse.json({ error: "Attachment service unavailable" }, { status: 403 }); } }


export async function DELETE(request: Request, context: { params: { id: string } }) {
  const bid = new URL(request.url).searchParams.get("businessId");
  if (!bid) return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  try {
    const access = await requireBusinessMember(request, bid);
    if (!["owner", "manager"].includes(access.role)) return NextResponse.json({ error: "Owner or manager required" }, { status: 403 });
    const db = adminDb(); const invs = await db.collection(`businesses/${bid}/invoices`).get(); const invoice = invs.docs.find(d => (d.data().attachments ?? []).some((a: { id: string }) => a.id === context.params.id));
    if (!invoice) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    const data = invoice.data(); const attachment = (data.attachments ?? []).find((a: { id: string }) => a.id === context.params.id);
    if (attachment.retentionUntil && new Date(attachment.retentionUntil).getTime() > Date.now()) return NextResponse.json({ error: "This document is within its retention period and cannot be deleted." }, { status: 409 });
    if (attachment.storagePath) { try { await getStorage().bucket().file(attachment.storagePath).delete(); } catch { /* metadata deletion can still proceed if the object is already gone */ } }
    await invoice.ref.update({ attachments: (data.attachments ?? []).filter((a: { id: string }) => a.id !== context.params.id), updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Attachment deletion unavailable" }, { status: 403 }); }
}
