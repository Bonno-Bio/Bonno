/**
 * AI assistant – local "business brain".
 *
 * Answers common questions directly from tenant data without a network call.
 * When OPENAI/GEMINI keys are configured on the server, /api/assistant can
 * be used instead; this stays as the offline fallback and keeps AI costs low.
 */
import type { Customer, Expense, Invoice, Payment, Product } from "./types";
import { invoiceTotals, money, fmtDate, isSameMonth } from "./utils";

export interface Ctx {
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  customers: Customer[];
  products: Product[];
  vatRate: number;
  businessName: string;
}

export const SUGGESTIONS = [
  "Who owes me money?",
  "How much profit did I make this month?",
  "What is low on stock?",
  "What are my biggest expenses?",
  "Who are my best customers?",
  "How much VAT do I owe?",
];

export function answer(q: string, c: Ctx): string {
  const s = q.toLowerCase();
  const byId = Object.fromEntries(c.customers.map((x) => [x.id, x]));

  if (/(owe|outstanding|unpaid|overdue|debt)/.test(s)) {
    const open = c.invoices.filter((i) => i.kind === "invoice" && (i.status === "sent" || i.status === "overdue"));
    if (!open.length) return "Great news — nobody owes you money right now. All invoices are paid. 🎉";
    const total = open.reduce((t, i) => t + invoiceTotals(i, c.vatRate).total, 0);
    const lines = open.map((i) => `• ${byId[i.customerId]?.name ?? "Unknown"} — ${money(invoiceTotals(i, c.vatRate).total)} (${i.number}, ${i.status === "overdue" ? "overdue since" : "due"} ${fmtDate(i.dueDate)})`);
    return `You're owed ${money(total)} across ${open.length} invoice${open.length > 1 ? "s" : ""}:\n${lines.join("\n")}\n\nTip: send WhatsApp reminders from the Invoices page.`;
  }

  if (/(profit|earn|made|net)/.test(s)) {
    const sales = c.payments.filter((p) => isSameMonth(p.createdAt)).reduce((t, p) => t + p.amount, 0);
    const exp = c.expenses.filter((e) => isSameMonth(e.date)).reduce((t, e) => t + e.amount, 0);
    const p = sales - exp;
    return `This month so far:\n• Sales received: ${money(sales)}\n• Expenses: ${money(exp)}\n• Cash profit: ${money(p)} ${p >= 0 ? "✅" : "⚠️"}\n\n${p < 0 ? "You're spending more than you're collecting. Check overdue invoices and your biggest expense categories." : sales > 0 ? `Your margin is ${Math.round((p / sales) * 100)}%.` : "No payments received yet this month."}`;
  }

  if (/(sales|revenue|turnover|income)/.test(s)) {
    const sales = c.payments.filter((p) => isSameMonth(p.createdAt)).reduce((t, p) => t + p.amount, 0);
    const n = c.payments.filter((p) => isSameMonth(p.createdAt)).length;
    return `You've received ${money(sales)} from ${n} payment${n === 1 ? "" : "s"} this month.`;
  }

  if (/(stock|inventory|reorder|running out)/.test(s)) {
    const low = c.products.filter((p) => p.trackStock && p.stockQty <= p.lowStockThreshold);
    if (!low.length) return "All tracked products are above their low-stock levels. 👍";
    return `${low.length} item${low.length > 1 ? "s" : ""} need reordering:\n${low.map((p) => `• ${p.name} — ${p.stockQty} left (alert at ${p.lowStockThreshold})`).join("\n")}`;
  }

  if (/(expense|spend|cost|biggest)/.test(s)) {
    const m: Record<string, number> = {};
    c.expenses.filter((e) => isSameMonth(e.date)).forEach((e) => (m[e.category] = (m[e.category] ?? 0) + e.amount));
    const top = Object.entries(m).sort((a, b) => b[1] - a[1]);
    if (!top.length) return "No expenses logged this month yet.";
    const total = top.reduce((t, [, v]) => t + v, 0);
    return `Expenses this month total ${money(total)}. Biggest categories:\n${top.slice(0, 5).map(([k, v]) => `• ${k} — ${money(v)} (${Math.round((v / total) * 100)}%)`).join("\n")}`;
  }

  if (/(best|top).*(customer|client)/.test(s) || /customer/.test(s)) {
    const m: Record<string, number> = {};
    c.invoices.filter((i) => i.kind === "invoice" && i.status === "paid").forEach((i) => (m[i.customerId] = (m[i.customerId] ?? 0) + invoiceTotals(i, c.vatRate).total));
    const top = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!top.length) return `You have ${c.customers.length} customers but no paid invoices yet.`;
    return `Your top customers by paid sales:\n${top.map(([id, v], i) => `${i + 1}. ${byId[id]?.name ?? "—"} — ${money(v)}`).join("\n")}`;
  }

  if (/vat|tax|burs/.test(s)) {
    if (!c.vatRate) return "Your business isn't set up as VAT registered, so no VAT is charged on invoices. If you register with BURS, switch VAT on in Settings.";
    const out = c.invoices.filter((i) => i.kind === "invoice" && i.status === "paid" && isSameMonth(i.issueDate)).reduce((t, i) => t + invoiceTotals(i, c.vatRate).vat, 0);
    return `Output VAT collected on paid invoices this month: ${money(out)}. Remember to deduct input VAT from your expense receipts when filing with BURS.`;
  }

  if (/(hello|hi|dumela|help)/.test(s)) {
    return `Dumela! I'm the ${c.businessName} assistant. Ask me things like:\n${SUGGESTIONS.map((x) => `• ${x}`).join("\n")}`;
  }

  return `I'm not sure how to answer that yet. Try one of these:\n${SUGGESTIONS.map((x) => `• ${x}`).join("\n")}`;
}
