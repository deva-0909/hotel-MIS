"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createJournalEntry } from "@/app/actions/ledger";
import { Card, CardHeader, Input, Label, Select, Button } from "@/components/ui";

type Account = { id: string; code: string; name: string };
type Line = { account_id: string; debit: string; credit: string };

const EMPTY_LINE: Line = { account_id: "", debit: "", credit: "" };

export function JournalEntryForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.005;

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!balanced) {
      setError("Debits and credits must balance before posting.");
      return;
    }

    const formData = new FormData();
    formData.set("entry_date", date);
    formData.set("description", description);
    formData.set(
      "lines",
      JSON.stringify(
        lines
          .filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0))
          .map((l) => ({ account_id: l.account_id, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      ),
    );

    setPending(true);
    try {
      const result = await createJournalEntry(formData);
      router.push(`/accounts/journal-entries/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
      setPending(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader title="New journal entry" />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="e.g. Owner capital infusion"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Lines</Label>
          {lines.map((line, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <Select value={line.account_id} onChange={(e) => updateLine(i, { account_id: e.target.value })} required>
                  <option value="">Select account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-28">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Debit"
                  value={line.debit}
                  onChange={(e) => updateLine(i, { debit: e.target.value, credit: e.target.value ? "" : line.credit })}
                />
              </div>
              <div className="w-28">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Credit"
                  value={line.credit}
                  onChange={(e) => updateLine(i, { credit: e.target.value, debit: e.target.value ? "" : line.debit })}
                />
              </div>
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={lines.length <= 2}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
            className="text-xs text-accent hover:underline"
          >
            + Add line
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
          <span className={balanced ? "text-emerald-600" : "text-amber-600"}>
            Debit ₹{totalDebit.toFixed(2)} · Credit ₹{totalCredit.toFixed(2)}
          </span>
          {!balanced && <span className="text-amber-600">Out of balance</span>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={pending || !balanced}>
          {pending ? "Saving…" : "Post journal entry"}
        </Button>
      </form>
    </Card>
  );
}
