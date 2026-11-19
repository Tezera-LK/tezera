import "server-only";
import { cache } from "react";
import { sampleEvents } from "@/lib/data/samples";
import { allStoredEvents, findStoredEvent, insertStoredEvent, updateStoredEvent } from "@/lib/data/event-store";
import {
  sampleAccounts,
  sampleCommunities,
  sampleEventResults,
  sampleNotifications,
  sampleBoard,
  sampleEventWork,
  sampleOrganiserExtras,
  sampleOrganiserProfile,
  samplePastEvent,
  sampleReviewsToWrite,
  sampleUnpublished,
  sampleProviders,
  sampleRecentSearches,
} from "@/lib/data/portal-samples";
import type {
  Account,
  EventDraft,
  FeaturedEvent,
  ManagedEvent,
  NotificationType,
  OrganiserEventRow,
  OrganiserDashboard,
  PortalNotification,
  SearchResults,
} from "@/lib/data/portal-types";
import type { Session } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

// The only way signed-in portal pages read data, like lib/data/public.ts for public pages.
// Pages call these functions and never talk to the backend directly.
//
// STAND-IN until EN-03 (data) and EN-04 (sign-in) are wired in: sample records from
// portal-samples.ts in `next dev`, nothing in production builds, so a deployed site never shows
// made-up bookings. Every function takes the session, because the real versions will read as that user.
// React cache(): the layout and the page share one read per request.

const useSamples = process.env.NODE_ENV === "development";

// The signed-in account, for the profile menu (O82). null for an account with no role yet.
export const getAccount = cache(async (session: Session): Promise<Account | null> => {
  if (!useSamples || !session.role) return null;
  return sampleAccounts[session.role];
});

// Everything the organiser dashboard (O05) shows. null when there's nothing to show (production).
// "Your events" lists what's coming up plus drafts; the big card is the next published or
// postponed event, including one that started in the last 6 hours (it's still on tonight).
export const getOrganiserDashboard = cache(async (session: Session): Promise<OrganiserDashboard | null> => {
  const mine = await listMyEvents(session);
  if (!useSamples || session.role !== "organiser") return null;

  const now = Date.now();
  const live = (e: ManagedEvent) => e.startsAt !== null && Date.parse(e.startsAt) >= now - 6 * 3_600_000;
  const upcoming = mine
    .filter((e) => (e.status === "published" || e.status === "postponed") && live(e))
    .sort(byStart);
  const drafts = mine.filter((e) => e.status === "draft");
  const next = upcoming[0];

  return {
    ...sampleOrganiserExtras,
    featured: next?.startsAt && next.endsAt ? (toRow(next) as FeaturedEvent) : null,
    events: [...upcoming, ...drafts].map(toRow),
  };
});

// ---------- The organiser's events (O07, O08, O51, O52, O54) ----------

// Earliest first; events with no date go last.
function byStart(a: ManagedEvent, b: ManagedEvent) {
  return (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999");
}

// The dashboard's view of one event. Unpublished events show as drafts would: not public.
function toRow(e: ManagedEvent): OrganiserEventRow & Partial<FeaturedEvent> {
  return {
    ...e,
    status: e.status === "unpublished" ? "draft" : e.status,
    startsAt: e.startsAt ?? "",
    endsAt: e.endsAt ?? "",
  };
}

// All of the signed-in organiser's events, newest edit first. The stand-in store holds one
// organiser's events, so every organiser sees the same list in `next dev`.
export const listMyEvents = cache(async (session: Session): Promise<ManagedEvent[]> => {
  if (!useSamples || session.role !== "organiser") return [];
  return allStoredEvents();
});

// One of the signed-in organiser's events, or null if it isn't theirs or doesn't exist.
export const getMyEvent = cache(async (session: Session, id: string): Promise<ManagedEvent | null> => {
  if (!useSamples || session.role !== "organiser") return null;
  return findStoredEvent(id);
});

// Who the organiser is, for the published page (O51) and the preview's organiser card (O52).
export async function getMyOrganiserProfile(session: Session) {
  if (!useSamples || session.role !== "organiser") return null;
  return sampleOrganiserProfile;
}

// What a write returns: the saved event, or why it couldn't be saved.
export type WriteResult = { ok: true; event: ManagedEvent } | { ok: false; error: string };

const NO_BACKEND =
  "Saving needs the backend (EN-03), which isn't connected yet. In next dev, events are kept until the dev server restarts.";

// Saves a new event as a draft, or publishes it straight away.
export async function createMyEvent(session: Session, draft: EventDraft, publish: boolean): Promise<WriteResult> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  return { ok: true, event: insertStoredEvent(draft, publish) };
}

