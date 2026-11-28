import "server-only";
import { cache } from "react";
import type { Session } from "@/lib/auth/session";
import type { AccountSettings, Community, CommunityThread, Verification } from "@/lib/data/portal-types";
import { newProviderId, readProviderState, writeProviderState } from "@/lib/data/provider-store";
import type {
  CalendarMark,
  IncomingRequest,
  OpenJob,
  OrganiserCard,
  OrganiserReviewTask,
  ProviderBooking,
  ProviderConversation,
  ProviderKind,
  ProviderMoney,
  ProviderNotification,
  ProviderProfile,
  ProviderReview,
  ProviderState,
  StallCall,
  StallListing,
} from "@/lib/data/provider-types";
import { newestFirst } from "@/lib/format";
import { previewMode } from "@/lib/preview";

// The only way the vendor and freelancer pages read and write data, like lib/data/portal.ts for the
// organiser's. Pages call these functions and never talk to the backend directly.
//
// STAND-IN until EN-03 (data) and EN-04 (sign-in) are wired in: sample records from
// provider-samples.ts in preview mode (`next dev` and dev.tezera.lk, lib/preview.ts), kept in
// provider-store.ts; nothing in other builds, so the live site never shows made-up bookings.
// Every function takes the session, because the real versions will read as that user.

const useSamples = previewMode;

// "vendor" or "freelancer" for a provider's session, otherwise null
export function providerKind(session: Session): ProviderKind | null {
  return session.role === "vendor" || session.role === "freelancer" ? session.role : null;
}

// Everything the signed-in provider's pages read, as one copy. null outside preview mode or for
// other roles. React cache(): the layout and the page share one read per request.
export const getProviderState = cache(async (session: Session): Promise<ProviderState | null> => {
  const kind = providerKind(session);
  if (!useSamples || !kind) return null;
  return readProviderState(kind);
});

// What a write returns: the saved record, or why it couldn't be saved.
export type ProviderWrite<T> = { ok: true; value: T } | { ok: false; error: string };

const NO_BACKEND =
  "Saving needs the backend (EN-03), which isn't connected yet. In next dev, changes are kept until the dev server restarts.";
const GONE = "That record doesn't exist any more.";

// Runs one change on the signed-in provider's records. `change` returns the saved record, or null
// when what it should change isn't there.
async function write<T>(session: Session, change: (draft: ProviderState) => T | null): Promise<ProviderWrite<T>> {
  const kind = providerKind(session);
  if (!useSamples || !kind) return { ok: false, error: NO_BACKEND };
  const value = writeProviderState(kind, change);
  return value === null ? { ok: false, error: GONE } : { ok: true, value };
}

// Merges `patch` into the record with this id, in place.
function patchIn<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T | null {
  const found = list.find((item) => item.id === id);
  if (!found) return null;
  Object.assign(found, patch);
  return found;
}

// ---------- Organisers (V08's panel, V54) ----------

export async function getOrganiser(session: Session, id: string): Promise<OrganiserCard | null> {
  return (await getProviderState(session))?.organisers.find((o) => o.id === id) ?? null;
}

// ---------- Booking requests (V47, V08, V09, V46, V48–V56) ----------

export async function getRequest(session: Session, id: string): Promise<IncomingRequest | null> {
  return (await getProviderState(session))?.requests.find((r) => r.id === id) ?? null;
}

export async function updateRequest(session: Session, id: string, patch: Partial<IncomingRequest>) {
  return write(session, (s) => patchIn(s.requests, id, patch));
}

