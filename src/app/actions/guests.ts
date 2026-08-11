"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";

export async function updateGuest(guestId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("guests")
    .update({
      full_name: String(formData.get("full_name")),
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      id_proof_type: (formData.get("id_proof_type") as string) || null,
      id_proof_number: (formData.get("id_proof_number") as string) || null,
      address: (formData.get("address") as string) || null,
      preferences: (formData.get("preferences") as string) || null,
      nationality: (formData.get("nationality") as string) || null,
      passport_number: (formData.get("passport_number") as string) || null,
      passport_country: (formData.get("passport_country") as string) || null,
      passport_expiry: (formData.get("passport_expiry") as string) || null,
      visa_number: (formData.get("visa_number") as string) || null,
      visa_expiry: (formData.get("visa_expiry") as string) || null,
    })
    .eq("id", guestId);
  if (error) throw new Error(error.message);
  revalidatePath(`/guests/${guestId}`);
}

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export async function uploadGuestDocument(guestId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const file = formData.get("file") as File | null;
  const documentType = String(formData.get("document_type") || "other");
  if (!file || file.size === 0) throw new Error("Select a file to upload");
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error("File is too large (max 10MB)");

  const path = `${guestId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadError } = await supabase.storage.from("guest-documents").upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from("guest_documents").insert({
    guest_id: guestId,
    document_type: documentType,
    file_path: path,
    file_name: file.name,
    uploaded_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/guests/${guestId}`);
}

export async function getGuestDocumentUrl(filePath: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.storage.from("guest-documents").createSignedUrl(filePath, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function getSignatureUrl(filePath: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.storage.from("guest-signatures").createSignedUrl(filePath, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteGuestDocument(documentId: string, guestId: string, filePath: string) {
  const { supabase } = await requireUser();
  await supabase.storage.from("guest-documents").remove([filePath]);
  const { error } = await supabase.from("guest_documents").delete().eq("id", documentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/guests/${guestId}`);
}
