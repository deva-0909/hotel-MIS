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
