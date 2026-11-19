import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Dialog from "@/components/portal/events/Dialog";
import EventHeader from "@/components/portal/events/EventHeader";
import styles from "@/components/portal/events/EventPages.module.css";
import { EVENT_STATUS, compactCount, hasEnded, whenShort } from "@/components/portal/events/eventText";
import forms from "@/components/portal/forms.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import {
  getEventBoard,
  getEventWork,
  getMyEvent,
  getMyOrganiserProfile,
  getPastEventSummary,
  getUnpublishedDetails,
} from "@/lib/data/portal";
import type { Audience, ManagedEvent } from "@/lib/data/portal-types";
import { daysFrom, formatCount, formatDayMonth, formatTime, formatWhen } from "@/lib/format";
import { routes } from "@/lib/routes";
import { cancelEvent, postponeEvent, sendAnnouncement, updateLiveStatus } from "../actions";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ dialog?: string; message?: string; error?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await requireRole("organiser");
  const event = await getMyEvent(session, (await params).eventId);
  return { title: event?.title ?? "Event" };
}

const TEXT = {
  going: "Going · live",
  interested: "Interested · live",
  hiringAndStalls: "Hiring and stalls",
  requestsSent: "Requests sent",
  quotesReceived: "Quotes received",
  bookings: "Bookings",
  stallApplications: "Stall applications",
  stallsApproved: "Stalls approved",
  venueMap: "Venue map",
  mapVersion: (version: number, when: string) => `Version ${version} · published ${when}`,
  noMap: "No map yet",
  openMapBuilder: "Open map builder",
  questionsAndBoard: "Questions and board",
  waiting: (n: number) => `${n} ${n === 1 ? "question" : "questions"} waiting for your answer`,
  threads: (n: number) => `${n} ${n === 1 ? "thread" : "threads"} on the discussion board`,
  sent: "Sent announcements",
  noneSent: "Nothing sent yet.",
  to: (who: Audience[]) => `to ${listAudience(who)}`,
  liveStatus: "Live status",
  liveHint: "Shown on the event page and pushed to everyone who marked Going or Interested.",
  onTime: "On time",
  runningLate: "Running late",
  newStart: (time: string) => `New start time · ${time}`,
  newStartLabel: "New start time",
  postponed: "Postponed",
  cancelled: "Cancelled",
  updateStatus: "Update status",
  lateError: "Add the new start time.",
  announce: "Send an announcement",
  announceButton: "Send announcement",
  announceLabel: "Announcement",
  announcePlaceholder: "Gates now open at 5:30 PM. Bring your NIC: 18+ after 9 PM.",
  goesTo: (going: number, interested: number, followers: number) =>
    `Goes to ${formatCount(going)} Going, ${formatCount(interested)} Interested and ${compactCount(followers)} followers, in the app and by push.`,
  cancelledNote: (reason: string) => `Cancelled: ${reason}`,
} as const;

