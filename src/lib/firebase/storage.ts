"use client";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { firebaseStorage } from "./client";
import { uid } from "../utils";

export async function uploadBusinessDocument(businessId: string, file: File): Promise<{ url: string; storagePath: string }> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `businesses/${businessId}/documents/${Date.now()}_${uid()}_${safe}`;
  const object = ref(firebaseStorage(), storagePath);
  await uploadBytes(object, file, { contentType: file.type || "application/octet-stream" });
  return { url: await getDownloadURL(object), storagePath };
}
