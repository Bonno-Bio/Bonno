"use client";
/**
 * Sync engine: local zustand store  ⇄  Firestore.
 *
 *  - Outbound: every store mutation is queued in `pendingOps`; we drain the
 *    queue into Firestore (Firestore itself buffers while offline).
 *  - Inbound: on login we subscribe to the business doc, subscription doc and
 *    all collections; snapshots replace store arrays.
 *  - Firestore's persistent cache makes this offline-first without extra work.
 */
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, getDoc, getDocs, query, where, serverTimestamp, writeBatch, type Unsubscribe,
} from "firebase/firestore";
import { firestore, isFirebaseConfigured } from "./client";
import { COLLECTIONS, P, type StoreCollectionKey } from "./paths";
import { syncBridge } from "./bridge";
import { useStore, type PendingOp } from "../store";
import type { Business, Subscription, User } from "../types";

const ENTITY_TO_KEY: Record<string, StoreCollectionKey> = {
  customers: "customers", reminders: "reminders", products: "products", stock_movements: "stockMovements", invoices: "invoices",
  payments: "payments", expenses: "expenses", audit_logs: "auditLogs",
};

let subs: Unsubscribe[] = [];
let draining = false;
let currentBid: string | null = null;

/** Push queued ops to Firestore. Safe to call often. */
export async function drain() {
  if (!isFirebaseConfigured || draining || !currentBid) return;
  const ops = useStore.getState().pendingOps;
  if (!ops.length) return;
  draining = true;
  try {
    const db = firestore();
    const chunks: PendingOp[][] = [];
    for (let i = 0; i < ops.length; i += 400) chunks.push(ops.slice(i, i + 400));
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const op of chunk) {
        const key = ENTITY_TO_KEY[op.entity];
        if (!key) continue;
        const payload = op.payload as { id: string } & Record<string, unknown>;
        const ref = doc(db, P.col(currentBid, COLLECTIONS[key]), payload.id);
        if (op.op === "delete") batch.delete(ref);
        else batch.set(ref, { ...payload, businessId: currentBid, updatedAt: serverTimestamp() }, { merge: true });
      }
      await batch.commit();
    }
    useStore.setState((s) => ({ pendingOps: s.pendingOps.filter((o) => !ops.some((d) => d.id === o.id)) }));
  } catch (e) {
    console.warn("[sync] drain failed, will retry", e);
  } finally {
    draining = false;
  }
}

/** Create the business, membership and subscription docs for a new tenant. */
export async function createBusinessDocs(uid: string, b: Business, u: User, s: Subscription) {
  if (!isFirebaseConfigured) return;
  const db = firestore();
  const batch = writeBatch(db);
  batch.set(doc(db, P.business(b.id)), { ...b, ownerUid: uid, createdAt: serverTimestamp() });
  batch.set(doc(db, P.member(b.id, uid)), { uid, role: "owner", name: u.name, email: u.email, createdAt: serverTimestamp() });
  batch.set(doc(db, P.user(uid)), { businessId: b.id, name: u.name, email: u.email, updatedAt: serverTimestamp() }, { merge: true });
  batch.set(doc(db, `${P.business(b.id)}/meta/subscription`), { ...s, updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function updateBusinessDoc(b: Business) {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(firestore(), P.business(b.id)), { ...b, updatedAt: serverTimestamp() }, { merge: true });
}

/** Find the business a signed-in user belongs to (owner or invited member). */
export async function findBusinessForUser(uid: string, email?: string | null): Promise<string | null> {
  const db = firestore();
  const u = await getDoc(doc(db, P.user(uid)));
  if (u.exists() && u.data().businessId) return u.data().businessId as string;
  if (email) {
    // Accept a pending invite by email
    const q = query(collection(db, "invites"), where("email", "==", email.toLowerCase()), where("status", "==", "pending"));
    const inv = await getDocs(q);
    const first = inv.docs[0];
    if (first) {
      const { businessId, role } = first.data();
      const batch = writeBatch(db);
      batch.set(doc(db, P.member(businessId, uid)), { uid, role, email, createdAt: serverTimestamp() });
      batch.set(doc(db, P.user(uid)), { businessId, email, updatedAt: serverTimestamp() }, { merge: true });
      batch.set(first.ref, { status: "accepted", acceptedBy: uid }, { merge: true });
      await batch.commit();
      return businessId;
    }
  }
  return null;
}

/** Attach live listeners for a tenant and hydrate the store. Returns a stop fn. */
export function attach(bid: string, uid: string, fallbackUser: { name: string; email: string }): () => void {
  detach();
  currentBid = bid;
  const db = firestore();
  const strip = <T,>(d: Record<string, unknown>): T => { const { updatedAt, ...rest } = d; void updatedAt; return rest as T; };

  subs.push(onSnapshot(doc(db, P.business(bid)), (snap) => {
    if (snap.exists()) useStore.setState({ business: strip<Business>({ ...snap.data(), id: snap.id, createdAt: toISO(snap.data().createdAt) }) });
  }));
  subs.push(onSnapshot(doc(db, `${P.business(bid)}/meta/subscription`), (snap) => {
    if (snap.exists()) useStore.setState({ subscription: strip<Subscription>(snap.data()) });
  }));
  subs.push(onSnapshot(doc(db, P.member(bid, uid)), (snap) => {
    const d = snap.data();
    useStore.setState({ user: { id: uid, businessId: bid, name: d?.name ?? fallbackUser.name, email: d?.email ?? fallbackUser.email, role: d?.role ?? "owner" } });
  }));
  (Object.keys(COLLECTIONS) as StoreCollectionKey[]).forEach((key) => {
    subs.push(onSnapshot(collection(db, P.col(bid, COLLECTIONS[key])), (snap) => {
      const rows = snap.docs.map((d) => strip<Record<string, unknown>>({ ...d.data(), id: d.id }));
      rows.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
      // Don't clobber local rows that haven't been pushed yet
      const pending = new Set(useStore.getState().pendingOps.map((o) => (o.payload as { id?: string }).id));
      const local = (useStore.getState()[key] as unknown as { id: string }[]).filter((r) => pending.has(r.id) && !snap.docs.some((d) => d.id === r.id));
      useStore.setState({ [key]: [...local, ...rows] } as never);
    }));
  });

  syncBridge.onPendingOps = () => void drain();
  syncBridge.onBusinessUpdated = (b) => void updateBusinessDoc(b);
  void drain();
  const timer = setInterval(drain, 15_000);
  const onOnline = () => void drain();
  window.addEventListener("online", onOnline);
  return () => { clearInterval(timer); window.removeEventListener("online", onOnline); detach(); };
}

export function detach() {
  subs.forEach((u) => u());
  subs = [];
  currentBid = null;
  syncBridge.onPendingOps = undefined;
  syncBridge.onBusinessUpdated = undefined;
}

export async function removeDoc(bid: string, col: string, id: string) {
  await deleteDoc(doc(firestore(), P.col(bid, col), id));
}

function toISO(v: unknown): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return v;
  const ts = v as { toDate?: () => Date };
  return ts.toDate ? ts.toDate().toISOString() : new Date().toISOString();
}
