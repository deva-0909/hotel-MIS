"use client";

import { useTransition } from "react";
import { togglePropertyActive, toggleRestaurantActive } from "@/app/actions/property";
import { Button } from "@/components/ui";

export function PropertyActiveToggle({ propertyId, isActive }: { propertyId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => startTransition(() => togglePropertyActive(propertyId, !isActive))}
    >
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}

export function RestaurantActiveToggle({
  restaurantId,
  propertyId,
  isActive,
}: {
  restaurantId: string;
  propertyId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleRestaurantActive(restaurantId, propertyId, !isActive))}
      className={`text-xs ${isActive ? "text-emerald-600" : "text-gray-400"} hover:underline`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
