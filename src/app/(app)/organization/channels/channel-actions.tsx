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
