"use client";

import { useState } from "react";
import { createOrder } from "@/app/actions/restaurant";
import { Card, CardHeader, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Table = { id: string; table_number: string };
type Reservation = {
  id: string;
  reservation_number: string;
  property_id: string;
  properties: { name: string } | null;
  guests: { full_name: string } | null;
  rooms: { room_number: string } | null;
};

export function OrderForm({
  tables,
  reservations,
  homePropertyId,
}: {
  tables: Table[];
  reservations: Reservation[];
  homePropertyId: string;
}) {
  const [orderType, setOrderType] = useState<"dine_in" | "room_service" | "takeaway">("dine_in");

  const homeReservations = reservations.filter((r) => r.property_id === homePropertyId);
  const visitingByProperty = new Map<string, Reservation[]>();
  for (const r of reservations) {
    if (r.property_id === homePropertyId) continue;
    const name = r.properties?.name ?? "Other property";
    visitingByProperty.set(name, [...(visitingByProperty.get(name) ?? []), r]);
  }

  const reservationLabel = (r: Reservation) => `${r.rooms?.room_number ?? "—"} · ${r.guests?.full_name} (${r.reservation_number})`;

  return (
    <Card className="max-w-lg">
      <CardHeader title="New order" />
      <form action={createOrder} className="space-y-4 px-5 py-5">
        <div>
          <Label>Order type</Label>
          <Select name="order_type" value={orderType} onChange={(e) => setOrderType(e.target.value as typeof orderType)}>
            <option value="dine_in">Dine-in</option>
            <option value="room_service">Room service</option>
            <option value="takeaway">Takeaway</option>
          </Select>
        </div>

        {orderType === "dine_in" && (
          <div>
            <Label>Table</Label>
            <Select name="table_id" required>
              <option value="">Select table…</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.table_number}
                </option>
              ))}
            </Select>
          </div>
        )}

        {orderType === "room_service" && (
          <div className="space-y-2">
            <div>
              <Label>Reservation (checked-in guests)</Label>
              <Select name="reservation_id" required>
                <option value="">Select reservation…</option>
                {homeReservations.length > 0 && (
                  <optgroup label="This property">
                    {homeReservations.map((r) => (
                      <option key={r.id} value={r.id}>
                        {reservationLabel(r)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {Array.from(visitingByProperty.entries()).map(([propertyName, list]) => (
                  <optgroup key={propertyName} label={`Visiting from ${propertyName}`}>
                    {list.map((r) => (
                      <option key={r.id} value={r.id}>
                        {reservationLabel(r)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
              <p className="mt-1 text-xs text-gray-400">
                Guests from another property bill straight back to their own room folio there.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="bill_to_room" defaultChecked /> Bill to room folio
            </label>
          </div>
        )}

        <SubmitButton>Start order</SubmitButton>
      </form>
    </Card>
  );
}
