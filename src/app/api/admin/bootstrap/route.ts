import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminConfigured } from "@/lib/firebase/admin";
import type { AdminRole } from "@/lib/firebase/admin-auth";

const roles: AdminRole[] = ["super_admin", "support", "billing", "compliance", "analyst"];
export async function POST(request: Request) {
  if (!adminConfigured() || request.headers.get("x-bootstrap-secret") !== process.env.PLATFORM_BOOTSTRAP_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { email?: string; role?: AdminRole };
  if (!body.email || !body.role || !roles.includes(body.role)) return NextResponse.json({ error: "email and valid role are required" }, { status: 400 });
  try {
    const user = await getAuth().getUserByEmail(body.email);
    await getAuth().setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), platformAdmin: true, adminRole: body.role });
    return NextResponse.json({ ok: true, uid: user.uid, email: user.email, role: body.role });
  } catch { return NextResponse.json({ error: "Firebase user not found" }, { status: 404 }); }
}
