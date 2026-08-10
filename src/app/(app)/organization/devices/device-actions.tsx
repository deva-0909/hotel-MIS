"use client";

import { useTransition } from "react";
import { toggleDeviceActive, deleteDevice } from "@/app/actions/devices";

export function DeviceActiveToggle({ deviceId, isActive }: { deviceId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleDeviceActive(deviceId, !isActive))}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}

export function DeleteDeviceButton({ deviceId }: { deviceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Remove this device?")) startTransition(() => deleteDevice(deviceId));
      }}
      className="text-xs text-gray-400 hover:text-red-600"
    >
      Remove
    </button>
  );
}
