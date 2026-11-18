// What the public pages may show: a teaser (decided 18 Nov), enough to recognise an event or a profile
// from a shared link. Everything else needs an account. A page can't show more than these types carry,
// because lib/data/public.ts only ever hands them these fields.
// Written by hand for now; once the backend has a schema (EN-03), derive them from it with SelectionSet.
// Public fields only: no drafts, no descriptions, no contact details, nothing personal.

export type EventStatus = "published" | "postponed" | "cancelled";

export type PublicEvent = {
  id: string;
  title: string;
  // ISO 8601 date and time with offset, e.g. 2026-12-12T18:00:00+05:30
  startsAt: string;
  // the district (city), not the venue
  district: string;
  // postponed and cancelled events stay visible (PRD EV-02)
  status: EventStatus;
  organiserName: string;
};

export type PublicOrganiser = {
  id: string;
  name: string;
  district: string;
  verified: boolean;
};

// vendors are businesses; freelancers are individuals and don't take stalls (PRD section 3)
export type ProviderKind = "vendor" | "freelancer";

export type PublicProvider = {
  id: string;
  name: string;
  kind: ProviderKind;
  // what they do, e.g. "Photographer"
  category: string;
  verified: boolean;
};
