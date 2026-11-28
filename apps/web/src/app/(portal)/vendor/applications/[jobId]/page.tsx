import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { formatCount, formatDayMonth, formatShortDate } from "@/lib/format";
import { day, lkr } from "@/lib/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Application" };

const TEXT = {
  chosenTitle: "You were chosen",
  booked: "Booked",
  chosenText: "Your quote was accepted. The booking is confirmed.",
  chose: (who: string, n: number, on: string) => `${who} chose 1 of ${n} quotes · ${on}`,
  agreed: "Agreed",
  price: "Price",
  deposit: "Deposit",
  final: "Final instalment",
  received: (on: string) => `received ${on}`,
  openBooking: "Open booking",
  message: (who: string) => `Message ${who}`,
  addedForYou: "Added for you",
  calendar: "Calendar",
  auto: "Auto",
  markedBooked: (d: string) => `${d} marked booked`,
  notChosenTitle: "Not chosen this time",
  closed: "Closed",
  postClosed: (who: string, event: string, on: string) => `${who} · ${event} · post closed ${on}`,
  what: "What happened",
  whatText: (quote: string, min: string, max: string) => `The organiser picked another provider. Your quote was ${quote}; the post's budget was ${min} – ${max}.`,
  private: "Organisers do not share who they chose or their price.",
  findSimilar: "Find similar job posts",
  back: "Back to my applications",
  rankTitle: "This does not affect your rank",
  rankText: "Only reviews, completed bookings and response rate count.",
} as const;

// What happened to one application (Figma V60 chosen, V61 not chosen).
export default async function ApplicationPage({ params }: { params: Promise<{ jobId: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const { jobId } = await params;
  const state = await getProviderState(session);
  const job = state?.jobs.find((j) => j.id === jobId);
  if (!state || !job?.application) notFound();
  const a = job.application;
  if (a.status === "waiting" || a.status === "withdrawn") redirect(routes.vendorArea.job(job.id));
  const who = state.organisers.find((o) => o.id === job.organiserId)?.name ?? "";

  if (a.status === "not-chosen") {
    return (
      <Columns
        aside={
          <Panel title={TEXT.rankTitle}>
            <p className={styles.foot}>{TEXT.rankText}</p>
          </Panel>
        }
      >
        <header className={hiring.pageHeadText}>
          <div className={styles.inline}>
            <h1 className={hiring.pageTitle}>{TEXT.notChosenTitle}</h1>
            <Chip tone="neutral">{TEXT.closed}</Chip>
          </div>
          <p className={hiring.lede}>{TEXT.postClosed(who, job.eventTitle, formatDayMonth(a.decidedAt ?? job.quotesBy))}</p>
        </header>
        <section className={events.card} aria-labelledby="what-title">
          <h2 id="what-title" className={hiring.cardTitle}>
            {TEXT.what}
          </h2>
          <p className={styles.foot}>{TEXT.whatText(lkr(a.priceLkr), lkr(job.budgetMinLkr), formatCount(job.budgetMaxLkr))}</p>
          <p className={styles.foot}>{TEXT.private}</p>
        </section>
        <div className={styles.pair}>
          <Link href={routes.vendorArea.jobs} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.findSimilar}
          </Link>
          <Link href={routes.vendorArea.applications} className={forms.bigButton}>
            {TEXT.back}
          </Link>
        </div>
      </Columns>
    );
  }

  const booking = state.bookings.find((b) => b.id === a.bookingId);
  const [deposit, ...rest] = booking?.payments ?? [];
  const last = rest.at(-1);
  return (
    <Columns
      aside={
        <Panel title={TEXT.addedForYou}>
          <div className={styles.tintRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{TEXT.calendar}</span>
              <span className={hiring.sub}>{TEXT.markedBooked(day(booking?.date ?? job.date))}</span>
            </span>
            <Chip tone="soft">{TEXT.auto}</Chip>
          </div>
        </Panel>
      }
    >
      <header className={hiring.pageHeadText}>
        <div className={styles.inline}>
          <h1 className={hiring.pageTitle}>{TEXT.chosenTitle}</h1>
          <Chip tone="good">{TEXT.booked}</Chip>
        </div>
        <p className={hiring.lede}>{`${who} · ${job.title} · ${day(booking?.date ?? job.date)}`}</p>
      </header>
      <div className={styles.banner}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{TEXT.chosenText}</span>
          <span className={hiring.sub}>{TEXT.chose(who, job.quotes, formatDayMonth(a.decidedAt ?? a.sentAt))}</span>
        </span>
      </div>
      <section className={events.card} aria-labelledby="agreed-title">
        <h2 id="agreed-title" className={hiring.cardTitle}>
          {TEXT.agreed}
        </h2>
        <dl className={events.facts}>
          <dt>{TEXT.price}</dt>
          <dd>{lkr(booking?.priceLkr ?? a.priceLkr)}</dd>
          {deposit && (
            <>
              <dt>{TEXT.deposit}</dt>
              <dd>{[lkr(deposit.amountLkr), deposit.receivedAt ? TEXT.received(formatShortDate(deposit.receivedAt)) : null].filter(Boolean).join(" · ")}</dd>
            </>
          )}
          {last && (
            <>
              <dt>{TEXT.final}</dt>
              <dd>{`${lkr(last.amountLkr)} · ${last.due ? day(last.due) : ""}`}</dd>
            </>
          )}
        </dl>
      </section>
      <div className={styles.pair}>
        {booking && (
          <Link href={routes.vendorArea.booking(booking.id)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.openBooking}
          </Link>
        )}
        <Link href={`${routes.vendorArea.messages}?to=${job.organiserId}`} className={forms.bigButton}>
          {TEXT.message(who)}
        </Link>
      </div>
    </Columns>
  );
}
