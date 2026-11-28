// Small helpers the vendor and freelancer pages share: money, dates and the wording Figma uses for
// them. Plain functions, safe for server and client code.
import type { IncomingRequest, ProviderBooking, ProviderPayment, ProviderState, StallType } from "@/lib/data/provider-types";
import { daysFrom, formatCount, formatDayMonth, formatShortDate } from "@/lib/format";

// 180000 → "LKR 180,000"
export const lkr = (amount: number) => `LKR ${formatCount(amount)}`;

// A calendar day ("2026-12-12") as an instant at noon in Sri Lanka, so formatting can't slip a day.
export const noon = (date: string) => `${date}T12:00:00+05:30`;

// "2026-12-12" → "Sat 12 Dec"
export const day = (date: string) => formatDayMonth(noon(date));

// "2026-12-12" → "12 Dec"
export const shortDay = (date: string) => formatShortDate(noon(date));

// "16:00" → "4:00 PM"
export function clock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// "Sat 12 Dec · 4:00 PM – 11:30 PM"
export const when = (r: Pick<IncomingRequest, "date" | "startTime" | "endTime">) => `${day(r.date)} · ${clock(r.startTime)} – ${clock(r.endTime)}`;

// "Deposit · 30%" or "Final instalment"
export const paymentTitle = (p: ProviderPayment) => (p.percent ? `${p.label} · ${p.percent}%` : p.label);

// "Due on confirm", or "Thu 10 Dec"
export const paymentDue = (p: ProviderPayment) => (p.due ? day(p.due) : "Due on confirm");

// What a booking still owes: payments not marked received, oldest due first.
export function stillDue(booking: ProviderBooking): ProviderPayment[] {
  return booking.payments.filter((p) => !p.receivedAt).sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
}

// A payment's state on a booking (V12, V13, V73): received, overdue, due soon or upcoming.
export function paymentState(p: ProviderPayment, now: Date): "received" | "overdue" | "due" | "upcoming" {
  if (p.receivedAt) return "received";
  if (!p.due) return "due";
  const days = daysFrom(now, noon(p.due));
  if (days < 0) return "overdue";
  return days <= 14 ? "due" : "upcoming";
}

// A booking's place on My bookings (V12): upcoming, completed (done or past) or cancelled.
export function bookingTab(b: ProviderBooking, now: Date): "upcoming" | "completed" | "cancelled" {
  if (b.cancelled) return "cancelled";
  if (b.completedAt || daysFrom(now, noon(b.date)) < 0) return "completed";
  return "upcoming";
}

// Hours left to reply to a new request: 48 from when it arrived (V47's "26 hours left").
export function hoursLeft(receivedAt: string, now: Date): number {
  return Math.max(0, Math.ceil((Date.parse(receivedAt) + 48 * 3_600_000 - now.getTime()) / 3_600_000));
}

// The organiser's name for a record, from the provider's organiser cards.
export function organiserName(state: ProviderState, organiserId: string): string {
  return state.organisers.find((o) => o.id === organiserId)?.name ?? "";
}

// Days between now and a calendar day; negative once it's past.
export const daysUntil = (date: string, now: Date) => daysFrom(now, noon(date));

// Why a provider declines a request (V50).
export const DECLINE_REASONS = ["Not free that day", "Budget is too low", "Not a service I offer", "Other"] as const;

// Why a provider cancels a booking (V63).
export const CANCEL_REASONS = ["Illness or emergency", "Double booked", "The organiser changed the brief", "Other"] as const;

// How an instalment arrived (V68).
export const PAYMENT_METHODS = ["Bank transfer", "Cash", "PayHere", "Cheque"] as const;

// What went wrong on a booking (V72).
export const PROBLEM_REASONS = ["Payment not received", "The organiser changed the job", "Safety or conduct", "Something else"] as const;

// The stall types organisers open slots for (V14, V74).
export const STALL_TYPES: readonly StallType[] = ["Food", "Drinks", "Merchandise", "Crafts", "Other"];

// The three scores a provider gives an organiser (V20).
export const ORGANISER_REVIEW_PARTS = ["Payment", "Communication", "Planning"] as const;

// Why a provider reports a review (V100).
export const PROVIDER_REPORT_REASONS = ["Not about my service", "Offensive or abusive", "Fake or from a competitor", "Shares private details"] as const;

// "★★★★☆" for a whole-star rating
export const stars = (n: number) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
