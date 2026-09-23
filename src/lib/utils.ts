import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Invoice, LineItem } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = ""): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}_${rand}` : rand;
}

export function money(n: number, currency = "BWP"): string {
  const abs = Math.abs(n);
  const s = abs.toLocaleString("en-BW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : ""}P${s}`.replace("BWP", currency);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function isSameMonth(iso: string, ref = new Date()): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function lineTotal(i: LineItem): number {
  return i.qty * i.unitPrice;
}

export function invoiceTotals(inv: Pick<Invoice, "items">, vatRate: number) {
  const subtotal = inv.items.reduce((s, i) => s + lineTotal(i), 0);
  const taxable = inv.items.filter((i) => i.taxable).reduce((s, i) => s + lineTotal(i), 0);
  const vat = +(taxable * vatRate).toFixed(2);
  return { subtotal, vat, total: +(subtotal + vat).toFixed(2) };
}

export function padNumber(n: number, width = 4): string {
  return String(n).padStart(width, "0");
}
