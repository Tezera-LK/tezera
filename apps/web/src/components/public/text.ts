import type { EventStatus, VendorKind } from "@/lib/data/types";

// Labels shared by the public pages. EN-07-T4 moves these into translation files.

// "published" needs no label: only postponed and cancelled events get a pill
export const EVENT_STATUS_LABEL: Record<Exclude<EventStatus, "published">, string> = {
  postponed: "Postponed",
  cancelled: "Cancelled",
};

export const VENDOR_KIND_LABEL: Record<VendorKind, string> = {
  vendor: "Vendor",
  freelancer: "Freelancer",
};
