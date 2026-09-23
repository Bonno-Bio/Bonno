import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requirePlatformAdmin } from "@/lib/firebase/admin-auth";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request);
    const snap = await adminDb().collection("businesses").orderBy("createdAt", "desc").limit(500).get();
    const rows = await Promise.all(snap.docs.map(async (d) => {
      const sub = await d.ref.collection("meta").doc("subscription").get();
      const members = await d.ref.collection("members").get();
      return { id: d.id, ...d.data(), subscription: sub.exists ? sub.data() : { plan: "free", status: "free" }, memberCount: members.size };
    }));
    return NextResponse.json({ businesses: rows });
  } catch (e) { return NextResponse.json({ error: e instanceof Error && e.message === "FORBIDDEN" ? "Forbidden" : "Admin service unavailable" }, { status: e instanceof Error && e.message === "FORBIDDEN" ? 403 : 401 }); }
}
