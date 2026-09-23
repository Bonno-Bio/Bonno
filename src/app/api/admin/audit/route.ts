import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requirePlatformAdmin } from "@/lib/firebase/admin-auth";
export async function GET(request: Request) { try { await requirePlatformAdmin(request); const snap = await adminDb().collection("platform_audit_logs").orderBy("createdAt", "desc").limit(200).get(); return NextResponse.json({ logs: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }); } catch { return NextResponse.json({ error: "Admin service unavailable" }, { status: 401 }); } }
