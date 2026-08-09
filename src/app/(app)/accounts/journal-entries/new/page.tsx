import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { JournalEntryForm } from "./journal-entry-form";

export default async function NewJournalEntryPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, code, name")
    .eq("property_id", org.propertyId)
    .eq("is_active", true)
    .order("code");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">New journal entry</h1>
      <JournalEntryForm accounts={accounts ?? []} />
    </div>
  );
}
