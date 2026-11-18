// What the public pages may show. Written by hand for now; Phase B derives these from the
// Amplify schema (EN-03) with SelectionSet, so a page can't use a field that was never fetched.
// Public fields only: no drafts, no contact details, nothing a visitor must not see.

export type EventStatus = "published" | "postponed" | "cancelled";

export type PublicEvent = {
  id: string;
  title: string;
  summary: string;
  // ISO 8601 date and time with offset, e.g. 2026-12-12T18:00:00+05:30
  startsAt: string;
  venueName: string;
  district: string;
  // postponed and cancelled events stay visible (PRD EV-02)
  status: EventStatus;
  organiser: { id: string; name: string };
};

export type EventSummary = Pick<PublicEvent, "id" | "title" | "startsAt" | "status">;

export type PublicOrganiser = {
  id: string;
  name: string;
  description: string;
  district: string;
  verified: boolean;
  upcomingEvents: EventSummary[];
};

// vendors are businesses; freelancers are individuals and don't take stalls (PRD section 3)
export type VendorKind = "vendor" | "freelancer";

export type PublicVendor = {
  id: string;
  name: string;
  kind: VendorKind;
  category: string;
  description: string;
  districtsServed: string[];
  verified: boolean;
};
