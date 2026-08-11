"use client";

import { useTransition } from "react";
import {
  updateItemMealPeriod,
  toggleComboAvailability,
  deleteMealPeriod,
  deleteMenuItemVariant,
  deleteModifierGroup,
  deleteModifier,
  removeComboItem,
  deleteUpsell,
} from "@/app/actions/restaurant";
import { Select } from "@/components/ui";

type Period = { id: string; name: string };

export function ItemMealPeriodSelect({ itemId, currentPeriodId, periods }: { itemId: string; currentPeriodId: string | null; periods: Period[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={currentPeriodId ?? ""}
      disabled={pending}
      onChange={(e) => startTransition(() => updateItemMealPeriod(itemId, e.target.value || null))}
      className="text-xs"
    >
      <option value="">Always</option>
      {periods.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}

export function ComboAvailabilityToggle({ comboId, available }: { comboId: string; available: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleComboAvailability(comboId, !available))}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${available ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
    >
      {available ? "Available" : "86'd"}
    </button>
  );
}

function DeleteLink({ onDelete, label = "Remove" }: { onDelete: () => Promise<void>; label?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button disabled={pending} onClick={() => startTransition(onDelete)} className="text-xs text-gray-400 hover:text-red-600">
      {label}
    </button>
  );
}

export const DeleteMealPeriodButton = ({ periodId }: { periodId: string }) => <DeleteLink onDelete={() => deleteMealPeriod(periodId)} />;
export const DeleteVariantButton = ({ variantId }: { variantId: string }) => <DeleteLink onDelete={() => deleteMenuItemVariant(variantId)} />;
export const DeleteModifierGroupButton = ({ groupId }: { groupId: string }) => <DeleteLink onDelete={() => deleteModifierGroup(groupId)} />;
export const DeleteModifierButton = ({ modifierId }: { modifierId: string }) => <DeleteLink onDelete={() => deleteModifier(modifierId)} />;
export const RemoveComboItemButton = ({ comboItemId }: { comboItemId: string }) => <DeleteLink onDelete={() => removeComboItem(comboItemId)} />;
export const DeleteUpsellButton = ({ upsellId }: { upsellId: string }) => <DeleteLink onDelete={() => deleteUpsell(upsellId)} />;
