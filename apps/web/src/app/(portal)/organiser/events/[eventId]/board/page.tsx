import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import EventHeader from "@/components/portal/events/EventHeader";
import styles from "@/components/portal/events/EventPages.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getEventBoard, getMyEvent, getMyOrganiserProfile } from "@/lib/data/portal";
import { newestFirst } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Discussion board" };

const TEXT = {
  title: "Discussion board",
  hint: "Where people going to the event talk and make plans.",
  sortLabel: "Sort threads",
  newest: "Newest",
  top: "Most upvoted",
  newThread: "New thread",
  reply: "Reply",
  replies: (n: number) => `${n} ${n === 1 ? "reply" : "replies"}`,
  verified: "Verified",
  pinned: "pinned",
  upvotes: (n: number) => `${n} upvotes`,
  empty: "No threads yet. People going can start one from the event page.",
  badge: "Your badge",
  organiser: "Organiser",
  badgeText: "Your threads and replies show these badges on every board and community.",
} as const;

// The event's discussion board (Figma O16): its threads, newest or most upvoted first. Reply
// opens the thread (O25); New thread opens the dialog (O93) on the Community page.
export default async function EventBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const session = await requireRole("organiser");
  const { eventId } = await params;
  const top = (await searchParams).sort === "top";
  const [event, threads, profile] = await Promise.all([
    getMyEvent(session, eventId),
    getEventBoard(session, eventId),
    getMyOrganiserProfile(session),
  ]);
  if (!event || event.status === "draft" || event.status === "unpublished") notFound();

  // pinned threads stay first either way
  const sorted = [...threads].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      (top ? b.upvotes - a.upvotes : newestFirst(a.postedAt, b.postedAt)),
  );
  const base = routes.eventBoard(event.id);

  const aside = profile && (
    <Panel title={TEXT.badge}>
      <div className={`${ui.row} ${styles.announcement}`}>
        <Thumb size={36} shape="round" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{profile.name}</span>
          <span className={styles.badges}>
            <Chip tone="soft">{TEXT.organiser}</Chip>
            {profile.verified && <Chip tone="good">{TEXT.verified}</Chip>}
          </span>
        </span>
      </div>
      <p className={styles.panelText}>{TEXT.badgeText}</p>
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <EventHeader event={event} current="board" />
      <div className={styles.listHead}>
        <div className={styles.listHeadText}>
          <h2 className={ui.sectionTitle}>{TEXT.title}</h2>
          <p className={ui.muted}>{TEXT.hint}</p>
        </div>
        <div className={styles.filters}>
          <nav className={styles.filters} aria-label={TEXT.sortLabel}>
            <Link href={base} className={styles.filter} aria-current={!top ? "page" : undefined}>
              {TEXT.newest}
            </Link>
            <Link href={`${base}?sort=top`} className={styles.filter} aria-current={top ? "page" : undefined}>
              {TEXT.top}
            </Link>
          </nav>
          <MaybeLink href={`${routes.community}?dialog=new&in=event:${event.id}`} className={`${styles.filter} ${styles.filterPrimary}`}>
            {TEXT.newThread}
          </MaybeLink>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className={ui.muted}>{TEXT.empty}</p>
      ) : (
        <ul className={ui.rows}>
          {sorted.map((t) => (
            <li key={t.id} className={`${styles.post} ${styles.postRow}`}>
              <Thumb size={36} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{t.title}</span>
                <span className={ui.muted}>
                  {[t.author, t.authorRole, t.verified && TEXT.verified, TEXT.replies(t.replies), t.pinned && TEXT.pinned]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className={ui.muted}>{`▲ ${t.upvotes}`}</span>
              </span>
              <MaybeLink href={routes.thread(t.id)} className={ui.rowButton}>
                {TEXT.reply}
              </MaybeLink>
            </li>
          ))}
        </ul>
      )}
    </Columns>
  );
}
