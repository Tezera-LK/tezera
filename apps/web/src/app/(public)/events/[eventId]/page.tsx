import type { Metadata } from "next";
import { notFound } from "next/navigation";
import palette from "@/components/Palette.module.css";
import { teaserMetadata } from "@/components/public/metadata";
import styles from "@/components/public/Public.module.css";
import SignInPrompt from "@/components/public/SignInPrompt";
import { EVENT_STATUS_LABEL, eventDescription } from "@/components/public/text";
import { getPublicEvent } from "@/lib/data/public";
import { formatDateTime } from "@/lib/format";

// Same HTML for every visitor, so it can be cached: Next builds it on the first visit, serves that
// copy to everyone, and rebuilds it in the background at most once a minute (Decision 4b).
// Both lines are needed: revalidate alone silently turns into "render on every request".
export const dynamic = "force-static";
export const revalidate = 60;

type EventPageProps = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const event = await getPublicEvent((await params).eventId);
  return event ? teaserMetadata(event.title, eventDescription(event)) : {};
}

// The teaser anyone with the link sees (decided 18 Nov): enough to recognise the event, then
// "See more on Tezera". The full event page is US-C03-T3.
export default async function EventPage({ params }: EventPageProps) {
  const event = await getPublicEvent((await params).eventId);
  if (!event) notFound();

  return (
    <article className={`${palette.root} ${styles.card}`} data-palette="att">
      <p className={styles.eyebrow}>Event</p>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{event.title}</h1>
        {event.status !== "published" && (
          <span className={styles.pill} data-status={event.status}>
            {EVENT_STATUS_LABEL[event.status]}
          </span>
        )}
      </div>
      <dl className={styles.facts}>
        <dt>When</dt>
        <dd>
          <time dateTime={event.startsAt}>{formatDateTime(event.startsAt)}</time>
        </dd>
        <dt>Where</dt>
        <dd>{event.district}</dd>
        <dt>Organiser</dt>
        <dd>{event.organiserName}</dd>
      </dl>
      <SignInPrompt kind="event" />
    </article>
  );
}
