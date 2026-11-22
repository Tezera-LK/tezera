import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import { compactCount } from "@/components/portal/events/eventText";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/people/People.module.css";
import Votes from "@/components/portal/people/Votes";
import shell from "@/components/portal/PortalShell.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getMyEvent, getMyOrganiserProfile, getThread, listCommunities } from "@/lib/data/portal";
import { formatDayMonth, formatWhen, newestFirst } from "@/lib/format";
import { routes } from "@/lib/routes";
import { replyToThread, reportThread, setMembership } from "../../actions";

export const metadata: Metadata = { title: "Thread" };

const TEXT = {
  joined: "Joined",
  join: "Join",
  newThread: "New thread",
  communityLede: (members: number, about: string) => `${compactCount(members)} members · ${about.charAt(0).toLowerCase()}${about.slice(1).replace(/\.$/, "")}`,
  boardLede: "Where people going to the event talk and make plans",
  board: (title: string) => `${title} · board`,
  verified: "Verified",
  linked: "Short link to the event page",
  reply: "Reply",
  report: "Report",
  reported: "Reported · an admin is checking it",
  replies: (n: number) => `${n} ${n === 1 ? "reply" : "replies"}`,
  sortLabel: "Sort replies",
  top: "Most upvoted",
  newest: "Newest",
  write: "Write a reply",
  replyError: "Write something first.",
  about: "About this community",
  aboutLine: (members: number, posts: number) => `${compactCount(members)} members · ${posts} new posts today`,
  leave: "Leave",
  aboutBoard: "About this board",
  boardText: "Everyone going to the event can post here. You're the organiser, so your posts are marked.",
  badges: "Your badges",
  organiser: "Organiser",
  badgeText: "Your replies show your role and the Verified badge.",
} as const;

