"use client";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "./client";
import type { Role } from "../types";

/**
 * Team invites. An invite doc is matched by email when that person signs in
 * (see sync.findBusinessForUser). Email delivery can be added with the
 * Firebase "Trigger Email" extension on the `invites` collection.
 */
export async function createInvite(businessId: string, businessName: string, email: string, role: Role) {
  await addDoc(collection(firestore(), "invites"), {
    businessId, businessName, email: email.toLowerCase().trim(), role, status: "pending", createdAt: serverTimestamp(),
  });
}
