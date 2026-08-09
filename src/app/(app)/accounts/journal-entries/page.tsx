import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, Badge, Breadcrumb, Button, EmptyState } from "@/components/ui";

export default async function JournalEntriesPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id, entry_number, entry_date, description, source_table, journal_entry_lines(debit)")
    .eq("property_id", org.propertyId)
    .order("entry_date", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Journal Entries"]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl text-gray-900">Journal entries</h1>
        <Link href="/accounts/journal-entries/new">
          <Button>New journal entry</Button>
        </Link>
      </div>

      <Card>
        {!entries?.length ? (
          <EmptyState>No journal entries yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Entry</th>
                <th className="px-5 py-2 font-medium">Date</th>
                <th className="px-5 py-2 font-medium">Description</th>
                <th className="px-5 py-2 font-medium">Source</th>
                <th className="px-5 py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const total = e.journal_entry_lines?.reduce((sum, l) => sum + Number(l.debit), 0) ?? 0;
                return (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-2.5">
                      <Link href={`/accounts/journal-entries/${e.id}`} className="font-medium text-slate-900 hover:underline">
                        {e.entry_number}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{e.entry_date}</td>
                    <td className="px-5 py-2.5 text-gray-600">{e.description}</td>
                    <td className="px-5 py-2.5">
                      <Badge color={e.source_table ? "blue" : "gray"}>{e.source_table ? "Auto-posted" : "Manual"}</Badge>
                    </td>
                    <td className="px-5 py-2.5 text-gray-800">₹{total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
