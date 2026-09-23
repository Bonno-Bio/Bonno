import { describe, expect, it } from "vitest";
import { getEntitlements, resolveStatus, upgradeReason } from "@/lib/entitlements";
import type { Subscription } from "@/lib/types";
const free: Subscription = { businessId: "b1", plan: "free", status: "free" };
describe("entitlements", () => {
  it("keeps a new business on Free", () => { const e = getEntitlements(free); expect(e.effectivePlan).toBe("free"); expect(e.can("quotes")).toBe(false); expect(e.limitFor("invoices_per_month")).toBe(20); });
  it("allows Premium through its paid period", () => { const end = new Date("2026-10-01T00:00:00Z").toISOString(); const e = getEntitlements({ businessId: "b1", plan: "premium", status: "active", currentPeriodEnd: end }, new Date("2026-09-23T00:00:00Z")); expect(e.effectivePlan).toBe("premium"); expect(e.can("quotes")).toBe(true); });
  it("uses the grace period before downgrade", () => { const end = new Date("2026-09-20T00:00:00Z").toISOString(); const r = resolveStatus({ businessId: "b1", plan: "premium", status: "active", currentPeriodEnd: end }, new Date("2026-09-22T00:00:00Z")); expect(r.status).toBe("past_due"); expect(r.effectivePlan).toBe("premium"); expect(r.inGrace).toBe(true); });
  it("explains limit paywalls", () => { expect(upgradeReason("customers")).toContain("100 customer"); expect(upgradeReason("quotes")).toContain("Premium"); });
});
