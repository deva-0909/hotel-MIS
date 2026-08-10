"use client";

import { useTransition } from "react";
import { cancelBooking } from "@/app/actions/booking";
import { Button } from "@/components/ui";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (confirm("Cancel every room still on this booking? Any configured cancellation fee will be applied per room.")) {
          startTransition(() => cancelBooking(bookingId));
        }
      }}
    >
      Cancel whole booking
    </Button>
  );
}
