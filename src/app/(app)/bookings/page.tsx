import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, Badge, Breadcrumb, Button, EmptyState } from "@/components/ui";

const TYPE_COLOR: Record<string, "purple" | "blue" | "amber" | "gold"> = {
  individual: "purple",
  group: "blue",
  corporate: "amber",
  travel_agent: "gold",
};

export default async function BookingsPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, booking_number, source, booking_type, created_at, guests(full_name), companies(name), travel_agents(name), reservations(id)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Bookings"]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Bookings</h1>
        <Link href="/reservations/new">
          <Button>New booking</Button>
        </Link>
      </div>

      <Card>
        {!bookings?.length ? (
          <EmptyState>No bookings yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Booking</th>
                <th className="px-5 py-2 font-medium">Guest</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Source</th>
                <th className="px-5 py-2 font-medium">Company / Agent</th>
                <th className="px-5 py-2 font-medium">Rooms</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-2.5">
                    <Link href={`/bookings/${b.id}`} className="font-medium text-slate-900 hover:underline">
                      {b.booking_number}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-gray-700">{b.guests?.full_name}</td>
                  <td className="px-5 py-2.5">
                    <Badge color={TYPE_COLOR[b.booking_type] ?? "purple"}>{b.booking_type.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-5 py-2.5 text-gray-600">{b.source.replace(/_/g, " ")}</td>
                  <td className="px-5 py-2.5 text-gray-600">{b.companies?.name ?? b.travel_agents?.name ?? "—"}</td>
                  <td className="px-5 py-2.5 text-gray-600">{b.reservations?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
