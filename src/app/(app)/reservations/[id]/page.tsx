import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { formatMoney } from "@/lib/format-money";
import { formatDateTime } from "@/lib/format-datetime";
import { addMiscCharge, collectDeposit, transferFolioCharge } from "@/app/actions/hotel";
import { addOccupant } from "@/app/actions/occupants";
import { Card, CardHeader, Badge, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { parseBookingPolicy, computeDepositAmount } from "@/lib/booking-policy";
import { ChangeRoomForm, ReservationLifecycleActions, ViewSignatureLink } from "./reservation-actions";
import { TransferPropertyForm } from "./transfer-form";
import { RemoveOccupantButton } from "./occupant-actions";

const STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red" | "purple"> = {
  confirmed: "purple",
  checked_in: "blue",
  checked_out: "green",
  cancelled: "gray",
  no_show: "red",
};

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "id, reservation_number, check_in_date, check_out_date, actual_check_in_at, actual_check_out_at, early_checkin, late_checkout, signature_path, adults, children, rate_per_night, status, notes, special_requests, guest_id, room_id, room_type_id, booking_id, property_id, guests(id, full_name, phone, email, preferences), rooms(id, room_number), room_types(name), bookings(booking_number), properties(currency, booking_policy)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!reservation) notFound();

  const [{ data: charges }, { data: changeableRooms }, { data: invoices }, { data: otherProperties }, { data: occupants }] = await Promise.all([
    supabase.from("folio_charges").select("id, charge_type, description, amount, created_at").eq("reservation_id", id).order("created_at"),
    supabase
      .from("rooms")
      .select("id, room_number, room_type_id, room_types(name, base_rate)")
      .eq("property_id", reservation.property_id)
      .or(`status.in.(available,dirty)${reservation.room_id ? `,id.eq.${reservation.room_id}` : ""}`)
      .order("room_number"),
    supabase.from("invoices").select("id, invoice_number, status, total_amount, amount_paid").eq("reservation_id", id).neq("status", "cancelled"),
    reservation.status === "checked_in"
      ? supabase.from("properties").select("id, name").eq("is_active", true).neq("id", reservation.property_id).order("name")
      : Promise.resolve({ data: [] }),
    supabase.from("reservation_occupants").select("id, full_name, age_category, id_proof_type, id_proof_number").eq("reservation_id", id).order("created_at"),
  ]);

  const [{ data: transferTargets }, { data: invoicedCharges }] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, reservation_number, rooms(room_number)")
      .eq("property_id", reservation.property_id)
      .neq("id", id)
      .in("status", ["confirmed", "checked_in"])
      .order("reservation_number"),
    charges?.length
      ? supabase.from("invoice_line_items").select("source_id").eq("source_table", "folio_charges").in("source_id", charges.map((c) => c.id))
      : Promise.resolve({ data: [] }),
  ]);
  const invoicedChargeIds = new Set((invoicedCharges ?? []).map((li) => li.source_id));

  const total = charges?.reduce((sum, c) => sum + Number(c.amount), 0) ?? 0;
  const currency = reservation.properties?.currency ?? org.currency;
  const bookingPolicy = parseBookingPolicy(reservation.properties?.booking_policy);
  const nights = Math.max(
    1,
    Math.round((new Date(reservation.check_out_date).getTime() - new Date(reservation.check_in_date).getTime()) / 86400000),
  );
  const depositRequired = computeDepositAmount(bookingPolicy, reservation.rate_per_night, nights);
  const depositCollected = (invoices ?? []).reduce((sum, inv) => sum + Number(inv.amount_paid), 0);
  const showDeposit = bookingPolicy.deposit_type !== "none" && (reservation.status === "confirmed" || reservation.status === "checked_in");

  let transferOptions: { id: string; name: string; roomTypes: { id: string; name: string; base_rate: number }[]; rooms: { id: string; room_number: string; room_type_id: string }[] }[] = [];
  if (otherProperties?.length) {
    const propertyIds = otherProperties.map((p) => p.id);
    const [{ data: allRoomTypes }, { data: allRooms }] = await Promise.all([
      supabase.from("room_types").select("id, name, base_rate, property_id").in("property_id", propertyIds),
      supabase.from("rooms").select("id, room_number, room_type_id, property_id").in("property_id", propertyIds).in("status", ["available", "dirty"]),
    ]);
    transferOptions = otherProperties.map((p) => ({
      id: p.id,
      name: p.name,
      roomTypes: (allRoomTypes ?? []).filter((t) => t.property_id === p.id),
      rooms: (allRooms ?? []).filter((r) => r.property_id === p.id),
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{reservation.reservation_number}</h1>
            <Badge color={STATUS_COLOR[reservation.status]}>{reservation.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {reservation.guests?.full_name} · {reservation.room_types?.name} · {reservation.check_in_date} → {reservation.check_out_date}
            {reservation.bookings && (
              <>
                {" · "}
                <Link href={`/bookings/${reservation.booking_id}`} className="text-accent hover:underline">
                  {reservation.bookings.booking_number}
                </Link>
              </>
            )}
          </p>
        </div>
        <ReservationLifecycleActions reservationId={reservation.id} status={reservation.status} hasRoom={!!reservation.room_id} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Stay details" />
            <div className="grid grid-cols-2 gap-4 px-5 py-4 text-sm">
              <div>
                <div className="text-xs text-gray-400">Guest</div>
                <div className="text-gray-800">{reservation.guests?.full_name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Contact</div>
                <div className="text-gray-800">{reservation.guests?.phone ?? reservation.guests?.email ?? "—"}</div>
              </div>
              {reservation.guests?.preferences && (
                <div>
                  <div className="text-xs text-gray-400">Guest preferences</div>
                  <div className="text-gray-800">{reservation.guests.preferences}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-400">Room</div>
                <div className="text-gray-800">{reservation.rooms ? reservation.rooms.room_number : "Unassigned"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Occupancy</div>
                <div className="text-gray-800">
                  {reservation.adults} adult{reservation.adults === 1 ? "" : "s"}
                  {reservation.children ? `, ${reservation.children} child(ren)` : ""}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Rate/night</div>
                <div className="text-gray-800">{formatMoney(reservation.rate_per_night, currency)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Actual check-in / out</div>
                <div className="text-gray-800">
                  {reservation.actual_check_in_at ? formatDateTime(reservation.actual_check_in_at, org.timezone) : "—"}
                  {reservation.early_checkin && <Badge color="amber">Early check-in</Badge>}
                  {" / "}
                  {reservation.actual_check_out_at ? formatDateTime(reservation.actual_check_out_at, org.timezone) : "—"}
                  {reservation.late_checkout && <Badge color="amber">Late checkout</Badge>}
                </div>
              </div>
              {reservation.signature_path && (
                <div>
                  <div className="text-xs text-gray-400">Signature</div>
                  <ViewSignatureLink filePath={reservation.signature_path} />
                </div>
              )}
              {reservation.special_requests && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-400">Special requests</div>
                  <div className="text-amber-700">{reservation.special_requests}</div>
                </div>
              )}
              {reservation.notes && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-400">Notes</div>
                  <div className="text-gray-800">{reservation.notes}</div>
                </div>
              )}
            </div>
          </Card>

          {(reservation.status === "confirmed" || reservation.status === "checked_in") && (
            <Card>
              <CardHeader title={reservation.room_id ? "Change room / move dates" : "Assign room"} />
              <div className="px-5 py-4">
                <ChangeRoomForm
                  reservationId={reservation.id}
                  rooms={changeableRooms ?? []}
                  currentRoomId={reservation.room_id}
                  currentRoomTypeId={reservation.room_type_id}
                  currentRate={reservation.rate_per_night}
                  checkInDate={reservation.check_in_date}
                  checkOutDate={reservation.check_out_date}
                  currency={currency}
                />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title={`Folio charges — total ${formatMoney(total, currency)}`} />
            {!charges?.length ? (
              <EmptyState>No charges posted yet.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                    <th className="px-5 py-2 font-medium">Description</th>
                    <th className="px-5 py-2 font-medium">Type</th>
                    <th className="px-5 py-2 font-medium">Amount</th>
                    {!!transferTargets?.length && <th className="px-5 py-2 font-medium">Transfer to</th>}
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5 text-gray-800">{c.description}</td>
                      <td className="px-5 py-2.5 capitalize text-gray-500">{c.charge_type}</td>
                      <td className="px-5 py-2.5 text-gray-800">{formatMoney(c.amount, currency)}</td>
                      {!!transferTargets?.length && (
                        <td className="px-5 py-2.5">
                          {invoicedChargeIds.has(c.id) ? (
                            <span className="text-xs text-gray-400">Invoiced</span>
                          ) : (
                            <form action={transferFolioCharge.bind(null, c.id)} className="flex items-center gap-1">
                              <Select name="target_reservation_id" className="w-32 text-xs">
                                <option value="">Select…</option>
                                {transferTargets.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.rooms?.room_number ?? t.reservation_number}
                                  </option>
                                ))}
                              </Select>
                              <button type="submit" className="text-xs text-accent hover:underline">
                                Go
                              </button>
                            </form>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <form action={addMiscCharge.bind(null, reservation.id)} className="flex items-end gap-2 border-t border-gray-100 px-5 py-4">
              <div className="flex-1">
                <Label>Add charge — description</Label>
                <Input name="description" required placeholder="e.g. Laundry service" />
              </div>
              <div className="w-32">
                <Label>Amount</Label>
                <Input name="amount" type="number" min={0} step="0.01" required />
              </div>
              <SubmitButton variant="secondary">Add</SubmitButton>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Invoices" />
            {!invoices?.length ? (
              <EmptyState>No invoice generated yet.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/billing/invoices/${inv.id}`}
                    className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium text-slate-900">{inv.invoice_number}</span>
                    <span className="text-gray-500">{formatMoney(inv.total_amount, currency)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {showDeposit && (
            <Card>
              <CardHeader title="Deposit" />
              <div className="space-y-1 px-5 pt-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Required</span>
                  <span>{formatMoney(depositRequired, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Collected</span>
                  <span>{formatMoney(depositCollected, currency)}</span>
                </div>
              </div>
              {depositCollected < depositRequired && (
                <form action={collectDeposit.bind(null, reservation.id)} className="space-y-2 border-t border-gray-100 px-5 py-4">
                  <div>
                    <Label>Amount</Label>
                    <Input
                      name="amount"
                      type="number"
                      min={0.01}
                      step="0.01"
                      defaultValue={(depositRequired - depositCollected).toFixed(2)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Method</Label>
                    <Select name="method" defaultValue="cash">
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank transfer</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>
                  <SubmitButton variant="secondary">Collect deposit</SubmitButton>
                </form>
              )}
            </Card>
          )}

          {reservation.status === "checked_in" && transferOptions.length > 0 && (
            <Card>
              <CardHeader title="Transfer to another property" />
              <TransferPropertyForm reservationId={reservation.id} properties={transferOptions} currency={currency} />
            </Card>
          )}

          <Card>
            <CardHeader title={`Room occupants (${occupants?.length ?? 0})`} />
            <p className="px-5 pt-3 text-xs text-gray-500">
              Every adult staying in this room, beyond the booking guest — for KYC/registration records.
            </p>
            {!occupants?.length ? (
              <EmptyState>No additional occupants recorded.</EmptyState>
            ) : (
              <div className="divide-y divide-gray-50">
                {occupants.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-5 py-2 text-sm">
                    <div>
                      <div className="text-gray-800">{o.full_name}</div>
                      <div className="text-xs capitalize text-gray-400">
                        {o.age_category}
                        {o.id_proof_type ? ` · ${o.id_proof_type} ${o.id_proof_number ?? ""}` : ""}
                      </div>
                    </div>
                    <RemoveOccupantButton occupantId={o.id} reservationId={reservation.id} />
                  </div>
                ))}
              </div>
            )}
            <form action={addOccupant.bind(null, reservation.id)} className="space-y-2 border-t border-gray-100 px-5 py-4">
              <div>
                <Label>Full name</Label>
                <Input name="full_name" required />
              </div>
              <div>
                <Label>Type</Label>
                <Select name="age_category" defaultValue="adult">
                  <option value="adult">Adult</option>
                  <option value="child">Child</option>
                </Select>
              </div>
              <div>
                <Label>ID proof type</Label>
                <Input name="id_proof_type" />
              </div>
              <div>
                <Label>ID proof number</Label>
                <Input name="id_proof_number" />
              </div>
              <SubmitButton variant="secondary">Add occupant</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
