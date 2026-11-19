"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { paymentStates } from "@/lib/bookings";
import { getBooking, getProvider, listPayments, recordPayment, savePaymentAccount } from "@/lib/data/portal";
import { routes } from "@/lib/routes";

// Payment actions (O61, O62). Everything runs against the PayHere sandbox stand-in: no money
// moves, and card details are checked for shape and then dropped, never stored or logged.

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// "Connect account" (O61). The merchant secret is checked but not kept: the real connection
// stores it with PayHere's own key handling (EN-03), never in this app's data.
export async function connectAccount(form: FormData) {
  const session = await requireRole("organiser");
  const merchantId = field(form, "merchantId").replace(/\s/g, "");
  const secret = field(form, "secret");
  const accountName = field(form, "accountName");
  const back = (error: string) => redirect(`${routes.connectPayments}?error=${error}`);

  if (!/^\d{6,10}$/.test(merchantId)) back("merchant");
  if (!secret) back("secret");
  if (!accountName) back("name");

  const result = await savePaymentAccount(session, { merchantId, accountName, connectedAt: new Date().toISOString() });
  if (!result.ok) back("save");
  revalidatePath(routes.payments);
  redirect(`${routes.payments}?connected=1`);
}

// "2028-12" style check: an expiry like "12 / 28" that hasn't passed.
function expiryOk(value: string, now: Date): boolean {
  const match = value.replace(/\s/g, "").match(/^(\d{1,2})\/(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

const METHODS: Record<string, string> = { card: "card", ezcash: "eZ Cash", bank: "bank transfer" };

// "Pay LKR 15,000 (test)" (O62): records the instalment as paid on the booking, with a receipt,
// and Tezera's 5% shown but not charged. Goes to "Instalment paid" (O63).
export async function payInstalment(bookingId: string, partIndex: number, form: FormData) {
  const session = await requireRole("organiser");
  const booking = await getBooking(session, bookingId);
  if (!booking || booking.status !== "accepted") redirect(routes.payments);
  const now = new Date();
  const part = paymentStates(booking, await listPayments(session), now)[partIndex];
  if (!part || part.state === "paid" || part.state === "refunded") redirect(routes.booking(bookingId));

  const pay = routes.payInstalment(bookingId, partIndex);
  const method = field(form, "method");
  if (!METHODS[method]) redirect(`${pay}?error=method`);
  let methodLabel = `PayHere sandbox · ${METHODS[method]}`;
  if (method === "card") {
    const digits = field(form, "number").replace(/\D/g, "");
    if (digits.length !== 16) redirect(`${pay}?error=number`);
    if (!expiryOk(field(form, "expiry"), now)) redirect(`${pay}?error=expiry`);
    if (!/^\d{3,4}$/.test(field(form, "cvv"))) redirect(`${pay}?error=cvv`);
    if (!field(form, "name")) redirect(`${pay}?error=name`);
    // only the last four digits go on the receipt
    methodLabel = `PayHere sandbox · card ending ${digits.slice(-4)}`;
  }

  const provider = await getProvider(session, booking.providerId);
  const service = (booking.brief.service || provider?.role || "").toLowerCase();
  const paid = await recordPayment(session, {
    kind: "paid",
    party: provider?.name ?? "",
    label: `${part.label} paid · ${service}`,
    amountLkr: part.amountLkr,
    at: now.toISOString(),
    eventId: booking.eventId,
    requestId: booking.id,
    partIndex,
    method: methodLabel,
  });
  if (!paid.ok) redirect(`${pay}?error=save`);
  await recordPayment(session, {
    kind: "commission",
    party: "Tezera",
    label: "Commission 5% · shown, not charged",
    amountLkr: Math.round(part.amountLkr * 0.05),
    at: now.toISOString(),
    eventId: booking.eventId,
    requestId: booking.id,
    partIndex: null,
    method: "Not charged",
  });
  revalidatePath(routes.booking(bookingId));
  revalidatePath(routes.payments);
  redirect(routes.paymentDone(paid.value.id));
}

// "Try a failed payment" (O62): the sandbox's declined card, so the failure screen (O65) can be
// seen. Nothing is recorded.
export async function failPayment(bookingId: string, partIndex: number) {
  await requireRole("organiser");
  redirect(routes.paymentFailed(bookingId, partIndex));
}
