import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import palette from "@/components/Palette.module.css";
import styles from "@/components/public/Public.module.css";
import { EVENT_STATUS_LABEL } from "@/components/public/text";
import { getPublicEvent } from "@/lib/data/public";
import { formatDateTime } from "@/lib/format";
import { routes } from "@/lib/routes";

// Same HTML for every visitor, so it can be cached: Next builds it on the first visit, serves that
// copy to everyone, and rebuilds it in the background at most once a minute (Decision 4b).
// Both lines are needed: revalidate alone silently turns into "render on every request".
export const dynamic = "force-static";
export const revalidate = 60;

type EventPageProps = { params: Promise<{ eventId: string }> };

// Title and description for search results and WhatsApp or Instagram link previews.
// The preview image belongs to US-C15-T4.
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const event = await getPublicEvent((await params).eventId);
  return event ? { title: event.title, description: event.summary } : {};
}

// The route and data path for a public event. The finished page design is US-C03-T3.
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
      <p className={styles.summary}>{event.summary}</p>
      <dl className={styles.facts}>
        <dt>When</dt>
        <dd>
          <time dateTime={event.startsAt}>{formatDateTime(event.startsAt)}</time>
        </dd>
        <dt>Where</dt>
        <dd>
          {event.venueName}, {event.district}
        </dd>
        <dt>Organiser</dt>
        <dd>
          <Link href={routes.organiser(event.organiser.id)}>{event.organiser.name}</Link>
        </dd>
      </dl>
    </article>
  );
}
