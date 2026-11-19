import "server-only";
import { cache } from "react";
import { sampleEvents } from "@/lib/data/samples";
import { allStoredEvents, findStoredEvent, insertStoredEvent, updateStoredEvent } from "@/lib/data/event-store";
import { findStoredStalls, saveStoredStalls } from "@/lib/data/stall-store";
import {
  allStoredJobs,
  allStoredRequests,
  insertStoredJob,
  insertStoredRequest,
  updateStoredJob,
  updateStoredRequest,
} from "@/lib/data/hiring-store";
import { hiringCounts } from "@/lib/hiring";
import { saveStoredProfile, storedProfile } from "@/lib/data/profile-store";
import { saveStoredAccountSettings, storedAccountSettings } from "@/lib/data/account-store";
import { saveStoredVerification, storedVerification } from "@/lib/data/verification-store";
import {
  saveStoredCommunity,
  saveStoredConversation,
  saveStoredThread,
  storedCommunities,
  storedConversations,
  storedThreads,
} from "@/lib/data/people-store";
import { allStoredReceived, allStoredWritten, saveStoredWritten, updateStoredReceived } from "@/lib/data/reviews-store";
import { allStoredPosts, insertStoredPost, updateStoredPost } from "@/lib/data/feed-store";
import { allStoredRecords, insertStoredRecord, saveStoredAccount, storedAccount } from "@/lib/data/payment-store";
import {
  sampleAccounts,
  sampleCommunities,
  sampleEventResults,
  sampleNotifications,
  sampleEventWork,
  sampleOrganiserExtras,
  samplePastEvent,
  sampleUnpublished,
  sampleProviders,
  sampleRecentSearches,
  sampleStallVendors,
  sampleHireProviders,
  sampleHiringMessages,
  sampleAnalytics,
  sampleFollowers,
  sampleOrganiserRanks,
  sampleReviewAverages,
  sampleReviewTasks,
  sampleReviewTotals,
} from "@/lib/data/portal-samples";
import type {
  Account,
  EventDraft,
  EventStalls,
  BookingRequest,
  HireProvider,
  JobPost,
  PaymentAccount,
  PaymentRecord,
  AnalyticsExtras,
  FeedPost,
  Follower,
  OrganiserProfile,
  Verification,
  OrganiserRank,
  ReceivedReview,
  ReviewTask,
  WrittenReview,
  BoardThread,
  AccountSettings,
  Community,
  CommunityThread,
  Conversation,
  FeaturedEvent,
  ManagedEvent,
  NotificationType,
  OrganiserEventRow,
  OrganiserDashboard,
  PortalNotification,
  SearchResults,
  StallVendor,
} from "@/lib/data/portal-types";
import type { Session } from "@/lib/auth/session";
import { newestFirst } from "@/lib/format";
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

// The organiser's profile (O27): who they are, for the published page (O51), the preview's
// organiser card (O52), the feed and their own profile pages.
export async function getMyOrganiserProfile(session: Session): Promise<OrganiserProfile | null> {
  if (!useSamples || session.role !== "organiser") return null;
  const verification = storedVerification();
  // the badge follows verification (O28–O40), so the two can never disagree
  return {
    ...storedProfile(),
    verified: verification.status === "approved",
    verifiedAt: verification.status === "approved" ? verification.decidedAt : null,
  };
}

// Saves the profile form (O42).
export async function saveMyOrganiserProfile(session: Session, patch: Partial<OrganiserProfile>): Promise<HiringWrite<OrganiserProfile>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  return { ok: true, value: saveStoredProfile(patch) };
}

