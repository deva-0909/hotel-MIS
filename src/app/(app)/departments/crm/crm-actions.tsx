"use client";

import { useTransition } from "react";
import { updateCampaignStatus } from "@/app/actions/crm";
import { Select } from "@/components/ui";

type CampaignStatus = "draft" | "scheduled" | "live" | "ended";

export function CampaignStatusControl({ campaignId, status }: { campaignId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateCampaignStatus(campaignId, e.target.value as CampaignStatus))}
      className="text-xs"
    >
      <option value="draft">Draft</option>
      <option value="scheduled">Scheduled</option>
      <option value="live">Live</option>
      <option value="ended">Ended</option>
    </Select>
  );
}
