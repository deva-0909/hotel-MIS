"use client";

import { useState, useTransition } from "react";
import { updateWorkOrder } from "@/app/actions/engineering";
import { Select, Input } from "@/components/ui";

const STATUSES = ["open", "assigned", "in_progress", "scheduled", "resolved"];

export function AssignedToControl({ workOrderId, assignedTo }: { workOrderId: string; assignedTo: string | null }) {
  const [value, setValue] = useState(assignedTo ?? "");
  const [pending, startTransition] = useTransition();
  return (
    <Input
      value={value}
      disabled={pending}
      placeholder="Unassigned"
      className="h-7 w-28 text-xs"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== (assignedTo ?? "")) {
          startTransition(() => updateWorkOrder(workOrderId, { assigned_to: value }));
        }
      }}
    />
  );
}

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
