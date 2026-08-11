"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchGuestsByQuery, mergeGuestProfiles, updateGuestRequestStatus } from "@/app/actions/guests";
import { Button, Input, Select, Label } from "@/components/ui";

type GuestMatch = { id: string; full_name: string; phone: string | null; email: string | null };

export function MergeGuestForm({ guestId }: { guestId: string }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<GuestMatch[]>([]);
  const [selected, setSelected] = useState<GuestMatch | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const search = () => {
    startTransition(async () => {
      const results = await searchGuestsByQuery(query, guestId);
      setMatches(results);
    });
  };

  const merge = () => {
    if (!selected) return;
    if (!confirm(`Merge "${selected.full_name}" into this profile? Their stays, invoices, and history move here, and their duplicate profile is deleted.`)) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("source_guest_id", selected.id);
        await mergeGuestProfiles(guestId, fd);
        setSelected(null);
        setMatches([]);
        setQuery("");
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not merge profiles");
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label>Find a duplicate profile (name, phone, or email)</Label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button variant="secondary" disabled={pending || !query.trim()} onClick={search}>
          Search
        </Button>
      </div>
      {!!matches.length && (
        <div className="space-y-1 rounded border border-gray-100 p-2">
          {matches.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-xs text-gray-700">
              <input type="radio" name="merge_candidate" checked={selected?.id === m.id} onChange={() => setSelected(m)} />
              {m.full_name} {m.phone ? `· ${m.phone}` : ""} {m.email ? `· ${m.email}` : ""}
            </label>
          ))}
        </div>
      )}
      {selected && (
        <Button variant="danger" disabled={pending} onClick={merge}>
          Merge &quot;{selected.full_name}&quot; into this profile
        </Button>
      )}
    </div>
  );
}

export function RequestStatusForm({ requestId, guestId, currentStatus }: { requestId: string; guestId: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState("");

  if (currentStatus === "resolved") return null;

  return (
    <form
      action={(fd) => startTransition(() => updateGuestRequestStatus(requestId, guestId, fd))}
      className="mt-1 flex flex-wrap items-end gap-1"
    >
      <Select name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-32 text-xs">
        <option value="open">Open</option>
        <option value="in_progress">In progress</option>
        <option value="resolved">Resolved</option>
      </Select>
      <Input name="resolution_notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resolution notes" className="w-40 text-xs" />
      <button type="submit" disabled={pending} className="text-xs text-accent hover:underline">
        Update
      </button>
    </form>
  );
}
