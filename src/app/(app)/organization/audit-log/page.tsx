import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { Card, CardHeader, Badge, Breadcrumb, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format-datetime";

const ACTION_COLOR: Record<string, "green" | "blue" | "red"> = { insert: "green", update: "blue", delete: "red" };
const TABLE_LABEL: Record<string, string> = {
  properties: "Property",
  tax_rates: "Tax rate",
  devices: "Device",
  restaurants: "Restaurant",
  profiles: "Staff profile",
  staff_invites: "Staff invite",
  stores: "Store",
  pos_terminals: "POS terminal",
};

type JsonRecord = Record<string, unknown>;

// Only the fields that actually changed, old -> new — a full row dump on
// every update (most of which is unrelated columns) would bury the signal.
function diffFields(oldData: JsonRecord | null, newData: JsonRecord | null) {
  if (!oldData || !newData) return [];
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const changes: { field: string; from: unknown; to: unknown }[] = [];
  for (const key of keys) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes.push({ field: key, from: oldData[key], to: newData[key] });
    }
  }
  return changes;
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function AuditLogPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const { data: entries } = await supabase
    .from("config_audit_log")
    .select("id, table_name, record_id, action, changed_at, old_data, new_data, profiles(full_name)")
    .eq("property_id", org.propertyId)
    .order("changed_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Audit Log"]} />
      <h1 className="text-xl text-gray-900">Configuration Audit Log</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Every insert, update, or delete on property settings, tax rates, devices, restaurants, stores, POS
        terminals, staff invites, and staff profiles at this property — captured automatically, not just when
        someone remembers to log it. Most recent 200 changes.
      </p>

      <Card>
        <CardHeader title={`Recent changes (${entries?.length ?? 0})`} />
        {!entries?.length ? (
          <EmptyState>No configuration changes recorded yet.</EmptyState>
        ) : (
          <div className="divide-y divide-gray-50">
            {entries.map((entry) => {
              const changes = entry.action === "update" ? diffFields(entry.old_data as JsonRecord, entry.new_data as JsonRecord) : [];
              return (
                <div key={entry.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge color={ACTION_COLOR[entry.action] ?? "gray"}>{entry.action}</Badge>
                      <span className="font-medium text-gray-900">{TABLE_LABEL[entry.table_name] ?? entry.table_name}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {entry.profiles?.full_name ?? "System"} · {formatDateTime(entry.changed_at, org.timezone)}
                    </div>
                  </div>
                  {entry.action === "update" && changes.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-gray-500">
                      {changes.map((c) => (
                        <li key={c.field}>
                          <span className="font-medium text-gray-600">{c.field}</span>: {renderValue(c.from)} → {renderValue(c.to)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {entry.action !== "update" && (
                    <details className="mt-1.5 text-xs text-gray-500">
                      <summary className="cursor-pointer select-none">View details</summary>
                      <pre className="mt-1 overflow-x-auto rounded-md bg-gray-50 p-2">
                        {JSON.stringify(entry.action === "delete" ? entry.old_data : entry.new_data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