// "Going, Interested and followers"
function listAudience(who: Audience[]): string {
  const words = who.map((w) => ({ going: "Going", interested: "Interested", followers: "followers" })[w]);
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}` : (words[0] ?? "");
}

// "2 hours ago", "3 days ago"
function ago(iso: string, now: number): string {
  const hours = Math.max(1, Math.round((now - Date.parse(iso)) / 3_600_000));
  return hours < 24 ? `${hours} ${hours === 1 ? "hour" : "hours"} ago` : `${Math.round(hours / 24)} days ago`;
}

// One event's home (Figma O09). The same address shows O55 when an admin unpublished the event,
// and O57 once it has ended. ?dialog= opens postpone or cancel (O10, O53) or the announcement
// check (O56) over it.
export default async function ManageEventPage({ params, searchParams }: Props) {
  const session = await requireRole("organiser");
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getMyEvent(session, eventId);
  if (!event || event.status === "draft") notFound();

  if (event.status === "unpublished") return <Unpublished event={event} />;
  if (hasEnded(event)) return <PastEvent event={event} />;

  const [work, board, profile] = await Promise.all([
    getEventWork(session, eventId),
    getEventBoard(session, eventId),
    getMyOrganiserProfile(session),
  ]);
  const now = new Date().getTime();
  const waiting = event.questions.filter((q) => !q.answer).length;
  const followers = profile?.followers ?? 0;
  const late = event.liveStatus?.kind === "late";
  const changeable = event.status === "published" || event.status === "postponed";

  const aside = changeable ? (
    <>
      <Panel title={TEXT.liveStatus}>
        <p className={styles.panelText}>{TEXT.liveHint}</p>
        <form action={updateLiveStatus.bind(null, event.id)} className={ui.rows}>
          <StatusChoice value="on-time" title={TEXT.onTime} checked={!late && event.status === "published"} />
          <StatusChoice
            value="late"
            title={TEXT.runningLate}
            detail={late && event.liveStatus ? TEXT.newStart(formatTime(event.liveStatus.newStartAt)) : undefined}
            checked={late}
          >
            <span className={forms.field}>
              <span className={forms.label} aria-hidden="true">
                {TEXT.newStartLabel}
              </span>
              <input
                type="time"
                name="lateTime"
                aria-label={TEXT.newStartLabel}
                className={`${forms.input} ${styles.panelTextarea}`}
                defaultValue={late && event.liveStatus ? event.liveStatus.newStartAt.slice(11, 16) : ""}
                aria-invalid={query.error === "late-time" || undefined}
              />
            </span>
            {query.error === "late-time" && <p className={forms.error}>{TEXT.lateError}</p>}
          </StatusChoice>
          <StatusChoice value="postponed" title={TEXT.postponed} checked={event.status === "postponed"} />
          <StatusChoice value="cancelled" title={TEXT.cancelled} checked={false} />
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary} ${styles.panelButton}`}>
            {TEXT.updateStatus}
          </button>
        </form>
      </Panel>
      <Panel title={TEXT.announce}>
        {/* a GET form: it opens the check-before-sending dialog (O56) with the text in the URL */}
        <form action={routes.manageEvent(event.id)} className={ui.rows}>
          <input type="hidden" name="dialog" value="announce" />
          <label className={shell.srOnly} htmlFor="announce-text">
            {TEXT.announceLabel}
          </label>
          <textarea
            id="announce-text"
            name="message"
            required
            rows={3}
            className={`${forms.input} ${styles.panelTextarea}`}
            placeholder={TEXT.announcePlaceholder}
          />
          <p className={styles.panelText}>{TEXT.goesTo(event.going, event.interested, followers)}</p>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary} ${styles.panelButton}`}>
            {TEXT.announceButton}
          </button>
        </form>
      </Panel>
    </>
  ) : (
    event.cancelReason && (
      <div className={styles.quietPanel}>
        <p className={ui.rowTitle}>{TEXT.cancelled}</p>
        <p className={styles.panelText}>{event.cancelReason}</p>
      </div>
    )
  );

  return (
    <>
      <Columns aside={aside}>
        <EventHeader event={event} current="overview" />

        <dl className={`${styles.tiles} ${styles.tiles2}`}>
          <Tile value={formatCount(event.going)} label={TEXT.going} />
          <Tile value={formatCount(event.interested)} label={TEXT.interested} />
        </dl>

        <section className={styles.events} aria-labelledby="hiring-title">
          <h2 id="hiring-title" className={ui.sectionTitle}>
            {TEXT.hiringAndStalls}
          </h2>
          <dl className={styles.tiles}>
            <Tile value={String(work?.requestsSent ?? event.bookings?.requested ?? 0)} label={TEXT.requestsSent} />
            <Tile value={String(work?.quotesReceived ?? 0)} label={TEXT.quotesReceived} />
            <Tile value={String(work?.confirmed ?? event.bookings?.confirmed ?? 0)} label={TEXT.bookings} />
            <Tile value={String(event.stalls?.offered ?? 0)} label={TEXT.stallApplications} />
            <Tile value={String(event.stalls?.approved ?? 0)} label={TEXT.stallsApproved} />
          </dl>
        </section>

        <div className={styles.pair}>
          <section className={styles.card} aria-labelledby="map-title">
            <div className={styles.cardHead}>
              <h2 id="map-title" className={styles.cardTitle}>
                {TEXT.venueMap}
              </h2>
              {work?.map && <Chip tone="good">{EVENT_STATUS.published.label}</Chip>}
            </div>
            <p className={ui.muted}>{work?.map ? TEXT.mapVersion(work.map.version, ago(work.map.publishedAt, now)) : TEXT.noMap}</p>
            {/* the map builder is its own slice (O11–O71) */}
            <MaybeLink className={`${ui.rowButton} ${ui.rowButtonWhite} ${styles.centred}`}>{TEXT.openMapBuilder}</MaybeLink>
          </section>
          <section className={styles.card} aria-labelledby="qa-title">
            <h2 id="qa-title" className={styles.cardTitle}>
              {TEXT.questionsAndBoard}
            </h2>
            <Link href={routes.eventQa(event.id)} className={styles.linkRow}>
              {TEXT.waiting(waiting)} <span aria-hidden="true">›</span>
            </Link>
            <Link href={routes.eventBoard(event.id)} className={styles.linkRow}>
              {TEXT.threads(board.length)} <span aria-hidden="true">›</span>
            </Link>
          </section>
        </div>

        <section className={styles.events} aria-labelledby="sent-title">
          <h2 id="sent-title" className={ui.sectionTitle}>
            {TEXT.sent}
          </h2>
          {event.announcements.length === 0 ? (
            <p className={ui.muted}>{TEXT.noneSent}</p>
          ) : (
            <ul className={ui.rows}>
              {event.announcements.map((a) => (
                <li key={a.id} className={`${ui.row} ${styles.announcement}`}>
                  <span className={styles.square} aria-hidden="true" />
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{a.text}</span>
                    <span className={ui.muted}>
                      {`${daysFrom(new Date(now), a.sentAt) === 0 ? "Today" : formatWhen(a.sentAt, new Date(now))} · ${formatTime(a.sentAt)} · ${TEXT.to(a.audience)}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Columns>

      {changeable && (query.dialog === "postpone" || query.dialog === "cancel") && (
        <PostponeOrCancel event={event} cancel={query.dialog === "cancel"} error={query.error} />
      )}
      {changeable && query.dialog === "announce" && (
        <ConfirmAnnouncement event={event} message={query.message ?? ""} followers={followers} error={query.error} />
      )}
    </>
  );
}

