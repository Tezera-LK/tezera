"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { acceptTermsChange, cancelBooking, getBooking, markPaymentReceived, updateBooking } from "@/lib/data/provider";
import { CANCEL_REASONS, PAYMENT_METHODS, PROBLEM_REASONS } from "@/lib/provider";
import { routes } from "@/lib/routes";

// Booking actions: cancel (V63), mark an instalment received (V68), report a problem (V72),
// propose new terms (V65) or withdraw them (V66), and answer the organiser's new terms (V67).

const r = routes.vendorArea;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const amount = (form: FormData, name: string) => {
  const digits = field(form, name).replace(/[^\d]/g, "");
  return digits ? Number(digits) : Number.NaN;
};

function done(bookingId: string, extra = "") {
  revalidatePath(r.bookings);
  redirect(`${r.booking(bookingId)}${extra}`);
}

// "Cancel booking" (V63). What's paid is refunded under the booking's terms.
export async function cancelThisBooking(bookingId: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const reason = CANCEL_REASONS.find((x) => x === field(form, "reason"));
  if (!reason) redirect(`${r.booking(bookingId)}?dialog=cancel&error=reason`);
  await cancelBooking(session, bookingId, reason, field(form, "note"));
  done(bookingId);
}

// "Mark received" (V68): only when the money is in the provider's account.
export async function markReceived(bookingId: string, index: number, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const on = field(form, "on");
  const method = PAYMENT_METHODS.find((x) => x === field(form, "method"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on) || !method) redirect(`${r.booking(bookingId)}?dialog=received&part=${index}&error=fields`);
  await markPaymentReceived(session, bookingId, index, on, method, field(form, "reference"));
  done(bookingId);
}

// "Send report" (V72). An admin sees the full booking history (EN-08).
export async function reportProblem(bookingId: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const booking = await getBooking(session, bookingId);
  const reason = PROBLEM_REASONS.find((x) => x === field(form, "reason"));
  const text = field(form, "text");
  if (!booking) redirect(r.bookings);
  if (!reason || !text) redirect(`${r.booking(bookingId)}?dialog=report&error=fields`);
  await updateBooking(session, bookingId, { reports: [...booking.reports, { reason, text, at: new Date().toISOString() }] });
  done(bookingId, "?reported=1");
}

// "Send to …" (V65): new terms the organiser must accept before anything changes. Payments
// already received can't change.
export async function proposeTerms(bookingId: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const booking = await getBooking(session, bookingId);
  if (!booking || booking.cancelled || booking.completedAt) redirect(r.bookings);
  const price = amount(form, "price");
  const finalLkr = amount(form, "final");
  const due = field(form, "due");
  const note = field(form, "note");
  const back = `${r.changeTerms(bookingId)}?price=${encodeURIComponent(field(form, "price"))}&final=${encodeURIComponent(field(form, "final"))}&due=${due}&note=${encodeURIComponent(note)}`;
  const received = booking.payments.filter((p) => p.receivedAt).reduce((sum, p) => sum + p.amountLkr, 0);
  if (!(price > 0)) redirect(`${back}&error=price`);
  if (!note) redirect(`${back}&error=note`);
  if (!due || due >= booking.date) redirect(`${back}&error=due`);
  if (received + finalLkr !== price) redirect(`${back}&error=total`);
  const payments = booking.payments.map((p) => (p.receivedAt ? p : { ...p, amountLkr: finalLkr, due }));
  await updateBooking(session, bookingId, { termsChange: { from: "you", priceLkr: price, payments, date: null, note, at: new Date().toISOString() } });
  done(bookingId);
}

// "Withdraw" (V66): the current terms carry on.
export async function withdrawTerms(bookingId: string) {
  const session = await requireRole("vendor", "freelancer");
  const booking = await getBooking(session, bookingId);
  if (booking?.termsChange?.from === "you") await updateBooking(session, bookingId, { termsChange: null });
  done(bookingId);
}

// "Accept new terms" and "Decline" on the organiser's proposal (V67).
export async function answerTerms(bookingId: string, accept: boolean) {
  const session = await requireRole("vendor", "freelancer");
  if (accept) await acceptTermsChange(session, bookingId);
  else await updateBooking(session, bookingId, { termsChange: null });
  done(bookingId);
}

// "Send a reminder" (V73): the organiser gets a push and an email (EN-09); nothing to store yet.
export async function sendReminder(bookingId: string) {
  await requireRole("vendor", "freelancer");
  done(bookingId, "?reminded=1");
}
