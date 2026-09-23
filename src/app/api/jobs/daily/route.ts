import { NextResponse } from "next/server";
import { runBackgroundJobs } from "@/lib/jobs/background";
import { adminConfigured, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const expected = process.env.JOBS_CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? request.headers.get("x-jobs-secret");
  if (!expected || !provided || provided !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await runBackgroundJobs()); } catch (error) { console.error("[jobs] daily failed", error); if (adminConfigured()) await adminDb().collection("job_runs").add({ type: "daily", status: "failed", startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "unknown" }); return NextResponse.json({ error: "Job runner failed" }, { status: 500 }); }
}
