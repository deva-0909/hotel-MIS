import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateGuest, uploadGuestDocument } from "@/app/actions/guests";
import { Card, CardHeader, Badge, Input, Label, Select, Textarea, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DocumentViewButton, DeleteDocumentButton } from "./guest-actions";

const DOCUMENT_TYPES = [
  ["id_proof", "ID proof"],
  ["passport", "Passport"],
  ["visa", "Visa"],
  ["other", "Other"],
] as const;

export default async function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: guest } = await supabase.from("guests").select("*").eq("id", id).maybeSingle();
  if (!guest) notFound();

  const [{ data: documents }, { data: reservations }] = await Promise.all([
    supabase.from("guest_documents").select("id, document_type, file_name, file_path, uploaded_at").eq("guest_id", id).order("uploaded_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("id, reservation_number, check_in_date, check_out_date, status, properties(name)")
      .eq("guest_id", id)
      .order("check_in_date", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">{guest.full_name}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Profile & KYC" />
          <form action={updateGuest.bind(null, id)} className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
            <div>
              <Label>Full name</Label>
              <Input name="full_name" defaultValue={guest.full_name} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" defaultValue={guest.phone ?? ""} />
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" defaultValue={guest.email ?? ""} />
            </div>
            <div>
              <Label>Nationality</Label>
              <Input name="nationality" defaultValue={guest.nationality ?? ""} />
            </div>
            <div>
              <Label>ID proof type</Label>
              <Input name="id_proof_type" defaultValue={guest.id_proof_type ?? ""} placeholder="Aadhaar / Driving licence / other" />
            </div>
            <div>
              <Label>ID proof number</Label>
              <Input name="id_proof_number" defaultValue={guest.id_proof_number ?? ""} />
            </div>
            <div>
              <Label>Passport number</Label>
              <Input name="passport_number" defaultValue={guest.passport_number ?? ""} />
            </div>
            <div>
              <Label>Passport issuing country</Label>
              <Input name="passport_country" defaultValue={guest.passport_country ?? ""} />
            </div>
            <div>
              <Label>Passport expiry</Label>
              <Input name="passport_expiry" type="date" defaultValue={guest.passport_expiry ?? ""} />
            </div>
            <div>
              <Label>Visa number</Label>
              <Input name="visa_number" defaultValue={guest.visa_number ?? ""} />
            </div>
            <div>
              <Label>Visa expiry</Label>
              <Input name="visa_expiry" type="date" defaultValue={guest.visa_expiry ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input name="address" defaultValue={guest.address ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <Label>Preferences</Label>
              <Textarea name="preferences" rows={2} defaultValue={guest.preferences ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton variant="secondary">Save profile</SubmitButton>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Documents" />
            {!documents?.length ? (
              <EmptyState>No documents uploaded.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between px-5 py-2 text-sm">
                    <div>
                      <div className="text-gray-800">{doc.file_name}</div>
                      <div className="text-xs text-gray-400 capitalize">{doc.document_type.replace(/_/g, " ")}</div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <DocumentViewButton filePath={doc.file_path} />
                      <DeleteDocumentButton documentId={doc.id} guestId={id} filePath={doc.file_path} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form action={uploadGuestDocument.bind(null, id)} className="space-y-2 border-t border-gray-100 px-5 py-4">
              <div>
                <Label>Document type</Label>
                <Select name="document_type" defaultValue="id_proof">
                  {DOCUMENT_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>File (scan/photo, max 10MB)</Label>
                <input type="file" name="file" required className="block w-full text-sm text-gray-700" />
              </div>
              <SubmitButton variant="secondary">Upload</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title="Stay history" />
            {!reservations?.length ? (
              <EmptyState>No stays yet.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {reservations.map((r) => (
                  <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between px-5 py-2 text-sm hover:bg-gray-50">
                    <div>
                      <div className="text-gray-800">{r.reservation_number}</div>
                      <div className="text-xs text-gray-400">
                        {r.properties?.name} · {r.check_in_date} → {r.check_out_date}
                      </div>
                    </div>
                    <Badge color="gray">{r.status.replace(/_/g, " ")}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
