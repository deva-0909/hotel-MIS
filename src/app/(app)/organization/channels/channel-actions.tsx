"use client";

import { useState, useTransition } from "react";
import { triggerChannelSync, retryChannelSync, deleteChannelConnection } from "@/app/actions/channels";
import { Button } from "@/components/ui";

export function SyncNowButton({ connectionId, isRetry }: { connectionId: string; isRetry?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string | null } | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = isRetry ? await retryChannelSync(connectionId) : await triggerChannelSync(connectionId);
            setResult(res);
          })
        }
      >
        {pending ? "Syncing…" : isRetry ? "Retry sync" : "Sync now"}
      </Button>
      {result && !pending && (
        <span className={`text-xs ${result.success ? "text-emerald-600" : "text-red-600"}`}>
          {result.success ? "Synced" : result.error}
        </span>
      )}
    </div>
  );
}

// Fires from the browser that's actually viewing this page, against this
// app's own deployed URL — unlike everything else verified during
// development, this genuinely proves the route is reachable and DB-wired,
// because it isn't run from a sandboxed dev session with its own network
// restrictions. event_type "ping" touches no data (see the route).
export function TestWebhookButton({ connectionId }: { connectionId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const res = await fetch(`/api/channels/webhook/${connectionId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_type: "ping", external_booking_id: "ping" }),
              });
              const body = await res.json();
              setResult(
                res.ok
                  ? { ok: true, message: `Reachable — ${body.channel ?? "connection"} / ${body.property ?? "property"}` }
                  : { ok: false, message: body.error ?? `HTTP ${res.status}` },
              );
            } catch (err) {
              setResult({ ok: false, message: err instanceof Error ? err.message : "Network error" });
            }
          })
        }
      >
        {pending ? "Testing…" : "Send test webhook"}
      </Button>
      {result && !pending && <span className={`text-xs ${result.ok ? "text-emerald-600" : "text-red-600"}`}>{result.message}</span>}
    </div>
  );
}

export function PreviewIcalButton({ url }: { url: string }) {
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        className="text-xs text-accent hover:underline"
        onClick={() =>
          startTransition(async () => {
            try {
              const res = await fetch(url);
              const text = await res.text();
              setPreview({ ok: res.ok, text: res.ok ? text : `HTTP ${res.status}: ${text}` });
            } catch (err) {
              setPreview({ ok: false, text: err instanceof Error ? err.message : "Network error" });
            }
          })
        }
      >
        {pending ? "Fetching…" : "Preview feed"}
      </button>
      {preview && (
        <pre
          className={`max-h-32 overflow-auto rounded p-2 text-[10px] ${preview.ok ? "bg-gray-50 text-gray-600" : "bg-red-50 text-red-600"}`}
        >
          {preview.text.slice(0, 800)}
        </pre>
      )}
    </div>
  );
}

export function DeleteConnectionButton({ connectionId }: { connectionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Disconnect this channel? Sync history and rate-plan mappings for it will be removed.")) {
          startTransition(() => deleteChannelConnection(connectionId));
        }
      }}
      className="text-xs text-gray-400 hover:text-red-600"
    >
      Disconnect
    </button>
  );
}
