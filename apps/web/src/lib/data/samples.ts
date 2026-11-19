// Made-up records for `next dev`, so the public pages have something to show before the backend exists.
// Never used in production builds (see lib/data/public.ts). Real demo data comes from EN-03-T3's seed script.
import type { PublicEvent, PublicOrganiser, PublicVendor } from "@/lib/data/types";

// the backend also stores drafts; public reads must never return them
export type SampleEvent = Omit<PublicEvent, "status"> & { status: PublicEvent["status"] | "draft" };

export const sampleOrganisers: Omit<PublicOrganiser, "upcomingEvents">[] = [
  {
    // the organiser the portal's event store belongs to (lib/data/event-store.ts)
    id: "org-agastra",
    name: "Agastra Events",
    description: "Concerts and night markets around Colombo.",
    district: "Colombo",
    verified: true,
  },
  {
    id: "org-sample-1",
    name: "Lotus Pond Events (sample)",
    description: "Food festivals and night markets around Colombo, run by a small team of four.",
    district: "Colombo",
    verified: true,
  },
  {
    id: "org-sample-2",
    name: "Hill Country Gatherings (sample)",
    description: "Open-air music evenings in Kandy and Nuwara Eliya.",
    district: "Kandy",
    verified: false,
  },
];

export const sampleEvents: SampleEvent[] = [
  {
    id: "evt-sample-1",
    title: "Colombo Street Food Night (sample)",
    summary: "Forty food stalls, live music and a kids' corner by the sea.",
    startsAt: "2026-12-12T17:00:00+05:30",
    venueName: "Galle Face Green",
    district: "Colombo",
    status: "published",
    organiser: { id: "org-sample-1", name: "Lotus Pond Events (sample)" },
  },
  {
    id: "evt-sample-2",
    title: "Kandy Lakeside Music Evening (sample)",
    summary: "Acoustic sets from local bands. Moved to a new date because of the weather.",
    startsAt: "2027-01-09T18:30:00+05:30",
    venueName: "Lakeside Pavilion",
    district: "Kandy",
    status: "postponed",
    organiser: { id: "org-sample-2", name: "Hill Country Gatherings (sample)" },
  },
  {
    id: "evt-sample-3",
    title: "Galle Fort Craft Market (sample)",
    summary: "Handmade crafts, batik and woodwork from makers in the south.",
    startsAt: "2026-12-20T09:00:00+05:30",
    venueName: "Fort ramparts",
    district: "Galle",
    status: "cancelled",
    organiser: { id: "org-sample-1", name: "Lotus Pond Events (sample)" },
  },
  {
    // a draft: /events/evt-sample-draft must show "Event not found"
    id: "evt-sample-draft",
    title: "Unannounced New Year Festival (sample draft)",
    summary: "Still being planned.",
    startsAt: "2026-12-31T20:00:00+05:30",
    venueName: "To be confirmed",
    district: "Colombo",
    status: "draft",
    organiser: { id: "org-sample-1", name: "Lotus Pond Events (sample)" },
  },
];

export const sampleVendors: PublicVendor[] = [
  {
    id: "ven-sample-1",
    name: "Spice Route Kitchen (sample)",
    kind: "vendor",
    category: "Food and drink stall",
    description: "Kottu, hoppers and fresh juice for crowds of up to 2,000.",
    districtsServed: ["Colombo", "Gampaha"],
    verified: true,
  },
  {
    id: "ven-sample-2",
    name: "Studio Lumen Photography (sample)",
    kind: "freelancer",
    category: "Photographer",
    description: "Event and concert photography, with edited photos delivered within three days.",
    districtsServed: ["Kandy", "Colombo", "Galle"],
    verified: false,
  },
];
