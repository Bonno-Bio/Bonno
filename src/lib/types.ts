import type { PlanId } from "./plans";

export type ID = string;

export type Role =
  | "owner"
  | "manager"
  | "accountant"
  | "salesperson"
  | "staff"
  | "auditor";

export type SubscriptionStatus =
  | "active"
  | "past_due" // inside grace period
  | "expired" // downgraded to free
  | "free";

export interface Business {
  id: ID;
  name: string;
  industry: string;
  phone?: string;
  email?: string;
  address?: string;
  vatNumber?: string; // BURS VAT registration
  vatRate: number; // e.g. 0.14
  currency: "BWP";
  createdAt: string;
}

export interface User {
  id: ID;
  businessId: ID;
  name: string;
  email: string;
  role: Role;
}

export interface Subscription {
  businessId: ID;
  plan: PlanId;
  status: SubscriptionStatus;
  currentPeriodEnd?: string;
  provider?: "paypal";
  interval?: "monthly" | "annual";
  payerEmail?: string;
  lastPaymentRef?: string;
}

export interface Customer {
  id: ID;
  businessId: ID;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: ID;
  businessId: ID;
  name: string;
  sku?: string;
  price: number;
  cost?: number;
  stockQty: number;
  lowStockThreshold: number;
  trackStock: boolean;
  createdAt: string;
}

export type StockMovementType = "purchase" | "sale" | "adjustment" | "return";
export interface StockMovement {
  id: ID;
  businessId: ID;
  productId: ID;
  type: StockMovementType;
  qty: number; // positive in, negative out
  note?: string;
  createdAt: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";
export type DocKind = "invoice" | "quote";

export interface LineItem {
  id: ID;
  productId?: ID;
  description: string;
  qty: number;
  unitPrice: number;
  taxable: boolean;
}

export interface Invoice {
  id: ID;
  businessId: ID;
  kind: DocKind;
  number: string; // INV-0001 / QUO-0001
  customerId: ID;
  items: LineItem[];
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  notes?: string;
  recurring?: "monthly" | "weekly" | null;
  createdAt: string;
}

/** How a business records that ITS customer paid an invoice (bookkeeping only). */
export type PaymentMethod = "cash" | "card" | "paypal" | "bank_transfer" | "other";

export interface Payment {
  id: ID;
  businessId: ID;
  invoiceId: ID;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  createdAt: string;
}

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Stock purchase",
  "Salaries",
  "Transport",
  "Marketing",
  "Equipment",
  "Airtime & data",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: ID;
  businessId: ID;
  category: ExpenseCategory;
  amount: number;
  vendor?: string;
  date: string;
  note?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface AuditLog {
  id: ID;
  businessId: ID;
  actor: string;
  action: string;
  entity: string;
  entityId?: ID;
  createdAt: string;
}

export interface Notification {
  id: ID;
  businessId: ID;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
