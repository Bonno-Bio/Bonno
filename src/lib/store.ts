"use client";
/**
 * Local-first application store.
 *
 * All records are keyed by businessId (tenant). Data is persisted to
 * localStorage so the app works offline; a sync layer (Supabase) can
 * replay `pendingOps` when connectivity returns. See docs/ARCHITECTURE.md.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AuditLog,
  ApprovalRequest,
  Business,
  Customer,
  CollectionReminder,
  Expense,
  Invoice,
  Notification,
  Payment,
  Product,
  StockMovement,
  Subscription,
  User,
} from "./types";
import { addDays, padNumber, todayISO, uid } from "./utils";
import { syncBridge } from "./firebase/bridge";

export interface PendingOp {
  id: string;
  entity: string;
  op: "insert" | "update" | "delete";
  payload: unknown;
  at: string;
}

interface State {
  hydrated: boolean;
  business: Business | null;
  user: User | null;
  subscription: Subscription | null;
  customers: Customer[];
  reminders: CollectionReminder[];
  products: Product[];
  stockMovements: StockMovement[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  auditLogs: AuditLog[];
  approvals: ApprovalRequest[];
  notifications: Notification[];
  pendingOps: PendingOp[];
  aiCreditsUsed: number;
  aiCreditsMonth: string; // YYYY-MM

  // onboarding / auth
  registerBusiness: (b: Omit<Business, "id" | "createdAt" | "currency">, owner: { name: string; email: string }) => void;
  signOut: () => void;
  loadDemo: () => void;

  // subscription
  setSubscription: (sub: Subscription) => void;
  activatePremium: (ref: string, months: number, interval: "monthly" | "annual", payerEmail?: string) => void;
  cancelPremium: () => void;

  // customers
  addCustomer: (c: Omit<Customer, "id" | "businessId" | "createdAt">) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  addReminder: (r: Omit<CollectionReminder, "id" | "businessId" | "sentAt">) => CollectionReminder;
  updateReminder: (id: string, patch: Partial<CollectionReminder>) => void;
  deleteCustomer: (id: string) => void;
  requestApproval: (a: Omit<ApprovalRequest, "id" | "businessId" | "createdAt" | "status" | "requestedBy">) => ApprovalRequest;
  resolveApproval: (id: string, status: "approved" | "rejected") => void;

  // products
  addProduct: (p: Omit<Product, "id" | "businessId" | "createdAt">) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, qty: number, type: StockMovement["type"], note?: string) => void;

  // invoices
  nextNumber: (kind: Invoice["kind"]) => string;
  addInvoice: (i: Omit<Invoice, "id" | "businessId" | "createdAt" | "number">) => Invoice;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  recordPayment: (p: Omit<Payment, "id" | "businessId" | "createdAt">) => void;
  updatePayment: (id: string, patch: Partial<Payment>) => void;
  convertQuoteToInvoice: (quoteId: string) => Invoice | null;

  // expenses
  addExpense: (e: Omit<Expense, "id" | "businessId" | "createdAt">) => Expense;
  deleteExpense: (id: string) => void;

  // misc
  useAiCredit: () => void;
  log: (action: string, entity: string, entityId?: string, severity?: "info" | "warning" | "critical", exception?: boolean) => void;
  notify: (title: string, body: string) => void;
  markAllRead: () => void;
  clearPending: () => void;
}

const invoiceSubtotal = (items: { qty: number; unitPrice: number }[]) => items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
const nowISO = () => new Date().toISOString();
const monthKey = () => new Date().toISOString().slice(0, 7);

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const bid = () => get().business?.id ?? "";
      const push = (entity: string, op: PendingOp["op"], payload: unknown) => {
        set((s) => ({ pendingOps: [...s.pendingOps, { id: uid("op"), entity, op, payload, at: nowISO() }] }));
        syncBridge.onPendingOps?.();
      };

      return {
        hydrated: false,
        business: null,
        user: null,
        subscription: null,
        customers: [],
        reminders: [],
        products: [],
        stockMovements: [],
        invoices: [],
        payments: [],
        expenses: [],
        auditLogs: [],
        approvals: [],
        notifications: [],
        pendingOps: [],
        aiCreditsUsed: 0,
        aiCreditsMonth: monthKey(),

        registerBusiness: (b, owner) => {
          const id = uid("biz");
          const business: Business = { ...b, id, currency: "BWP", createdAt: nowISO() };
          const user: User = { id: uid("usr"), businessId: id, name: owner.name, email: owner.email, role: "owner" };
          const subscription: Subscription = {
            businessId: id,
            plan: "free",
            status: "free",
          };
          set({ business, user, subscription });
          void syncBridge.onBusinessCreated?.(business, user, subscription);
          get().log("business.registered", "business", id);
          get().notify("Welcome to KgweboOS 🎉", "Your free workspace is ready. Upgrade only when you need Premium tools.");
        },

        signOut: () =>
          set({
            business: null, user: null, subscription: null, customers: [], reminders: [], products: [], stockMovements: [],
            invoices: [], payments: [], expenses: [], auditLogs: [], approvals: [], notifications: [], pendingOps: [], aiCreditsUsed: 0,
          }),

        loadDemo: () => {
          const s = get();
          if (!s.business) {
            s.registerBusiness(
              { name: "Neo's Salon & Barber", industry: "Salon / Barber", phone: "+267 71 234 567", email: "neo@example.com", address: "Plot 1234, Main Mall, Gaborone", vatRate: 0.14 },
              { name: "Neo Moeng", email: "neo@example.com" },
            );
          }
          const st = get();
          const c1 = st.addCustomer({ name: "Kabelo Dintwe", phone: "+267 72 111 222" });
          const c2 = st.addCustomer({ name: "Lorato Sebina", phone: "+267 73 333 444", email: "lorato@example.com" });
          const c3 = st.addCustomer({ name: "Thabo Mokgosi", phone: "+267 74 555 666" });
          const p1 = st.addProduct({ name: "Haircut (men)", price: 60, cost: 0, stockQty: 0, lowStockThreshold: 0, trackStock: false });
          const p2 = st.addProduct({ name: "Braids – medium", price: 350, cost: 0, stockQty: 0, lowStockThreshold: 0, trackStock: false });
          const p3 = st.addProduct({ name: "Hair relaxer 250ml", sku: "RLX-250", price: 85, cost: 55, stockQty: 12, lowStockThreshold: 5, trackStock: true });
          const p4 = st.addProduct({ name: "Shampoo 500ml", sku: "SHP-500", price: 65, cost: 40, stockQty: 3, lowStockThreshold: 5, trackStock: true });
          const today = todayISO();
          const i1 = st.addInvoice({
            kind: "invoice", customerId: c1.id, status: "paid", issueDate: addDays(today, -12), dueDate: addDays(today, -5),
            items: [{ id: uid(), productId: p1.id, description: p1.name, qty: 1, unitPrice: 60, taxable: true }],
          });
          st.recordPayment({ invoiceId: i1.id, amount: 68.4, method: "card", reference: "POS-88213" });
          st.addInvoice({
            kind: "invoice", customerId: c2.id, status: "sent", issueDate: addDays(today, -3), dueDate: addDays(today, 4),
            items: [
              { id: uid(), productId: p2.id, description: p2.name, qty: 1, unitPrice: 350, taxable: true },
              { id: uid(), productId: p3.id, description: p3.name, qty: 1, unitPrice: 85, taxable: true },
            ],
          });
          st.addInvoice({
            kind: "invoice", customerId: c3.id, status: "overdue", issueDate: addDays(today, -20), dueDate: addDays(today, -6),
            items: [{ id: uid(), productId: p4.id, description: p4.name, qty: 2, unitPrice: 65, taxable: true }],
          });
          st.addInvoice({
            kind: "quote", customerId: c2.id, status: "draft", issueDate: today, dueDate: addDays(today, 14),
            items: [{ id: uid(), productId: p2.id, description: "Bridal party braids x4", qty: 4, unitPrice: 350, taxable: true }],
          });
          st.addExpense({ category: "Rent", amount: 2500, vendor: "Main Mall Properties", date: addDays(today, -10) });
          st.addExpense({ category: "Stock purchase", amount: 640, vendor: "Beauty Wholesalers", date: addDays(today, -7) });
          st.addExpense({ category: "Utilities", amount: 380, vendor: "BPC", date: addDays(today, -2) });
          st.addExpense({ category: "Airtime & data", amount: 150, vendor: "Mascom", date: today });
        },

        setSubscription: (subscription) => set({ subscription }),
        activatePremium: (ref, months, interval, payerEmail) => {
          const sub = get().subscription;
          if (!sub) return;
          const base = sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date() ? new Date(sub.currentPeriodEnd) : new Date();
          base.setDate(base.getDate() + 30 * months);
          set({ subscription: { ...sub, plan: "premium", status: "active", currentPeriodEnd: base.toISOString(), provider: "paypal", interval, payerEmail, lastPaymentRef: ref } });
          get().log("subscription.activated", "subscription");
          get().notify("Premium activated ✅", `PayPal payment ${ref} confirmed. Premium is active until ${base.toLocaleDateString("en-GB")}.`);
        },

        cancelPremium: () => {
          const sub = get().subscription;
          if (!sub) return;
          set({ subscription: { ...sub, plan: "free", status: "free", currentPeriodEnd: undefined } });
          get().log("subscription.cancelled", "subscription");
        },

        addCustomer: (c) => {
          const rec: Customer = { ...c, id: uid("cus"), businessId: bid(), createdAt: nowISO() };
          set((s) => ({ customers: [rec, ...s.customers] }));
          push("customers", "insert", rec);
          get().log("customer.created", "customer", rec.id);
          return rec;
        },
        updateCustomer: (id, patch) => {
          set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
          push("customers", "update", { id, ...patch });
        },
        deleteCustomer: (id) => {
          set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
          push("customers", "delete", { id });
          get().log("customer.deleted", "customer", id);
        },
        addReminder: (r) => {
          const rec: CollectionReminder = { ...r, id: uid("rem"), businessId: bid(), sentAt: nowISO() };
          set((s) => ({ reminders: [rec, ...s.reminders] }));
          push("reminders", "insert", rec);
          get().log("collection.reminder_sent", "reminder", rec.id);
          return rec;
        },
        updateReminder: (id, patch) => {
          set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
          push("reminders", "update", { id, ...patch });
        },

        requestApproval: (a) => {
          const rec: ApprovalRequest = { ...a, id: uid("apr"), businessId: bid(), status: "pending", requestedBy: get().user?.email ?? "system", createdAt: nowISO() };
          set((s) => ({ approvals: [rec, ...s.approvals] }));
          get().log("approval.requested", a.entity, a.entityId, "warning", true);
          get().notify("Approval required", `${a.action.replaceAll("_", " ")} is waiting for review.`);
          return rec;
        },
        resolveApproval: (id, status) => {
          const rec = get().approvals.find((a) => a.id === id);
          if (!rec) return;
          set((s) => ({ approvals: s.approvals.map((a) => a.id === id ? { ...a, status, resolvedAt: nowISO(), resolvedBy: s.user?.email ?? "system" } : a) }));
          if (status === "approved" && rec.action === "void_invoice") get().updateInvoice(rec.entityId, { status: "void" });
          if (status === "approved" && rec.action === "stock_adjustment") get().notify("Stock adjustment approved", rec.reason);
          get().log(`approval.${status}`, rec.entity, rec.entityId, status === "approved" ? "info" : "warning", status !== "approved");
        },

        addProduct: (p) => {
          const rec: Product = { ...p, id: uid("prd"), businessId: bid(), createdAt: nowISO() };
          set((s) => ({ products: [rec, ...s.products] }));
          push("products", "insert", rec);
          if (rec.trackStock && rec.stockQty) {
            const mv: StockMovement = { id: uid("mv"), businessId: bid(), productId: rec.id, type: "adjustment", qty: rec.stockQty, note: "Opening stock", createdAt: nowISO() };
            set((s) => ({ stockMovements: [mv, ...s.stockMovements] }));
          }
          get().log("product.created", "product", rec.id);
          return rec;
        },
        updateProduct: (id, patch) => {
          set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
          push("products", "update", { id, ...patch });
        },
        deleteProduct: (id) => {
          set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
          push("products", "delete", { id });
        },
        adjustStock: (productId, qty, type, note) => {
          const mv: StockMovement = { id: uid("mv"), businessId: bid(), productId, type, qty, note, createdAt: nowISO() };
          set((s) => ({
            stockMovements: [mv, ...s.stockMovements],
            products: s.products.map((p) => (p.id === productId ? { ...p, stockQty: p.stockQty + qty } : p)),
          }));
          push("stock_movements", "insert", mv);
          if (type === "shrinkage" || (type === "adjustment" && qty < 0)) {
            get().log("stock.shrinkage_detected", "product", productId, "warning", true);
            get().notify("Stock exception", `${get().products.find((x) => x.id === productId)?.name ?? "Stock"}: ${Math.abs(qty)} unit${Math.abs(qty) === 1 ? "" : "s"} unaccounted for.`);
          }
          const p = get().products.find((x) => x.id === productId);
          if (p && p.trackStock && p.stockQty <= p.lowStockThreshold) {
            get().notify("Low stock", `${p.name} is down to ${p.stockQty}. Time to reorder.`);
          }
        },

        nextNumber: (kind) => {
          const count = get().invoices.filter((i) => i.kind === kind).length + 1;
          return `${kind === "invoice" ? "INV" : "QUO"}-${padNumber(count)}`;
        },
        addInvoice: (i) => {
          const rec: Invoice = { ...i, id: uid("inv"), businessId: bid(), number: get().nextNumber(i.kind), createdAt: nowISO() };
          set((s) => ({ invoices: [rec, ...s.invoices] }));
          push("invoices", "insert", rec);
          // Deduct stock for tracked products on invoices (not quotes/drafts)
          if (rec.kind === "invoice" && rec.status !== "draft") {
            rec.items.forEach((li) => {
              const p = li.productId && get().products.find((x) => x.id === li.productId);
              if (p && p.trackStock) get().adjustStock(p.id, -li.qty, "sale", rec.number);
            });
          }
          get().log(`${rec.kind}.created`, rec.kind, rec.id);
          if (rec.discountAmount && rec.discountAmount > invoiceSubtotal(rec.items) * 0.1) {
            get().log("invoice.large_discount", "invoice", rec.id, "warning", true);
            get().notify("Large discount recorded", `${rec.number} includes a discount above 10%; review the audit trail.`);
          }
          return rec;
        },
        updateInvoice: (id, patch) => {
          set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
          push("invoices", "update", { id, ...patch });
        },
        deleteInvoice: (id) => {
          set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) }));
          push("invoices", "delete", { id });
        },
        recordPayment: (p) => {
          const rec: Payment = { ...p, id: uid("pay"), businessId: bid(), verificationStatus: p.verificationStatus ?? "verified", createdAt: nowISO() };
          set((s) => ({ payments: [rec, ...s.payments] }));
          push("payments", "insert", rec);
          get().updateInvoice(p.invoiceId, { status: "paid" });
          get().log("payment.recorded", "payment", rec.id);
        },
        updatePayment: (id, patch) => {
          set((s) => ({ payments: s.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
          push("payments", "update", { id, ...patch });
          get().log("payment.verification_updated", "payment", id);
        },
        convertQuoteToInvoice: (quoteId) => {
          const q = get().invoices.find((i) => i.id === quoteId && i.kind === "quote");
          if (!q) return null;
          const inv = get().addInvoice({ ...q, kind: "invoice", status: "sent", issueDate: todayISO(), dueDate: addDays(todayISO(), 7), items: q.items.map((x) => ({ ...x, id: uid() })) });
          get().updateInvoice(quoteId, { status: "void", notes: `Converted to ${inv.number}` });
          return inv;
        },

        addExpense: (e) => {
          const rec: Expense = { ...e, id: uid("exp"), businessId: bid(), createdAt: nowISO() };
          set((s) => ({ expenses: [rec, ...s.expenses] }));
          push("expenses", "insert", rec);
          get().log("expense.created", "expense", rec.id);
          return rec;
        },
        deleteExpense: (id) => {
          set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
          push("expenses", "delete", { id });
        },

        useAiCredit: () =>
          set((s) => (s.aiCreditsMonth === monthKey() ? { aiCreditsUsed: s.aiCreditsUsed + 1 } : { aiCreditsUsed: 1, aiCreditsMonth: monthKey() })),

        log: (action, entity, entityId, severity = "info", exception = false) =>
          set((s) => ({
            auditLogs: [{ id: uid("log"), businessId: s.business?.id ?? "", actor: s.user?.email ?? "system", action, entity, entityId, severity, exception, createdAt: nowISO() }, ...s.auditLogs].slice(0, 500),
          })),
        notify: (title, body) =>
          set((s) => ({ notifications: [{ id: uid("ntf"), businessId: s.business?.id ?? "", title, body, read: false, createdAt: nowISO() }, ...s.notifications].slice(0, 100) })),
        markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
        clearPending: () => set({ pendingOps: [] }),
      };
    },
    {
      name: "kgweboos:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hydrated, ...rest } = s;
        return rest as State;
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

/** Hook returning true once localStorage state has been loaded (avoids SSR flash). */
import { useEffect, useState } from "react";
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => {
    if (useStore.persist.hasHydrated()) setH(true);
    const unsub = useStore.persist.onFinishHydration(() => setH(true));
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);
  return h;
}
