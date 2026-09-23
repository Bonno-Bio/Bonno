/**
 * KgweboOS plan definitions & entitlements.
 *
 * Every premium check in the app must go through `can()` / `limitFor()`
 * so that pricing and limits live in exactly one place.
 */

export type PlanId = "free" | "premium";

export const PREMIUM_PRICE_MONTHLY = 47; // BWP
export const PREMIUM_PRICE_ANNUAL = 470; // BWP – 2 months free
export const TRIAL_DAYS = 14;
export const GRACE_PERIOD_DAYS = 5;
export const CURRENCY = "BWP";

export type Feature =
  | "quotes"
  | "recurring_invoices"
  | "receipt_ocr"
  | "advanced_reports"
  | "full_inventory"
  | "whatsapp_reminders"
  | "custom_branding"
  | "advanced_roles"
  | "api_access"
  | "multi_branch"
  | "priority_support";

export type Limit =
  | "users"
  | "invoices_per_month"
  | "customers"
  | "products"
  | "ai_credits_per_month"
  | "branches";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  tagline: string;
  features: Record<Feature, boolean>;
  limits: Record<Limit, number>; // Infinity === unlimited
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    tagline: "Get started – free forever",
    features: {
      quotes: false,
      recurring_invoices: false,
      receipt_ocr: false,
      advanced_reports: false,
      full_inventory: false,
      whatsapp_reminders: false,
      custom_branding: false,
      advanced_roles: false,
      api_access: false,
      multi_branch: false,
      priority_support: false,
    },
    limits: {
      users: 2,
      invoices_per_month: 20,
      customers: 100,
      products: 50,
      ai_credits_per_month: 5,
      branches: 1,
    },
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceMonthly: PREMIUM_PRICE_MONTHLY,
    tagline: "Run your whole business from one dashboard",
    features: {
      quotes: true,
      recurring_invoices: true,
      receipt_ocr: true,
      advanced_reports: true,
      full_inventory: true,
      whatsapp_reminders: true,
      custom_branding: true,
      advanced_roles: true,
      api_access: true,
      multi_branch: true,
      priority_support: true,
    },
    limits: {
      users: 10,
      invoices_per_month: Infinity,
      customers: Infinity,
      products: Infinity,
      ai_credits_per_month: 500,
      branches: Infinity,
    },
  },
};

export const FEATURE_LABELS: Record<Feature, string> = {
  quotes: "Quotes & recurring invoices",
  recurring_invoices: "Recurring invoices",
  receipt_ocr: "Receipt OCR",
  advanced_reports: "Advanced reports (VAT, cash flow, profit)",
  full_inventory: "Full inventory & POS",
  whatsapp_reminders: "WhatsApp / SMS reminders",
  custom_branding: "Custom branding",
  advanced_roles: "Advanced roles & permissions",
  api_access: "API & accounting integrations",
  multi_branch: "Multi-branch",
  priority_support: "Priority support",
};

export const ADDONS = [
  { id: "payroll", name: "Payroll", price: 75, unit: "month" },
  { id: "ecommerce", name: "E-commerce store", price: 75, unit: "month" },
  { id: "branch", name: "Extra branch", price: 25, unit: "branch / month" },
  { id: "user", name: "Extra user", price: 10, unit: "user / month" },
  { id: "sms", name: "SMS bundles", price: 50, unit: "from" },
] as const;

/** Comparison matrix used on the pricing page. */
export const PLAN_MATRIX: { feature: string; free: string; premium: string }[] = [
  { feature: "Businesses", free: "1", premium: "1 + multi-branch" },
  { feature: "Users", free: "2", premium: "Up to 10" },
  { feature: "Invoices", free: "20 / month", premium: "Unlimited" },
  { feature: "Customers", free: "100", premium: "Unlimited" },
  { feature: "Products / stock", free: "50", premium: "Unlimited" },
  { feature: "Expenses", free: "Basic", premium: "Advanced + receipt OCR" },
  { feature: "Reports", free: "Basic", premium: "Advanced, VAT, cash flow, profit" },
  { feature: "Quotes / recurring invoices", free: "—", premium: "Yes" },
  { feature: "Inventory / POS", free: "Basic", premium: "Full" },
  { feature: "AI assistant", free: "5 credits / month", premium: "500 credits / month" },
  { feature: "WhatsApp / SMS reminders", free: "—", premium: "Yes" },
  { feature: "Custom branding", free: "—", premium: "Yes" },
  { feature: "Roles / permissions", free: "Basic", premium: "Advanced" },
  { feature: "Support", free: "Community", premium: "Priority" },
  { feature: "API / accounting integrations", free: "—", premium: "Yes" },
];
