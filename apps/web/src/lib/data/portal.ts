import "server-only";
import { cache } from "react";
import { sampleEvents } from "@/lib/data/samples";
import {
  sampleAccounts,
  sampleCommunities,
  sampleEventResults,
  sampleNotifications,
  sampleOrganiserDashboard,
  sampleProviders,
  sampleRecentSearches,
} from "@/lib/data/portal-samples";
import type {
  Account,
  NotificationType,
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
export const getOrganiserDashboard = cache(async (session: Session): Promise<OrganiserDashboard | null> => {
  if (!useSamples || session.role !== "organiser") return null;
  return sampleOrganiserDashboard(new Date());
});

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