// Accepting a request (V48) or having a quote accepted makes a booking, and marks the day booked.
export async function acceptRequest(session: Session, id: string): Promise<ProviderWrite<ProviderBooking>> {
  return write(session, (s) => {
    const request = s.requests.find((r) => r.id === id);
    if (!request || request.status === "accepted" || request.status === "declined") return null;
    const terms = request.quote ?? { priceLkr: request.budgetLkr, payments: request.payments };
    const booking: ProviderBooking = {
      id: newProviderId("bk"),
      ref: `TZ-${24_900 + s.bookings.length}`,
      requestId: request.id,
      organiserId: request.organiserId,
      eventTitle: request.eventTitle,
      service: request.title.toLowerCase(),
      serviceDetail: request.brief.service,
      date: request.date,
      times: `${request.startTime} – ${request.endTime}`,
      venue: request.venue,
      priceLkr: terms.priceLkr,
      bookedAt: new Date().toISOString(),
      // the deposit falls due as soon as it's a booking
      payments: terms.payments.map((p) => ({ ...p, due: p.due ?? new Date().toISOString().slice(0, 10) })),
      cancellation: request.cancellation,
      completedAt: null,
      reviewed: false,
      cancelled: null,
      termsChange: null,
      reports: [],
    };
    s.bookings.push(booking);
    request.status = "accepted";
    request.bookingId = booking.id;
    markDay(s, request.date, { kind: "booked", label: request.eventTitle, detail: `${request.eventTitle} · confirmed booking`, auto: true });
    return booking;
  });
}

// ---------- Job posts (V10, V57, V62, V11, V58–V61) ----------

export async function getJob(session: Session, id: string): Promise<OpenJob | null> {
  return (await getProviderState(session))?.jobs.find((j) => j.id === id) ?? null;
}

export async function updateJob(session: Session, id: string, patch: Partial<OpenJob>) {
  return write(session, (s) => patchIn(s.jobs, id, patch));
}

// ---------- Bookings (V12, V13, V63–V69, V72, V73) ----------

export async function getBooking(session: Session, id: string): Promise<ProviderBooking | null> {
  return (await getProviderState(session))?.bookings.find((b) => b.id === id) ?? null;
}

export async function updateBooking(session: Session, id: string, patch: Partial<ProviderBooking>) {
  return write(session, (s) => patchIn(s.bookings, id, patch));
}

// Cancelling a booking (V63) refunds what was paid and sets the day free again.
export async function cancelBooking(session: Session, id: string, reason: string, note: string) {
  return write(session, (s) => {
    const booking = s.bookings.find((b) => b.id === id);
    if (!booking || booking.cancelled || booking.completedAt) return null;
    booking.cancelled = { by: "you", at: new Date().toISOString(), reason, note };
    booking.termsChange = null;
    s.calendar = s.calendar.filter((m) => !(m.date === booking.date && m.kind === "booked" && m.auto));
    return booking;
  });
}

// Marks one payment received (V68) and records it under Payments (V21).
export async function markPaymentReceived(session: Session, id: string, index: number, receivedOn: string, method: string, reference: string) {
  return write(session, (s) => {
    const booking = s.bookings.find((b) => b.id === id);
    const payment = booking?.payments[index];
    if (!booking || !payment || payment.receivedAt) return null;
    payment.receivedAt = `${receivedOn}T12:00:00+05:30`;
    const organiser = s.organisers.find((o) => o.id === booking.organiserId)?.name ?? "";
    s.money.unshift({
      id: `TZ-R-${55_100 + s.money.length}`,
      kind: "received",
      party: organiser,
      label: `${payment.label} received · ${booking.service}`,
      amountLkr: payment.amountLkr,
      at: payment.receivedAt,
      method: reference ? `${method} · ${reference}` : method,
      bookingId: booking.id,
    });
    return booking;
  });
}

// Accepting the organiser's new terms (V67) replaces the old ones; the date moves with them.
export async function acceptTermsChange(session: Session, id: string) {
  return write(session, (s) => {
    const booking = s.bookings.find((b) => b.id === id);
    if (!booking?.termsChange || booking.termsChange.from !== "organiser") return null;
    const newDate = booking.termsChange.date;
    if (newDate) {
      const mark = s.calendar.find((m) => m.date === booking.date && m.kind === "booked");
      if (mark) mark.date = newDate;
      booking.date = newDate;
    }
    booking.priceLkr = booking.termsChange.priceLkr;
    booking.payments = booking.termsChange.payments;
    booking.termsChange = null;
    return booking;
  });
}

