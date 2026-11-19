import type { Metadata } from "next";
import ButtonLink from "@/components/portal/ButtonLink";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import PageHeader from "@/components/portal/PageHeader";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import Thumb from "@/components/portal/Thumb";
import styles from "@/components/portal/events/EventPages.module.css";
import { EVENT_STATUS, hasEnded, turnout, whenShort } from "@/components/portal/events/eventText";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getReviewsToWrite, listMyEvents } from "@/lib/data/portal";
import type { ManagedEvent } from "@/lib/data/portal-types";
import { daysFrom, formatStartsLabel, formatTime, formatWhen } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "My events" };

const TEXT = {
  title: "My events",
  description: "Drafts, upcoming events and past events",
  create: "Create event",
  tabsLabel: "Which events",
  manage: "Manage",
  edit: "Edit",
  seeWhy: "See why",
  newDate: "New date: ",
  runningLate: "Running late",
  onTime: (time: string) => `On time · starts ${time}`,
  updateStatus: "Update status",
  venueMap: "Venue map",
  qa: "Q&A",
  board: "Board",
  draft: "Draft",
  edited: (when: string) => `Edited ${when} · not published`,
  reviews: "Reviews to write",
  review: "Review",
  empty: {
    upcoming: { title: "No upcoming events", description: "Events you publish show up here until they've happened." },
    drafts: { title: "No drafts", description: "Save an event as a draft to finish it later." },
    past: { title: "No past events yet", description: "Events move here once they've ended." },
  },
} as const;

type Tab = "upcoming" | "drafts" | "past";

// Reads ?tab= and falls back to upcoming.
function pickTab(value: string | string[] | undefined): Tab {
  return value === "drafts" || value === "past" ? value : "upcoming";
}

