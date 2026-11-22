import type { BookingRequest, JobPost, JobQuote, PaymentPart } from "@/lib/data/portal-types";
import { newestFirst, oldestFirst } from "@/lib/format";

// Helpers the hiring pages (O14, O17–O21, O77–O79, O89) and their actions share.

// The categories and districts Find providers (O17) filters by, and job posts (O20) ask for.
export const PROVIDER_CATEGORIES = ["Photography", "DJ", "Sound and lighting", "Staging", "Hosting"];
export const DISTRICTS = ["Colombo", "Gampaha", "Kalutara", "Kandy", "Galle"];

// The three numbers at the top of an event's Hiring tab (O14), also on its overview (O09).
// Requests a job post created aren't "sent"; quotes count while someone still has to answer them.
export function hiringCounts(requests: BookingRequest[], jobs: JobPost[]) {
  return {
    requestsSent: requests.filter((r) => !r.fromJob).length,
    quotesReceived:
      requests.filter((r) => r.status === "quoted").length +
      jobs.filter((j) => j.status === "open").reduce((sum, j) => sum + j.quotes.length, 0),
    confirmed: requests.filter((r) => r.status === "accepted").length,
  };
}

// "Booking requests" on O14: the ones still waiting for someone, and the ones answered in the
// last week. Newest first. Older answers live on under "Confirmed bookings".
export function recentRequests(requests: BookingRequest[], now: Date): BookingRequest[] {
  const weekAgo = now.getTime() - 7 * 86_400_000;
  return requests
    .filter((r) => !r.fromJob)
    .filter((r) => r.status === "waiting" || r.status === "quoted" || (r.answeredAt !== null && Date.parse(r.answeredAt) >= weekAgo))
    .filter((r) => r.status !== "cancelled")
    .sort((a, b) => newestFirst(a.sentAt, b.sentAt));
}

// "Confirmed bookings" on O14: accepted ones first, then cancelled ones, each oldest first.
export function bookingsOf(requests: BookingRequest[]): BookingRequest[] {
  return requests
    .filter((r) => r.status === "accepted" || r.status === "cancelled")
    .sort((a, b) => Number(a.status === "cancelled") - Number(b.status === "cancelled") || oldestFirst(a.sentAt, b.sentAt));
}

// What a booking costs: the provider's own price when the organiser accepted it, else the budget.
export function priceOf(request: BookingRequest): number {
  return request.quote ? request.quote.priceLkr : request.budgetLkr;
}

// A job post's quotes inside its budget, and the ones over it (O21 hides those, with a note).
export function splitQuotes(job: JobPost): { within: JobQuote[]; over: JobQuote[] } {
  return {
    within: job.quotes.filter((q) => q.priceLkr <= job.budgetMaxLkr),
    over: job.quotes.filter((q) => q.priceLkr > job.budgetMaxLkr),
  };
}

// The total of a list of payments.
export const totalOf = (payments: PaymentPart[]) => payments.reduce((sum, p) => sum + p.amountLkr, 0);

// "LKR 15,000" → 15000; NaN when there are no digits.
export function readLkr(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : NaN;
}

// The event a hiring page works for: the one in ?event= when it can still take bookings, else
// the organiser's next one that can. Published or postponed, and not over yet.
export function hiringEvent<E extends { id: string; status: string; startsAt: string | null; endsAt: string | null }>(
  events: E[],
  id: string | undefined,
  now: Date,
): E | null {
  const open = events
    .filter((e) => (e.status === "published" || e.status === "postponed") && e.startsAt)
    .filter((e) => Date.parse(e.endsAt ?? e.startsAt ?? "") > now.getTime())
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
  return open.find((e) => e.id === id) ?? open[0] ?? null;
}

// "photographers", for "Top photographers in Colombo"
export const CATEGORY_PEOPLE: Record<string, string> = {
  Photography: "photographers",
  DJ: "DJs",
  "Sound and lighting": "sound and lighting crews",
  Staging: "staging crews",
  Hosting: "MCs",
};