// Changes one of the organiser's events. `patch` can hold form fields (EventDraft) or a new status.
export async function updateMyEvent(
  session: Session,
  id: string,
  patch: Partial<ManagedEvent>,
): Promise<WriteResult> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  const event = updateStoredEvent(id, patch);
  return event ? { ok: true, event } : { ok: false, error: "That event doesn't exist any more." };
}

// The user's notifications, newest first. Only the organiser has samples, because only the
// organiser's Figma file draws them; other roles see the empty state.
export const getNotifications = cache(async (session: Session): Promise<PortalNotification[]> => {
  if (!useSamples || session.role !== "organiser") return [];
  return sampleNotifications(new Date()).sort((a, b) => b.at.localeCompare(a.at));
});

// The bell's dropdown (O81): the three newest and how many are unread.
export async function getNotificationSummary(session: Session) {
  const all = await getNotifications(session);
  return { latest: all.slice(0, 3), unread: all.filter((n) => n.unread).length };
}

// Keeps the notifications of one tab on O06; undefined (the "All" tab) keeps everything.
export function filterNotifications(all: PortalNotification[], type?: NotificationType) {
  return type ? all.filter((n) => n.type === type) : all;
}

// The search page (O80). Matches every word of the query against names and categories, ignoring
// case and simple word endings, so "photographer" also finds "Photography and video".
export const searchPortal = cache(async (session: Session, query: string): Promise<SearchResults> => {
  const empty = { query, providers: [], events: [], communities: [] };
  if (!useSamples || !session.role || !query.trim()) return empty;

  const matches = matcher(query);
  const now = new Date();
  // events that also exist in the public samples link to their public page
  const publicIds = new Set(sampleEvents.filter((e) => e.status !== "draft").map((e) => e.id));

  return {
    query,
    providers: sampleProviders.filter((p) => matches(`${p.name} ${p.category}`)),
    events: sampleEventResults(now)
      .filter((e) => matches(`${e.title} ${e.venueName} ${e.organiserName}`))
      .map((e) => (publicIds.has(e.id) ? { ...e, href: routes.event(e.id) } : e)),
    communities: sampleCommunities.filter((c) => matches(c.name)),
  };
});

// The "Recent searches" panel on O80, newest first.
export const getRecentSearches = cache(async (session: Session): Promise<string[]> => {
  if (!useSamples || !session.role) return [];
  return sampleRecentSearches;
});

// Builds a test for one query: true when every word of it (minus a simple ending such as "-er",
// "-s" or "-y") appears in the text. A stand-in for the backend's real search (US-C01).
function matcher(query: string): (text: string) => boolean {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length > 4 ? word.replace(/(ers|er|ies|y|s)$/, "") : word));
  return (text) => {
    const haystack = text.toLowerCase();
    return words.every((word) => haystack.includes(word));
  };
}

// ---------- One event's pages (O09, O16, O55, O57) ----------
// Read-only samples for the parts other slices own (hiring, stalls, the map, the board, reviews).
// Each returns null or [] in production and for events with no sample.

// Hiring, stalls and venue map counts for the overview (O09).
export async function getEventWork(session: Session, eventId: string) {
  if (!useSamples || session.role !== "organiser") return null;
  return sampleEventWork[eventId] ?? null;
}

// The event's discussion board threads (O16).
export async function getEventBoard(session: Session, eventId: string) {
  if (!useSamples || session.role !== "organiser") return [];
  return sampleBoard(new Date())[eventId] ?? [];
}

// Ratings and what's left to close on a finished event (O57).
export async function getPastEventSummary(session: Session, eventId: string) {
  if (!useSamples || session.role !== "organiser") return null;
  return samplePastEvent[eventId] ?? null;
}

// When and why an admin unpublished an event, and what that closed (O55).
export async function getUnpublishedDetails(session: Session, eventId: string) {
  if (!useSamples || session.role !== "organiser") return null;
  return sampleUnpublished(new Date())[eventId] ?? null;
}

// Providers and vendors from past events still waiting for a review (O07).
export async function getReviewsToWrite(session: Session) {
  if (!useSamples || session.role !== "organiser") return [];
  return sampleReviewsToWrite;
}
