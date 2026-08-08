import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import type { Database } from "@/lib/database.types";

type ReservationStatus = Database["public"]["Enums"]["reservation_status"];

const RESERVATION_STATUSES: ReservationStatus[] = ["confirmed", "checked_in", "checked_out", "cancelled", "no_show"];

const STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red" | "purple"> = {
  confirmed: "purple",
  checked_in: "blue",
  checked_out: "green",
  cancelled: "gray",
  no_show: "red",
};

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ guest?: string; status?: string }>;
}) {
  const { guest, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("reservations")
    .select(
      "id, reservation_number, check_in_date, check_out_date, status, rate_per_night, guests(full_name), rooms(room_number)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (guest) query = query.eq("guest_id", guest);
  if (status && RESERVATION_STATUSES.includes(status as ReservationStatus)) {
    query = query.eq("status", status as ReservationStatus);
  }

  const { data: reservations } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Reservations</h1>
        <Link href="/reservations/new">
          <Button>New reservation</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        {["", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"].map((s) => (
          <Link
            key={s}
            href={s ? `/reservations?status=${s}` : "/reservations"}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === s || (!status && !s) ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {s ? s.replace(/_/g, " ") : "All"}
          </Link>
        ))}
      </div>

      <Card>
        {!reservations?.length ? (
          <EmptyState>No reservations found.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Reservation</th>
                <th className="px-5 py-2 font-medium">Guest</th>
                <th className="px-5 py-2 font-medium">Room</th>
                <th className="px-5 py-2 font-medium">Dates</th>
                <th className="px-5 py-2 font-medium">Rate/night</th>
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
                  </td>
                  <td className="px-5 py-2.5 text-gray-700">{r.guests?.full_name}</td>
                  <td className="px-5 py-2.5 text-gray-600">{r.rooms?.room_number ?? "Unassigned"}</td>
                  <td className="px-5 py-2.5 text-gray-600">
                    {r.check_in_date} → {r.check_out_date}
                  </td>
                  <td className="px-5 py-2.5 text-gray-600">₹{r.rate_per_night}</td>
                  <td className="px-5 py-2.5">
                    <Badge color={STATUS_COLOR[r.status]}>{r.status.replace(/_/g, " ")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
