import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { formatDate } from "@/lib/format-datetime";
import { convertWaitlistEntry } from "@/app/actions/waitlist";
import { Card, CardHeader, Breadcrumb, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { AddWaitlistForm } from "./add-waitlist-form";
import { CancelWaitlistButton } from "./waitlist-actions";

export default async function WaitlistPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: entries }, { data: guests }, { data: roomTypes }, { data: rooms }] = await Promise.all([
    supabase
      .from("waitlist_entries")
      .select("id, requested_check_in, requested_check_out, party_size, notes, created_at, guests(full_name, phone), room_types(id, name)")
      .eq("property_id", org.propertyId)
      .eq("status", "waiting")
      .order("created_at"),
    supabase.from("guests").select("id, full_name, phone").order("full_name"),
    supabase.from("room_types").select("id, name").eq("property_id", org.propertyId).order("name"),
    supabase.from("rooms").select("id, room_number, room_type_id, status").eq("property_id", org.propertyId).in("status", ["available", "dirty"]),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Waitlist"]} />
      <h1 className="text-xl text-gray-900">Waitlist</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Guests waiting for a room type with no availability for their dates. Convert an entry to a confirmed
        reservation the moment a room frees up.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Waiting (${entries?.length ?? 0})`} />
          {!entries?.length ? (
            <EmptyState>Nobody on the waitlist right now.</EmptyState>
          ) : (
            <div className="divide-y divide-gray-50">
              {entries.map((e) => {
                const roomsForType = (rooms ?? []).filter((r) => r.room_type_id === e.room_types?.id);
                return (
                  <div key={e.id} className="px-5 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{e.guests?.full_name}</div>
                        <div className="text-xs text-gray-500">
                          {e.room_types?.name} · {e.requested_check_in} → {e.requested_check_out} · {e.party_size} guest{e.party_size === 1 ? "" : "s"}
                        </div>
                        {e.notes && <div className="text-xs text-amber-600">{e.notes}</div>}
                        <div className="text-xs text-gray-400">Waiting since {formatDate(e.created_at, org.timezone)}</div>
                      </div>
                      <CancelWaitlistButton entryId={e.id} />
                    </div>
                    <form action={convertWaitlistEntry.bind(null, e.id)} className="mt-2 flex items-end gap-2">
                      <Select name="room_id" className="h-8 max-w-[180px] text-xs" defaultValue="">
                        <option value="">Unassigned room</option>
                        {roomsForType.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.room_number}
                          </option>
                        ))}
                      </Select>
                      <SubmitButton variant="secondary">Convert to reservation</SubmitButton>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Add to waitlist" />
          <AddWaitlistForm guests={guests ?? []} roomTypes={roomTypes ?? []} />
        </Card>
      </div>
    </div>
  );
}
