import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireBusinessMember } from "@/lib/firebase/admin-auth";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = await request.json() as { businessId?: string; imageDataUrl?: string; mimeType?: string };
  if (!body.businessId || !body.imageDataUrl) return NextResponse.json({ error: "businessId and imageDataUrl are required" }, { status: 400 });
  try {
    await requireBusinessMember(request, body.businessId); const db = adminDb(); const sub = await db.doc(`businesses/${body.businessId}/meta/subscription`).get();
    if (sub.data()?.plan !== "premium") return NextResponse.json({ error: "Receipt OCR requires Premium" }, { status: 402 });
    const usageRef = db.doc(`businesses/${body.businessId}/meta/usage`); const month = new Date().toISOString().slice(0, 7); let used = 0;
    await db.runTransaction(async (tx) => { const snap = await tx.get(usageRef); const d = snap.data() ?? {}; used = d.aiCreditsMonth === month ? Number(d.aiCreditsUsed ?? 0) : 0; if (used >= 500) throw new Error("AI_CREDITS_EXHAUSTED"); tx.set(usageRef, { aiCreditsMonth: month, aiCreditsUsed: used + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OCR provider is not configured", creditsRemaining: 499 - used }, { status: 503 });
    if (body.imageDataUrl.length > 8_000_000) return NextResponse.json({ error: "Receipt image is too large" }, { status: 413 });
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini", temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Extract only what is visibly present on the receipt. Never invent missing values. Return JSON with amount, vendor, date, currency, taxAmount, confidence from 0 to 1, and notes. If a field is unreadable, use null. This is data extraction, not tax advice." }, { role: "user", content: [{ type: "text", text: "Extract this receipt for bookkeeping. Use BWP if visibly stated; otherwise preserve the visible currency." }, { type: "image_url", image_url: { url: body.imageDataUrl } }] }] }) });
    const data = await response.json() as { choices?: { message?: { content?: string } }[]; error?: { message?: string } }; if (!response.ok) return NextResponse.json({ error: data.error?.message ?? "OCR provider failed" }, { status: 502 });
    let extracted: Record<string, unknown>; try { extracted = JSON.parse(data.choices?.[0]?.message?.content ?? "{}"); } catch { return NextResponse.json({ error: "OCR returned unreadable data" }, { status: 502 }); }
    return NextResponse.json({ ...extracted, confidence: typeof extracted.confidence === "number" ? Math.max(0, Math.min(1, extracted.confidence as number)) : 0, source: "receipt_image", advisory: "Check the image and original receipt before saving. OCR is not tax advice.", creditsRemaining: 499 - used });
  } catch (e) { if (e instanceof Error && e.message === "AI_CREDITS_EXHAUSTED") return NextResponse.json({ error: "Monthly AI credits exhausted" }, { status: 429 }); return NextResponse.json({ error: "OCR service unavailable" }, { status: 503 }); }
}
