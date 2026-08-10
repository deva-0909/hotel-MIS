"use client";

import { useMemo, useState } from "react";
import { createBooking } from "@/app/actions/booking";
import { formatMoney } from "@/lib/format-money";
import { Card, CardHeader, Input, Label, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Guest = { id: string; full_name: string; phone: string | null; stayCount: number };
type Property = { id: string; name: string };
type RoomType = { id: string; name: string; base_rate: number; property_id: string };
type Room = { id: string; room_number: string; room_type_id: string; property_id: string; status: string };
type Company = { id: string; name: string };
type Agent = { id: string; name: string; default_commission_percent: number };

type RoomLine = {
  key: number;
  propertyId: string;
  roomTypeId: string;
  roomId: string;
  ratePerNight: number;
  adults: number;
  children: number;
  specialRequests: string;
};

const SOURCES = [
  ["direct", "Direct"],
  ["phone", "Phone"],
  ["walk_in", "Walk-in"],
  ["ota", "OTA / Website"],
  ["travel_agent", "Travel agent"],
  ["corporate", "Corporate"],
  ["other", "Other"],
] as const;

function newLine(key: number, propertyId: string, roomTypes: RoomType[]): RoomLine {
  const firstType = roomTypes.find((t) => t.property_id === propertyId);
  return {
    key,
    propertyId,
    roomTypeId: firstType?.id ?? "",
    roomId: "",
    ratePerNight: firstType?.base_rate ?? 0,
    adults: 1,
    children: 0,
    specialRequests: "",
  };
}

export function BookingForm({
  guests,
  properties,
  roomTypes,
  rooms,
  companies,
  agents,
  defaultPropertyId,
  currency,
}: {
  guests: Guest[];
  properties: Property[];
  roomTypes: RoomType[];
  rooms: Room[];
  companies: Company[];
  agents: Agent[];
  defaultPropertyId: string;
  currency: string;
}) {
  const [guestMode, setGuestMode] = useState<"existing" | "new">(guests.length ? "existing" : "new");
  const [guestSearch, setGuestSearch] = useState("");
  const [guestId, setGuestId] = useState("");

  const [bookingType, setBookingType] = useState<"individual" | "group" | "corporate" | "travel_agent">("individual");
  const [source, setSource] = useState<(typeof SOURCES)[number][0]>("direct");
  const [companyId, setCompanyId] = useState("");
  const [travelAgentId, setTravelAgentId] = useState("");
  const [commissionPercent, setCommissionPercent] = useState<number | "">("");

  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [nextKey, setNextKey] = useState(1);
  const [roomLines, setRoomLines] = useState<RoomLine[]>([newLine(0, defaultPropertyId, roomTypes)]);

  const filteredGuests = useMemo(() => {
    const q = guestSearch.trim().toLowerCase();
    if (!q) return guests.slice(0, 20);
    return guests.filter((g) => g.full_name.toLowerCase().includes(q) || (g.phone ?? "").includes(q)).slice(0, 20);
  }, [guests, guestSearch]);
  const selectedGuest = guests.find((g) => g.id === guestId);

  function updateLine(key: number, patch: Partial<RoomLine>) {
    setRoomLines((lines) => lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setRoomLines((lines) => [...lines, newLine(nextKey, defaultPropertyId, roomTypes)]);
    setNextKey((k) => k + 1);
  }

  function removeLine(key: number) {
    setRoomLines((lines) => (lines.length > 1 ? lines.filter((l) => l.key !== key) : lines));
  }

  const roomsJson = JSON.stringify(
    roomLines.map((l) => ({
      propertyId: l.propertyId,
      roomTypeId: l.roomTypeId,
      roomId: l.roomId || null,
      ratePerNight: Number(l.ratePerNight),
      adults: Number(l.adults),
      children: Number(l.children),
      specialRequests: l.specialRequests || null,
    })),
  );

  return (
    <Card className="max-w-3xl">
      <CardHeader title="New booking" />
      <form action={createBooking} className="space-y-5 px-5 py-5">
        <input type="hidden" name="guest_id" value={guestMode === "existing" ? guestId : ""} />
        <input type="hidden" name="rooms_json" value={roomsJson} />

        <div>
          <Label>Guest</Label>
          <div className="mb-2 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setGuestMode("existing")}
              className={`rounded-full px-3 py-1 ${guestMode === "existing" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              Existing guest
            </button>
            <button
              type="button"
              onClick={() => setGuestMode("new")}
              className={`rounded-full px-3 py-1 ${guestMode === "new" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              New guest
            </button>
          </div>

          {guestMode === "existing" ? (
            <div>
              <Input
                placeholder="Search by name or phone…"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
              />
              <div className="mt-1.5 max-h-40 overflow-y-auto rounded-md border border-gray-100">
                {filteredGuests.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGuestId(g.id)}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
                      guestId === g.id ? "bg-accent-soft text-accent" : "hover:bg-gray-50"
                    }`}
                  >
                    <span>
                      {g.full_name} {g.phone ? `(${g.phone})` : ""}
                    </span>
                    {g.stayCount > 0 && <span className="text-xs text-gray-400">{g.stayCount} past stay{g.stayCount === 1 ? "" : "s"}</span>}
                  </button>
                ))}
                {!filteredGuests.length && <div className="px-3 py-2 text-xs text-gray-400">No matches.</div>}
              </div>
              {selectedGuest && <p className="mt-1 text-xs text-emerald-700">Selected: {selectedGuest.full_name}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Input name="new_guest_name" placeholder="Full name" required />
              <Input name="new_guest_phone" placeholder="Phone" />
              <Input name="new_guest_email" placeholder="Email" />
              <Input name="new_guest_preferences" placeholder="Preferences (e.g. high floor, vegetarian)" />
              <p className="col-span-2 text-xs text-gray-400">
                A matching phone number will attach this booking to the existing guest instead of creating a duplicate.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Check-in date</Label>
            <Input name="check_in_date" type="date" required value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
          </div>
          <div>
            <Label>Check-out date</Label>
            <Input name="check_out_date" type="date" required value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Booking type</Label>
            <Select name="booking_type" value={bookingType} onChange={(e) => setBookingType(e.target.value as typeof bookingType)}>
              <option value="individual">Individual</option>
              <option value="group">Group</option>
              <option value="corporate">Corporate</option>
              <option value="travel_agent">Travel agent</option>
            </Select>
          </div>
          <div>
            <Label>Source</Label>
            <Select name="source" value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
              {SOURCES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {bookingType === "corporate" && (
          <div>
            <Label>Company</Label>
            <Select name="company_id" required value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Select company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {!companies.length && <p className="mt-1 text-xs text-amber-600">No companies yet — add one under Organization → Companies.</p>}
          </div>
        )}

        {bookingType === "travel_agent" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Travel agent</Label>
              <Select
                name="travel_agent_id"
                required
                value={travelAgentId}
                onChange={(e) => {
                  setTravelAgentId(e.target.value);
                  const agent = agents.find((a) => a.id === e.target.value);
                  if (agent) setCommissionPercent(agent.default_commission_percent);
                }}
              >
                <option value="">Select agent…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
              {!agents.length && <p className="mt-1 text-xs text-amber-600">No agents yet — add one under Organization → Travel Agents.</p>}
            </div>
            <div>
              <Label>Commission %</Label>
              <Input
                name="commission_percent"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Rooms</Label>
            <button type="button" onClick={addLine} className="text-xs text-accent hover:underline">
              + Add another room
            </button>
          </div>
          <div className="space-y-3">
            {roomLines.map((line) => {
              const typesForProperty = roomTypes.filter((t) => t.property_id === line.propertyId);
              const roomsForType = rooms.filter(
                (r) => r.room_type_id === line.roomTypeId && (r.status === "available" || r.status === "dirty"),
              );
              return (
                <div key={line.key} className="space-y-2 rounded-md border border-gray-100 p-3">
                  <div className="grid grid-cols-3 gap-2">
                    {properties.length > 1 && (
                      <div>
                        <Label>Property</Label>
                        <Select
                          value={line.propertyId}
                          onChange={(e) => {
                            const pid = e.target.value;
                            const firstType = roomTypes.find((t) => t.property_id === pid);
                            updateLine(line.key, {
                              propertyId: pid,
                              roomTypeId: firstType?.id ?? "",
                              roomId: "",
                              ratePerNight: firstType?.base_rate ?? 0,
                            });
                          }}
                        >
                          {properties.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label>Room type</Label>
                      <Select
                        value={line.roomTypeId}
                        onChange={(e) => {
                          const rt = roomTypes.find((t) => t.id === e.target.value);
                          updateLine(line.key, { roomTypeId: e.target.value, roomId: "", ratePerNight: rt?.base_rate ?? 0 });
                        }}
                      >
                        {typesForProperty.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} — {formatMoney(t.base_rate, currency)}/night
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Room (optional)</Label>
                      <Select value={line.roomId} onChange={(e) => updateLine(line.key, { roomId: e.target.value })}>
                        <option value="">Unassigned</option>
                        {roomsForType.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.room_number}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label>Adults</Label>
                      <Input type="number" min={1} value={line.adults} onChange={(e) => updateLine(line.key, { adults: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label>Children</Label>
                      <Input type="number" min={0} value={line.children} onChange={(e) => updateLine(line.key, { children: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2">
                      <Label>Rate/night</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.ratePerNight}
                        onChange={(e) => updateLine(line.key, { ratePerNight: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Special requests (this room)</Label>
                    <Input
                      value={line.specialRequests}
                      onChange={(e) => updateLine(line.key, { specialRequests: e.target.value })}
                      placeholder="e.g. extra bed, away from elevator"
                    />
                  </div>
                  {roomLines.length > 1 && (
                    <button type="button" onClick={() => removeLine(line.key)} className="text-xs text-red-500 hover:underline">
                      Remove room
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Booking notes (optional)</Label>
          <Textarea name="notes" rows={2} />
        </div>

        <SubmitButton>Create booking</SubmitButton>
      </form>
    </Card>
  );
}
