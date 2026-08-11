import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { formatMoney } from "@/lib/format-money";
import { formatDate, formatDateTime } from "@/lib/format-datetime";
import {
  updateGuest,
  updateGuestConsent,
  uploadGuestDocument,
  createGuestRequest,
  createGuestFeedback,
  logGuestCommunication,
} from "@/app/actions/guests";
import { Card, CardHeader, Badge, Input, Label, Select, Textarea, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DocumentViewButton, DeleteDocumentButton } from "./guest-actions";
import { MergeGuestForm, RequestStatusForm } from "./guest-360-actions";

const DOCUMENT_TYPES = [
  ["id_proof", "ID proof"],
  ["passport", "Passport"],
  ["visa", "Visa"],
  ["other", "Other"],
] as const;

const RESERVATION_STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red" | "purple"> = {
  confirmed: "purple",
  checked_in: "blue",
  checked_out: "green",
  cancelled: "gray",
  no_show: "red",
};

const TIER_COLOR: Record<string, "gold" | "gray" | "blue" | "purple"> = {
  platinum: "gold",
  gold: "gold",
  silver: "blue",
  member: "gray",
};

export default async function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: guest } = await supabase.from("guests").select("*, companies(name, gstin)").eq("id", id).maybeSingle();
  if (!guest) notFound();

  const [
    { data: documents },
    { data: reservations },
    { data: orders },
    { data: requests },
    { data: feedback },
    { data: communications },
    { data: invoices },
    { data: companies },
  ] = await Promise.all([
    supabase.from("guest_documents").select("id, document_type, file_name, file_path, uploaded_at").eq("guest_id", id).order("uploaded_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("id, reservation_number, check_in_date, check_out_date, status, rate_per_night, properties(name, currency), rooms(room_number), room_types(name)")
      .eq("guest_id", id)
      .order("check_in_date", { ascending: false })
      .limit(100),
    supabase
      .from("orders")
      .select("id, order_number, order_type, status, created_at, properties(name), order_items(quantity, unit_price)")
      .eq("guest_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("guest_requests")
      .select("id, request_type, description, priority, status, resolution_notes, created_at, properties(name)")
      .eq("guest_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("guest_feedback").select("id, rating, category, comments, created_at").eq("guest_id", id).order("created_at", { ascending: false }),
    supabase
      .from("guest_communications")
      .select("id, channel, direction, subject, notes, created_at")
      .eq("guest_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("invoices").select("id, invoice_number, status, total_amount, amount_paid, refunded_amount").eq("guest_id", id).neq("status", "cancelled"),
    supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const currentStay = reservations?.find((r) => r.status === "checked_in");
  const upcoming = (reservations ?? []).filter((r) => r.status === "confirmed" && r.check_in_date >= today);
  const pastStays = (reservations ?? []).filter((r) => r.status === "checked_out");
  const noShows = (reservations ?? []).filter((r) => r.status === "no_show");

  const totalSpend = (invoices ?? []).reduce((sum, i) => sum + Number(i.total_amount), 0);
  const totalPaid = (invoices ?? []).reduce((sum, i) => sum + Number(i.amount_paid), 0);
  const totalRefunded = (invoices ?? []).reduce((sum, i) => sum + Number(i.refunded_amount), 0);

  const openRequests = (requests ?? []).filter((r) => r.status !== "resolved").length;
  const avgRating = feedback?.length ? (feedback.reduce((sum, f) => sum + (f.rating ?? 0), 0) / feedback.filter((f) => f.rating != null).length).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{guest.full_name}</h1>
            {guest.loyalty_tier && <Badge color={TIER_COLOR[guest.loyalty_tier] ?? "gray"}>{guest.loyalty_tier}</Badge>}
            {guest.companies && <Badge color="blue">{guest.companies.name}</Badge>}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {guest.phone ?? "—"} {guest.email ? `· ${guest.email}` : ""} · Member since {formatDate(guest.created_at, org.timezone)} ·{" "}
            {guest.loyalty_points} loyalty points
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-4">
          <div className="text-xs text-gray-400">Total spend</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{formatMoney(totalSpend, org.currency)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-400">Stays</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{pastStays.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-400">No-shows</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{noShows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-400">Open requests</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{openRequests}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-400">Avg. feedback rating</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{avgRating ?? "—"}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {currentStay && (
            <Card>
              <CardHeader title="Current stay" />
              <div className="px-5 py-3 text-sm">
                <Link href={`/reservations/${currentStay.id}`} className="font-medium text-slate-900 hover:underline">
                  {currentStay.reservation_number}
                </Link>{" "}
                <span className="text-gray-500">
                  · {currentStay.properties?.name} · {currentStay.rooms?.room_number ?? "Unassigned"} ({currentStay.room_types?.name}) ·{" "}
                  {currentStay.check_in_date} → {currentStay.check_out_date}
                </span>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title={`Upcoming reservations (${upcoming.length})`} />
            {!upcoming.length ? (
              <EmptyState>No upcoming reservations.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcoming.map((r) => (
                  <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between px-5 py-2 text-sm hover:bg-gray-50">
                    <div>
                      <div className="text-gray-800">{r.reservation_number}</div>
                      <div className="text-xs text-gray-400">
                        {r.properties?.name} · {r.check_in_date} → {r.check_out_date}
                      </div>
                    </div>
                    <Badge color={RESERVATION_STATUS_COLOR[r.status]}>{r.status.replace(/_/g, " ")}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={`Stay history — past (${pastStays.length}) · no-shows (${noShows.length})`} />
            {!pastStays.length && !noShows.length ? (
              <EmptyState>No past stays yet.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {[...pastStays, ...noShows].map((r) => (
                  <Link key={r.id} href={`/reservations/${r.id}`} className="flex items-center justify-between px-5 py-2 text-sm hover:bg-gray-50">
                    <div>
                      <div className="text-gray-800">{r.reservation_number}</div>
                      <div className="text-xs text-gray-400">
                        {r.properties?.name} · {r.check_in_date} → {r.check_out_date}
                      </div>
                    </div>
                    <Badge color={RESERVATION_STATUS_COLOR[r.status]}>{r.status.replace(/_/g, " ")}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={`Restaurant visits (${orders?.length ?? 0})`} />
            {!orders?.length ? (
              <EmptyState>No restaurant orders yet.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.map((o) => {
                  const total = (o.order_items ?? []).reduce((sum, li) => sum + li.quantity * Number(li.unit_price), 0);
                  return (
                    <div key={o.id} className="flex items-center justify-between px-5 py-2 text-sm">
                      <div>
                        <div className="text-gray-800">{o.order_number}</div>
                        <div className="text-xs text-gray-400">
                          {o.properties?.name} · {o.order_type.replace(/_/g, " ")} · {formatDateTime(o.created_at, org.timezone)}
                        </div>
                      </div>
                      <span className="text-gray-600">{formatMoney(total, org.currency)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={`Complaints & service requests (${requests?.length ?? 0})`} />
            {!requests?.length ? (
              <EmptyState>None recorded.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {requests.map((r) => (
                  <div key={r.id} className="px-5 py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 capitalize">{r.request_type.replace(/_/g, " ")}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge color={r.priority === "high" ? "red" : r.priority === "low" ? "gray" : "amber"}>{r.priority}</Badge>
                        <Badge color={r.status === "resolved" ? "green" : r.status === "in_progress" ? "blue" : "gray"}>
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-1 text-gray-700">{r.description}</p>
                    {r.resolution_notes && <p className="mt-1 text-xs text-emerald-700">Resolved: {r.resolution_notes}</p>}
                    <div className="mt-1 text-xs text-gray-400">
                      {r.properties?.name} · {formatDateTime(r.created_at, org.timezone)}
                    </div>
                    <RequestStatusForm requestId={r.id} guestId={id} currentStatus={r.status} />
                  </div>
                ))}
              </div>
            )}
            <form action={createGuestRequest.bind(null, id)} className="space-y-2 border-t border-gray-100 px-5 py-4">
              <div className="flex gap-2">
                <Select name="request_type" defaultValue="service_request" className="flex-1">
                  <option value="service_request">Service request</option>
                  <option value="complaint">Complaint</option>
                </Select>
                <Select name="priority" defaultValue="medium" className="flex-1">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
              <Textarea name="description" rows={2} required placeholder="What happened / what's needed" />
              <SubmitButton variant="secondary">Log</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title={`Feedback (${feedback?.length ?? 0})`} />
            {!feedback?.length ? (
              <EmptyState>No feedback recorded.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {feedback.map((f) => (
                  <div key={f.id} className="px-5 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      {f.rating && <Badge color={f.rating >= 4 ? "green" : f.rating === 3 ? "amber" : "red"}>{f.rating}/5</Badge>}
                      {f.category && <span className="text-xs text-gray-400">{f.category}</span>}
                    </div>
                    {f.comments && <p className="mt-1 text-gray-700">{f.comments}</p>}
                    <div className="mt-1 text-xs text-gray-400">{formatDateTime(f.created_at, org.timezone)}</div>
                  </div>
                ))}
              </div>
            )}
            <form action={createGuestFeedback.bind(null, id)} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
              <div className="w-24">
                <Label>Rating</Label>
                <Select name="rating" defaultValue="">
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-32">
                <Label>Category</Label>
                <Input name="category" placeholder="e.g. Housekeeping" />
              </div>
              <div className="flex-1">
                <Label>Comments</Label>
                <Input name="comments" />
              </div>
              <SubmitButton variant="secondary">Add</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title={`Communication history (${communications?.length ?? 0})`} />
            {!communications?.length ? (
              <EmptyState>No communications logged.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {communications.map((c) => (
                  <div key={c.id} className="px-5 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge color="gray">{c.channel}</Badge>
                      <span className="text-xs text-gray-400 capitalize">{c.direction}</span>
                      {c.subject && <span className="text-gray-800">{c.subject}</span>}
                    </div>
                    {c.notes && <p className="mt-1 text-gray-600">{c.notes}</p>}
                    <div className="mt-1 text-xs text-gray-400">{formatDateTime(c.created_at, org.timezone)}</div>
                  </div>
                ))}
              </div>
            )}
            <form action={logGuestCommunication.bind(null, id)} className="space-y-2 border-t border-gray-100 px-5 py-4">
              <div className="flex gap-2">
                <Select name="channel" defaultValue="email" className="flex-1">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="call">Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="in_person">In person</option>
                  <option value="other">Other</option>
                </Select>
                <Select name="direction" defaultValue="outbound" className="flex-1">
                  <option value="outbound">Outbound</option>
                  <option value="inbound">Inbound</option>
                </Select>
              </div>
              <Input name="subject" placeholder="Subject" />
              <Textarea name="notes" rows={2} placeholder="Notes" />
              <SubmitButton variant="secondary">Log</SubmitButton>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Payment history" />
            <div className="space-y-1 px-5 py-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Total billed</span>
                <span>{formatMoney(totalSpend, org.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total paid</span>
                <span>{formatMoney(totalPaid, org.currency)}</span>
              </div>
              {totalRefunded > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Refunded</span>
                  <span>−{formatMoney(totalRefunded, org.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold text-gray-900">
                <span>Balance</span>
                <span>{formatMoney(totalSpend - totalPaid, org.currency)}</span>
              </div>
            </div>
            {!!invoices?.length && (
              <div className="max-h-40 divide-y divide-gray-50 overflow-y-auto border-t border-gray-100">
                {invoices.map((inv) => (
                  <Link key={inv.id} href={`/billing/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-1.5 text-xs hover:bg-gray-50">
                    <span className="text-slate-900">{inv.invoice_number}</span>
                    <span className="text-gray-500">{formatMoney(inv.total_amount, org.currency)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Profile, preferences & KYC" />
            <form action={updateGuest.bind(null, id)} className="grid grid-cols-1 gap-3 px-5 py-4">
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
                <Label>Date of birth</Label>
                <Input name="date_of_birth" type="date" defaultValue={guest.date_of_birth ?? ""} />
              </div>
              <div>
                <Label>Anniversary</Label>
                <Input name="anniversary_date" type="date" defaultValue={guest.anniversary_date ?? ""} />
              </div>
              <div>
                <Label>Corporate affiliation</Label>
                <Select name="company_id" defaultValue={guest.company_id ?? ""}>
                  <option value="">—</option>
                  {companies?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>ID proof type</Label>
                <Input name="id_proof_type" defaultValue={guest.id_proof_type ?? ""} />
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
              <div>
                <Label>Address</Label>
                <Input name="address" defaultValue={guest.address ?? ""} />
              </div>
              <div>
                <Label>Room preferences</Label>
                <Textarea name="room_preferences" rows={2} defaultValue={guest.room_preferences ?? ""} placeholder="e.g. high floor, away from lift, extra pillows" />
              </div>
              <div>
                <Label>Food preferences</Label>
                <Textarea name="food_preferences" rows={2} defaultValue={guest.food_preferences ?? ""} placeholder="e.g. vegetarian, no nuts" />
              </div>
              <div>
                <Label>Other notes</Label>
                <Textarea name="preferences" rows={2} defaultValue={guest.preferences ?? ""} />
              </div>
              <SubmitButton variant="secondary">Save profile</SubmitButton>
            </form>
          </Card>

          <Card>
            <CardHeader title="Consent & marketing" />
            <form action={updateGuestConsent.bind(null, id)} className="space-y-2 px-5 py-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="consent_marketing" defaultChecked={guest.consent_marketing} /> Marketing communications
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="consent_email" defaultChecked={guest.consent_email} /> Email
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="consent_sms" defaultChecked={guest.consent_sms} /> SMS
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="consent_call" defaultChecked={guest.consent_call} /> Phone calls
              </label>
              {guest.consent_updated_at && (
                <p className="text-xs text-gray-400">Last updated {formatDateTime(guest.consent_updated_at, org.timezone)}</p>
              )}
              <SubmitButton variant="secondary">Save consent</SubmitButton>
            </form>
          </Card>

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
            <CardHeader title="Merge duplicate profile" />
            <p className="px-5 pt-3 text-xs text-gray-500">
              Folds another guest record&apos;s stays, invoices, and history into this one, then deletes the duplicate.
            </p>
            <div className="px-5 py-4">
              <MergeGuestForm guestId={id} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
