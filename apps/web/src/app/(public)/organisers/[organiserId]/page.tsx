import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import palette from "@/components/Palette.module.css";
import ContactDetails from "@/components/public/ContactDetails";
import styles from "@/components/public/Public.module.css";
import { EVENT_STATUS_LABEL } from "@/components/public/text";
import EmptyState from "@/components/states/EmptyState";
import { getPublicOrganiser } from "@/lib/data/public";
import { formatDateTime } from "@/lib/format";
import { routes } from "@/lib/routes";

// cached like the event page: same HTML for everyone, rebuilt at most once a minute (Decision 4b)
export const dynamic = "force-static";
export const revalidate = 60;

type OrganiserPageProps = { params: Promise<{ organiserId: string }> };

export async function generateMetadata({ params }: OrganiserPageProps): Promise<Metadata> {
  const organiser = await getPublicOrganiser((await params).organiserId);
  return organiser ? { title: organiser.name, description: organiser.description } : {};
}

// The route and data path for an organiser's public profile. The finished design is US-P04-T3.
export default async function OrganiserPage({ params }: OrganiserPageProps) {
  const organiser = await getPublicOrganiser((await params).organiserId);
  if (!organiser) notFound();

  return (
    <article className={`${palette.root} ${styles.card}`} data-palette="org">
      <p className={styles.eyebrow}>Organiser</p>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{organiser.name}</h1>
        {organiser.verified && <span className={styles.pill}>Verified</span>}
      </div>
      <p className={styles.summary}>{organiser.description}</p>
      <dl className={styles.facts}>
        <dt>Based in</dt>
        <dd>{organiser.district}</dd>
      </dl>

      <ContactDetails />

      <section className={styles.section} aria-labelledby="organiser-events">
        <h2 id="organiser-events" className={styles.sectionTitle}>
          Upcoming events
        </h2>
        {organiser.upcomingEvents.length === 0 ? (
          <EmptyState headingLevel={3} title="No upcoming events" />
        ) : (
          <ul className={styles.events}>
            {organiser.upcomingEvents.map((event) => (
              <li key={event.id}>
                <Link href={routes.event(event.id)}>
                  <span className={styles.eventTitle}>{event.title}</span>
                  <span className={styles.eventMeta}>
                    {formatDateTime(event.startsAt)}
                    {event.status !== "published" && ` · ${EVENT_STATUS_LABEL[event.status]}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