// ---------- Stalls (V14, V74–V76, V83; vendors only) ----------

export async function getStall(session: Session, id: string): Promise<StallCall | null> {
  return (await getProviderState(session))?.stalls.find((c) => c.id === id) ?? null;
}

export async function updateStall(session: Session, id: string, patch: Partial<StallCall>) {
  return write(session, (s) => patchIn(s.stalls, id, patch));
}

// Paying a stall fee (V78, V79) marks the stall paid and records the receipt.
export async function payStallFee(session: Session, id: string, method: string) {
  return write(session, (s) => {
    const stall = s.stalls.find((c) => c.id === id);
    if (!stall?.application || stall.application.fee.paidAt) return null;
    const receipt = `TZ-R-${55_190 + s.money.length}`;
    stall.application.fee = { ...stall.application.fee, paidAt: new Date().toISOString(), receipt };
    const organiser = s.organisers.find((o) => o.id === stall.organiserId)?.name ?? "";
    s.money.unshift({ id: receipt, kind: "stall-fee", party: organiser, label: `Stall fee paid · ${stall.eventTitle}`, amountLkr: stall.feeLkr, at: new Date().toISOString(), method, bookingId: null });
    return stall;
  });
}

// ---------- My stall listing (V15, V77, V81, V82) ----------

export async function getListing(session: Session, stallId: string): Promise<StallListing | null> {
  return (await getProviderState(session))?.listings.find((l) => l.stallId === stallId) ?? null;
}

export async function saveListing(session: Session, listing: StallListing) {
  return write(session, (s) => {
    const index = s.listings.findIndex((l) => l.stallId === listing.stallId);
    if (index === -1) s.listings.push(listing);
    else s.listings[index] = listing;
    return listing;
  });
}

// ---------- Availability (V17, V42) ----------

function markDay(s: ProviderState, date: string, mark: Omit<CalendarMark, "date">) {
  s.calendar = s.calendar.filter((m) => m.date !== date);
  s.calendar.push({ date, ...mark });
}

// Marks days unavailable by hand (V42), or clears hand-made marks. Bookings and quotes can't be
// cleared here: they follow their booking.
export async function setDays(session: Session, dates: string[], mark: Omit<CalendarMark, "date"> | null) {
  return write(session, (s) => {
    const locked = new Set(s.calendar.filter((m) => m.auto).map((m) => m.date));
    const free = dates.filter((d) => !locked.has(d));
    s.calendar = s.calendar.filter((m) => m.auto || !free.includes(m.date));
    if (mark) for (const date of free) s.calendar.push({ date, ...mark });
    return free;
  });
}

// ---------- Payments (V21, V70, V71) ----------

export async function getMoney(session: Session, id: string): Promise<ProviderMoney | null> {
  return (await getProviderState(session))?.money.find((m) => m.id === id) ?? null;
}

export async function savePayout(session: Session, payout: ProviderState["payout"]) {
  return write(session, (s) => {
    s.payout = payout;
    return true;
  });
}

// ---------- Profile and verification (V16, V35–V39, V18, V43–V45) ----------

export async function saveProfile(session: Session, patch: Partial<ProviderProfile>) {
  return write(session, (s) => Object.assign(s.profile, patch));
}

export async function saveVerification(session: Session, next: Verification) {
  return write(session, (s) => {
    s.verification = next;
    return next;
  });
}

// Accepting bookings needs the verified badge (V46).
export function isVerified(state: ProviderState): boolean {
  return state.verification.status === "approved";
}

// ---------- Reviews and rank (V19, V20, V40, V41, V98–V100) ----------

export async function updateReview(session: Session, id: string, patch: Partial<ProviderReview>) {
  return write(session, (s) => patchIn(s.reviews, id, patch));
}