// The organiser's followers (O43), matching a search when there is one.
export async function listFollowers(session: Session, query: string): Promise<Follower[]> {
  if (!useSamples || session.role !== "organiser") return [];
  const matches = query.trim() ? matcher(query) : () => true;
  return sampleFollowers.filter((f) => matches(`${f.name} ${f.role} ${f.detail}`));
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
  return sampleNotifications(new Date()).sort((a, b) => newestFirst(a.at, b.at));
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

// Hiring counts and the venue map's version for the overview (O09). The counts come from the
// event's booking requests and job posts; the map is a sample until the Venue map slice.
export async function getEventWork(session: Session, eventId: string) {
  if (!useSamples || session.role !== "organiser") return null;
  const { requests, jobs } = await getEventHiring(session, eventId);
  const sample = sampleEventWork[eventId];
  return {
    ...hiringCounts(requests, jobs),
    map: sample ? { version: sample.mapVersion, publishedAt: sample.mapPublishedAt } : null,
  };
}

// The event's discussion board threads (O16), from the same records as the community (O24).
export async function getEventBoard(session: Session, eventId: string): Promise<BoardThread[]> {
  if (!useSamples || session.role !== "organiser") return [];
  return storedThreads()
    .filter((t) => t.eventId === eventId)
    .map((t) => ({
      id: t.id,
      title: t.title,
      author: t.author,
      authorRole: t.authorRole,
      verified: t.verified,
      replies: t.replyCount,
      upvotes: t.upvotes,
      pinned: t.pinned,
      postedAt: t.at,
    }));
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
  const tasks = await listReviewTasks(session);
  const events = allStoredEvents();
  return tasks.map((t) => ({ id: t.id, name: t.name, eventTitle: t.eventTitle, eventId: events.find((e) => e.title === t.eventTitle)?.id ?? "" }));
}

// ---------- One event's stalls (O13, O72–O76) ----------

// The event's stall slots, applications and approved vendors. null in production.
export const getEventStalls = cache(async (session: Session, eventId: string): Promise<EventStalls | null> => {
  if (!useSamples || session.role !== "organiser" || !findStoredEvent(eventId)) return null;
  return findStoredStalls(eventId);
});

// Saves the event's stalls, and keeps the event's own "stalls approved" count (O05, O09) in step.
export async function saveEventStalls(
  session: Session,
  eventId: string,
  stalls: EventStalls,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  const event = findStoredEvent(eventId);
  if (!event) return { ok: false, error: "That event doesn't exist any more." };
  saveStoredStalls(eventId, stalls);
  const approved = stalls.slots.reduce((sum, slot) => sum + slot.approved, 0);
  updateStoredEvent(eventId, { stalls: { approved, offered: event.stalls?.offered ?? approved } });
  return { ok: true };
}

// Vendors the organiser can invite to a stall (O73). The real search is the backend's (US-C01).
export async function getStallVendors(session: Session): Promise<StallVendor[]> {
  if (!useSamples || session.role !== "organiser") return [];
  return sampleStallVendors;
}

// ---------- Hiring (O14, O17–O21, O77–O79, O89) ----------

// What the Find providers page (O17) filters by. Empty fields don't filter.
export type ProviderFilters = {
  q: string;
  category: string;
  district: string;
  minRating: number;
  verifiedOnly: boolean;
  // a day the provider must be free ("2026-12-12")
  freeOn: string;
  sort: "rank" | "rating" | "price";
};

// Vendors and freelancers that match the filters (O17). Search words match the name, what they
// do and where; ranked providers come first by rank, then the rest by rating.
export const listProviders = cache(async (session: Session, filters: ProviderFilters): Promise<HireProvider[]> => {
  if (!useSamples || session.role !== "organiser") return [];
  const matches = filters.q ? matcher(filters.q) : () => true;
  const found = sampleHireProviders.filter(
    (p) =>
      matches(`${p.name} ${p.role} ${p.category} ${p.categoryLabel} ${p.districts.join(" ")}`) &&
      (!filters.category || p.category === filters.category) &&
      (!filters.district || p.districts.includes(filters.district)) &&
      p.rating >= filters.minRating &&
      (!filters.verifiedOnly || p.verified) &&
      (!filters.freeOn || !p.bookedDates.includes(filters.freeOn)),
  );
  const byRating = (x: HireProvider, y: HireProvider) => y.rating - x.rating;
  const order = {
    rank: (x: HireProvider, y: HireProvider) => (x.rank ?? 99) - (y.rank ?? 99) || byRating(x, y),
    rating: byRating,
    price: (x: HireProvider, y: HireProvider) => x.fromLkr - y.fromLkr,
  }[filters.sort];
  return found.sort(order);
});

// One provider's profile (O18), or null.
export const getProvider = cache(async (session: Session, id: string): Promise<HireProvider | null> => {
  if (!useSamples || session.role !== "organiser") return null;
  return sampleHireProviders.find((p) => p.id === id) ?? null;
});

// The top five in a category and district, by rank (O17's Leaderboard panel).
export async function getLeaderboard(session: Session, category: string, district: string): Promise<HireProvider[]> {
  if (!useSamples || session.role !== "organiser") return [];
  return sampleHireProviders
    .filter((p) => p.rank !== null && p.category === category && p.districts.includes(district))
    .sort((x, y) => (x.rank ?? 0) - (y.rank ?? 0))
    .slice(0, 5);
}

// The organiser's own booking requests and job posts, all events.
export const listMyHiring = cache(async (session: Session): Promise<{ requests: BookingRequest[]; jobs: JobPost[] }> => {
  if (!useSamples || session.role !== "organiser") return { requests: [], jobs: [] };
  const mine = new Set(allStoredEvents().map((e) => e.id));
  return {
    requests: allStoredRequests().filter((r) => mine.has(r.eventId)),
    jobs: allStoredJobs().filter((j) => mine.has(j.eventId)),
  };
});

// One event's booking requests and job posts (O14).
export async function getEventHiring(session: Session, eventId: string) {
  const { requests, jobs } = await listMyHiring(session);
  return { requests: requests.filter((r) => r.eventId === eventId), jobs: jobs.filter((j) => j.eventId === eventId) };
}

export async function getBookingRequest(session: Session, id: string): Promise<BookingRequest | null> {
  return (await listMyHiring(session)).requests.find((r) => r.id === id) ?? null;
}

export async function getJobPost(session: Session, id: string): Promise<JobPost | null> {
  return (await listMyHiring(session)).jobs.find((j) => j.id === id) ?? null;
}

// The event's latest messages with providers (O14). Read-only until the Messages slice.
export async function getHiringMessages(session: Session, eventId: string) {
  if (!useSamples || session.role !== "organiser") return [];
  return sampleHiringMessages[eventId] ?? [];
}

// Keeps the event's own booking counts (O05, O07) in step with its requests.
function syncBookings(eventId: string) {
  const requests = allStoredRequests().filter((r) => r.eventId === eventId);
  const confirmed = requests.filter((r) => r.status === "accepted").length;
  updateStoredEvent(eventId, { bookings: requests.length ? { confirmed, requested: requests.length } : null });
}

type HiringWrite<T> = { ok: true; value: T } | { ok: false; error: string };

// Sends a booking request (O19), or records a booking made from a job post's quote (O89).
export async function saveBookingRequest(session: Session, request: Omit<BookingRequest, "id">): Promise<HiringWrite<BookingRequest>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  if (!findStoredEvent(request.eventId)) return { ok: false, error: "That event doesn't exist any more." };
  const saved = insertStoredRequest(request);
  syncBookings(saved.eventId);
  return { ok: true, value: saved };
}

