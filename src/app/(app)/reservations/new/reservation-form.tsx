"use client";

import { useMemo, useState } from "react";
import { createReservation } from "@/app/actions/hotel";
import { Card, CardHeader, Input, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Guest = { id: string; full_name: string; phone: string | null };
type RoomType = { id: string; name: string; base_rate: number };
type Room = { id: string; room_number: string; room_type_id: string; status: string };

export function ReservationForm({ guests, roomTypes, rooms }: { guests: Guest[]; roomTypes: RoomType[]; rooms: Room[] }) {
  const [guestMode, setGuestMode] = useState<"existing" | "new">(guests.length ? "existing" : "new");
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id ?? "");

  const availableRooms = useMemo(
    () => rooms.filter((r) => r.room_type_id === roomTypeId && (r.status === "available" || r.status === "dirty")),
    [rooms, roomTypeId],
  );
  const selectedType = roomTypes.find((t) => t.id === roomTypeId);
  const [rate, setRate] = useState(selectedType?.base_rate ?? 0);
  const [syncedRoomTypeId, setSyncedRoomTypeId] = useState(roomTypeId);

  if (roomTypeId !== syncedRoomTypeId) {
    setSyncedRoomTypeId(roomTypeId);
    setRate(selectedType?.base_rate ?? 0);
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader title="New reservation" />
      <form action={createReservation} className="space-y-4 px-5 py-5">
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
            <Select name="guest_id" required>
              <option value="">Select guest…</option>
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.full_name} {g.phone ? `(${g.phone})` : ""}
                </option>
              ))}
            </Select>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Input name="new_guest_name" placeholder="Full name" required />
              <Input name="new_guest_phone" placeholder="Phone" />
              <Input name="new_guest_email" placeholder="Email" className="col-span-2" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Check-in date</Label>
            <Input name="check_in_date" type="date" required />
          </div>
          <div>
            <Label>Check-out date</Label>
            <Input name="check_out_date" type="date" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Room type</Label>
            <Select
              name="room_type_id"
              required
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name} — ₹{rt.base_rate}/night
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Room (optional — can assign later)</Label>
            <Select name="room_id" defaultValue="">
              <option value="">Unassigned</option>
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_number}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Adults</Label>
            <Input name="adults" type="number" min={1} defaultValue={1} />
          </div>
          <div>
            <Label>Children</Label>
            <Input name="children" type="number" min={0} defaultValue={0} />
          </div>
          <div>
            <Label>Rate/night</Label>
            <Input
              name="rate_per_night"
              type="number"
              min={0}
              step="0.01"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Input name="notes" />
        </div>

        <SubmitButton>Create reservation</SubmitButton>
      </form>
    </Card>
  );
}
