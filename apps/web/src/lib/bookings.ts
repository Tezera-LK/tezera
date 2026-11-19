import type { BookingRequest, PaymentRecord } from "@/lib/data/portal-types";
import { daysFrom, formatDayMonth, formatTime, oldestFirst } from "@/lib/format";

// Helpers the booking (O22, O83–O88) and payment (O60–O65) pages and their actions share.

// One payment of a booking and where it stands.
export type PartState = {
  index: number;
  label: string;
  amountLkr: number;
  due: string;
  paid: PaymentRecord | null;
  refunded: PaymentRecord | null;
  // overdue = its date has passed; due = the next one to pay; upcoming = later ones
  state: "paid" | "refunded" | "overdue" | "due" | "upcoming";
  daysLeft: number | null;
};

// A date input's "2026-12-12", read as noon in Sri Lanka so it stays on that day.
export const dayIso = (date: string) => `${date}T12:00:00+05:30`;
export const dayLabel = (date: string) => (date ? formatDayMonth(dayIso(date)) : "");

// Each payment of a booking, matched with its receipt or refund.
export function paymentStates(booking: BookingRequest, records: PaymentRecord[], now: Date): PartState[] {
  const states: PartState[] = booking.payments.map((part, index) => {
    const mine = records.filter((r) => r.requestId === booking.id && r.partIndex === index);
    const paid = mine.find((r) => r.kind === "paid") ?? null;
    const refunded = mine.find((r) => r.kind === "refunded") ?? null;
    const daysLeft = part.due ? daysFrom(now, dayIso(part.due)) : null;
    const state: PartState["state"] = refunded ? "refunded" : paid ? "paid" : daysLeft !== null && daysLeft < 0 ? "overdue" : "upcoming";
    return { index, label: part.label, amountLkr: part.amountLkr, due: part.due, paid, refunded, state, daysLeft };
  });
  // the first one still open is the one due now, as on O22 ("Due in 9 days", then "Upcoming")
  const next = states.find((s) => s.state === "upcoming" || s.state === "overdue");
  if (next && next.state === "upcoming") next.state = "due";
  return states;
}

// The first payment still to make, or null when everything's paid.
export function nextToPay(states: PartState[]): PartState | null {
  return states.find((s) => s.state === "due" || s.state === "overdue" || s.state === "upcoming") ?? null;
}

export const paidTotal = (states: PartState[]) =>
  states.filter((s) => s.state === "paid").reduce((sum, s) => sum + s.amountLkr, 0);

// The booking's reference on receipts, "TZ-24903", made from its id so it never changes.
export function bookingRef(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 90000;
  return `TZ-${10000 + hash}`;
}

// "Fri 20 Nov · 10:12 AM"
export const stamp = (iso: string) => `${formatDayMonth(iso)} · ${formatTime(iso)}`;

// The booking's history, oldest first (O22's History panel).
export function bookingHistory(booking: BookingRequest, records: PaymentRecord[], first: string) {
  const items: { title: string; detail: string; at: string }[] = [];
  if (!booking.fromJob) items.push({ title: "Request sent", detail: stamp(booking.sentAt), at: booking.sentAt });
  if (booking.answeredAt) {
    const title = booking.fromJob ? "Quote accepted" : booking.quote ? "Their quote accepted" : `Accepted by ${first}`;
    items.push({ title, detail: stamp(booking.answeredAt), at: booking.answeredAt });
  }
  for (const r of records.filter((r) => r.requestId === booking.id && (r.kind === "paid" || r.kind === "refunded"))) {
    const part = r.partIndex !== null ? booking.payments[r.partIndex]?.label : "Payment";
    items.push({
      title: `${part} ${r.kind === "paid" ? "paid" : "refunded"}`,
      detail: `${formatDayMonth(r.at)} · test payment`,
      at: r.at,
    });
  }
  if (booking.proposedTerms) {
    items.push({ title: "New terms sent", detail: `${stamp(booking.proposedTerms.sentAt)} · waiting for ${first}`, at: booking.proposedTerms.sentAt });
  }
  for (const report of booking.reports ?? []) items.push({ title: "Problem reported", detail: stamp(report.at), at: report.at });
  if (booking.completedAt) items.push({ title: "Marked completed", detail: stamp(booking.completedAt), at: booking.completedAt });
  if (booking.cancelledAt) {
    items.push({
      title: booking.cancelledBy === "provider" ? `Cancelled by ${first}` : "Cancelled by you",
      detail: stamp(booking.cancelledAt),
      at: booking.cancelledAt,
    });
  }
  return items.sort((a, b) => oldestFirst(a.at, b.at));
}

// Cancelling inside 7 days of the event keeps the deposit with the provider and shows as a late
// cancellation on the organiser's profile (O84). Further out, everything paid comes back.
export const LATE_DAYS = 7;

export function cancelOutcome(booking: BookingRequest, now: Date) {
  const daysAway = daysFrom(now, dayIso(booking.date));
  return { daysAway, late: daysAway < LATE_DAYS };
}
