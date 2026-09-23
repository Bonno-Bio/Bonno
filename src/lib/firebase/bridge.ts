/**
 * Tiny event bridge so the store can notify the sync engine without a
 * circular import (store → bridge ← sync).
 */
import type { Business, Subscription, User } from "../types";

export const syncBridge: {
  onBusinessCreated?: (b: Business, u: User, s: Subscription) => Promise<void> | void;
  onPendingOps?: () => void;
  onBusinessUpdated?: (b: Business) => void;
} = {};
