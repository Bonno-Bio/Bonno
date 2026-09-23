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
  cipaNumber?: string;
  tradeLicenseNumber?: string;
  taxClearanceExpiry?: string;
  logoUrl?: string;
  brandColor?: string;
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
  preferredReminderChannel?: "whatsapp" | "sms" | "email" | "phone";
  reminderConsent?: boolean;
  promiseToPayDate?: string;
  promiseToPayNote?: string;
  escalationLevel?: 0 | 1 | 2 | 3;
  createdAt: string;
}

export type ReminderChannel = "whatsapp" | "sms" | "email" | "phone";
export interface CollectionReminder {
  id: ID;
  businessId: ID;
  invoiceId: ID;
  customerId: ID;
  channel: ReminderChannel;
  message: string;
  sentAt: string;
  outcome?: "opened" | "promised" | "paid" | "no_response";
  nextReminderAt?: string;
  scheduledAt?: string;
  status?: "scheduled" | "sent";
}

export type PaymentVerificationStatus = "unverified" | "pending" | "verified" | "rejected";

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

export type StockMovementType = "purchase" | "sale" | "adjustment" | "return" | "shrinkage";
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

export interface DocumentAttachment {
  id: ID;
  name: string;
  url: string;
  storagePath?: string;
  retentionUntil?: string;
  addedAt: string;
}

export const RECORD_RETENTION_YEARS = 7;

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
  discountAmount?: number;
  discountReason?: string;
  creditNoteForId?: ID;
  creditNoteReason?: string;
  attachments?: DocumentAttachment[];
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
  proofUrl?: string;
  verificationStatus?: PaymentVerificationStatus;
  verifiedAt?: string;
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
  receiptStoragePath?: string;
  retentionUntil?: string;
  createdAt: string;
}

export interface AuditLog {
  id: ID;
  businessId: ID;
  actor: string;
  action: string;
  entity: string;
  entityId?: ID;
  severity?: "info" | "warning" | "critical";
  exception?: boolean;
  resolvedAt?: string;
  createdAt: string;
}

export type ApprovalAction = "void_invoice" | "stock_adjustment" | "large_discount";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export interface ApprovalRequest {
  id: ID;
  businessId: ID;
  action: ApprovalAction;
  entity: string;
  entityId: ID;
  reason: string;
  requestedBy: string;
  status: ApprovalStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface Notification {
  id: ID;
  businessId: ID;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
