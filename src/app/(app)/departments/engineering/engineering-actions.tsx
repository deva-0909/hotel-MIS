"use client";

import { useTransition } from "react";
import { updateWorkOrder } from "@/app/actions/engineering";
import { Select } from "@/components/ui";

const STATUSES = ["open", "assigned", "in_progress", "scheduled", "resolved"];

export function WorkOrderStatusControl({ workOrderId, status }: { workOrderId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateWorkOrder(workOrderId, { status: e.target.value }))}
      className="text-xs"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </Select>
  );
}
