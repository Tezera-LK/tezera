import "server-only";
import { cache } from "react";
import { sampleEvents, sampleOrganisers, sampleProviders } from "@/lib/data/samples";
import type { ProviderKind, PublicEvent, PublicOrganiser, PublicProvider } from "@/lib/data/types";

// The only way public pages read data. Pages call these functions and never talk to the backend
// directly, so the backend can change (Amplify Data, or the NestJS API if the team picks it) without
// touching them. Each one returns a teaser (lib/data/types.ts) and picks those fields out by name, so a
// field added to the backend later doesn't become public by accident.
//
// STAND-IN until the backend has data (EN-03): sample records in `next dev`, nothing in production
// builds, so a deployed site never shows made-up events. Later the insides become reads as a guest.
// React cache(): generateMetadata() and the page share one read per request.

const useSamples = process.env.NODE_ENV === "development";

export const getPublicEvent = cache(async (eventId: string): Promise<PublicEvent | null> => {
  if (!useSamples) return null;
  const event = sampleEvents.find((e) => e.id === eventId);
  // drafts are never public; the backend must enforce this as well (Decision 4a)
  if (!event || event.status === "draft") return null;
  const organiser = sampleOrganisers.find((o) => o.id === event.organiserId);
  if (!organiser) return null;
  return {
    id: event.id,
    title: event.title,
    startsAt: event.startsAt,
    district: event.district,
    status: event.status,
    organiserName: organiser.name,
  };
});

export const getPublicOrganiser = cache(async (organiserId: string): Promise<PublicOrganiser | null> => {
  if (!useSamples) return null;
  const organiser = sampleOrganisers.find((o) => o.id === organiserId);
  if (!organiser) return null;
  const { id, name, district, verified } = organiser;
  return { id, name, district, verified };
});

// Vendors and freelancers have separate addresses (/vendors/<id>, /freelancers/<id>), so each page
// asks for its own kind; the other kind's ID is "not found" there.
export const getPublicProvider = cache(
  async (kind: ProviderKind, providerId: string): Promise<PublicProvider | null> => {
    if (!useSamples) return null;
    const provider = sampleProviders.find((p) => p.id === providerId && p.kind === kind);
    if (!provider) return null;
    const { id, name, category, verified } = provider;
    return { id, name, kind, category, verified };
  },
);