// One white number tile: the value big, the label under it.
function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.tile}>
      <dt className={`${ui.muted} ${styles.tileLabel}`}>{label}</dt>
      <dd className={styles.tileValue}>{value}</dd>
    </div>
  );
}

// One option in the Live status panel; `children` opens under it when it's picked.
function StatusChoice({
  value,
  title,
  detail,
  checked,
  children,
}: {
  value: string;
  title: string;
  detail?: string;
  checked: boolean;
  children?: React.ReactNode;
}) {
  return (
    <label className={`${forms.choice} ${forms.choiceWhite}`}>
      <input type="radio" name="status" value={value} defaultChecked={checked} />
      <span className={forms.choiceText}>
        <span className={forms.choiceTitle}>{title}</span>
        {detail && <span className={ui.muted}>{detail}</span>}
      </span>
      <span className={forms.choiceDot} aria-hidden="true" />
      {children && <span className={`${forms.choiceMore} ${styles.onlyWhenPicked}`}>{children}</span>}
    </label>
  );
}

// ---------- Dialogs ----------

const DIALOG_TEXT = {
  close: "Close",
  postponeOrCancel: "Postpone or cancel",
  cancelTitle: (title: string) => `Cancel ${title}?`,
  cannotUndo: "This cannot be undone",
  postpone: "Postpone",
  postponeHint: "Move the event to a new date and time.",
  postponeInstead: "Move to a new date instead",
  newDate: "New date",
  newTime: "New time",
  dateError: "Pick a new date that hasn't passed, and a time.",
  cancelEvent: "Cancel the event",
  cancelHint: "The event will not go ahead.",
  reason: "Reason, shown on the event page",
  reasonError: "Say why, so people know.",
  told: (going: number, interested: number) =>
    `${formatCount(going)} Going and ${formatCount(interested)} Interested will be told`,
  toldHint: "Booked providers and stall vendors are asked to accept the new date.",
  keep: "Keep the event as it is",
  keepShort: "Keep the event",
  postponeButton: "Postpone event",
  cancelButton: "Cancel event",
  whatHappens: "What happens",
  peopleTold: "People told",
  peopleToldValue: (going: number, interested: number) =>
    `${formatCount(going)} Going, ${formatCount(interested)} Interested, by push and SMS (proposed)`,
  bookingsValue: (n: number) => `${n} cancelled under their terms`,
  stallFees: "Stall fees",
  stallFeesValue: (n: number) => `${n} vendors refunded`,
  yourProfile: "Your profile",
  yourProfileValue: "Bookings cancelled within 7 days show as late cancellations",
  sendTitle: "Send this announcement?",
  people: (n: string) => `${n} people`,
  sendHint: "In the app and by push. Announcements cannot be edited once sent.",
  audienceError: "Pick at least one group.",
  cancel: "Cancel",
  send: (n: number) => `Send to ${formatCount(n)} people`,
} as const;

