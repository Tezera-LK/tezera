import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import CopyLink from "@/components/portal/events/CopyLink";
import styles from "@/components/portal/events/EventPages.module.css";
import { compactCount } from "@/components/portal/events/eventText";
import forms from "@/components/portal/forms.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getMyEvent, getMyOrganiserProfile } from "@/lib/data/portal";
import { formatDayMonth } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Event published" };

const TEXT = {
  live: (title: string) => `${title} is live`,
  published: (when: string, followers: string) => `Published ${when} · your ${followers} followers see it in their feed`,
  copy: "Copy link",
  copied: "Copied",
  manage: "Manage event",
  view: "View event page",
  nextSteps: "Next steps",
  board: "Discussion board",
  boardText: "A board was made for this event. People going can talk and plan meetups there.",
  openBoard: "Open board",
} as const;

// What comes next after publishing. The venue map and posts are later slices, so those two
// aren't links yet.
const NEXT_STEPS: { title: string; detail: string; href?: (eventId: string) => string }[] = [
  { title: "Add a venue map", detail: "Zones, stalls and pins" },
  { title: "Open stall slots", detail: "Food, drinks, merchandise", href: (id) => `${routes.eventStalls(id)}?dialog=slots` },
  { title: "Hire providers", detail: "Send requests or post a job", href: routes.eventHiring },
  { title: "Post about it", detail: "Image or reel linked to the event" },
];

// The page right after publishing (Figma O51): the event is live, here's its link, and here's
// what to do next.
export default async function EventPublishedPage({ params }: { params: Promise<{ eventId: string }> }) {
  const session = await requireRole("organiser");
  const { eventId } = await params;
  const [event, profile] = await Promise.all([getMyEvent(session, eventId), getMyOrganiserProfile(session)]);
  if (!event || event.status === "draft") notFound();

  const aside = (
    <Panel title={TEXT.board}>
      <p className={styles.panelText}>{TEXT.boardText}</p>
      <MaybeLink href={routes.eventBoard(event.id)} className={ui.wideButton}>
        {TEXT.openBoard}
      </MaybeLink>
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <section className={styles.liveHero} aria-labelledby="live-title">
        <span className={styles.tick} aria-hidden="true">
          ✓
        </span>
        <h1 id="live-title" className={styles.heroTitle}>
          {TEXT.live(event.title)}
        </h1>
        <p className={styles.heroText}>
          {TEXT.published(formatDayMonth(event.publishedAt ?? event.editedAt), compactCount(profile?.followers ?? 0))}
        </p>
        <div className={styles.linkLine}>
          <span className={styles.linkChip}>{routes.event(event.id)}</span>
          <CopyLink path={routes.event(event.id)} label={TEXT.copy} copied={TEXT.copied} />
        </div>
        <div className={styles.heroActions}>
          <MaybeLink href={routes.manageEvent(event.id)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.manage}
          </MaybeLink>
          <MaybeLink href={routes.event(event.id)} className={forms.bigButton}>
            {TEXT.view}
          </MaybeLink>
        </div>
      </section>

      <h2 className={ui.sectionTitle}>{TEXT.nextSteps}</h2>
      <ul className={styles.steps}>
        {NEXT_STEPS.map((step) => (
          <li key={step.title}>
            <MaybeLink href={step.href?.(event.id)} className={`${ui.row} ${styles.announcement}`}>
              <Thumb size={36} />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{step.title}</span>
                <span className={ui.muted}>{step.detail}</span>
              </span>
            </MaybeLink>
          </li>
        ))}
      </ul>
    </Columns>
  );
}
