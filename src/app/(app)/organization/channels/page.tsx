import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { formatDateTime } from "@/lib/format-datetime";
import { Card, CardHeader, Badge, Breadcrumb, Input, Label, Select, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createChannelConnection, updateChannelConnection, mapRatePlanToChannel, unmapRatePlanFromChannel, importIcalFeed } from "@/app/actions/channels";
import { SyncNowButton, DeleteConnectionButton } from "./channel-actions";

const STATUS_COLOR: Record<string, "green" | "amber" | "red" | "gray"> = {
  connected: "green",
  error: "red",
  disconnected: "gray",
};

const API_SUPPORTED = new Set(["booking_com", "expedia", "agoda", "makemytrip", "goibibo", "airbnb", "google_hotel"]);

export default async function ChannelsPage() {
  const supabase = await createClient();
  const org = await getOrgContext();

  const [{ data: channels }, { data: connections }, { data: ratePlans }, { data: roomTypes }] = await Promise.all([
    supabase.from("channels").select("id, code, name, supports_ical, supports_api").order("name"),
    supabase
      .from("channel_connections")
      .select(
        "id, status, external_property_id, api_key, ical_export_token, ical_import_url, last_synced_at, last_error, channels(code, name, supports_ical, supports_api), channel_rate_plan_map(id, external_rate_plan_id, external_room_type_id, rate_plans(id, name, room_types(name)))",
      )
      .eq("property_id", org.propertyId)
      .order("created_at"),
    supabase.from("rate_plans").select("id, name, room_types(name)").eq("property_id", org.propertyId).eq("is_active", true).order("name"),
    supabase.from("room_types").select("id, name").eq("property_id", org.propertyId).order("name"),
  ]);

  const availableChannels = (channels ?? []).filter((ch) => !(connections ?? []).some((c) => c.channels?.code === ch.code));

  let recentLogsByConnection = new Map<string, { id: string; direction: string; sync_type: string; status: string; error_message: string | null; created_at: string }[]>();
  if (connections?.length) {
    const { data: logs } = await supabase
      .from("channel_sync_log")
      .select("id, channel_connection_id, direction, sync_type, status, error_message, created_at")
      .in("channel_connection_id", connections.map((c) => c.id))
      .order("created_at", { ascending: false })
      .limit(200);
    recentLogsByConnection = new Map();
    for (const log of logs ?? []) {
      const list = recentLogsByConnection.get(log.channel_connection_id) ?? [];
      if (list.length < 5) list.push(log);
      recentLogsByConnection.set(log.channel_connection_id, list);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[org.corporateName, org.regionName, org.hotelName, "Channels"]} />
      <h1 className="text-xl text-gray-900">Channel Manager</h1>
      <p className="-mt-4 text-sm text-gray-500">
        Connect OTAs and push availability/rates/restrictions to them. Booking.com and Airbnb also support a
        credential-free iCal calendar feed. Agoda, MakeMyTrip, and Goibibo don&apos;t offer a direct property API —
        those reach a hotel through a certified channel-manager aggregator (SiteMinder, RateGain, etc.) instead, so
        connecting one here records the account but syncs will report that rather than actually pushing.
      </p>

      {!!connections?.length && (
        <div className="space-y-6">
          {connections.map((conn) => {
            const logs = recentLogsByConnection.get(conn.id) ?? [];
            const icsFeedUrls = roomTypes?.map((rt) => ({
              name: rt.name,
              url: `/api/channels/ical/${conn.ical_export_token}?room_type=${rt.id}`,
            }));
            return (
              <Card key={conn.id}>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      {conn.channels?.name}
                      <Badge color={STATUS_COLOR[conn.status] ?? "gray"}>{conn.status}</Badge>
                    </span>
                  }
                  action={
                    <div className="flex items-center gap-3">
                      {conn.channels?.code && API_SUPPORTED.has(conn.channels.code) && (
                        <SyncNowButton connectionId={conn.id} isRetry={conn.status === "error"} />
                      )}
                      <DeleteConnectionButton connectionId={conn.id} />
                    </div>
                  }
                />

                <div className="grid grid-cols-1 gap-6 px-5 py-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-xs text-gray-500">
                      {conn.last_synced_at ? `Last synced ${formatDateTime(conn.last_synced_at, org.timezone)}` : "Never synced"}
                      {conn.last_error && <div className="mt-1 text-red-600">{conn.last_error}</div>}
                    </div>

                    <form action={updateChannelConnection.bind(null, conn.id)} className="space-y-2 rounded-md border border-gray-100 p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Credentials</div>
                      <div>
                        <Label>External property/hotel ID</Label>
                        <Input name="external_property_id" defaultValue={conn.external_property_id ?? ""} />
                      </div>
                      <div>
                        <Label>API key / username</Label>
                        <Input name="api_key" defaultValue={conn.api_key ?? ""} />
                      </div>
                      <div>
                        <Label>API secret / password</Label>
                        <Input name="api_secret" type="password" placeholder={conn.api_key ? "••••••••" : ""} />
                      </div>
                      {conn.channels?.supports_ical && (
                        <div>
                          <Label>Import iCal URL (their calendar feed)</Label>
                          <Input name="ical_import_url" defaultValue={conn.ical_import_url ?? ""} placeholder="https://..." />
                        </div>
                      )}
                      <SubmitButton variant="secondary">Save</SubmitButton>
                    </form>

                    {conn.channels?.supports_api && (
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Webhook URL (give this to the channel)</div>
                        <code className="mt-1 block break-all rounded bg-gray-50 px-2 py-1 text-xs text-gray-600">
                          /api/channels/webhook/{conn.id}
                        </code>
                      </div>
                    )}

                    {conn.channels?.supports_ical && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-400">iCal export feed (give this URL to the channel)</div>
                        {icsFeedUrls?.map((f) => (
                          <code key={f.url} className="block break-all rounded bg-gray-50 px-2 py-1 text-xs text-gray-600">
                            {f.name}: {f.url}
                          </code>
                        ))}
                        {conn.ical_import_url && (
                          <form action={importIcalFeed.bind(null, conn.id)} className="flex items-end gap-2">
                            <Select name="room_type_id" className="max-w-[160px]" required>
                              {roomTypes?.map((rt) => (
                                <option key={rt.id} value={rt.id}>
                                  {rt.name}
                                </option>
                              ))}
                            </Select>
                            <SubmitButton variant="secondary">Import now</SubmitButton>
                          </form>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Rate plan mapping</div>
                    {!conn.channel_rate_plan_map?.length ? (
                      <p className="text-xs text-gray-400">No rate plans mapped — rates won&apos;t push until at least one is.</p>
                    ) : (
                      <div className="space-y-1">
                        {conn.channel_rate_plan_map.map((m) => (
                          <div key={m.id} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs">
                            <span>
                              {m.rate_plans?.room_types?.name} — {m.rate_plans?.name} → {m.external_rate_plan_id}
                            </span>
                            <form action={unmapRatePlanFromChannel.bind(null, m.id)}>
                              <button className="text-gray-400 hover:text-red-600">Remove</button>
                            </form>
                          </div>
                        ))}
                      </div>
                    )}
                    <form action={mapRatePlanToChannel.bind(null, conn.id)} className="flex items-end gap-2">
                      <Select name="rate_plan_id" className="flex-1" required>
                        <option value="">Rate plan…</option>
                        {ratePlans?.map((rp) => (
                          <option key={rp.id} value={rp.id}>
                            {rp.room_types?.name} — {rp.name}
                          </option>
                        ))}
                      </Select>
                      <Input name="external_rate_plan_id" placeholder="External rate plan ID" className="w-40" required />
                      <SubmitButton variant="secondary">Map</SubmitButton>
                    </form>

                    <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Recent sync activity</div>
                    {!logs.length ? (
                      <p className="text-xs text-gray-400">No sync activity yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {logs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {log.direction} {log.sync_type}
                            </span>
                            <span className={log.status === "success" ? "text-emerald-600" : "text-red-600"}>{log.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader title="Connect a channel" />
        {!availableChannels.length ? (
          <EmptyState>Every channel is already connected.</EmptyState>
        ) : (
          <form action={createChannelConnection} className="space-y-2 px-5 py-4">
            <div>
              <Label>Channel</Label>
              <Select name="channel_id" required>
                {availableChannels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>External property/hotel ID (optional, add later)</Label>
              <Input name="external_property_id" />
            </div>
            <SubmitButton>Connect</SubmitButton>
          </form>
        )}
      </Card>
    </div>
  );
}
