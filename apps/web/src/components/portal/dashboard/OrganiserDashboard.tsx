import type { OrganiserDashboard as Data, OrganiserEventRow, OrganiserEventStatus } from "@/lib/data/portal-types";
import { formatCount, formatDayMonth, formatStartsLabel, formatTime } from "@/lib/format";
import { routes } from "@/lib/routes";
import ButtonLink from "../ButtonLink";
import Chip, { type ChipTone } from "../Chip";
import Columns from "../Columns";
import MaybeLink from "../MaybeLink";
import PageHeader from "../PageHeader";
import Panel from "../Panel";
import Thumb from "../Thumb";
import styles from "./Dashboard.module.css";
import shell from "../PortalShell.module.css";
import ui from "../ui.module.css";

// Words on the organiser dashboard, in one place for the translation files (EN-07-T4).
const TEXT = {
  title: "Dashboard",
  postJob: "Post a job",
  createEvent: "Create event",
  manageEvent: "Manage event",
  updateStatus: "Update status",
  going: "Going",
  interested: "Interested",
  yourEvents: "Your events",
  analytics: "Analytics",
  tableCaption: "Your events, with how many people are going and how hiring and stalls are going",
  columns: ["Event", "Status", "Going", "Interested", "Bookings", "Stalls"],
  actionsColumn: "Actions",
  open: "Open ›",
  edit: "Edit ›",
  notPublished: "Not published",
  none: "–",
  note: "Bookings: confirmed of requests sent. Stalls: approved of applications. Counts update live.",
  attention: "Needs your attention",
  nothingWaiting: "Nothing is waiting for you.",
  seeAllNotifications: "See all notifications",
  rank: "Your rank",
  leaderboards: "Leaderboards",
  runningLate: "Running late",
} as const;

