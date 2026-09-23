import { describe, expect, it } from "vitest";
import { invoiceTotals, lineTotal } from "@/lib/utils";
describe("invoice money calculations", () => {
  it("calculates lines, VAT and totals", () => { const inv = { items: [{ id: "1", description: "Service", qty: 2, unitPrice: 100, taxable: true }] }; expect(lineTotal(inv.items[0])).toBe(200); expect(invoiceTotals(inv, 0.14)).toEqual({ subtotal: 200, discount: 0, vat: 28, total: 228 }); });
  it("applies a discount before VAT", () => { const inv = { items: [{ id: "1", description: "Stock", qty: 1, unitPrice: 500, taxable: true }], discountAmount: 50 }; expect(invoiceTotals(inv, 0.14)).toEqual({ subtotal: 500, discount: 50, vat: 70, total: 520 }); });
  it("does not allow a discount larger than subtotal", () => { const inv = { items: [{ id: "1", description: "Item", qty: 1, unitPrice: 100, taxable: false }], discountAmount: 500 }; expect(invoiceTotals(inv, 0)).toEqual({ subtotal: 100, discount: 100, vat: 0, total: 0 }); });
});
