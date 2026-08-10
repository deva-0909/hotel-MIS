"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  assignRoom,
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  generateInvoiceForReservation,
  markNoShow,
} from "@/app/actions/hotel";
import { Button, Select } from "@/components/ui";

type Room = { id: string; room_number: string };

export function AssignRoomControl({ reservationId, rooms }: { reservationId: string; rooms: Room[] }) {
  const [pending, startTransition] = useTransition();
  const [roomId, setRoomId] = useState("");

  return (
    <div className="flex items-center gap-2">
      <Select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-40">
        <option value="">Select room…</option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.room_number}
          </option>
        ))}
      </Select>
      <Button
        variant="secondary"
        disabled={!roomId || pending}
        onClick={() => startTransition(() => assignRoom(reservationId, roomId))}
      >
        Assign
      </Button>
    </div>
  );
}

export function ReservationLifecycleActions({
  reservationId,
  status,
  hasRoom,
}: {
  reservationId: string;
  status: string;
  hasRoom: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "confirmed" && (
        <>
          {hasRoom ? (
            <Button disabled={pending} onClick={() => startTransition(() => checkInReservation(reservationId))}>
              Check in
            </Button>
          ) : (
            <span className="text-xs text-gray-400">Assign a room to check in</span>
          )}
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => startTransition(() => cancelReservation(reservationId))}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (confirm("Mark this reservation as a no-show? Any configured no-show fee will be charged.")) {
                startTransition(() => markNoShow(reservationId));
              }
            }}
          >
            No-show
          </Button>
        </>
      )}
      {status === "checked_in" && (
        <Button disabled={pending} onClick={() => startTransition(() => checkOutReservation(reservationId))}>
          Check out
        </Button>
      )}
      {status === "checked_out" && (
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await generateInvoiceForReservation(reservationId);
              router.refresh();
            })
          }
        >
          Generate invoice
        </Button>
      )}
    </div>
  );
}