const STATUS: Record<OrganiserEventStatus, { label: string; tone: ChipTone }> = {
  published: { label: "Published", tone: "good" },
  postponed: { label: "Postponed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  draft: { label: "Draft", tone: "soft" },
};

// "4 upcoming events", "1 upcoming event"
function upcoming(count: number) {
  return `${count} upcoming ${count === 1 ? "event" : "events"}`;
}

// "3 of 6" for bookings or stalls, a dash when there are none to count
function ratio(done: number | undefined, outOf: number | undefined) {
  return done === undefined || outOf === undefined ? TEXT.none : `${done} of ${outOf}`;
}

// The organiser's home page (Figma O05): their next event in a big card, a table of all their
// events, and on the right what needs an answer and where they rank. Event pages, hiring and
// analytics come from later slices, so their buttons are drawn but don't click yet.
export default function OrganiserDashboard({ data, now }: { data: Data; now: Date }) {
  const { organiserName, featured, events, attention, rank } = data;
  // Drafts count as upcoming too: Figma's "4 upcoming events" includes the draft. An event that
  // started in the last 6 hours still counts, so tonight's event doesn't drop out once it begins.
  const upcomingCount = events.filter(
    (e) => e.status !== "cancelled" && Date.parse(e.startsAt) >= now.getTime() - 6 * 3_600_000,
  ).length;

  const aside = (
    <>
      <Panel title={TEXT.attention}>
        {attention.length === 0 ? (
          <p className={shell.panelEmpty}>{TEXT.nothingWaiting}</p>
        ) : (
          <ul className={ui.rows}>
            {attention.map((item) => (
              <li key={item.id}>
                <MaybeLink href={item.href} className={`${ui.row} ${styles.attentionRow}`}>
                  <Thumb size={36} />
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{item.title}</span>
                    <span className={ui.muted}>{item.detail}</span>
                  </span>
                </MaybeLink>
              </li>
            ))}
          </ul>
        )}
        <MaybeLink href={routes.notifications} className={ui.wideButton}>
          {TEXT.seeAllNotifications}
        </MaybeLink>
      </Panel>

      {rank && (
        <Panel title={TEXT.rank} link={{ label: TEXT.leaderboards }}>
          <div className={styles.rank}>
            <div className={styles.rankText}>
              <p className={styles.rankPosition}>{`#${rank.position} of ${rank.among}`}</p>
              <p className={ui.muted}>{`★ ${rank.rating} from ${formatCount(rank.reviews)} reviews`}</p>
            </div>
            {rank.badge && <Chip tone="strong">{rank.badge}</Chip>}
          </div>
        </Panel>
      )}
    </>
  );

  return (
    <Columns aside={aside}>
      <PageHeader
        title={TEXT.title}
        description={`${organiserName} · ${upcoming(upcomingCount)}`}
        actions={
          <>
            <ButtonLink>{TEXT.postJob}</ButtonLink>
            <ButtonLink primary>{TEXT.createEvent}</ButtonLink>
          </>
        }
      />

      {featured && (
        <section className={styles.featured} aria-labelledby="featured-title">
          <span className={styles.photo}>
            <Thumb size={220} height={150} shape="image" />
          </span>
          <div className={styles.featuredBody}>
            <p className={ui.muted}>{formatStartsLabel(featured.startsAt, now)}</p>
            <h2 id="featured-title" className={styles.featuredTitle}>
              {featured.title}
            </h2>
            <p className={`${ui.muted} ${styles.featuredMeta}`}>
              {`${formatDayMonth(featured.startsAt)} · ${formatTime(featured.startsAt)} – ${formatTime(featured.endsAt)} · ${featured.venueName}`}
            </p>
            <div className={styles.chips}>
              <Chip tone={STATUS[featured.status].tone}>{STATUS[featured.status].label}</Chip>
              {featured.liveStatus?.kind === "late" && (
                <Chip tone="warn">{`${TEXT.runningLate} · ${formatTime(featured.liveStatus.newStartAt)}`}</Chip>
              )}
            </div>
            <div className={styles.featuredActions}>
              {/* the event's own page and its live status are slice 4 (O09) */}
              <MaybeLink className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>{TEXT.manageEvent}</MaybeLink>
              <MaybeLink className={`${ui.rowButton} ${ui.rowButtonWhite}`}>{TEXT.updateStatus}</MaybeLink>
            </div>
          </div>
          <dl className={styles.stats}>
            <Stat value={featured.going} label={TEXT.going} />
            <Stat value={featured.interested} label={TEXT.interested} />
          </dl>
        </section>
      )}

      <section className={styles.events} aria-labelledby="your-events">
        <div className={ui.sectionHead}>
          <h2 id="your-events" className={ui.sectionTitle}>
            {TEXT.yourEvents}
          </h2>
          <MaybeLink className={ui.textLink}>{TEXT.analytics}</MaybeLink>
        </div>
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <caption className={shell.srOnly}>{TEXT.tableCaption}</caption>
            <thead>
              <tr>
                {TEXT.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
                <th scope="col">
                  <span className={shell.srOnly}>{TEXT.actionsColumn}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </tbody>
          </table>
        </div>
        <p className={ui.note}>{TEXT.note}</p>
      </section>
    </Columns>
  );
}

// One white tile on the right of the featured card: a big number over its label.
// The label is the <dt> but sits second, as in Figma; CSS order puts it under the number.
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.stat}>
      <dt className={`${ui.muted} ${styles.statLabel}`}>{label}</dt>
      <dd className={styles.statValue}>{formatCount(value)}</dd>
    </div>
  );
}

// One row of "Your events". Drafts show "Not published" and dashes, and their link says "Edit".
function EventRow({ event }: { event: OrganiserEventRow }) {
  const draft = event.status === "draft";
  const status = STATUS[event.status];

  return (
    <tr>
      <th scope="row">
        <span className={styles.eventName}>{event.title}</span>
        <span className={ui.muted}>{draft ? TEXT.notPublished : formatDayMonth(event.startsAt)}</span>
      </th>
      <td>
        <Chip tone={status.tone}>{status.label}</Chip>
      </td>
      <td className={draft ? undefined : styles.strong}>{draft ? TEXT.none : formatCount(event.going)}</td>
      <td>{draft ? TEXT.none : formatCount(event.interested)}</td>
      <td>{ratio(event.bookings?.confirmed, event.bookings?.requested)}</td>
      <td>{ratio(event.stalls?.approved, event.stalls?.offered)}</td>
      <td>
        {/* the event's own page is slice 4 (O09, O54) */}
        <MaybeLink className={ui.textLink}>{draft ? TEXT.edit : TEXT.open}</MaybeLink>
      </td>
    </tr>
  );
}
