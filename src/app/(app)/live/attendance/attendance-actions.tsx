"use client";

import { useTransition } from "react";
import { markAttendance, updateLeaveRequest } from "@/app/actions/hr";
import { Button } from "@/components/ui";

const CYCLE: Record<string, "present" | "absent" | "leave" | "week_off"> = {
  "—": "present",
  P: "absent",
  A: "leave",
  L: "week_off",
  W: "present",
};

const CODE_STYLE: Record<string, string> = {
  P: "bg-emerald-50 text-emerald-700",
  A: "bg-red-50 text-red-600",
  L: "bg-amber-50 text-amber-700",
  W: "bg-gray-100 text-gray-400",
  "—": "bg-gray-50 text-gray-300",
};

export function AttendanceCell({ employeeId, date, code }: { employeeId: string; date: string; code: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      title="Click to cycle status"
      onClick={() => startTransition(() => markAttendance(employeeId, date, CYCLE[code]))}
      className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-medium ${CODE_STYLE[code]}`}
    >
      {code}
    </button>
  );
}

export function LeaveActionButtons({ leaveId }: { leaveId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2">
      <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => updateLeaveRequest(leaveId, "approved"))}>
        Approve
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => startTransition(() => updateLeaveRequest(leaveId, "rejected"))}>
        Reject
      </Button>
    </div>
  );
}
