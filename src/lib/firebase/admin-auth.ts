import "server-only";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { adminDb, adminConfigured } from "./admin";

export type AdminRole = "super_admin" | "support" | "billing" | "compliance" | "analyst";
const LEVEL: Record<AdminRole, number> = { analyst: 1, support: 2, billing: 2, compliance: 2, super_admin: 3 };

export async function requirePlatformAdmin(request: Request, minimum: AdminRole = "analyst"): Promise<DecodedIdToken & { adminRole: AdminRole }> {
  if (!adminConfigured()) throw new Error("ADMIN_NOT_CONFIGURED");
  adminDb();
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) throw new Error("UNAUTHENTICATED");
  const token = await getAuth().verifyIdToken(header.slice(7));
  const role = token.adminRole as AdminRole | undefined;
  if (token.platformAdmin !== true || !role || LEVEL[role] < LEVEL[minimum]) throw new Error("FORBIDDEN");
  if (!token.firebase?.sign_in_second_factor) throw new Error("MFA_REQUIRED");
  return { ...token, adminRole: role };
}

export async function writePlatformAudit(admin: DecodedIdToken, action: string, target?: string, metadata?: Record<string, unknown>) {
  if (!adminConfigured()) return;
  await adminDb().collection("platform_audit_logs").add({ adminUid: admin.uid, adminEmail: admin.email ?? null, adminRole: admin.adminRole ?? null, action, target: target ?? null, metadata: metadata ?? {}, createdAt: new Date().toISOString() });
}
