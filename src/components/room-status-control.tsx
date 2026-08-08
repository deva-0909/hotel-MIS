"use client";

import { useTransition } from "react";
import { updateRoomStatus } from "@/app/actions/hotel";
import { Select } from "@/components/ui";
import type { Database } from "@/lib/database.types";

type RoomStatus = Database["public"]["Enums"]["room_status"];

const OPTIONS: RoomStatus[] = ["available", "occupied", "reserved", "dirty", "maintenance", "out_of_order"];

export function RoomStatusControl({ roomId, status }: { roomId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateRoomStatus(roomId, e.target.value as RoomStatus))}
      className="text-xs"
    >
      {OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </Select>
  );
}
