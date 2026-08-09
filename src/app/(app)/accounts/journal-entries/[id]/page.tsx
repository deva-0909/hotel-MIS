import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";

export default async function JournalEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("journal_entries")
    .select("id, entry_number, entry_date, description, source_table, source_id")
    .eq("id", id)
    .maybeSingle();

  if (!entry) notFound();

  const { data: lines } = await supabase
    .from("journal_entry_lines")
    .select("id, debit, credit, chart_of_accounts(code, name)")
    .eq("journal_entry_id", id);

  const totalDebit = lines?.reduce((sum, l) => sum + Number(l.debit), 0) ?? 0;
  const totalCredit = lines?.reduce((sum, l) => sum + Number(l.credit), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{entry.entry_number}</h1>
        <Badge color={entry.source_table ? "blue" : "gray"}>{entry.source_table ? "Auto-posted" : "Manual"}</Badge>
      </div>
      <p className="-mt-4 text-sm text-gray-500">
        {entry.entry_date} · {entry.description}
      </p>

      <Card>
        <CardHeader title="Lines" />
        {!lines?.length ? (
          <EmptyState>No lines.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-2 font-medium">Account</th>
                <th className="px-5 py-2 font-medium">Debit</th>
                <th className="px-5 py-2 font-medium">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-2.5 text-gray-800">
                    {l.chart_of_accounts?.code} — {l.chart_of_accounts?.name}
                  </td>
                  <td className="px-5 py-2.5 text-gray-700">{Number(l.debit) > 0 ? `₹${Number(l.debit).toFixed(2)}` : ""}</td>
                  <td className="px-5 py-2.5 text-gray-700">{Number(l.credit) > 0 ? `₹${Number(l.credit).toFixed(2)}` : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-semibold text-gray-900">
                <td className="px-5 py-2.5">Total</td>
                <td className="px-5 py-2.5">₹{totalDebit.toFixed(2)}</td>
                <td className="px-5 py-2.5">₹{totalCredit.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </Card>
    </div>
  );
}