// Accepts or declines a provider's own quote (O78).
export async function updateBookingRequest(session: Session, id: string, patch: Partial<BookingRequest>): Promise<HiringWrite<BookingRequest>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  const saved = updateStoredRequest(id, patch);
  if (!saved) return { ok: false, error: "That request doesn't exist any more." };
  syncBookings(saved.eventId);
  return { ok: true, value: saved };
}

// Posts a job (O20).
export async function saveJobPost(session: Session, job: Omit<JobPost, "id">): Promise<HiringWrite<JobPost>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  if (!findStoredEvent(job.eventId)) return { ok: false, error: "That event doesn't exist any more." };
  return { ok: true, value: insertStoredJob(job) };
}

// Closes a job post or marks its quotes (O79, O89).
export async function updateJobPost(session: Session, id: string, patch: Partial<JobPost>): Promise<HiringWrite<JobPost>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  const saved = updateStoredJob(id, patch);
  return saved ? { ok: true, value: saved } : { ok: false, error: "That job post doesn't exist any more." };
}

// The providers named in a list of requests or quotes, by id.
export async function getProvidersById(session: Session, ids: string[]): Promise<Map<string, HireProvider>> {
  if (!useSamples || session.role !== "organiser") return new Map();
  const wanted = new Set(ids);
  return new Map(sampleHireProviders.filter((p) => wanted.has(p.id)).map((p) => [p.id, p]));
}

// ---------- Bookings (O22, O83–O88) ----------

// One booking: a booking request the provider accepted, or one that was later cancelled.
export async function getBooking(session: Session, id: string): Promise<BookingRequest | null> {
  const request = await getBookingRequest(session, id);
  return request && (request.status === "accepted" || request.status === "cancelled") ? request : null;
}

