"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  generateInvoiceForReservation,
  markNoShow,
} from "@/app/actions/hotel";
import { moveReservation } from "@/app/actions/reservation-move";
import { getSignatureUrl } from "@/app/actions/guests";
import { Button, Select, Input, Label } from "@/components/ui";
import { formatMoney } from "@/lib/format-money";
import { SignaturePad } from "@/components/signature-pad";

type Room = { id: string; room_number: string; room_type_id: string; room_types: { name: string; base_rate: number } | null };

// One form for "assign the first room", "change/upgrade/downgrade the
// room", and "move dates" — all three are the same move_reservation() call
// underneath, just with some fields left equal to their current value.
export function ChangeRoomForm({
  reservationId,
  rooms,
  currentRoomId,
  currentRoomTypeId,
  currentRate,
  checkInDate,
  checkOutDate,
  currency,
}: {
  reservationId: string;
  rooms: Room[];
  currentRoomId: string | null;
  currentRoomTypeId: string;
  currentRate: number;
  checkInDate: string;
  checkOutDate: string;
  currency: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [roomId, setRoomId] = useState(currentRoomId ?? "");
  const [checkIn, setCheckIn] = useState(checkInDate);
  const [checkOut, setCheckOut] = useState(checkOutDate);

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const typeChanges = selectedRoom && selectedRoom.room_type_id !== currentRoomTypeId;
  const newRate = typeChanges ? selectedRoom?.room_types?.base_rate ?? currentRate : currentRate;

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label>Room</Label>
          <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">Select room…</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.room_number} — {r.room_types?.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div>
          <Label>Check-in</Label>
          <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </div>
        <div>
          <Label>Check-out</Label>
          <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
      </div>
      {typeChanges && (
        <p className="text-xs text-amber-700">
          Room type changes to {selectedRoom?.room_types?.name} — rate updates to {formatMoney(newRate, currency)}/night.
        </p>
      )}
      <Button
        variant="secondary"
        disabled={!roomId || pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await moveReservation(reservationId, roomId, checkIn, checkOut, typeChanges ? newRate : null);
              router.refresh();
            } catch (err) {
              alert(err instanceof Error ? err.message : "Could not update the reservation");
            }
          })
        }
      >
        {currentRoomId ? "Update" : "Assign"}
      </Button>
    </div>
  );
}

function CheckInDialog({ reservationId, disabled }: { reservationId: string; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [signature, setSignature] = useState<string | null>(null);
  const [fee, setFee] = useState("0");
  const router = useRouter();

  const submit = () => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("fee", fee || "0");
        if (signature) {
          const blob = await (await fetch(signature)).blob();
          fd.set("signature", new File([blob], "signature.png", { type: "image/png" }));
        }
        await checkInReservation(reservationId, fd);
        setOpen(false);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not check in");
      }
    });
  };

  if (!open) {
    return (
      <Button disabled={disabled} onClick={() => setOpen(true)}>
        Check in
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900">Check in</h3>
        <div className="mt-3">
          <Label>Guest signature (optional — registration card acknowledgement)</Label>
          <SignaturePad onChange={setSignature} />
        </div>
        <div className="mt-3">
          <Label>Early check-in fee (only applied if this arrival is actually early)</Label>
          <Input value={fee} onChange={(e) => setFee(e.target.value)} type="number" min={0} step="0.01" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={submit}>
            Confirm check-in
          </Button>
        </div>
      </div>
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

  const handleCheckOut = () => {
    const feeStr = prompt("Late checkout fee to charge, if this guest is leaving after standard checkout time (leave as 0 otherwise):", "0");
    if (feeStr === null) return;
    const fd = new FormData();
    fd.set("fee", feeStr || "0");
    startTransition(() => checkOutReservation(reservationId, fd));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "confirmed" && (
        <>
          {hasRoom ? (
            <CheckInDialog reservationId={reservationId} disabled={pending} />
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
        <Button disabled={pending} onClick={handleCheckOut}>
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

export function ViewSignatureLink({ filePath }: { filePath: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      className="text-xs text-accent hover:underline"
      onClick={() =>
        startTransition(async () => {
          try {
            const url = await getSignatureUrl(filePath);
            window.open(url, "_blank", "noopener,noreferrer");
          } catch (err) {
            alert(err instanceof Error ? err.message : "Could not open signature");
          }
        })
      }
    >
      View signature
    </button>
  );
}
