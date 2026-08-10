"use client";

import { useState } from "react";
import { createDevice } from "@/app/actions/devices";
import { Input, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function AddDeviceForm({
  restaurants,
  serviceAreas,
  kitchens,
}: {
  restaurants: { id: string; name: string }[];
  serviceAreas: { id: string; name: string; restaurant_id: string }[];
  kitchens: { id: string; name: string }[];
}) {
  const [deviceType, setDeviceType] = useState<"printer" | "kds">("printer");
  const [restaurantId, setRestaurantId] = useState("");

  const areasForRestaurant = serviceAreas.filter((a) => a.restaurant_id === restaurantId);

  return (
    <form action={createDevice} className="space-y-2 px-5 py-4">
      <div>
        <Label>Type</Label>
        <Select name="device_type" value={deviceType} onChange={(e) => setDeviceType(e.target.value as "printer" | "kds")}>
          <option value="printer">Printer</option>
          <option value="kds">KDS (kitchen display)</option>
        </Select>
      </div>
      <div>
        <Label>Name</Label>
        <Input name="name" required placeholder="e.g. Front Desk Printer" />
      </div>
      <div>
        <Label>Identifier (IP / serial, optional)</Label>
        <Input name="identifier" placeholder="e.g. 192.168.1.50" />
      </div>

      {deviceType === "printer" && (
        <>
          <div>
            <Label>Restaurant</Label>
            <Select name="restaurant_id" value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
              <option value="">Not tied to a restaurant</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
          {restaurantId && (
            <div>
              <Label>Service area (optional)</Label>
              <Select name="service_area_id" defaultValue="">
                <option value="">Whole restaurant</option>
                {areasForRestaurant.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </>
      )}

      {deviceType === "kds" && (
        <div>
          <Label>Kitchen</Label>
          <Select name="kitchen_id" defaultValue="">
            <option value="">Not tied to a kitchen</option>
            {kitchens.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <SubmitButton>Add device</SubmitButton>
    </form>
  );
}
