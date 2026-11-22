"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { cancelOutcome, paymentStates } from "@/lib/bookings";
import { getBooking, getProvider, listPayments, recordPayment, updateBookingRequest } from "@/lib/data/portal";
import type { PaymentPart } from "@/lib/data/portal-types";
import { readLkr, totalOf } from "@/lib/hiring";
import { routes } from "@/lib/routes";

// A booking's actions: propose new terms (O83), cancel it (O84), report a problem (O87) and mark
// it completed (O88). Each saves through lib/data/portal.ts and goes back to the booking.

export type TermsFormState = { errors?: Record<string, string>; message?: string };

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function refresh(bookingId: string, eventId: string) {
  revalidatePath(routes.booking(bookingId));
  revalidatePath(routes.eventHiring(eventId));
  revalidatePath(routes.payments);
}

// "Send to Tharindu" (O83). Paid payments can't change; the rest have to add up to the new price
// with them. The booking keeps its terms until the provider accepts (their side, a later slice).
export async function proposeTerms(bookingId: string, _previous: TermsFormState, form: FormData): Promise<TermsFormState> {
  const session = await requireRole("organiser");
  const booking = await getBooking(session, bookingId);
  if (!booking || booking.status !== "accepted") return { message: "This booking can't be changed any more." };
  const states = paymentStates(booking, await listPayments(session), new Date());

  const priceLkr = readLkr(field(form, "price"));
  const startTime = field(form, "startTime");
  const endTime = field(form, "endTime");
  const payments: PaymentPart[] = booking.payments.map((part, i) =>
    states[i]?.state === "paid" ? part : { ...part, amountLkr: readLkr(field(form, `pay${i}`)) },
  );

  const errors: Record<string, string> = {};
  if (!Number.isFinite(priceLkr) || priceLkr <= 0) errors.price = "Add the new price in rupees.";
  if (!startTime) errors.startTime = "Add the start time.";
  if (payments.some((p) => !Number.isFinite(p.amountLkr) || p.amountLkr < 0)) {
    errors.payments = "Give every instalment an amount.";
  } else if (Number.isFinite(priceLkr) && totalOf(payments) !== priceLkr) {
    errors.payments = `The payments add up to LKR ${totalOf(payments).toLocaleString("en-GB")}, not the new price.`;
  }
  if (Object.keys(errors).length > 0) return { errors, message: "Some details need fixing. They're marked below." };

  const result = await updateBookingRequest(session, bookingId, {
    proposedTerms: { priceLkr, startTime, endTime, payments, note: field(form, "note"), sentAt: new Date().toISOString() },
  });
  if (!result.ok) return { message: result.error };
  refresh(bookingId, booking.eventId);
  redirect(`${routes.booking(bookingId)}?sent=terms`);
}

const CANCEL_REASONS: Record<string, string> = {
  event: "Event cancelled or postponed",
  other_provider: "Found another provider",
  budget: "Budget changed",
  other: "Other",
};

// "Cancel booking" (O84). Further than 7 days out, everything paid is refunded; closer than
// that the provider keeps the deposit and the rest comes back. The provider is told (EN-09).
export async function cancelBooking(bookingId: string, form: FormData) {
  const session = await requireRole("organiser");
  const booking = await getBooking(session, bookingId);
  if (!booking || booking.status !== "accepted") redirect(routes.booking(bookingId));
  const reason = CANCEL_REASONS[field(form, "reason")];
  if (!reason) redirect(`${routes.booking(bookingId)}?dialog=cancel&error=reason`);

  const now = new Date();
  const { late } = cancelOutcome(booking, now);
  const provider = await getProvider(session, booking.providerId);
  for (const part of paymentStates(booking, await listPayments(session), now)) {
    if (part.state !== "paid" || (late && part.index === 0)) continue;
    await recordPayment(session, {
      kind: "refunded",
      party: provider?.name ?? "",
      label: `${part.label} refunded · booking cancelled`,
      amountLkr: part.amountLkr,
      at: now.toISOString(),
      eventId: booking.eventId,
      requestId: booking.id,
      partIndex: part.index,
      method: part.paid?.method ?? "PayHere sandbox",
    });
  }
  await updateBookingRequest(session, bookingId, {
    status: "cancelled",
    cancelledBy: "you",
    cancelledAt: now.toISOString(),
    cancelReason: reason,
    cancelNote: field(form, "note"),
    proposedTerms: null,
  });
  refresh(bookingId, booking.eventId);
  redirect(routes.booking(bookingId));
}

const PROBLEMS: Record<string, string> = {
  "no-show": "No-show",
  work: "Work not as agreed",
  safety: "Safety or conduct",
  else: "Something else",
};

// "Send report" (O87): an admin looks at it with the booking's history (the admin side is EN-08).
export async function reportProblem(bookingId: string, form: FormData) {
  const session = await requireRole("organiser");
  const booking = await getBooking(session, bookingId);
  if (!booking) redirect(routes.myEvents);
  const reason = PROBLEMS[field(form, "reason")];
  const text = field(form, "text");
  if (!reason || !text) redirect(`${routes.booking(bookingId)}?dialog=report&error=${reason ? "text" : "reason"}`);

  await updateBookingRequest(session, bookingId, {
    reports: [...(booking.reports ?? []), { reason, text, at: new Date().toISOString() }],
  });
  refresh(bookingId, booking.eventId);
  redirect(`${routes.booking(bookingId)}?sent=report`);
}

// "Mark completed and review" (O88): reviews open for both sides and the organiser goes on to
// write theirs (O30). Payments still due stay on the booking.
export async function markCompleted(bookingId: string) {
  const session = await requireRole("organiser");
  const booking = await getBooking(session, bookingId);
  if (!booking || booking.status !== "accepted") redirect(routes.booking(bookingId));
  await updateBookingRequest(session, bookingId, { completedAt: new Date().toISOString() });
  refresh(bookingId, booking.eventId);
  revalidatePath(routes.reviews);
  redirect(routes.writeReview(bookingId));
}
