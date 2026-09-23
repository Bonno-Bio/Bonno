/**
 * Entitlements service.
 *
 * Resolves "what can this business do right now?" from its subscription.
 * Trial and grace periods are handled here, so UI and API only ask
 * `can(feature)` / `withinLimit(limit, currentUsage)`.
 */
import { PLANS, GRACE_PERIOD_DAYS, type Feature, type Limit, type PlanId } from "./plans";
import type { Subscription, SubscriptionStatus } from "./types";

export interface Entitlements {
  effectivePlan: PlanId;
  status: SubscriptionStatus;
  daysLeft: number | null; // days until the paid period ends
  inGrace: boolean;
  can: (feature: Feature) => boolean;
  limitFor: (limit: Limit) => number;
  withinLimit: (limit: Limit, currentUsage: number) => boolean;
  remaining: (limit: Limit, currentUsage: number) => number;
}

const DAY = 86_400_000;

export function resolveStatus(sub: Subscription, now = new Date()): {
  status: SubscriptionStatus;
  effectivePlan: PlanId;
  daysLeft: number | null;
  inGrace: boolean;
} {
  const t = now.getTime();

  if ((sub.status === "active" || sub.status === "past_due") && sub.currentPeriodEnd) {
    const end = new Date(sub.currentPeriodEnd).getTime();
    if (t <= end) {
      return { status: "active", effectivePlan: "premium", daysLeft: Math.ceil((end - t) / DAY), inGrace: false };
    }
    const graceEnd = end + GRACE_PERIOD_DAYS * DAY;
    if (t <= graceEnd) {
      return { status: "past_due", effectivePlan: "premium", daysLeft: Math.ceil((graceEnd - t) / DAY), inGrace: true };
    }
    return { status: "expired", effectivePlan: "free", daysLeft: 0, inGrace: false };
  }

  return { status: sub.status === "expired" ? "expired" : "free", effectivePlan: "free", daysLeft: null, inGrace: false };
}

export function getEntitlements(sub: Subscription, now = new Date()): Entitlements {
  const r = resolveStatus(sub, now);
  const plan = PLANS[r.effectivePlan];
  return {
    ...r,
    can: (f) => plan.features[f],
    limitFor: (l) => plan.limits[l],
    withinLimit: (l, usage) => usage < plan.limits[l],
    remaining: (l, usage) => (plan.limits[l] === Infinity ? Infinity : Math.max(0, plan.limits[l] - usage)),
  };
}

/** Human-readable reason shown in paywall prompts. */
export function upgradeReason(limitOrFeature: Limit | Feature): string {
  switch (limitOrFeature) {
    case "invoices_per_month":
      return "You've reached the 20 invoices/month limit on the Free plan.";
    case "customers":
      return "You've reached the 100 customer limit on the Free plan.";
    case "products":
      return "You've reached the 50 product limit on the Free plan.";
    case "users":
      return "The Free plan includes 2 users.";
    case "ai_credits_per_month":
      return "You've used your 5 free AI credits this month.";
    default:
      return "This feature is included in Premium.";
  }
}
