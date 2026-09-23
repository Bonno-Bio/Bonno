"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2, Minus, PackagePlus, History, ShoppingCart } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEntitlements } from "@/lib/useEntitlements";
import { money, fmtDate, cn } from "@/lib/utils";
import { PageHeader, Modal, Field, Empty, Stat } from "@/components/ui";
import { UpgradePrompt } from "@/components/Paywall";
import { upgradeReason } from "@/lib/entitlements";
import type { Product } from "@/lib/types";

export default function Page() {
  return <Suspense><Inventory /></Suspense>;
}

function Inventory() {
  const params = useSearchParams();
  const { products, stockMovements, addProduct, deleteProduct, adjustStock } = useStore();
  const ent = useEntitlements();
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState<Product | null>(null);
  const [tab, setTab] = useState<"products" | "pos">("products");
  const [f, setF] = useState({ name: "", sku: "", price: "", cost: "", stockQty: "", lowStockThreshold: "5", trackStock: true });
  useEffect(() => { if (params.get("new")) setOpen(true); }, [params]);

  const canAdd = ent.withinLimit("products", ent.usage.products);
  const stockValue = products.filter((p) => p.trackStock).reduce((s, p) => s + p.stockQty * (p.cost ?? 0), 0);
  const low = products.filter((p) => p.trackStock && p.stockQty <= p.lowStockThreshold).length;

  const submit = () => {
    if (!f.name || !f.price) return;
    addProduct({ name: f.name, sku: f.sku || undefined, price: +f.price, cost: f.cost ? +f.cost : undefined, stockQty: f.trackStock ? +f.stockQty || 0 : 0, lowStockThreshold: +f.lowStockThreshold || 0, trackStock: f.trackStock });
    setF({ name: "", sku: "", price: "", cost: "", stockQty: "", lowStockThreshold: "5", trackStock: true });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader title="Inventory & POS" subtitle={`${products.length} / ${ent.limitFor("products") === Infinity ? "∞" : ent.limitFor("products")} products`} action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> Add</button>} />

      <div className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1 text-sm">
        <button onClick={() => setTab("products")} className={cn("flex-1 rounded-lg py-1.5", tab === "products" ? "bg-white font-medium shadow-sm" : "text-slate-500")}>Products & stock</button>
        <button onClick={() => setTab("pos")} className={cn("flex-1 rounded-lg py-1.5", tab === "pos" ? "bg-white font-medium shadow-sm" : "text-slate-500")}>Quick sale (POS) {!ent.can("full_inventory") && "🔒"}</button>
      </div>

      {tab === "pos" ? (
        ent.can("full_inventory") ? <POS /> : <UpgradePrompt reason={upgradeReason("full_inventory")} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Stat label="Stock value (cost)" value={money(stockValue)} />
            <Stat label="Low stock items" value={String(low)} tone={low ? "warn" : "default"} />
          </div>
          {products.length === 0 ? (
            <Empty title="No products or services yet" body="Add what you sell — services (haircut) or stock items (shampoo)." action={<button className="btn-primary" onClick={() => setOpen(true)}>Add product</button>} />
          ) : (
            <ul className="space-y-2">
              {products.map((p) => {
                const lowP = p.trackStock && p.stockQty <= p.lowStockThreshold;
                return (
                  <li key={p.id} className="card flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.sku && `${p.sku} · `}{money(p.price)}{p.cost ? ` · cost ${money(p.cost)}` : ""}</div>
                    </div>
                    {p.trackStock ? (
                      <div className="flex items-center gap-1">
                        <button className="btn-secondary p-1.5" onClick={() => adjustStock(p.id, -1, "adjustment")}><Minus size={14} /></button>
                        <span className={cn("w-10 text-center font-semibold", lowP && "text-amber-700")}>{p.stockQty}</span>
                        <button className="btn-secondary p-1.5" onClick={() => adjustStock(p.id, 1, "purchase")}><PackagePlus size={14} /></button>
                      </div>
                    ) : <span className="badge bg-slate-100 text-slate-600">Service</span>}
                    <button className="btn-ghost p-1.5" onClick={() => setHist(p)}><History size={16} /></button>
                    <button className="btn-ghost p-1.5 text-rose-600" onClick={() => confirm("Delete?") && deleteProduct(p.id)}><Trash2 size={16} /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add product or service">
        {!canAdd ? <UpgradePrompt reason={upgradeReason("products")} /> : (
          <div className="space-y-3">
            <Field label="Name *"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Selling price (P) *"><input className="input" type="number" step="0.01" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
              <Field label="Cost price (P)"><input className="input" type="number" step="0.01" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.trackStock} onChange={(e) => setF({ ...f, trackStock: e.target.checked })} /> Track stock (untick for services)</label>
            {f.trackStock && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="SKU"><input className="input" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></Field>
                <Field label="Opening qty"><input className="input" type="number" value={f.stockQty} onChange={(e) => setF({ ...f, stockQty: e.target.value })} /></Field>
                <Field label="Low-stock alert"><input className="input" type="number" value={f.lowStockThreshold} onChange={(e) => setF({ ...f, lowStockThreshold: e.target.value })} /></Field>
              </div>
            )}
            <button className="btn-primary w-full" onClick={submit} disabled={!f.name || !f.price}>Save</button>
          </div>
        )}
      </Modal>

      <Modal open={!!hist} onClose={() => setHist(null)} title={`Stock history · ${hist?.name}`}>
        <ul className="divide-y divide-slate-100 text-sm">
          {stockMovements.filter((m) => m.productId === hist?.id).map((m) => (
            <li key={m.id} className="flex justify-between py-2"><span className="capitalize">{m.type}{m.note && <span className="text-xs text-slate-500"> · {m.note}</span>}</span><span className={m.qty >= 0 ? "text-emerald-700" : "text-rose-700"}>{m.qty > 0 ? "+" : ""}{m.qty}</span><span className="text-xs text-slate-400">{fmtDate(m.createdAt)}</span></li>
          ))}
          {stockMovements.filter((m) => m.productId === hist?.id).length === 0 && <li className="py-4 text-center text-slate-400">No movements yet</li>}
        </ul>
      </Modal>
    </div>
  );
}

/** Simple point of sale: tap products → cart → cash sale creates a paid invoice. */
function POS() {
  const { products, customers, business, addInvoice, addCustomer, recordPayment, notify } = useStore();
  const vat = business?.vatRate ?? 0;
  const [cart, setCart] = useState<Record<string, number>>({});
  const items = Object.entries(cart).map(([id, qty]) => ({ p: products.find((x) => x.id === id)!, qty })).filter((x) => x.p);
  const subtotal = items.reduce((s, x) => s + x.p.price * x.qty, 0);
  const total = +(subtotal * (1 + vat)).toFixed(2);

  const checkout = (method: "cash" | "card" | "paypal") => {
    let walkIn = customers.find((c) => c.name === "Walk-in customer");
    if (!walkIn) walkIn = addCustomer({ name: "Walk-in customer" });
    const today = new Date().toISOString().slice(0, 10);
    const inv = addInvoice({ kind: "invoice", customerId: walkIn.id, status: "sent", issueDate: today, dueDate: today, items: items.map((x) => ({ id: x.p.id + Math.random(), productId: x.p.id, description: x.p.name, qty: x.qty, unitPrice: x.p.price, taxable: vat > 0 })) });
    recordPayment({ invoiceId: inv.id, amount: total, method });
    notify("Sale recorded", `${inv.number} · ${money(total)} via ${method.replace("_", " ")}`);
    setCart({});
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-2">
        {products.map((p) => (
          <button key={p.id} onClick={() => setCart({ ...cart, [p.id]: (cart[p.id] ?? 0) + 1 })} className="card py-3 text-left hover:border-emerald-400 active:bg-emerald-50">
            <div className="truncate text-sm font-medium">{p.name}</div>
            <div className="text-xs text-slate-500">{money(p.price)}{p.trackStock && ` · ${p.stockQty} left`}</div>
          </button>
        ))}
        {products.length === 0 && <div className="col-span-full text-center text-sm text-slate-400">Add products first.</div>}
      </div>
      <div className="card h-fit">
        <div className="mb-2 flex items-center gap-2 font-semibold"><ShoppingCart size={16} /> Cart</div>
        {items.length === 0 && <p className="text-sm text-slate-400">Tap products to add.</p>}
        <ul className="space-y-1 text-sm">
          {items.map((x) => (
            <li key={x.p.id} className="flex items-center justify-between">
              <span className="truncate">{x.p.name}</span>
              <span className="flex items-center gap-1">
                <button className="btn-secondary px-1.5 py-0.5" onClick={() => setCart({ ...cart, [x.p.id]: Math.max(0, x.qty - 1) })}>−</button>{x.qty}<button className="btn-secondary px-1.5 py-0.5" onClick={() => setCart({ ...cart, [x.p.id]: x.qty + 1 })}>+</button>
                <span className="ml-2 w-16 text-right font-medium">{money(x.p.price * x.qty)}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t pt-2 text-sm">
          {vat > 0 && <div className="flex justify-between text-slate-500"><span>VAT</span><span>{money(total - subtotal)}</span></div>}
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(total)}</span></div>
        </div>
        <div className="mt-3 grid gap-2">
          <button className="btn-primary" disabled={!items.length} onClick={() => checkout("cash")}>Cash</button>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary" disabled={!items.length} onClick={() => checkout("card")}>Visa / card</button>
            <button className="btn-secondary" disabled={!items.length} onClick={() => checkout("paypal")}>PayPal</button>
          </div>
        </div>
      </div>
    </div>
  );
}
