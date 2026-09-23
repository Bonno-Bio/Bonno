import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { adminDb } from "@/lib/firebase/admin";
import { requireBusinessMember } from "@/lib/firebase/admin-auth";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: { id: string } }) {
  const bid = new URL(request.url).searchParams.get("businessId");
  if (!bid) return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  try {
    await requireBusinessMember(request, bid);
    const db = adminDb(); const invSnap = await db.doc(`businesses/${bid}/invoices/${context.params.id}`).get();
    if (!invSnap.exists) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    const inv = invSnap.data()!; const [bizSnap, custSnap] = await Promise.all([db.doc(`businesses/${bid}`).get(), db.doc(`businesses/${bid}/customers/${inv.customerId}`).get()]);
    const biz = bizSnap.data() ?? {}; const customer = custSnap.data() ?? {}; const vatRate = Number(biz.vatRate ?? 0); const subtotal = (inv.items ?? []).reduce((n: number, x: { qty: number; unitPrice: number }) => n + x.qty * x.unitPrice, 0); const discount = Math.min(subtotal, Math.max(0, Number(inv.discountAmount ?? 0))); const taxable = (inv.items ?? []).filter((x: { taxable: boolean }) => x.taxable).reduce((n: number, x: { qty: number; unitPrice: number }) => n + x.qty * x.unitPrice, 0); const vat = +((taxable - Math.min(taxable, discount)) * vatRate).toFixed(2); const total = +(subtotal - discount + vat).toFixed(2);
    const doc = new PDFDocument({ size: "A4", margin: 48 }); const chunks: Buffer[] = []; doc.on("data", (c) => chunks.push(c)); const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
    const color = biz.brandColor || "#047857"; doc.fillColor(color).fontSize(20).text(biz.name || "KgweboOS business"); doc.fillColor("#475569").fontSize(9).text([biz.address, biz.phone, biz.email].filter(Boolean).join(" · ")); if (biz.vatNumber) doc.text(`VAT No: ${biz.vatNumber}`); doc.moveDown(1.5); doc.fillColor(color).fontSize(18).text(inv.creditNoteForId ? "CREDIT NOTE" : inv.kind === "quote" ? "QUOTATION" : vatRate ? "TAX INVOICE" : "INVOICE", { align: "right" }); doc.fillColor("#0f172a").fontSize(10).text(`${inv.number} · Issued ${inv.issueDate} · Due ${inv.dueDate}`, { align: "right" }); doc.moveDown(); doc.fillColor("#475569").text("Bill to"); doc.fillColor("#0f172a").fontSize(11).text(customer.name || "Customer"); doc.fontSize(9).fillColor("#475569").text([customer.phone, customer.email].filter(Boolean).join(" · ")); doc.moveDown();
    doc.fillColor("#0f172a").fontSize(10); (inv.items ?? []).forEach((x: { description: string; qty: number; unitPrice: number }) => doc.text(`${x.description}    ${x.qty} × P${Number(x.unitPrice).toFixed(2)}    P${(x.qty * x.unitPrice).toFixed(2)}`)); doc.moveDown(); doc.text(`Subtotal: P${subtotal.toFixed(2)}`, { align: "right" }); if (discount) doc.text(`Discount: -P${discount.toFixed(2)}`, { align: "right" }); if (vatRate) doc.text(`VAT ${(vatRate * 100).toFixed(0)}%: P${vat.toFixed(2)}`, { align: "right" }); doc.fontSize(13).text(`TOTAL: P${total.toFixed(2)}`, { align: "right" }); if (inv.notes) doc.moveDown().fontSize(9).fillColor("#475569").text(inv.notes); doc.end(); const pdf = await done;
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${inv.number}.pdf"`, "Cache-Control": "private, max-age=0, no-store" } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error && e.message === "FORBIDDEN" ? "Not authorised" : "PDF service unavailable" }, { status: 403 }); }
}
