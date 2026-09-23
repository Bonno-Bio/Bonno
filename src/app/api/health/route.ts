import { NextResponse } from "next/server";
import { adminConfigured } from "@/lib/firebase/admin";
export function GET() {
  return NextResponse.json({ ok: true, app: "KgweboOS", version: process.env.npm_package_version ?? "0.1.0", timestamp: new Date().toISOString(), monitoring: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN), firebaseAdmin: adminConfigured() });
}
