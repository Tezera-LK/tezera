import type { ManagedEvent } from "@/lib/data/portal-types";
import { formatTime } from "@/lib/format";
import { routes } from "@/lib/routes";
import Chip from "../Chip";
import MaybeLink from "../MaybeLink";
import Tabs from "../Tabs";
import Thumb from "../Thumb";
import ui from "../ui.module.css";
import styles from "./EventPages.module.css";
import { AGE_LABEL, EVENT_STATUS, hasEnded, whenLong } from "./eventText";

export type EventTab = "overview" | "map" | "stalls" | "hiring" | "qa" | "board";

const TEXT = {
  viewPage: "View event page",
  edit: "Edit event",
  postponeOrCancel: "Postpone or cancel",
  runningLate: "Running late",
  ended: "Ended",
  tabsLabel: "Event sections",
} as const;

// The top of every page for one event (Figma O09, O15, O16, O57): photo, title, when and where,
// status chips, three buttons and the six tabs. Map and Hiring belong to later slices, so those
// tabs are drawn but aren't links yet.
export default function EventHeader({ event, current }: { event: ManagedEvent; current: EventTab }) {
  const ended = hasEnded(event);
  const status = EVENT_STATUS[event.status];
  // a cancelled, unpublished or finished event can't be postponed or cancelled again
  const canChange = !ended && (event.status === "published" || event.status === "postponed");
  const isPublic = event.status === "published" || event.status === "postponed" || event.status === "cancelled";

  return (
    <>
      <header className={styles.eventHead}>
        <Thumb size={110} height={76} shape="image" />
        <div className={styles.eventHeadText}>
          <h1 className={styles.eventTitle}>{event.title}</h1>
          <p className={styles.eventMeta}>
            {[whenLong(event), event.address || event.venueName].filter(Boolean).join(" · ")}
          </p>
          <div className={styles.eventChips}>
            {ended ? <Chip tone="neutral">{TEXT.ended}</Chip> : <Chip tone={status.tone}>{status.label}</Chip>}
            {!ended && event.liveStatus?.kind === "late" && (
              <Chip tone="warn">{`${TEXT.runningLate} · ${formatTime(event.liveStatus.newStartAt)}`}</Chip>
            )}
            {!ended && <Chip tone="neutral">{AGE_LABEL[event.ageRating]}</Chip>}
          </div>
          <div className={styles.eventActions}>
            <MaybeLink href={isPublic ? routes.event(event.id) : undefined} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
              {TEXT.viewPage}
            </MaybeLink>
            <MaybeLink href={routes.editEvent(event.id)} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
              {TEXT.edit}
            </MaybeLink>
            <MaybeLink
              href={canChange ? routes.eventDialog(event.id, "postpone") : undefined}
              className={`${ui.rowButton} ${ui.rowButtonWhite}`}
            >
              {TEXT.postponeOrCancel}
            </MaybeLink>
          </div>
        </div>
      </header>
      <Tabs
        label={TEXT.tabsLabel}
        current={current}
        tabs={[
          { key: "overview", label: "Overview", href: routes.manageEvent(event.id) },
          // the venue map (O11–O71) and hiring (O14) are later slices
          { key: "map", label: "Map" },
          { key: "stalls", label: "Stalls", href: routes.eventStalls(event.id) },
          { key: "hiring", label: "Hiring" },
          { key: "qa", label: "Q&A", href: routes.eventQa(event.id) },
          { key: "board", label: "Board", href: routes.eventBoard(event.id) },
        ]}
      />
    </>
  );
}
