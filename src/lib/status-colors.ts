export const PO_STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red" | "purple" | "gold"> = {
  draft: "gray",
  pending_approval: "amber",
  approved: "purple",
  ordered: "blue",
  partially_received: "amber",
  received: "green",
  rejected: "red",
  cancelled: "red",
};

export const EVENT_STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red" | "purple" | "gold"> = {
  tentative: "amber",
  confirmed: "blue",
  completed: "green",
  cancelled: "red",
};

export const TRANSFER_STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "gray" | "red" | "purple" | "gold"> = {
  requested: "gray",
  in_transit: "amber",
  received: "green",
  cancelled: "red",
};
