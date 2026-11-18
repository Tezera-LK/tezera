import "server-only";
import { cache } from "react";
import { sampleEvents, sampleOrganisers, sampleVendors } from "@/lib/data/samples";
import type { PublicEvent, PublicOrganiser, PublicVendor } from "@/lib/data/types";

// The only way public pages read data. Pages call these functions and never talk to the backend
// directly, so the backend can change (Amplify, or NestJS if the team picks it) without touching them.
//
// STAND-IN until EN-03 and EN-04 exist: sample records in `next dev`, nothing in production builds,
// so a deployed site never shows made-up events. Phase B replaces the insides with reads as a guest.
// React cache(): generateMetadata() and the page share one read per request.

const useSamples = process.env.NODE_ENV === "development";

export const getPublicEvent = cache(async (eventId: string): Promise<PublicEvent | null> => {
  if (!useSamples) return null;
  const event = sampleEvents.find((e) => e.id === eventId);
  // drafts are never public; the backend must enforce this as well (Decision 4a)
  if (!event || event.status === "draft") return null;
  return { ...event, status: event.status };
});

export const getPublicOrganiser = cache(
  async (organiserId: string): Promise<PublicOrganiser | null> => {
    if (!useSamples) return null;
    const organiser = sampleOrganisers.find((o) => o.id === organiserId);
    if (!organiser) return null;
    const upcomingEvents = sampleEvents.flatMap(({ id, title, startsAt, status, organiser: by }) =>
      by.id === organiser.id && status !== "draft" ? [{ id, title, startsAt, status }] : [],
    );
    return { ...organiser, upcomingEvents };
  },
);

export const getPublicVendor = cache(async (vendorId: string): Promise<PublicVendor | null> => {
  if (!useSamples) return null;
  return sampleVendors.find((v) => v.id === vendorId) ?? null;
});