export async function updateReviewTask(session: Session, id: string, patch: Partial<OrganiserReviewTask>) {
  return write(session, (s) => patchIn(s.reviewTasks, id, patch));
}

// ---------- Messages, community and notifications (V22–V24, V90–V97) ----------

// Conversations, the latest message first.
export function byLatestMessage(a: ProviderConversation, b: ProviderConversation) {
  return newestFirst(a.messages.at(-1)?.at, b.messages.at(-1)?.at);
}

// The open conversation: by its id, or "new:<organiserId>" for the one with that organiser (a new,
// empty one when there's none yet), from a Message button on a request, booking or profile.
export function findConversation(state: ProviderState, key: string): ProviderConversation | null {
  if (!key.startsWith("new:")) return state.conversations.find((c) => c.id === key) ?? null;
  const organiserId = key.slice(4);
  const existing = [...state.conversations].sort(byLatestMessage).find((c) => c.organiserId === organiserId);
  if (existing) return existing;
  const organiser = state.organisers.find((o) => o.id === organiserId);
  if (!organiser) return null;
  return { id: newProviderId("conv"), name: organiser.name, detail: "Organiser", organiserId, unread: 0, blocked: false, reported: null, messages: [] };
}

export async function saveConversation(session: Session, conversation: ProviderConversation) {
  return write(session, (s) => {
    const index = s.conversations.findIndex((c) => c.id === conversation.id);
    if (index === -1) s.conversations.push(conversation);
    else s.conversations[index] = conversation;
    return conversation;
  });
}

export async function setBlocked(session: Session, blocked: ProviderState["blocked"]) {
  return write(session, (s) => {
    s.blocked = blocked;
    return blocked;
  });
}

export async function saveCommunity(session: Session, community: Community) {
  return write(session, (s) => patchIn(s.communities, community.id, community));
}

export async function saveThread(session: Session, thread: CommunityThread) {
  return write(session, (s) => {
    const index = s.threads.findIndex((t) => t.id === thread.id);
    if (index === -1) s.threads.unshift(thread);
    else s.threads[index] = thread;
    return thread;
  });
}

// The provider's notifications, newest first (V23); the bell shows the top three (V93).
export async function getProviderNotifications(session: Session): Promise<ProviderNotification[]> {
  const state = await getProviderState(session);
  // a copy: the cached state must not be reordered in place
  return [...(state?.notifications ?? [])].sort((a, b) => newestFirst(a.at, b.at));
}

export async function markNotificationsRead(session: Session) {
  return write(session, (s) => {
    for (const n of s.notifications) n.unread = false;
    return true;
  });
}

// ---------- Home feed (V06, V85, V86) ----------

export async function updatePost(session: Session, id: string, patch: Partial<ProviderState["posts"][number]>) {
  return write(session, (s) => patchIn(s.posts, id, patch));
}

export async function setFollowing(session: Session, organiserId: string, follow: boolean) {
  return write(session, (s) => {
    s.following = follow ? [...new Set([...s.following, organiserId])] : s.following.filter((id) => id !== organiserId);
    if (follow) s.suggestions = s.suggestions.filter((o) => o.id !== organiserId);
    return s.following;
  });
}

// ---------- Settings (V25, V101–V104) ----------

export async function saveSettings(session: Session, patch: Partial<AccountSettings>) {
  return write(session, (s) => Object.assign(s.settings, patch));
}

// ---------- Events (V07, V89) ----------

// A public question to the organiser (V89); it shows as "Waiting" until they answer.
export async function askQuestion(session: Session, eventId: string, text: string) {
  return write(session, (s) => {
    const event = s.events.find((e) => e.id === eventId);
    if (!event) return null;
    const question = { id: newProviderId("q"), text, answer: null, askedAt: new Date().toISOString(), answeredAt: null, mine: true };
    event.questions.unshift(question);
    return question;
  });
}
