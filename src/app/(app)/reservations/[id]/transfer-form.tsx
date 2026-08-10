"use client";

import { useState } from "react";
import { transferReservationProperty } from "@/app/actions/hotel";
import { formatMoney } from "@/lib/format-money";
import { Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Property = {
  id: string;
  name: string;
  roomTypes: { id: string; name: string; base_rate: number }[];
  rooms: { id: string; room_number: string; room_type_id: string }[];
};

export function TransferPropertyForm({
  reservationId,
  properties,
  currency,
}: {
  reservationId: string;
  properties: Property[];
  currency: string;
}) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const property = properties.find((p) => p.id === propertyId);
  const [roomTypeId, setRoomTypeId] = useState(property?.roomTypes[0]?.id ?? "");

  const currentProperty = properties.find((p) => p.id === propertyId);
  const roomsForType = currentProperty?.rooms.filter((r) => r.room_type_id === roomTypeId) ?? [];

  return (
    <form action={transferReservationProperty.bind(null, reservationId)} className="space-y-2 px-5 py-4">
      <p className="text-xs text-gray-500">Checks this reservation out here and opens a new one at the destination, checked in immediately.</p>
      <div>
        <Label>Destination property</Label>
        <Select
          name="property_id"
          value={propertyId}
          onChange={(e) => {
            setPropertyId(e.target.value);
            const p = properties.find((x) => x.id === e.target.value);
            setRoomTypeId(p?.roomTypes[0]?.id ?? "");
          }}
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Room type</Label>
        <Select name="room_type_id" value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}>
          {currentProperty?.roomTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {formatMoney(t.base_rate, currency)}/night
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Room (optional)</Label>
        <Select name="room_id" defaultValue="">
          <option value="">Unassigned</option>
          {roomsForType.map((r) => (
            <option key={r.id} value={r.id}>
              {r.room_number}
            </option>
          ))}
        </Select>
      </div>
      <SubmitButton variant="secondary">Transfer</SubmitButton>
    </form>
  );
}
