"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, FileText, Receipt, Package, BarChart3, Sparkles, CreditCard,
  Settings, Bell, Menu, X, WifiOff, LogOut, CloudUpload, type LucideIcon,
} from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { useEntitlements } from "@/lib/useEntitlements";
import { cn } from "@/lib/utils";
import { SubscriptionBanner } from "./Paywall";
import { StatusBadge } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = NAV.slice(0, 5);

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const business = useStore((s) => s.business);
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (hydrated && !business) router.replace("/register");
  }, [hydrated, business, router]);

  if (!hydrated || !business) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading KgweboOS…</div>;
  }

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <Brand />
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((n) => <NavLink key={n.href} {...n} active={pathname.startsWith(n.href)} />)}
        </nav>
        <PlanCard />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={() => setOpen(false)}>
          <aside className="flex h-full w-72 flex-col bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pr-2"><Brand /><button className="btn-ghost p-2" onClick={() => setOpen(false)}><X size={18} /></button></div>
            <nav className="flex-1 space-y-0.5 px-3">
              {NAV.map((n) => <NavLink key={n.href} {...n} active={pathname.startsWith(n.href)} onClick={() => setOpen(false)} />)}
            </nav>
            <PlanCard />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <SubscriptionBanner />
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-slate-800 px-4 py-1.5 text-xs text-white"><WifiOff size={14} /> You&apos;re offline — changes are saved on this device and will sync later.</div>
        )}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button className="btn-ghost -ml-2 p-2 md:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={20} /></button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{business.name}</div>
            <div className="truncate text-xs text-slate-500">{business.industry}</div>
          </div>
          <SyncIndicator />
          <NotificationsButton />
        </header>

        <main className="flex-1 px-4 py-4 pb-24 md:px-8 md:pb-8">{children}</main>

        {/* Bottom nav (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden">
          {MOBILE_NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-emerald-700" : "text-slate-500")}>
                <n.icon size={20} />{n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">K</div>
      <div><div className="text-sm font-bold leading-tight">KgweboOS</div><div className="text-[10px] text-slate-500">Business in one dashboard</div></div>
    </Link>
  );
}

function NavLink({ href, label, icon: Icon, active, onClick }: { href: string; label: string; icon: LucideIcon; active: boolean; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm", active ? "bg-emerald-50 font-medium text-emerald-800" : "text-slate-600 hover:bg-slate-100")}>
      <Icon size={18} /> {label}
    </Link>
  );
}

function PlanCard() {
  const ent = useEntitlements();
  const signOut = useStore((s) => s.signOut);
  const router = useRouter();
  return (
    <div className="m-3 rounded-xl border border-slate-200 p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium">{ent.effectivePlan === "premium" ? "Premium" : "Free plan"}</span>
        <StatusBadge status={ent.status} />
      </div>
      {ent.daysLeft !== null && <div className="mt-1 text-slate-500">{ent.daysLeft} days left</div>}
      {ent.effectivePlan !== "premium" && <Link href="/billing" className="btn-primary mt-2 w-full py-1.5 text-xs">Upgrade · P47/mo</Link>}
      <button className="btn-ghost mt-2 w-full py-1.5 text-xs" onClick={() => { signOut(); router.replace("/"); }}><LogOut size={14} /> Sign out</button>
    </div>
  );
}

function SyncIndicator() {
  const pending = useStore((s) => s.pendingOps.length);
  const clear = useStore((s) => s.clearPending);
  if (!pending) return null;
  return (
    <button title="Pending changes to sync (Supabase adapter not connected yet)" onClick={clear} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
      <CloudUpload size={14} /> {pending}
    </button>
  );
}

function NotificationsButton() {
  const notifications = useStore((s) => s.notifications);
  const markAllRead = useStore((s) => s.markAllRead);
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div className="relative">
      <button className="btn-ghost relative p-2" onClick={() => { setOpen((o) => !o); if (!open) markAllRead(); }} aria-label="Notifications">
        <Bell size={20} />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="px-2 py-1 text-xs font-semibold text-slate-500">Notifications</div>
          {notifications.length === 0 && <div className="p-3 text-sm text-slate-400">Nothing yet.</div>}
          <div className="max-h-80 overflow-y-auto">
            {notifications.slice(0, 20).map((n) => (
              <div key={n.id} className="rounded-xl p-2 hover:bg-slate-50">
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-xs text-slate-500">{n.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
