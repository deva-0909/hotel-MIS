"use client";

import { useTransition } from "react";
import { markRoomStatus } from "@/app/actions/housekeeping";
import { Badge } from "@/components/ui";

const OPTIONS: { value: "dirty" | "inspecting" | "clean"; label: string; color: "amber" | "purple" | "green" }[] = [
  { value: "dirty", label: "Dirty", color: "amber" },
  { value: "inspecting", label: "Inspecting", color: "purple" },
  { value: "clean", label: "Clean", color: "green" },
];

export function RoomStatusButtons({ roomId, status }: { roomId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          disabled={pending}
          onClick={() => startTransition(() => markRoomStatus(roomId, opt.value))}
          className={status === opt.value ? "" : "opacity-40 hover:opacity-100"}
        >
          <Badge color={opt.color}>{opt.label}</Badge>
        </button>
      ))}
    </div>
  );
}