// ---------- Payments (O60–O65) ----------

// The organiser's PayHere account, or null when none is connected (O61).
export async function getPaymentAccount(session: Session): Promise<PaymentAccount | null> {
  if (!useSamples || session.role !== "organiser") return null;
  return storedAccount();
}

export async function savePaymentAccount(session: Session, account: PaymentAccount | null): Promise<HiringWrite<null>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  saveStoredAccount(account);
  return { ok: true, value: null };
}

// The organiser's payments and receipts, newest first (O60).
export const listPayments = cache(async (session: Session): Promise<PaymentRecord[]> => {
  if (!useSamples || session.role !== "organiser") return [];
  return allStoredRecords();
});

// One receipt (O64), or null.
export async function getReceipt(session: Session, id: string): Promise<PaymentRecord | null> {
  return (await listPayments(session)).find((r) => r.id === id) ?? null;
}

// Records a sandbox payment or refund, with its receipt number.
export async function recordPayment(session: Session, record: Omit<PaymentRecord, "id">): Promise<HiringWrite<PaymentRecord>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  return { ok: true, value: insertStoredRecord(record) };
}

// Stall fees across the organiser's events, for the Payments page (O60): what's been collected,
// how many stalls paid of how many approved, and the first event with stalls to link to.
export async function getStallFeeTotals(session: Session) {
  const empty = { amountLkr: 0, paid: 0, of: 0, eventId: null as string | null };
  if (!useSamples || session.role !== "organiser") return empty;
  return allStoredEvents().reduce((sum, event) => {
    const stalls = findStoredStalls(event.id);
    const of = stalls.slots.reduce((n, s) => n + s.approved, 0);
    if (of === 0) return sum;
    return {
      amountLkr: sum.amountLkr + stalls.collected.amountLkr,
      paid: sum.paid + stalls.collected.paid,
      of: sum.of + of,
      eventId: sum.eventId ?? event.id,
    };
  }, empty);
}

// ---------- Feed and analytics (O26, O99, O94, O50) ----------

// The organiser's feed posts, newest first.
export const listFeedPosts = cache(async (session: Session): Promise<FeedPost[]> => {
  if (!useSamples || session.role !== "organiser") return [];
  return allStoredPosts();
});

export async function getFeedPost(session: Session, id: string): Promise<FeedPost | null> {
  return (await listFeedPosts(session)).find((p) => p.id === id) ?? null;
}

// Puts a new post on the feed (O26, O99).
export async function createFeedPost(session: Session, post: Omit<FeedPost, "id">): Promise<HiringWrite<FeedPost>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  return { ok: true, value: insertStoredPost(post) };
}

// Changes a post's comments (O94): a reply, or hiding one.
export async function updateFeedPost(session: Session, id: string, patch: Partial<FeedPost>): Promise<HiringWrite<FeedPost>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  const saved = updateStoredPost(id, patch);
  return saved ? { ok: true, value: saved } : { ok: false, error: "That post doesn't exist any more." };
}

// Analytics numbers that have no records behind them yet (O50). null in production.
export async function getAnalyticsExtras(session: Session): Promise<AnalyticsExtras | null> {
  if (!useSamples || session.role !== "organiser") return null;
  return sampleAnalytics;
}

// ---------- Verification (O28, O38–O41) ----------

// Where the organiser's verification stands. null in production.
export async function getVerification(session: Session): Promise<Verification | null> {
  if (!useSamples || session.role !== "organiser") return null;
  return storedVerification();
}

// Whether the organiser may open stall slots, post jobs and send booking requests (O41).
export async function isVerified(session: Session): Promise<boolean> {
  return (await getVerification(session))?.status === "approved";
}

export async function saveVerification(session: Session, next: Verification): Promise<HiringWrite<null>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  saveStoredVerification(next);
  return { ok: true, value: null };
}

// ---------- Reviews and leaderboards (O29–O31, O46–O49) ----------

// Reviews of the organiser, newest first, with the totals and averages over all of them.
export async function getReceivedReviews(session: Session) {
  if (!useSamples || session.role !== "organiser") return null;
  return { reviews: allStoredReceived(), totals: sampleReviewTotals, averages: sampleReviewAverages };
}

