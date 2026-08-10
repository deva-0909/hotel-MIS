import { createClient } from "@/lib/supabase/server";
import { createGuest } from "@/app/actions/hotel";
import { Card, CardHeader, Input, Label, Textarea, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";

export default async function GuestsPage() {
  const supabase = await createClient();
  const [{ data: guests }, { data: allReservations }] = await Promise.all([
    supabase.from("guests").select("id, full_name, phone, email, preferences, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("reservations").select("guest_id").limit(5000),
  ]);

  const stayCountByGuest = new Map<string, number>();
  for (const r of allReservations ?? []) {
    stayCountByGuest.set(r.guest_id, (stayCountByGuest.get(r.guest_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Guests</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`All guests (${guests?.length ?? 0})`} />
          {!guests?.length ? (
            <EmptyState>No guests yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Phone</th>
                  <th className="px-5 py-2 font-medium">Email</th>
                  <th className="px-5 py-2 font-medium">Preferences</th>
                  <th className="px-5 py-2 font-medium">Stays</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5 font-medium text-gray-900">
                      <Link href={`/reservations?guest=${g.id}`} className="hover:underline">
                        {g.full_name}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{g.phone ?? "—"}</td>
                    <td className="px-5 py-2.5 text-gray-600">{g.email ?? "—"}</td>
                    <td className="px-5 py-2.5 text-gray-600">{g.preferences ?? "—"}</td>
                    <td className="px-5 py-2.5 text-gray-600">{stayCountByGuest.get(g.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Register guest" />
          <form action={createGuest} className="space-y-2 px-5 py-4">
            <div>
              <Label>Full name</Label>
              <Input name="full_name" required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" />
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" />
            </div>
            <div>
              <Label>ID proof type</Label>
              <Input name="id_proof_type" placeholder="Passport / Aadhaar / Driving licence" />
            </div>
            <div>
              <Label>ID proof number</Label>
              <Input name="id_proof_number" />
            </div>
            <div>
              <Label>Address</Label>
              <Input name="address" />
            </div>
            <div>
              <Label>Preferences</Label>
              <Textarea name="preferences" rows={2} placeholder="e.g. high floor, vegetarian, extra pillows" />
            </div>
            <SubmitButton>Register guest</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
