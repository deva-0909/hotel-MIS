"use client";

import { useState } from "react";
import { createWaitlistEntry } from "@/app/actions/waitlist";
import { Input, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Guest = { id: string; full_name: string; phone: string | null };
type RoomType = { id: string; name: string };

export function AddWaitlistForm({ guests, roomTypes }: { guests: Guest[]; roomTypes: RoomType[] }) {
  const [guestMode, setGuestMode] = useState<"existing" | "new">(guests.length ? "existing" : "new");

  return (
    <form action={createWaitlistEntry} className="space-y-2 px-5 py-4">
      <div>
        <Label>Guest</Label>
        <div className="mb-1.5 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setGuestMode("existing")}
            className={`rounded-full px-2.5 py-0.5 ${guestMode === "existing" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Existing
          </button>
          <button
            type="button"
            onClick={() => setGuestMode("new")}
            className={`rounded-full px-2.5 py-0.5 ${guestMode === "new" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            New
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
          <div className="space-y-2">
            <Input name="new_guest_name" placeholder="Full name" required />
            <Input name="new_guest_phone" placeholder="Phone" />
          </div>
        )}
      </div>
      <div>
        <Label>Room type wanted</Label>
        <Select name="room_type_id" required>
          {roomTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Check-in</Label>
          <Input name="requested_check_in" type="date" required />
        </div>
        <div>
          <Label>Check-out</Label>
          <Input name="requested_check_out" type="date" required />
        </div>
      </div>
      <div>
        <Label>Party size</Label>
        <Input name="party_size" type="number" min={1} defaultValue={1} />
      </div>
      <div>
        <Label>Notes</Label>
        <Input name="notes" placeholder="e.g. flexible on dates" />
      </div>
      <SubmitButton>Add to waitlist</SubmitButton>
    </form>
  );
}