// A reply (O46) or a report (O47) on one review.
export async function updateReceivedReview(session: Session, id: string, patch: Partial<ReceivedReview>): Promise<HiringWrite<ReceivedReview>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  const saved = updateStoredReceived(id, patch);
  return saved ? { ok: true, value: saved } : { ok: false, error: "That review doesn't exist any more." };
}

// Who the organiser can still review (O29's "Waiting for your review"): completed bookings and
// the past event's samples, until a review is submitted or two weeks pass.
export const listReviewTasks = cache(async (session: Session): Promise<ReviewTask[]> => {
  if (!useSamples || session.role !== "organiser") return [];
  const now = new Date();
  const { requests } = await listMyHiring(session);
  const events = new Map(allStoredEvents().map((e) => [e.id, e.title]));
  const fromBookings = requests
    .filter((r) => r.status === "accepted" && r.completedAt)
    .map((r) => ({
      id: r.id,
      name: sampleHireProviders.find((p) => p.id === r.providerId)?.name ?? "",
      kind: r.brief.service,
      eventTitle: events.get(r.eventId) ?? "",
      completedOn: r.completedAt ?? "",
      closesOn: new Date(Date.parse(`${r.date}T23:59:00+05:30`) + 14 * 86_400_000).toISOString(),
    }));
  const submitted = new Set(allStoredWritten().filter((w) => w.submitted).map((w) => w.taskId));
  return [...fromBookings, ...sampleReviewTasks(now)].filter((t) => !submitted.has(t.id) && Date.parse(t.closesOn) > now.getTime());
});

export async function getReviewTask(session: Session, id: string): Promise<ReviewTask | null> {
  return (await listReviewTasks(session)).find((t) => t.id === id) ?? null;
}

// The organiser's review or saved draft for one task.
export async function getWrittenReview(session: Session, taskId: string): Promise<WrittenReview | null> {
  if (!useSamples || session.role !== "organiser") return null;
  return allStoredWritten().find((w) => w.taskId === taskId) ?? null;
}

export async function saveWrittenReview(session: Session, review: WrittenReview): Promise<HiringWrite<null>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  saveStoredWritten(review);
  return { ok: true, value: null };
}

// "Top organisers" (O31), in one district or all of them.
export async function listOrganiserRanks(session: Session, district: string): Promise<OrganiserRank[]> {
  if (!useSamples || session.role !== "organiser") return [];
  return sampleOrganiserRanks.filter((o) => !district || o.districts.includes(district));
}

// ---------- Messages and community (O23–O25, O90–O93) ----------

// The organiser's conversations, the latest message first.
export const listConversations = cache(async (session: Session): Promise<Conversation[]> => {
  if (!useSamples || session.role !== "organiser") return [];
  const last = (c: Conversation) => c.messages[c.messages.length - 1]?.at ?? "";
  return storedConversations().sort((a, b) => newestFirst(last(a), last(b)));
});

export async function saveConversation(session: Session, conversation: Conversation): Promise<HiringWrite<null>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  saveStoredConversation(conversation);
  return { ok: true, value: null };
}

export const listCommunities = cache(async (session: Session): Promise<Community[]> => {
  if (!useSamples || session.role !== "organiser") return [];
  return storedCommunities();
});

export async function saveCommunity(session: Session, community: Community): Promise<HiringWrite<null>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  saveStoredCommunity(community);
  return { ok: true, value: null };
}

// Threads on boards and in communities, newest first.
export const listThreads = cache(async (session: Session): Promise<CommunityThread[]> => {
  if (!useSamples || session.role !== "organiser") return [];
  return storedThreads().sort((a, b) => newestFirst(a.at, b.at));
});

export async function getThread(session: Session, id: string): Promise<CommunityThread | null> {
  return (await listThreads(session)).find((t) => t.id === id) ?? null;
}

export async function saveThread(session: Session, thread: CommunityThread): Promise<HiringWrite<null>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  saveStoredThread(thread);
  return { ok: true, value: null };
}

// ---------- Account settings (O32, O95–O98) ----------

export async function getAccountSettings(session: Session): Promise<AccountSettings | null> {
  if (!useSamples || session.role !== "organiser") return null;
  return storedAccountSettings();
}

export async function saveAccountSettings(session: Session, patch: Partial<AccountSettings>): Promise<HiringWrite<AccountSettings>> {
  if (!useSamples || session.role !== "organiser") return { ok: false, error: NO_BACKEND };
  return { ok: true, value: saveStoredAccountSettings(patch) };
}
