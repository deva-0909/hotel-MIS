"use client";

import { useTransition } from "react";
import { addOrderItem } from "@/app/actions/restaurant";
import { formatMoney } from "@/lib/format-money";

type Suggestion = { id: string; name: string; price: number };

export function UpsellPrompt({ orderId, suggestions, currency }: { orderId: string; suggestions: Suggestion[]; currency: string }) {
  const [pending, startTransition] = useTransition();
  if (!suggestions.length) return null;

  return (
    <div className="border-t border-gray-100 bg-amber-50/50 px-5 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Frequently added together</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.id}
            disabled={pending}
            className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs text-amber-800 hover:bg-amber-100"
            onClick={() => {
              const fd = new FormData();
              fd.set("menu_item_id", s.id);
              fd.set("quantity", "1");
              startTransition(() => addOrderItem(orderId, fd));
            }}
          >
            + {s.name} ({formatMoney(s.price, currency)})
          </button>
        ))}
      </div>
    </div>
  );
}
