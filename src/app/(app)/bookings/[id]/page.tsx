import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { formatMoney } from "@/lib/format-money";
import { Card, CardHeader, Badge, Breadcrumb, EmptyState } from "@/components/ui";
import { CancelBookingButton } from "./booking-actions";

const STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red" | "purple"> = {
  confirmed: "purple",
  checked_in: "blue",
  checked_out: "green",
  cancelled: "gray",
  no_show: "red",
};

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, booking_number, source, booking_type, commission_percent, notes, created_at, guests(full_name, phone, email, preferences), companies(name, gstin), travel_agents(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!booking) notFound();

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, reservation_number, check_in_date, check_out_date, status, rate_per_night, adults, children, special_requests, properties(name, currency), rooms(room_number), room_types(name)")
    .eq("booking_id", id)
    .order("check_in_date");

  const nightsFor = (checkIn: string, checkOut: string) =>
    Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
  const totalRoomRevenue = (reservations ?? []).reduce((sum, r) => sum + r.rate_per_night * nightsFor(r.check_in_date, r.check_out_date), 0);
  const commissionAmount = booking.commission_percent ? (totalRoomRevenue * booking.commission_percent) / 100 : 0;
  const cancellable = (reservations ?? []).some((r) => r.status === "confirmed" || r.status === "checked_in");

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, "Bookings", booking.booking_number]} />
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{booking.booking_number}</h1>
            <Badge color="purple">{booking.booking_type.replace(/_/g, " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {booking.guests?.full_name} · {booking.source.replace(/_/g, " ")} · {reservations?.length ?? 0} room{(reservations?.length ?? 0) === 1 ? "" : "s"}
          </p>
        </div>
        {cancellable && <CancelBookingButton bookingId={booking.id} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Rooms on this booking" />
            {!reservations?.length ? (
              <EmptyState>No rooms on this booking.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                    <th className="px-5 py-2 font-medium">Reservation</th>
                    <th className="px-5 py-2 font-medium">Property</th>
                    <th className="px-5 py-2 font-medium">Room</th>
                    <th className="px-5 py-2 font-medium">Dates</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-2.5">
                        <Link href={`/reservations/${r.id}`} className="font-medium text-slate-900 hover:underline">
                          {r.reservation_number}
                        </Link>
                        {r.special_requests && <div className="text-xs text-amber-600">{r.special_requests}</div>}
                      </td>
                      <td className="px-5 py-2.5 text-gray-600">{r.properties?.name}</td>
                      <td className="px-5 py-2.5 text-gray-600">
                        {r.rooms?.room_number ?? "Unassigned"} <span className="text-xs text-gray-400">({r.room_types?.name})</span>
                      </td>
                      <td className="px-5 py-2.5 text-gray-600">
                        {r.check_in_date} → {r.check_out_date}
                      </td>
                      <td className="px-5 py-2.5">
                        <Badge color={STATUS_COLOR[r.status]}>{r.status.replace(/_/g, " ")}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {booking.notes && (
            <Card>
              <CardHeader title="Booking notes" />
              <p className="px-5 py-4 text-sm text-gray-700">{booking.notes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Guest" />
            <div className="space-y-2 px-5 py-4 text-sm">
              <div className="text-gray-900">{booking.guests?.full_name}</div>
              <div className="text-gray-500">{booking.guests?.phone ?? booking.guests?.email ?? "—"}</div>
              {booking.guests?.preferences && (
                <div>
                  <div className="text-xs text-gray-400">Preferences</div>
                  <div className="text-gray-700">{booking.guests.preferences}</div>
                </div>
              )}
            </div>
          </Card>

          {(booking.companies || booking.travel_agents) && (
            <Card>
              <CardHeader title={booking.companies ? "Corporate account" : "Travel agent"} />
              <div className="space-y-1 px-5 py-4 text-sm">
                <div className="text-gray-900">{booking.companies?.name ?? booking.travel_agents?.name}</div>
                {booking.companies?.gstin && <div className="text-xs text-gray-500">GSTIN {booking.companies.gstin}</div>}
                {booking.commission_percent != null && (
                  <div className="mt-2 text-xs text-gray-500">
                    Commission: {booking.commission_percent}% · {formatMoney(commissionAmount, reservations?.[0]?.properties?.currency ?? org.currency)}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
