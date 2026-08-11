"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { moveReservation } from "@/app/actions/reservation-move";
import { formatMoney } from "@/lib/format-money";

const CELL_WIDTH = 68;
const ROOM_COL_WIDTH = 150;

type Room = { id: string; room_number: string; status: string; room_type_id: string; room_types: { name: string; base_rate: number } | null };
type Bar = {
  id: string;
  room_id: string | null;
  room_type_id: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  rate_per_night: number;
  guests: { full_name: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-purple-100 text-purple-800 border-purple-300",
  checked_in: "bg-accent-soft text-accent border-accent/40",
};

export function RoomRackGrid({ rooms, reservations, dates, currency }: { rooms: Room[]; reservations: Bar[]; dates: string[]; currency: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<Bar | null>(null);

  const dateIndex = new Map(dates.map((d, i) => [d, i]));
  const barsByRoom = new Map<string, Bar[]>();
  for (const r of reservations) {
    if (!r.room_id) continue;
    barsByRoom.set(r.room_id, [...(barsByRoom.get(r.room_id) ?? []), r]);
  }

  async function handleDrop(targetRoom: Room, targetDate: string) {
    if (!dragging) return;
    const bar = dragging;
    setDragging(null);
    if (!["confirmed", "checked_in"].includes(bar.status)) return;

    const nights = Math.round((new Date(bar.check_out_date).getTime() - new Date(bar.check_in_date).getTime()) / 86400000);
    const newCheckIn = targetDate;
    const newCheckOutDate = new Date(`${targetDate}T00:00:00Z`);
    newCheckOutDate.setUTCDate(newCheckOutDate.getUTCDate() + nights);
    const newCheckOut = newCheckOutDate.toISOString().slice(0, 10);

    const typeChanged = targetRoom.room_type_id !== bar.room_type_id;
    const newRate = typeChanged ? targetRoom.room_types?.base_rate ?? bar.rate_per_night : null;
    if (targetRoom.id === bar.room_id && newCheckIn === bar.check_in_date) return;

    const guestName = bar.guests?.full_name ?? "Guest";
    let message = `Move ${guestName} to Room ${targetRoom.room_number}, ${newCheckIn} → ${newCheckOut}?`;
    if (typeChanged) {
      message += ` This changes the room type to ${targetRoom.room_types?.name} — rate will update to ${formatMoney(newRate ?? 0, currency)}/night.`;
    }
    if (!confirm(message)) return;

    startTransition(async () => {
      try {
        await moveReservation(bar.id, targetRoom.id, newCheckIn, newCheckOut, newRate);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not move reservation");
      }
    });
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: ROOM_COL_WIDTH + dates.length * CELL_WIDTH }}>
        <div className="flex border-b border-black/10 text-xs uppercase text-gray-400">
          <div style={{ width: ROOM_COL_WIDTH }} className="shrink-0 px-3 py-2 font-medium">
            Room
          </div>
          {dates.map((d) => (
            <div key={d} style={{ width: CELL_WIDTH }} className="shrink-0 py-2 text-center font-medium">
              {new Date(d).toLocaleDateString([], { day: "2-digit", month: "short" })}
            </div>
          ))}
        </div>

        {rooms.map((room) => {
          const bars = barsByRoom.get(room.id) ?? [];
          const notSellable = room.status === "maintenance" || room.status === "out_of_order";
          return (
            <div key={room.id} className="flex border-b border-gray-50">
              <div style={{ width: ROOM_COL_WIDTH }} className="shrink-0 px-3 py-2">
                <div className="text-sm font-medium text-gray-800">{room.room_number}</div>
                <div className="text-xs text-gray-400">{room.room_types?.name}</div>
              </div>
              <div className="relative" style={{ width: dates.length * CELL_WIDTH, height: 44 }}>
                <div className="absolute inset-0 flex">
                  {dates.map((d) => (
                    <div
                      key={d}
                      style={{ width: CELL_WIDTH }}
                      className={`h-full shrink-0 border-r border-gray-50 ${notSellable ? "bg-red-50" : ""}`}
                      onDragOver={(e) => {
                        if (!notSellable) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (!notSellable) handleDrop(room, d);
                      }}
                    />
                  ))}
                </div>
                {bars.map((bar) => {
                  const startIdx = dateIndex.get(bar.check_in_date) ?? -Infinity;
                  const nightsInView = (dateIndex.get(bar.check_out_date) ?? dates.length) - Math.max(0, startIdx);
                  const clippedStart = Math.max(0, startIdx);
                  if (clippedStart >= dates.length) return null;
                  const width = Math.max(1, nightsInView) * CELL_WIDTH - 4;
                  const draggable = ["confirmed", "checked_in"].includes(bar.status);
                  return (
                    <Link
                      key={bar.id}
                      href={`/reservations/${bar.id}`}
                      draggable={draggable}
                      onDragStart={() => setDragging(bar)}
                      onDragEnd={() => setDragging(null)}
                      title={`${bar.guests?.full_name ?? "Guest"} · ${bar.check_in_date} → ${bar.check_out_date}`}
                      style={{ left: clippedStart * CELL_WIDTH + 2, width, top: 4, height: 36 }}
                      className={`absolute flex items-center truncate rounded border px-2 text-xs font-medium ${
                        STATUS_STYLE[bar.status] ?? "bg-gray-100 text-gray-600 border-gray-300"
                      } ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer opacity-70"}`}
                    >
                      {bar.guests?.full_name ?? "Guest"}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