// "Postpone or cancel" (O10) and "Cancel … ?" (O53): one dialog, two choices. The choice not
// picked is a link to the other one, so switching works without JavaScript.
function PostponeOrCancel({ event, cancel, error }: { event: ManagedEvent; cancel: boolean; error?: string }) {
  const close = routes.manageEvent(event.id);
  const choice = (picked: boolean, title: string, hint: string, href: string, children?: React.ReactNode) =>
    picked ? (
      <div className={`${forms.choice} ${styles.pickedChoice}`}>
        <span className={forms.choiceText}>
          <span className={forms.choiceTitle}>{title}</span>
          <span className={ui.muted}>{hint}</span>
        </span>
        <span className={`${forms.choiceDot} ${styles.dotOn}`} aria-hidden="true" />
        {children && <div className={forms.choiceMore}>{children}</div>}
      </div>
    ) : (
      <Link href={href} scroll={false} className={forms.choice}>
        <span className={forms.choiceText}>
          <span className={forms.choiceTitle}>{title}</span>
          <span className={ui.muted}>{hint}</span>
        </span>
        <span className={forms.choiceDot} aria-hidden="true" />
      </Link>
    );

  if (!cancel) {
    return (
      <Dialog
        title={DIALOG_TEXT.postponeOrCancel}
        subtitle={`${event.title} · ${whenShort(event)}`}
        closeHref={close}
        closeLabel={DIALOG_TEXT.close}
      >
        <form action={postponeEvent.bind(null, event.id)} className={ui.rows}>
          {choice(
            true,
            DIALOG_TEXT.postpone,
            DIALOG_TEXT.postponeHint,
            "",
            <div className={forms.row2}>
              <label className={forms.field}>
                <span className={forms.label}>{DIALOG_TEXT.newDate}</span>
                <input type="date" name="date" required className={forms.input} defaultValue={event.date} />
              </label>
              <label className={forms.field}>
                <span className={forms.label}>{DIALOG_TEXT.newTime}</span>
                <input type="time" name="time" required className={forms.input} defaultValue={event.startTime} />
              </label>
            </div>,
          )}
          {error === "date" && <p className={forms.error}>{DIALOG_TEXT.dateError}</p>}
          {choice(false, DIALOG_TEXT.cancelEvent, DIALOG_TEXT.cancelHint, routes.eventDialog(event.id, "cancel"))}
          <div className={styles.tellNote}>
            <span className={styles.tellDot} aria-hidden="true" />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{DIALOG_TEXT.told(event.going, event.interested)}</span>
              <span className={ui.muted}>{DIALOG_TEXT.toldHint}</span>
            </span>
          </div>
          <div className={forms.actions}>
            <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
              {DIALOG_TEXT.keep}
            </Link>
            <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
              {DIALOG_TEXT.postponeButton}
            </button>
          </div>
        </form>
      </Dialog>
    );
  }

  return (
    <Dialog title={DIALOG_TEXT.cancelTitle(event.title)} subtitle={DIALOG_TEXT.cannotUndo} closeHref={close} closeLabel={DIALOG_TEXT.close}>
      <form action={cancelEvent.bind(null, event.id)} className={ui.rows}>
        {choice(false, DIALOG_TEXT.postpone, DIALOG_TEXT.postponeInstead, routes.eventDialog(event.id, "postpone"))}
        {choice(
          true,
          DIALOG_TEXT.cancelEvent,
          "",
          "",
          <label className={forms.field}>
            <span className={forms.label}>{DIALOG_TEXT.reason}</span>
            <input name="reason" required className={forms.input} aria-invalid={error === "reason" || undefined} />
            {error === "reason" && <span className={forms.error}>{DIALOG_TEXT.reasonError}</span>}
          </label>,
        )}
        <div className={styles.happens}>
          <p className={ui.rowTitle}>{DIALOG_TEXT.whatHappens}</p>
          <dl className={styles.facts}>
            <dt>{DIALOG_TEXT.peopleTold}</dt>
            <dd>{DIALOG_TEXT.peopleToldValue(event.going, event.interested)}</dd>
            <dt>{TEXT.bookings}</dt>
            <dd>{DIALOG_TEXT.bookingsValue(event.bookings?.confirmed ?? 0)}</dd>
            <dt>{DIALOG_TEXT.stallFees}</dt>
            <dd>{DIALOG_TEXT.stallFeesValue(event.stalls?.approved ?? 0)}</dd>
            <dt>{DIALOG_TEXT.yourProfile}</dt>
            <dd>{DIALOG_TEXT.yourProfileValue}</dd>
          </dl>
        </div>
        <div className={forms.actions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {DIALOG_TEXT.keepShort}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
            {DIALOG_TEXT.cancelButton}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// "Send this announcement?" (O56): the text, who gets it (three switches), and the send button.
function ConfirmAnnouncement({
  event,
  message,
  followers,
  error,
}: {
  event: ManagedEvent;
  message: string;
  followers: number;
  error?: string;
}) {
  const close = routes.manageEvent(event.id);
  const groups = [
    { key: "going", title: "Going", count: event.going },
    { key: "interested", title: "Interested", count: event.interested },
    { key: "followers", title: "Followers", count: followers },
  ];
  const total = groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <Dialog title={DIALOG_TEXT.sendTitle} subtitle={event.title} closeHref={close} closeLabel={DIALOG_TEXT.close}>
      <form action={sendAnnouncement.bind(null, event.id)} className={ui.rows}>
        <input type="hidden" name="message" value={message} />
        <p className={styles.quote}>{message}</p>
        {groups.map((g) => (
          <label key={g.key} className={styles.audienceRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{g.title}</span>
              <span className={ui.muted}>{DIALOG_TEXT.people(g.key === "followers" ? compactCount(g.count) : formatCount(g.count))}</span>
            </span>
            <span className={forms.switch}>
              <input type="checkbox" name={g.key} defaultChecked role="switch" />
            </span>
          </label>
        ))}
        {error === "audience" && <p className={forms.error}>{DIALOG_TEXT.audienceError}</p>}
        <p className={forms.hint}>{DIALOG_TEXT.sendHint}</p>
        <div className={`${forms.actions} ${styles.sendActions}`}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {DIALOG_TEXT.cancel}
          </Link>
          {/* the total assumes every switch is on; the server sends to the groups left on */}
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`} disabled={!message}>
            {DIALOG_TEXT.send(total)}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------- Unpublished by an admin (O55) ----------

const UNPUBLISHED_TEXT = {
  notice: (when: string) => `An admin unpublished this event on ${when}`,
  noticeHint: (reason: string) => `It was reported as ${reason.replace(/^Reported as /i, "").toLowerCase()}. People can no longer see it.`,
  whatClosed: "What closed",
  reasonTitle: "Reason from the admin",
  sendDocuments: "Send documents to the admin",
  support: "Message Tezera support",
  badgeTitle: "Your verified badge is not affected",
  badgeText: "Unless an admin finds the event was fake on purpose.",
} as const;

// What the organiser sees when an admin took their event down (Figma O55): what closed, why,
// and how to get it back. Sending documents and support messages are later slices.
async function Unpublished({ event }: { event: ManagedEvent }) {
  const session = await requireRole("organiser");
  const details = await getUnpublishedDetails(session, event.id);

  const aside = (
    <div className={styles.quietPanel}>
      <p className={ui.rowTitle}>{UNPUBLISHED_TEXT.badgeTitle}</p>
      <p className={styles.panelText}>{UNPUBLISHED_TEXT.badgeText}</p>
    </div>
  );

  return (
    <Columns aside={aside}>
      <header className={shell.pageHeader}>
        <div className={shell.pageHeading}>
          <h1 className={shell.pageTitle}>{event.title}</h1>
          <p className={shell.lede}>{[whenShort(event), event.venueName].filter(Boolean).join(" · ")}</p>
        </div>
        <Chip tone="danger">{EVENT_STATUS.unpublished.label}</Chip>
      </header>
      <div className={styles.notice} role="status">
        <span className={styles.liveDot} aria-hidden="true" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{UNPUBLISHED_TEXT.notice(formatDayMonth(details?.at ?? event.editedAt))}</span>
          <span className={styles.liveDetail}>{UNPUBLISHED_TEXT.noticeHint(event.unpublishedReason ?? "a problem")}</span>
        </span>
      </div>
      {details && (
        <section className={styles.card} aria-labelledby="closed-title">
          <h2 id="closed-title" className={styles.cardTitle}>
            {UNPUBLISHED_TEXT.whatClosed}
          </h2>
          <ul className={ui.rows}>
            {details.closed.map((item) => (
              <li key={item.title} className={styles.closedRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{item.title}</span>
                  <span className={ui.muted}>{item.detail}</span>
                </span>
                {item.state === "On hold" ? <Chip tone="warn">{item.state}</Chip> : <span className={styles.closedState}>{item.state}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {details && (
        <section className={styles.card} aria-labelledby="reason-title">
          <h2 id="reason-title" className={styles.cardTitle}>
            {UNPUBLISHED_TEXT.reasonTitle}
          </h2>
          <p className={styles.panelText}>{details.detail}</p>
        </section>
      )}
      <div className={styles.bigActions}>
        <MaybeLink className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>{UNPUBLISHED_TEXT.sendDocuments}</MaybeLink>
        <MaybeLink className={forms.bigButton}>{UNPUBLISHED_TEXT.support}</MaybeLink>
      </div>
    </Columns>
  );
}

// ---------- After the event (O57) ----------

const PAST_TEXT = {
  went: "Went (marked Going)",
  fromReviews: (n: number) => `From ${n} consumer reviews`,
  noRating: "No reviews yet",
  daysLeft: (n: number) => `${n} ${n === 1 ? "day" : "days"}`,
  leftToReview: "Left to review",
  closed: "Closed",
  bookingsToClose: "Bookings to close",
  provider: "Provider",
  service: "Service",
  status: "Status",
  actions: "Actions",
  completed: "Completed",
  notMarked: "Not marked",
  review: "Review",
  markCompleted: "Mark completed",
  stallsToReview: "Stall vendors to review",
  vendor: "Vendor",
  stall: "Stall",
  ended: "Ended",
  window: "Review window",
  windowText: (closes: string) =>
    `Reviews opened when the event ended and close 14 days later (proposed), on ${closes}.`,
  nothing: "Nothing left to close.",
} as const;

// An event that has ended (Figma O57): how it went, bookings to close, vendors to review.
// "Review" opens the review form (O30); "Mark completed" on these older sample bookings waits
// for them to move into the booking records.
async function PastEvent({ event }: { event: ManagedEvent }) {
  const session = await requireRole("organiser");
  const summary = await getPastEventSummary(session, event.id);
  const end = Date.parse(event.endsAt ?? event.startsAt ?? event.editedAt);
  const closes = new Date(end + 14 * 86_400_000);
  const daysLeft = Math.max(0, Math.ceil((closes.getTime() - new Date().getTime()) / 86_400_000));

  const aside = (
    <Panel title={PAST_TEXT.window}>
      <p className={styles.panelText}>{PAST_TEXT.windowText(formatDayMonth(closes.toISOString()))}</p>
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <EventHeader event={event} current="overview" />
      <dl className={`${styles.tiles} ${styles.tiles3}`}>
        <Tile value={formatCount(event.going)} label={PAST_TEXT.went} />
        <Tile value={summary ? String(summary.rating) : "–"} label={summary ? PAST_TEXT.fromReviews(summary.reviews) : PAST_TEXT.noRating} />
        <Tile value={daysLeft > 0 ? PAST_TEXT.daysLeft(daysLeft) : PAST_TEXT.closed} label={PAST_TEXT.leftToReview} />
      </dl>

      <section className={styles.events} aria-labelledby="close-title">
        <h2 id="close-title" className={ui.sectionTitle}>
          {PAST_TEXT.bookingsToClose}
        </h2>
        {summary && summary.bookings.length > 0 ? (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{PAST_TEXT.provider}</th>
                  <th scope="col">{PAST_TEXT.service}</th>
                  <th scope="col">{PAST_TEXT.status}</th>
                  <th scope="col">
                    <span className={shell.srOnly}>{PAST_TEXT.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.bookings.map((b) => (
                  <tr key={b.id}>
                    <th scope="row">
                      <span className={styles.name}>{b.provider}</span>
                      <span className={ui.muted}>{b.kind}</span>
                    </th>
                    <td>{b.service}</td>
                    <td>
                      {b.status === "completed" ? <Chip tone="good">{PAST_TEXT.completed}</Chip> : <Chip tone="warn">{PAST_TEXT.notMarked}</Chip>}
                    </td>
                    <td>
                      {b.status === "completed" ? (
                        <MaybeLink href={routes.writeReview(b.id)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                          {PAST_TEXT.review}
                        </MaybeLink>
                      ) : (
                        <MaybeLink className={`${ui.rowButton} ${ui.rowButtonWhite}`}>{PAST_TEXT.markCompleted}</MaybeLink>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={ui.muted}>{PAST_TEXT.nothing}</p>
        )}
      </section>

      {summary && summary.stalls.length > 0 && (
        <section className={styles.events} aria-labelledby="stalls-title">
          <h2 id="stalls-title" className={ui.sectionTitle}>
            {PAST_TEXT.stallsToReview}
          </h2>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{PAST_TEXT.vendor}</th>
                  <th scope="col">{PAST_TEXT.stall}</th>
                  <th scope="col">{PAST_TEXT.status}</th>
                  <th scope="col">
                    <span className={shell.srOnly}>{PAST_TEXT.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.stalls.map((s) => (
                  <tr key={s.id}>
                    <th scope="row">
                      <span className={styles.name}>{s.vendor}</span>
                      <span className={ui.muted}>{s.category}</span>
                    </th>
                    <td>{s.stall}</td>
                    <td>
                      <Chip tone="neutral">{PAST_TEXT.ended}</Chip>
                    </td>
                    <td>
                      <MaybeLink href={routes.writeReview(s.id)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                        {PAST_TEXT.review}
                      </MaybeLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Columns>
  );
}