// Every event the organiser has made (Figma O07), in three tabs, with what's on tonight, the
// latest draft and the reviews they still owe on the right.
export default async function MyEventsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const session = await requireRole("organiser");
  const tab = pickTab((await searchParams).tab);
  const [all, reviews] = await Promise.all([listMyEvents(session), getReviewsToWrite(session)]);
  const now = new Date();

  const drafts = all.filter((e) => e.status === "draft").sort((a, b) => b.editedAt.localeCompare(a.editedAt));
  const upcoming = all.filter((e) => e.status !== "draft" && !hasEnded(e)).sort(byStart);
  const past = all.filter((e) => e.status !== "draft" && hasEnded(e)).sort((a, b) => byStart(b, a));
  const shown = { upcoming, drafts, past }[tab];

  // tonight's event: published or postponed, starting today, not over yet
  const tonight = upcoming.find(
    (e) => e.startsAt && (e.status === "published" || e.status === "postponed") && daysFrom(now, e.startsAt) === 0,
  );
  const latestDraft = drafts[0];

  const aside = (
    <>
      {tonight?.startsAt && (
        <Panel title={formatStartsLabel(tonight.startsAt, now)}>
          <div className={styles.liveCard}>
            <span className={styles.liveDot} aria-hidden="true" />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{tonight.title}</span>
              <span className={styles.liveDetail}>
                {tonight.liveStatus?.kind === "late"
                  ? `${TEXT.runningLate} · ${formatTime(tonight.liveStatus.newStartAt)}`
                  : TEXT.onTime(formatTime(tonight.startsAt))}
              </span>
            </span>
          </div>
          <div className={styles.buttonGrid}>
            <MaybeLink href={routes.manageEvent(tonight.id)} className={ui.rowButton}>
              {TEXT.updateStatus}
            </MaybeLink>
            {/* the venue map builder is a later slice (O11–O71) */}
            <MaybeLink className={ui.rowButton}>{TEXT.venueMap}</MaybeLink>
            <MaybeLink href={routes.eventQa(tonight.id)} className={ui.rowButton}>
              {TEXT.qa}
            </MaybeLink>
            <MaybeLink href={routes.eventBoard(tonight.id)} className={ui.rowButton}>
              {TEXT.board}
            </MaybeLink>
          </div>
        </Panel>
      )}
      {latestDraft && (
        <Panel title={TEXT.draft}>
          <MaybeLink href={routes.editEvent(latestDraft.id)} className={`${ui.row} ${styles.announcement}`}>
            <Thumb size={36} radius={8} />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{latestDraft.title}</span>
              <span className={ui.muted}>{TEXT.edited(formatWhen(latestDraft.editedAt, now))}</span>
            </span>
          </MaybeLink>
        </Panel>
      )}
      {reviews.length > 0 && (
        <Panel title={TEXT.reviews}>
          <ul className={ui.rows}>
            {reviews.map((review) => {
              const event = all.find((e) => e.id === review.eventId);
              return (
                <li key={review.id} className={`${ui.row} ${styles.announcement}`}>
                  <Thumb size={36} radius={8} />
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{review.name}</span>
                    <span className={ui.muted}>
                      {[review.eventTitle, event?.startsAt && whenShort(event).split(" · ")[0]].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {/* writing a review is the Reviews slice (O30) */}
                  <MaybeLink className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>{TEXT.review}</MaybeLink>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );

  return (
    <Columns aside={aside}>
      <PageHeader
        title={TEXT.title}
        description={TEXT.description}
        actions={
          <ButtonLink href={routes.newEvent} primary>
            {TEXT.create}
          </ButtonLink>
        }
      />
      <Tabs
        label={TEXT.tabsLabel}
        current={tab}
        tabs={[
          { key: "upcoming", label: `Upcoming · ${upcoming.length}`, href: routes.myEvents },
          { key: "drafts", label: `Drafts · ${drafts.length}`, href: `${routes.myEvents}?tab=drafts` },
          { key: "past", label: `Past · ${past.length}`, href: `${routes.myEvents}?tab=past` },
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState {...TEXT.empty[tab]} action={{ label: TEXT.create, href: routes.newEvent }} />
      ) : (
        <ul className={ui.rows}>
          {shown.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      )}
    </Columns>
  );
}

// Earliest first; events with no date go last.
function byStart(a: ManagedEvent, b: ManagedEvent) {
  return (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999");
}

// One event in the list: photo, title, when and where, status and turnout, and its link.
function EventCard({ event }: { event: ManagedEvent }) {
  const status = EVENT_STATUS[event.status];
  const draft = event.status === "draft";
  const unpublished = event.status === "unpublished";
  const ended = hasEnded(event);

  return (
    <article className={styles.eventCard} aria-labelledby={`card-${event.id}`}>
      <Thumb size={104} height={72} shape="image" />
      <div className={styles.eventCardText}>
        <h2 id={`card-${event.id}`} className={styles.eventCardTitle}>
          {event.title}
        </h2>
        <p className={`${ui.muted} ${styles.eventCardMeta}`}>
          {`${event.status === "postponed" ? TEXT.newDate : ""}${[whenShort(event), event.venueName].filter(Boolean).join(" · ")}`}
        </p>
        <div className={styles.eventCardFoot}>
          <Chip tone={ended && !draft ? "neutral" : status.tone}>{ended && !draft ? "Ended" : status.label}</Chip>
          {!ended && event.liveStatus?.kind === "late" && (
            <Chip tone="warn">{`${TEXT.runningLate} · ${formatTime(event.liveStatus.newStartAt)}`}</Chip>
          )}
          {unpublished ? <span>{event.unpublishedReason}</span> : !draft && <span>{turnout(event)}</span>}
        </div>
      </div>
      <MaybeLink
        href={draft ? routes.editEvent(event.id) : routes.manageEvent(event.id)}
        className={`${ui.rowButton} ${ui.rowButtonWhite}`}
      >
        {draft ? TEXT.edit : unpublished ? TEXT.seeWhy : TEXT.manage}
      </MaybeLink>
    </article>
  );
}
