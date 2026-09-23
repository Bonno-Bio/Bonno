/** Firestore layout (mirrors the tenant model: everything lives under a business). */
export const P = {
  user: (uid: string) => `users/${uid}`,
  business: (bid: string) => `businesses/${bid}`,
  member: (bid: string, uid: string) => `businesses/${bid}/members/${uid}`,
  col: (bid: string, name: string) => `businesses/${bid}/${name}`,
  billing: (bid: string, ref: string) => `businesses/${bid}/billing_payments/${ref}`,
};

/** store key → Firestore sub-collection */
export const COLLECTIONS = {
  customers: "customers",
  products: "products",
  stockMovements: "stock_movements",
  invoices: "invoices",
  payments: "payments",
  expenses: "expenses",
  auditLogs: "audit_logs",
} as const;
export type StoreCollectionKey = keyof typeof COLLECTIONS;
