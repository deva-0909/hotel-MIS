"use client";

import { useTransition } from "react";
import { togglePosTerminalActive, deletePosTerminal } from "@/app/actions/pos-terminals";

export function PosTerminalActiveToggle({ terminalId, isActive }: { terminalId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => togglePosTerminalActive(terminalId, !isActive))}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}

export function DeletePosTerminalButton({ terminalId }: { terminalId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Remove this POS terminal?")) startTransition(() => deletePosTerminal(terminalId));
      }}
      className="text-xs text-gray-400 hover:text-red-600"
    >
      Remove
    </button>
  );
}
