import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addMiscCharge } from "@/app/actions/hotel";
import { Card, CardHeader, Badge, Input, Label, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { AssignRoomControl, ReservationLifecycleActions } from "./reservation-actions";

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

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "id, reservation_number, check_in_date, check_out_date, actual_check_in_at, actual_check_out_at, adults, children, rate_per_night, status, notes, guest_id, room_id, room_type_id, guests(id, full_name, phone, email), rooms(id, room_number), room_types(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!reservation) notFound();

  const [{ data: charges }, { data: availableRooms }, { data: invoices }] = await Promise.all([
    supabase.from("folio_charges").select("id, charge_type, description, amount, created_at").eq("reservation_id", id).order("created_at"),
    reservation.room_id
      ? Promise.resolve({ data: [] })
      : supabase
          .from("rooms")
          .select("id, room_number")
          .eq("room_type_id", reservation.room_type_id)
          .in("status", ["available", "dirty"]),
    supabase.from("invoices").select("id, invoice_number, status, total_amount").eq("reservation_id", id),
  ]);

  const total = charges?.reduce((sum, c) => sum + Number(c.amount), 0) ?? 0;

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
          </p>
        </div>
        <ReservationLifecycleActions reservationId={reservation.id} status={reservation.status} />
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
              <div>
                <div className="text-xs text-gray-400">Room</div>
                {reservation.rooms ? (
                  <div className="text-gray-800">{reservation.rooms.room_number}</div>
                ) : (
                  <AssignRoomControl reservationId={reservation.id} rooms={availableRooms ?? []} />
                )}
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
                <div className="text-gray-800">₹{reservation.rate_per_night}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Actual check-in / out</div>
                <div className="text-gray-800">
                  {reservation.actual_check_in_at ? new Date(reservation.actual_check_in_at).toLocaleString() : "—"} /{" "}
                  {reservation.actual_check_out_at ? new Date(reservation.actual_check_out_at).toLocaleString() : "—"}
                </div>
              </div>
              {reservation.notes && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-400">Notes</div>
                  <div className="text-gray-800">{reservation.notes}</div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={`Folio charges — total ₹${total.toFixed(2)}`} />
            {!charges?.length ? (
              <EmptyState>No charges posted yet.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                    <th className="px-5 py-2 font-medium">Description</th>
                    <th className="px-5 py-2 font-medium">Type</th>
                    <th className="px-5 py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5 text-gray-800">{c.description}</td>
                      <td className="px-5 py-2.5 capitalize text-gray-500">{c.charge_type}</td>
                      <td className="px-5 py-2.5 text-gray-800">₹{Number(c.amount).toFixed(2)}</td>
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
                  <span className="text-gray-500">₹{inv.total_amount}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
