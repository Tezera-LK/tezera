import "server-only";
import { cache } from "react";
import { allStoredEvents, findStoredEvent } from "@/lib/data/event-store";
import { sampleOrganiserProfile } from "@/lib/data/portal-samples";
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
  const stored = storedPublicEvent(eventId);
  if (stored) return stored;
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
    // Agastra Events also has the events made in the portal's stand-in store
    if (organiser.id === "org-agastra") {
      for (const event of allStoredEvents()) {
        const shown = storedPublicEvent(event.id);
        if (shown && Date.parse(shown.startsAt) >= Date.now()) {
          upcomingEvents.push({ id: shown.id, title: shown.title, startsAt: shown.startsAt, status: shown.status });
        }
      }
    }
    return { ...organiser, upcomingEvents };
  },
);

export const getPublicVendor = cache(async (vendorId: string): Promise<PublicVendor | null> => {
  if (!useSamples) return null;
  return sampleVendors.find((v) => v.id === vendorId) ?? null;
});

// An event an organiser made in the portal (lib/data/event-store.ts), as the public page sees it.
// Drafts and events an admin unpublished stay hidden, like drafts above.
function storedPublicEvent(eventId: string): PublicEvent | null {
  const event = findStoredEvent(eventId);
  if (!event?.startsAt) return null;
  if (event.status !== "published" && event.status !== "postponed" && event.status !== "cancelled") return null;
  return {
    id: event.id,
    title: event.title,
    summary: event.description,
    startsAt: event.startsAt,
    venueName: event.venueName,
    // the address's last part, without a postcode: "Viharamahadevi Park, Colombo 07" → "Colombo"
    district: (event.address.split(",").pop() ?? "").replace(/d+/g, "").trim() || event.venueName,
    status: event.status,
    // the stand-in store holds one organiser's events
    organiser: { id: "org-agastra", name: sampleOrganiserProfile.name },
  };
}
