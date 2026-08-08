import { createClient } from "@/lib/supabase/server";
import { createTable } from "@/app/actions/restaurant";
import { Card, CardHeader, Badge, Input, Label, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray"> = {
  available: "green",
  occupied: "blue",
  reserved: "amber",
  cleaning: "gray",
};

export default async function TablesPage() {
  const supabase = await createClient();
  const { data: tables } = await supabase.from("restaurant_tables").select("id, table_number, capacity, status").order("table_number");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Restaurant tables</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          {!tables?.length ? (
            <EmptyState>No tables yet.</EmptyState>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {tables.map((t) => (
                <div key={t.id} className="rounded-lg border border-gray-200 p-3 text-center">
                  <div className="text-lg font-semibold text-gray-900">{t.table_number}</div>
                  <div className="text-xs text-gray-500">{t.capacity} seats</div>
                  <div className="mt-2">
                    <Badge color={STATUS_COLOR[t.status]}>{t.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Add table" />
          <form action={createTable} className="space-y-2 px-5 py-4">
            <div>
              <Label>Table number</Label>
              <Input name="table_number" required placeholder="e.g. T7" />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input name="capacity" type="number" min={1} defaultValue={4} />
            </div>
            <SubmitButton>Add table</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
