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
      room_preferences: (formData.get("room_preferences") as string) || null,
      food_preferences: (formData.get("food_preferences") as string) || null,
      date_of_birth: (formData.get("date_of_birth") as string) || null,
      anniversary_date: (formData.get("anniversary_date") as string) || null,
      company_id: (formData.get("company_id") as string) || null,
    })
    .eq("id", guestId);
  if (error) throw new Error(error.message);
  revalidatePath(`/guests/${guestId}`);
}

export async function updateGuestConsent(guestId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("guests")
    .update({
      consent_marketing: formData.get("consent_marketing") === "on",
      consent_email: formData.get("consent_email") === "on",
      consent_sms: formData.get("consent_sms") === "on",
      consent_call: formData.get("consent_call") === "on",
      consent_updated_at: new Date().toISOString(),
    })
    .eq("id", guestId);
  if (error) throw new Error(error.message);
  revalidatePath(`/guests/${guestId}`);
}

export async function searchGuestsByQuery(query: string, excludeGuestId: string) {
  const { supabase } = await requireUser();
  // Strip characters that are syntax in PostgREST's .or() filter string
  // (comma separates clauses, parens group them) so a search term
  // containing one can't reshape the filter instead of just matching text.
  const safe = query.trim().replace(/[,()]/g, "");
  if (!safe) return [];
  const { data, error } = await supabase
    .from("guests")
    .select("id, full_name, phone, email")
    .neq("id", excludeGuestId)
    .or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`)
    .limit(10);
  if (error) throw new Error(error.message);
  return data;
}

export async function mergeGuestProfiles(targetGuestId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const sourceGuestId = String(formData.get("source_guest_id"));
  if (!sourceGuestId) throw new Error("Select the duplicate profile to merge in");
  const { error } = await supabase.rpc("merge_guest_profiles", {
    p_source_guest_id: sourceGuestId,
    p_target_guest_id: targetGuestId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/guests/${targetGuestId}`);
  revalidatePath("/guests");
}

export async function createGuestRequest(guestId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("guest_requests").insert({
    guest_id: guestId,
    reservation_id: (formData.get("reservation_id") as string) || null,
    request_type: String(formData.get("request_type") || "service_request"),
    priority: String(formData.get("priority") || "medium"),
    description: String(formData.get("description")),
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/guests/${guestId}`);
}

export async function updateGuestRequestStatus(requestId: string, guestId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const status = String(formData.get("status"));
  const { error } = await supabase
    .from("guest_requests")
    .update({
      status,
      resolution_notes: (formData.get("resolution_notes") as string) || null,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
      resolved_by: status === "resolved" ? user.id : null,
    })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath(`/guests/${guestId}`);
}

export async function createGuestFeedback(guestId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const rating = formData.get("rating") as string;
  const { error } = await supabase.from("guest_feedback").insert({
    guest_id: guestId,
    reservation_id: (formData.get("reservation_id") as string) || null,
    rating: rating ? Number(rating) : null,
    category: (formData.get("category") as string) || null,
    comments: (formData.get("comments") as string) || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/guests/${guestId}`);
}

export async function logGuestCommunication(guestId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("guest_communications").insert({
    guest_id: guestId,
    channel: String(formData.get("channel") || "other"),
    direction: String(formData.get("direction") || "outbound"),
    subject: (formData.get("subject") as string) || null,
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  });
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
