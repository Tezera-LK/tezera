import type { Metadata } from "next";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import styles from "@/components/portal/hiring/Hiring.module.css";
import JobForm from "@/components/portal/hiring/JobForm";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { dayLabel } from "@/lib/bookings";
import { getBooking, getProvider, isVerified, listMyEvents } from "@/lib/data/portal";
import { redirect } from "next/navigation";
import { formatCount, formatShortDate } from "@/lib/format";
import { CATEGORY_PEOPLE, DISTRICTS, PROVIDER_CATEGORIES, hiringEvent, priceOf } from "@/lib/hiring";
import { routes } from "@/lib/routes";
import { postJob } from "../../actions";

export const metadata: Metadata = { title: "Post a job" };

const TEXT = {
  title: "Post a job",
  lede: "Providers who match send you quotes. You can accept one or more.",
  whoSees: "Who sees this",
  whoText: "Providers in the category who serve the district see this post and can send you a quote with a message.",
  after: "When quotes close, compare them side by side and accept one or more. Each one you accept becomes a booking.",
  noEvents: "You need a published event that hasn't happened yet before you can post a job.",
  fromLede: (name: string) => `Filled in from your cancelled booking with ${name}. Check and post.`,
  prefilledTitle: "Prefilled from the booking",
  prefilledText: "Change anything you like.",
  firstLook: (people: string, day: string) => `Only ${people} free on ${day} see it first.`,
} as const;

// "Post a job" (Figma O20). ?event= picks the event and ?category= the provider category, as the
// Hiring tab and Find providers link here. ?from=<booking> fills it in from a cancelled booking
// (O86, "Reopen as a job post").
export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; category?: string; from?: string }>;
}) {
  const session = await requireRole("organiser");
  const query = await searchParams;
  // posting jobs needs the Verified badge (O41)
  if (!(await isVerified(session))) redirect(`${routes.hiring}?locked=job`);
  const now = new Date();
  const mine = await listMyEvents(session);
  const from = query.from ? await getBooking(session, query.from) : null;
  const fromProvider = from ? await getProvider(session, from.providerId) : null;
  const event = hiringEvent(mine, from?.eventId ?? query.event, now);
  // the old booking's price, give or take a fifth, rounded to a thousand
  const around = (n: number, by: number) => `LKR ${formatCount(Math.round((n * by) / 1000) * 1000)}`;
  const initial =
    from && fromProvider && event
      ? {
          title: `${fromProvider.role} for ${event.title}, ${formatShortDate(`${from.date}T12:00:00+05:30`)}`,
          service: from.brief.service || fromProvider.role,
          duration: from.brief.duration,
          runOfShow: from.brief.runOfShow,
          budgetMin: around(priceOf(from), 0.8),
          budgetMax: around(priceOf(from), 1.2),
        }
      : undefined;
  const bookable = mine
    .filter((e) => hiringEvent([e], e.id, now))
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.address || e.venueName,
      // the district named in the address, if any
      district: DISTRICTS.find((d) => `${e.address} ${e.venueName}`.includes(d)) ?? "",
    }));

  const aside = from && fromProvider ? (
    <div className={styles.notePanel}>
      <p className={tables.panelText}>{TEXT.firstLook(CATEGORY_PEOPLE[fromProvider.category] ?? "providers", dayLabel(from.date))}</p>
    </div>
  ) : (
    <>
      <Panel title={TEXT.whoSees}>
        <p className={tables.panelText}>{TEXT.whoText}</p>
      </Panel>
      <div className={styles.notePanel}>
        <p className={tables.panelText}>{TEXT.after}</p>
      </div>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={styles.pageHeadText}>
        <h1 className={styles.pageTitle}>{TEXT.title}</h1>
        <p className={styles.lede}>{fromProvider ? TEXT.fromLede(fromProvider.name) : TEXT.lede}</p>
      </header>
      {event ? (
        <JobForm
          action={postJob}
          events={bookable}
          eventId={event.id}
          category={fromProvider?.category ?? (PROVIDER_CATEGORIES.includes(query.category ?? "") ? (query.category as string) : "")}
          discardHref={from ? routes.booking(from.id) : routes.eventHiring(event.id)}
          initial={initial}
          prefilledNote={initial && { title: TEXT.prefilledTitle, text: TEXT.prefilledText }}
        />
      ) : (
        <p className={ui.muted}>{TEXT.noEvents}</p>
      )}
    </Columns>
  );
}
