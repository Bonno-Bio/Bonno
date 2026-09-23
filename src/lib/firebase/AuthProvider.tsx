"use client";
/**
 * AuthProvider — wraps the app, tracks the Firebase user, and wires the
 * sync engine to whichever business that user belongs to.
 *
 * In LOCAL MODE (no Firebase env) it is a no-op and the app behaves exactly
 * as before (browser-only data, "demo" experience).
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signInWithPopup, signOut as fbSignOut, updateProfile, type User as FbUser,
} from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "./client";
import { attach, createBusinessDocs, detach, findBusinessForUser } from "./sync";
import { syncBridge } from "./bridge";
import { useStore } from "../store";

interface AuthCtx {
  mode: "firebase" | "local";
  ready: boolean;
  fbUser: FbUser | null;
  /** business id resolved for this user (null = needs to register a business) */
  businessId: string | null | undefined;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fbUser, setFbUser] = useState<FbUser | null>(null);
  const [ready, setReady] = useState(!isFirebaseConfigured);
  const [businessId, setBusinessId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onAuthStateChanged(firebaseAuth(), async (u) => {
      setFbUser(u);
      if (!u) { detach(); setBusinessId(null); useStore.getState().signOut(); setReady(true); return; }
      const bid = await findBusinessForUser(u.uid, u.email);
      setBusinessId(bid);
      setReady(true);
    });
    return unsub;
  }, []);

  // Attach sync once we know user + business
  useEffect(() => {
    if (!isFirebaseConfigured || !fbUser || !businessId) return;
    const stop = attach(businessId, fbUser.uid, { name: fbUser.displayName ?? fbUser.email ?? "Owner", email: fbUser.email ?? "" });
    return stop;
  }, [fbUser, businessId]);

  // When a business is registered locally, create it in Firestore and attach
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    syncBridge.onBusinessCreated = async (b, u, s) => {
      const cu = firebaseAuth().currentUser;
      if (!cu) return;
      await createBusinessDocs(cu.uid, b, u, s);
      setBusinessId(b.id);
    };
    return () => { syncBridge.onBusinessCreated = undefined; };
  }, []);

  const value: AuthCtx = {
    mode: isFirebaseConfigured ? "firebase" : "local",
    ready, fbUser, businessId,
    signInEmail: async (e, p) => { await signInWithEmailAndPassword(firebaseAuth(), e, p); },
    signUpEmail: async (name, e, p) => {
      const cred = await createUserWithEmailAndPassword(firebaseAuth(), e, p);
      await updateProfile(cred.user, { displayName: name });
    },
    signInGoogle: async () => { await signInWithPopup(firebaseAuth(), new GoogleAuthProvider()); },
    resetPassword: async (e) => { await sendPasswordResetEmail(firebaseAuth(), e); },
    signOut: async () => { if (isFirebaseConfigured) await fbSignOut(firebaseAuth()); detach(); useStore.getState().signOut(); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