// A thread (Figma O25), on an event's board or in a community: the post with its votes, its
// replies newest or most upvoted first, and a reply box.
export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ threadId: string }>;
  searchParams: Promise<{ sort?: string; error?: string }>;
}) {
  const session = await requireRole("organiser");
  const { threadId } = await params;
  const query = await searchParams;
  const thread = await getThread(session, threadId);
  if (!thread) notFound();
  const [communities, event, linked, profile] = await Promise.all([
    listCommunities(session),
    thread.eventId ? getMyEvent(session, thread.eventId) : null,
    thread.linkedEventId ? getMyEvent(session, thread.linkedEventId) : null,
    getMyOrganiserProfile(session),
  ]);
  const community = communities.find((c) => c.id === thread.communityId) ?? null;
  const now = new Date();
  const newest = query.sort === "newest";
  const replies = [...thread.replies].sort((a, b) => (newest ? newestFirst(a.at, b.at) : b.upvotes - a.upvotes));
  const here = routes.thread(thread.id);
  const newThreadHref = `${routes.community}?dialog=new&in=${community ? `community:${community.id}` : `event:${thread.eventId}`}`;

  const aside = (
    <>
      {community ? (
        <Panel title={TEXT.about}>
          <p className={tables.panelText}>{community.about}</p>
          <p className={styles.small}>{TEXT.aboutLine(community.members, community.newPosts)}</p>
          {community.joined && (
            <form action={setMembership.bind(null, community.id, false, here)}>
              <button type="submit" className={`${ui.rowButton} ${ui.rowButtonWhite} ${tables.panelLink} ${styles.wide}`}>
                {TEXT.leave}
              </button>
            </form>
          )}
        </Panel>
      ) : (
        <Panel title={TEXT.aboutBoard}>
          <p className={tables.panelText}>{TEXT.boardText}</p>
        </Panel>
      )}
      <Panel title={TEXT.badges}>
        <div className={hiring.chipRow}>
          <Chip tone="soft">{TEXT.organiser}</Chip>
          {profile?.verified && <Chip tone="good">{TEXT.verified}</Chip>}
        </div>
        <p className={tables.panelText}>{TEXT.badgeText}</p>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={styles.headRow}>
        <div className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{community?.name ?? TEXT.board(event?.title ?? "")}</h1>
          <p className={hiring.lede}>{community ? TEXT.communityLede(community.members, community.about) : TEXT.boardLede}</p>
        </div>
        <div className={styles.threadButtons}>
          {community &&
            (community.joined ? (
              <span className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>{TEXT.joined}</span>
            ) : (
              <form action={setMembership.bind(null, community.id, true, here)}>
                <button type="submit" className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                  {TEXT.join}
                </button>
              </form>
            ))}
          {(!community || community.joined) && (
            <Link href={newThreadHref} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
              {TEXT.newThread}
            </Link>
          )}
        </div>
      </header>

      <article className={styles.thread} aria-labelledby="thread-title">
        <Votes threadId={thread.id} count={thread.upvotes} voted={Boolean(thread.voted)} back={here} label={thread.title} />
        <div className={ui.rowText}>
          <span className={styles.small}>{[thread.author, thread.authorRole, formatWhen(thread.at, now)].join(" · ")}</span>
          <h2 id="thread-title" className={styles.bigTitle}>
            {thread.title}
          </h2>
          {thread.body && <p className={styles.body}>{thread.body}</p>}
          {linked && (
            <Link href={routes.event(linked.id)} className={styles.linked}>
              <Thumb size={36} radius={4} />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{`${linked.title} · ${formatDayMonth(linked.startsAt ?? "")}`}</span>
                <span className={styles.small}>{TEXT.linked}</span>
              </span>
            </Link>
          )}
          <div className={styles.threadButtons}>
            <a href="#reply" className={ui.rowButton}>
              {TEXT.reply}
            </a>
            {thread.reported ? (
              <span className={styles.small}>{TEXT.reported}</span>
            ) : (
              <form action={reportThread.bind(null, thread.id)}>
                <button type="submit" className={ui.rowButton}>
                  {TEXT.report}
                </button>
              </form>
            )}
          </div>
        </div>
      </article>

      <section className={tables.section} aria-labelledby="replies-title">
        <div className={tables.sectionHead}>
          <h2 id="replies-title" className={ui.sectionTitle}>
            {TEXT.replies(thread.replyCount)}
          </h2>
          <nav className={styles.sortButtons} aria-label={TEXT.sortLabel}>
            <Link href={here} className={`${ui.rowButton} ${!newest ? ui.rowButtonPrimary : ui.rowButtonWhite}`} aria-current={!newest ? "page" : undefined}>
              {TEXT.top}
            </Link>
            <Link href={`${here}?sort=newest`} className={`${ui.rowButton} ${newest ? ui.rowButtonPrimary : ui.rowButtonWhite}`} aria-current={newest ? "page" : undefined}>
              {TEXT.newest}
            </Link>
          </nav>
        </div>
        <ul className={ui.rows}>
          {replies.map((r) => (
            <li key={r.id} id={r.id} className={styles.thread}>
              <Votes threadId={thread.id} replyId={r.id} count={r.upvotes} voted={Boolean(r.voted)} back={`${here}#${r.id}`} label={`${r.author}'s reply`} />
              <div className={ui.rowText}>
                <span className={hiring.nameLine}>
                  <span className={ui.rowTitle}>{[r.author, r.authorRole, formatWhen(r.at, now)].join(" · ")}</span>
                  {r.verified && <Chip tone="good">{TEXT.verified}</Chip>}
                </span>
                <p className={styles.body}>{r.text}</p>
                <a href="#reply" className={`${ui.textLink} ${styles.replyLink}`}>
                  {TEXT.reply}
                </a>
              </div>
            </li>
          ))}
        </ul>
        <form id="reply" action={replyToThread.bind(null, thread.id)} className={styles.replyForm}>
          <label className={shell.srOnly} htmlFor="reply-text">
            {TEXT.write}
          </label>
          <input id="reply-text" name="text" required placeholder={TEXT.write} className={forms.input} aria-invalid={query.error === "reply" || undefined} />
          <button type="submit" className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
            {TEXT.reply}
          </button>
        </form>
        {query.error === "reply" && <p className={forms.error}>{TEXT.replyError}</p>}
      </section>
    </Columns>
  );
}
