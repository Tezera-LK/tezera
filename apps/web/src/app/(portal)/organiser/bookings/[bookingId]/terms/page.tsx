import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import TermsForm from "@/components/portal/hiring/TermsForm";
import { requireRole } from "@/lib/auth/session";
import { paymentStates } from "@/lib/bookings";
import { getBooking, getMyEvent, getProvider, listPayments } from "@/lib/data/portal";
import { formatShortDate } from "@/lib/format";
import { priceOf } from "@/lib/hiring";
import { routes } from "@/lib/routes";
import { proposeTerms } from "../../actions";

export const metadata: Metadata = { title: "Propose new terms" };

// "Propose new terms" (Figma O83) for a confirmed booking. A cancelled or completed booking can't
// change, so those go back to the booking.
export default async function BookingTermsPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const session = await requireRole("organiser");
  const { bookingId } = await params;
  const booking = await getBooking(session, bookingId);
  if (!booking) notFound();
  if (booking.status !== "accepted" || booking.completedAt) redirect(routes.booking(bookingId));
  const [provider, event, records] = await Promise.all([
    getProvider(session, booking.providerId),
    getMyEvent(session, booking.eventId),
    listPayments(session),
  ]);
  if (!provider) notFound();

  const states = paymentStates(booking, records, new Date());
  const first = provider.kind === "Freelancer" ? provider.name.split(" ")[0] : provider.name;

  return (
    <TermsForm
      action={proposeTerms.bind(null, booking.id)}
      providerName={provider.name}
      first={first}
      eventTitle={event?.title ?? ""}
      current={{ priceLkr: priceOf(booking), startTime: booking.startTime, endTime: booking.endTime }}
      parts={states.map((s) => ({ label: s.label, amountLkr: s.amountLkr, paidOn: s.paid ? formatShortDate(s.paid.at) : null }))}
      cancelHref={routes.booking(booking.id)}
    />
  );
}
