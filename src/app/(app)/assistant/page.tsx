"use client";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEntitlements } from "@/lib/useEntitlements";
import { answer, SUGGESTIONS } from "@/lib/assistant";
import { PageHeader } from "@/components/ui";
import { UpgradePrompt } from "@/components/Paywall";
import { upgradeReason } from "@/lib/entitlements";

type Msg = { role: "user" | "assistant"; text: string };

export default function Assistant() {
  const store = useStore();
  const ent = useEntitlements();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: `Dumela! Ask me anything about ${store.business?.name}. I can read your invoices, expenses and stock.` }]);
  const [q, setQ] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const remaining = ent.remaining("ai_credits_per_month", ent.usage.ai_credits_per_month);
  const locked = remaining <= 0;

  const ask = (text: string) => {
    if (!text.trim() || locked) return;
    store.useAiCredit();
    const a = answer(text, {
      invoices: store.invoices, payments: store.payments, expenses: store.expenses, customers: store.customers, products: store.products,
      vatRate: store.business?.vatRate ?? 0, businessName: store.business?.name ?? "",
    });
    setMsgs((m) => [...m, { role: "user", text }, { role: "assistant", text: a }]);
    setQ("");
  };

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col md:h-[calc(100vh-7rem)]">
      <PageHeader title="AI Assistant" subtitle={`${remaining === Infinity ? "Unlimited" : remaining} credit${remaining === 1 ? "" : "s"} left this month · ${ent.limitFor("ai_credits_per_month")} on ${ent.effectivePlan}`} />
      <div className="card flex-1 space-y-3 overflow-y-auto">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800"}`}>
              {m.role === "assistant" && <Sparkles size={12} className="mb-1 text-violet-600" />}{m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {locked ? (
        <div className="mt-3"><UpgradePrompt reason={upgradeReason("ai_credits_per_month")} /></div>
      ) : (
        <>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs hover:border-emerald-400">{s}</button>)}
          </div>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
            <input className="input" placeholder="Ask about your business…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-primary" type="submit" disabled={!q.trim()}><Send size={16} /></button>
          </form>
        </>
      )}
    </div>
  );
}
