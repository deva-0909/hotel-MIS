"use client";

import { useMemo, useState, useTransition } from "react";
import { addOrderItem, addComboOrderItem } from "@/app/actions/restaurant";
import { Button, Select, Input, Label } from "@/components/ui";
import { formatMoney } from "@/lib/format-money";

type Variant = { id: string; name: string; price_delta: number; is_default: boolean };
type Modifier = { id: string; name: string; price_delta: number };
type ModifierGroup = { id: string; name: string; selection_type: "single" | "multiple"; is_required: boolean; modifiers: Modifier[] };
type MenuItem = {
  id: string;
  name: string;
  price: number;
  parcel_price: number | null;
  own_delivery_price: number | null;
  aggregator_price: number | null;
  variants: Variant[];
  modifierGroups: ModifierGroup[];
};
type Combo = { id: string; name: string; price: number };

function channelPriceFor(item: MenuItem, orderType: string): number {
  switch (orderType) {
    case "takeaway":
      return item.parcel_price ?? item.price;
    case "delivery_own":
      return item.own_delivery_price ?? item.price;
    case "delivery_aggregator":
      return item.aggregator_price ?? item.price;
    default:
      return item.price;
  }
}

export function AddItemForm({
  orderId,
  orderType,
  items,
  combos,
  currency,
}: {
  orderId: string;
  orderType: string;
  items: MenuItem[];
  combos: Combo[];
  currency: string;
}) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"item" | "combo">("item");
  const [itemId, setItemId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [comboId, setComboId] = useState("");

  const item = items.find((i) => i.id === itemId) ?? null;
  const defaultVariant = item?.variants.find((v) => v.is_default);

  const estimatedPrice = useMemo(() => {
    if (!item) return 0;
    let total = channelPriceFor(item, orderType);
    const variant = item.variants.find((v) => v.id === (variantId || defaultVariant?.id));
    if (variant) total += Number(variant.price_delta);
    for (const group of item.modifierGroups) {
      for (const modId of selectedModifiers[group.id] ?? []) {
        const mod = group.modifiers.find((m) => m.id === modId);
        if (mod) total += Number(mod.price_delta);
      }
    }
    return total;
  }, [item, orderType, variantId, defaultVariant, selectedModifiers]);

  const toggleModifier = (groupId: string, modifierId: string, selectionType: "single" | "multiple") => {
    setSelectedModifiers((prev) => {
      const current = prev[groupId] ?? [];
      if (selectionType === "single") {
        return { ...prev, [groupId]: current.includes(modifierId) ? [] : [modifierId] };
      }
      const next = current.includes(modifierId) ? current.filter((id) => id !== modifierId) : [...current, modifierId];
      return { ...prev, [groupId]: next };
    });
  };

  const missingRequired = item?.modifierGroups.some((g) => g.is_required && !(selectedModifiers[g.id] ?? []).length);

  const submitItem = () => {
    if (!item) return;
    const fd = new FormData();
    fd.set("menu_item_id", item.id);
    if (variantId || defaultVariant) fd.set("variant_id", variantId || defaultVariant!.id);
    fd.set("quantity", String(quantity));
    for (const ids of Object.values(selectedModifiers)) {
      for (const id of ids) fd.append("modifier_ids", id);
    }
    startTransition(async () => {
      await addOrderItem(orderId, fd);
      setItemId("");
      setVariantId("");
      setSelectedModifiers({});
      setQuantity(1);
    });
  };

  const submitCombo = () => {
    if (!comboId) return;
    const fd = new FormData();
    fd.set("combo_id", comboId);
    fd.set("quantity", String(quantity));
    startTransition(async () => {
      await addComboOrderItem(orderId, fd);
      setComboId("");
      setQuantity(1);
    });
  };

  return (
    <div className="space-y-3 border-t border-gray-100 px-5 py-4">
      {!!combos.length && (
        <div className="flex gap-4 text-xs">
          <button type="button" className={mode === "item" ? "font-semibold text-accent" : "text-gray-400"} onClick={() => setMode("item")}>
            Menu item
          </button>
          <button type="button" className={mode === "combo" ? "font-semibold text-accent" : "text-gray-400"} onClick={() => setMode("combo")}>
            Combo
          </button>
        </div>
      )}

      {mode === "item" ? (
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>Menu item</Label>
              <Select
                value={itemId}
                onChange={(e) => {
                  setItemId(e.target.value);
                  setVariantId("");
                  setSelectedModifiers({});
                }}
              >
                <option value="">Select item…</option>
                {items.map((mi) => (
                  <option key={mi.id} value={mi.id}>
                    {mi.name} — {formatMoney(channelPriceFor(mi, orderType), currency)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-20">
              <Label>Qty</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} />
            </div>
          </div>

          {!!item?.variants.length && (
            <div>
              <Label>Size / variant</Label>
              <Select value={variantId || defaultVariant?.id || ""} onChange={(e) => setVariantId(e.target.value)}>
                {item.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.price_delta ? `(+${formatMoney(v.price_delta, currency)})` : ""}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {item?.modifierGroups.map((group) => (
            <div key={group.id}>
              <Label>
                {group.name} {group.is_required && <span className="text-red-500">*</span>}
              </Label>
              <div className="flex flex-wrap gap-2">
                {group.modifiers.map((m) => {
                  const checked = (selectedModifiers[group.id] ?? []).includes(m.id);
                  return (
                    <label key={m.id} className={`flex items-center gap-1 rounded border px-2 py-1 text-xs ${checked ? "border-accent bg-accent-soft" : "border-gray-200"}`}>
                      <input
                        type={group.selection_type === "single" ? "radio" : "checkbox"}
                        checked={checked}
                        onChange={() => toggleModifier(group.id, m.id, group.selection_type)}
                      />
                      {m.name} {m.price_delta ? `+${formatMoney(m.price_delta, currency)}` : ""}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {item && (
            <p className="text-xs text-gray-500">
              Line total: {formatMoney(estimatedPrice * quantity, currency)}
              {missingRequired && <span className="ml-2 text-red-500">Select a required option above</span>}
            </p>
          )}

          <Button variant="secondary" disabled={!item || !!missingRequired || pending} onClick={submitItem}>
            Add
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label>Combo</Label>
            <Select value={comboId} onChange={(e) => setComboId(e.target.value)}>
              <option value="">Select combo…</option>
              {combos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {formatMoney(c.price, currency)}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-20">
            <Label>Qty</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} />
          </div>
          <Button variant="secondary" disabled={!comboId || pending} onClick={submitCombo}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
