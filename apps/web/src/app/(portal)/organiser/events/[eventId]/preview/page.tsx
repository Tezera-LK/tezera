import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import Thumb from "@/components/portal/Thumb";
import styles from "@/components/portal/events/EventPages.module.css";
import { compactCount, entryLabel, whenLong } from "@/components/portal/events/eventText";
import shell from "@/components/portal/PortalShell.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getMyEvent, getMyOrganiserProfile } from "@/lib/data/portal";
import type { ManagedEvent } from "@/lib/data/portal-types";
import { formatCount, formatTime } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Preview event page" };

const TEXT = {
  bar: "Preview: what people see on the event page",
  barHint: "Empty Know before you go fields are hidden.",
  back: "Back to editing",
  verified: "✓ Verified organiser",
  runningLate: "Running late",
  going: "Going",
  interested: "Interested",
  share: "Share",
  tabsLabel: "Event page sections",
  know: "Know before you go",
  nothingYet: "Nothing here yet.",
  lineup: "Line-up",
  organiser: "Organiser",
  followers: (n: string) => `${n} followers`,
} as const;

// The "Know before you go" rows, in Figma's order and words (O52)
const KNOW_ROWS: { key: keyof ManagedEvent["know"]; label: string }[] = [
  { key: "dressCode", label: "Dress code" },
  { key: "bring", label: "Bring" },
  { key: "parking", label: "Parking" },
  { key: "rules", label: "Rules" },
  { key: "foodPrices", label: "Food and drink" },
  { key: "ifRains", label: "If it rains" },
];

type Section = "about" | "lineup";

// What people will see on the event page, inside the portal, before or after publishing
// (Figma O52). Going, Interested and Share are drawn but do nothing here. The About and Line-up
// tabs work; stall vendors, the map and Q&A come with their own slices.
export default async function PreviewEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const session = await requireRole("organiser");
  const { eventId } = await params;
  const section: Section = (await searchParams).section === "lineup" ? "lineup" : "about";
  const [event, profile] = await Promise.all([getMyEvent(session, eventId), getMyOrganiserProfile(session)]);
  if (!event) notFound();

  const filledKnow = KNOW_ROWS.filter((row) => event.know[row.key]);
  const base = routes.previewEvent(event.id);

  const aside = (
    <>
      <Panel title={TEXT.organiser}>
        <div className={`${ui.row} ${styles.announcement}`}>
          <Thumb size={40} shape="round" />
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{`${profile?.name ?? ""}${profile?.verified ? " ✓" : ""}`}</span>
            <span className={ui.muted}>{`★ ${profile?.rating ?? "–"} · ${TEXT.followers(compactCount(profile?.followers ?? 0))}`}</span>
          </span>
        </div>
      </Panel>
      <Panel title={TEXT.going}>
        <dl className={`${styles.tiles} ${styles.tiles2}`}>
          <div className={styles.tile}>
            <dt className={`${ui.muted} ${styles.tileLabel}`}>{TEXT.going}</dt>
            <dd className={styles.tileValue}>{formatCount(event.going)}</dd>
          </div>
          <div className={styles.tile}>
            <dt className={`${ui.muted} ${styles.tileLabel}`}>{TEXT.interested}</dt>
            <dd className={styles.tileValue}>{formatCount(event.interested)}</dd>
          </div>
        </dl>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <div className={styles.previewBar} role="note">
        <span className={styles.previewDot} aria-hidden="true" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.bar}</span>
          <span className={styles.liveDetail}>{TEXT.barHint}</span>
        </span>
        <MaybeLink href={routes.editEvent(event.id)} className={ui.textLink}>
          {TEXT.back}
        </MaybeLink>
      </div>

      <div className={styles.previewPhoto}>
        <Thumb size={744} height={240} shape="image" />
      </div>

      <div>
        <div className={styles.eventChips}>
          {event.category && <span className={ui.searchChip}>{event.category}</span>}
          {event.liveStatus?.kind === "late" && (
            <Chip tone="warn">{`${TEXT.runningLate} · ${formatTime(event.liveStatus.newStartAt)}`}</Chip>
          )}
          {profile?.verified && <span className={`${ui.searchChip} ${ui.chipSoft}`}>{TEXT.verified}</span>}
        </div>
        <h1 className={styles.previewTitle}>{event.title}</h1>
        <p className={styles.eventMeta}>
          {[whenLong(event), event.address || event.venueName, entryLabel(event)].filter(Boolean).join(" · ")}
        </p>
      </div>

      {/* the real buttons are the public page's (US-C03-T3); here they only show the layout */}
      <div className={styles.previewButtons} aria-hidden="true">
        <span className={`${shell.button} ${shell.buttonPrimary}`}>{TEXT.going}</span>
        <span className={shell.button}>{TEXT.interested}</span>
        <span className={shell.button}>{TEXT.share}</span>
      </div>

      <Tabs
        label={TEXT.tabsLabel}
        current={section}
        tabs={[
          { key: "about", label: "About", href: base },
          { key: "lineup", label: "Line-up", href: `${base}?section=lineup` },
          { key: "stalls", label: "Stall vendors" },
          { key: "map", label: "Venue map" },
          { key: "qa", label: "Q&A" },
        ]}
      />

      {section === "about" ? (
        <section className={styles.card} aria-labelledby="know-title">
          {event.description && <p className={styles.panelText}>{event.description}</p>}
          <h2 id="know-title" className={styles.cardTitle}>
            {TEXT.know}
          </h2>
          {filledKnow.length > 0 ? (
            <dl className={styles.facts}>
              {filledKnow.map((row) => (
                <div key={row.key} style={{ display: "contents" }}>
                  <dt>{row.label}</dt>
                  <dd>{event.know[row.key]}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={ui.muted}>{TEXT.nothingYet}</p>
          )}
        </section>
      ) : (
        <section className={styles.card} aria-labelledby="lineup-title">
          <h2 id="lineup-title" className={styles.cardTitle}>
            {TEXT.lineup}
          </h2>
          {event.lineup.length > 0 ? (
            <dl className={styles.facts}>
              {event.lineup.map((item, i) => (
                <div key={i} style={{ display: "contents" }}>
                  <dt>{item.time ? formatTime(`2000-01-01T${item.time}:00+05:30`) : ""}</dt>
                  <dd>{item.act}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={ui.muted}>{TEXT.nothingYet}</p>
          )}
        </section>
      )}
    </Columns>
  );
}
