import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Columns from "@/components/portal/Columns";
import BookingRequestForm from "@/components/portal/hiring/BookingRequestForm";
import styles from "@/components/portal/hiring/Hiring.module.css";
import { ProviderSummary } from "@/components/portal/hiring/ProviderBits";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProvider, isVerified, listMyEvents } from "@/lib/data/portal";
import { hiringEvent } from "@/lib/hiring";
import { routes } from "@/lib/routes";
import { sendBookingRequest } from "../../../actions";

export const metadata: Metadata = { title: "Send a booking request" };

const TEXT = {
  title: "Send a booking request",
  lede: (name: string) => `To ${name}. They can accept, decline or send their own quote.`,
  line: (rating: number, reviews: number, role: string) => `★ ${rating} · ${reviews} reviews · ${role}`,
  terms: (first: string) =>
    `${first} sees these terms before accepting. Once the booking is confirmed, changing them needs their agreement.`,
  noEvents: "You need a published event that hasn't happened yet before you can send a booking request.",
} as const;

// "Send a booking request" (Figma O19): the event and time, a brief, the payments and the
// cancellation terms. Sending goes to "Request sent" (O77).
export default async function RequestBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ providerId: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const session = await requireRole("organiser");
  const { providerId } = await params;
  const query = await searchParams;
  const provider = await getProvider(session, providerId);
  if (!provider) notFound();
  // sending requests needs the Verified badge (O41)
  if (!(await isVerified(session))) redirect(`${routes.hiring}?locked=request`);

  const now = new Date();
  const mine = await listMyEvents(session);
  const event = hiringEvent(mine, query.event, now);
  // every event that can still take a booking, for the Event dropdown
  const bookable = mine
    .filter((e) => hiringEvent([e], e.id, now))
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.address || e.venueName,
    }));
  const first = provider.kind === "Freelancer" ? provider.name.split(" ")[0] : provider.name;

  const aside = (
    <>
      <ProviderSummary provider={provider} line={TEXT.line(provider.rating, provider.reviews, provider.role)} />
      <div className={styles.notePanel}>
        <p className={tables.panelText}>{TEXT.terms(first)}</p>
      </div>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={styles.pageHeadText}>
        <h1 className={styles.pageTitle}>{TEXT.title}</h1>
        <p className={styles.lede}>{TEXT.lede(provider.name)}</p>
      </header>
      {event ? (
        <BookingRequestForm
          action={sendBookingRequest.bind(null, provider.id)}
          events={bookable}
          eventId={event.id}
          first={first}
          budget={provider.fromLkr}
          discardHref={`${routes.provider(provider.id)}?event=${encodeURIComponent(event.id)}`}
        />
      ) : (
        <p className={ui.muted}>{TEXT.noEvents}</p>
      )}
    </Columns>
  );
}
