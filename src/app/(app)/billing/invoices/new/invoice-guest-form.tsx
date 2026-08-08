"use client";

import { useState } from "react";
import { createInvoice } from "@/app/actions/billing";
import { Card, CardHeader, Input, Label, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Guest = { id: string; full_name: string; phone: string | null };

export function InvoiceGuestForm({ guests }: { guests: Guest[] }) {
  const [mode, setMode] = useState<"existing" | "new">(guests.length ? "existing" : "new");

  return (
    <Card className="max-w-md">
      <CardHeader title="New invoice" />
      <form action={createInvoice} className="space-y-3 px-5 py-5">
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`rounded-full px-3 py-1 ${mode === "existing" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Existing guest
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`rounded-full px-3 py-1 ${mode === "new" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            New guest
          </button>
        </div>
        {mode === "existing" ? (
          <Select name="guest_id" required>
            <option value="">Select guest…</option>
            {guests.map((g) => (
              <option key={g.id} value={g.id}>
                {g.full_name} {g.phone ? `(${g.phone})` : ""}
              </option>
            ))}
          </Select>
        ) : (
          <div>
            <Label>Guest name</Label>
            <Input name="new_guest_name" required />
          </div>
        )}
        <SubmitButton>Create invoice</SubmitButton>
      </form>
    </Card>
  );
}
