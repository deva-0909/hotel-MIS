"use client";

import { useTransition } from "react";
import { toggleStaffActive, updateStaffRole, updateStaffProperty } from "@/app/actions/staff";
import { revokeInvite } from "@/app/actions/invites";
import { Select } from "@/components/ui";
import type { Database } from "@/lib/database.types";

type StaffRole = Database["public"]["Enums"]["staff_role"];

const ROLES: StaffRole[] = [
  "admin",
  "front_office",
  "restaurant_manager",
  "waiter",
  "chef",
  "housekeeping",
  "inventory_manager",
  "accountant",
];

export const ALL_ROLES: StaffRole[] = [
  "admin",
  "front_office",
  "housekeeping",
  "restaurant_manager",
  "waiter",
  "chef",
  "inventory_manager",
  "engineering",
  "hr",
  "accountant",
  "crm_marketing",
  "banquet",
  "spa_laundry",
  "travel_desk",
];

export function RoleSelect({ staffId, role }: { staffId: string; role: StaffRole }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={role}
      disabled={pending}
      onChange={(e) => startTransition(() => updateStaffRole(staffId, e.target.value as StaffRole))}
      className="text-xs"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r.replace(/_/g, " ")}
        </option>
      ))}
    </Select>
  );
}

export function PropertySelect({
  staffId,
  propertyId,
  properties,
}: {
  staffId: string;
  propertyId: string | null;
  properties: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={propertyId ?? ""}
      disabled={pending}
      onChange={(e) => startTransition(() => updateStaffProperty(staffId, e.target.value))}
      className="text-xs"
    >
      <option value="" disabled>
        Unassigned
      </option>
      {properties.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}

export function ActiveToggle({ staffId, active }: { staffId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleStaffActive(staffId, !active))}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => revokeInvite(inviteId))}
      className="text-xs text-gray-400 hover:text-red-600"
    >
      Revoke
    </button>
  );
}
