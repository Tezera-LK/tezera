import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ProviderVotes from "@/components/portal/provider/ProviderVotes";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { formatCount, formatWhen } from "@/lib/format";
import { routes } from "@/lib/routes";
import { replyToThread, reportThread, setJoined } from "../../actions";

export const metadata: Metadata = { title: "Thread" };

const TEXT = {
  postedBy: (where: string, who: string, when: string) => `${where} · posted by ${who} · ${when}`,
  verified: "✓ Verified",
  replies: (n: number) => `${n} ${n === 1 ? "reply" : "replies"}`,
  newest: "Newest",
  top: "Most upvoted",
  upvotes: (n: number) => `${n} upvotes`,
  write: "Write a reply…",
  reply: "Reply",
  replyError: "Write a reply first.",
  joined: "Joined ✓",
  join: "Join",
  members: (n: string, kind: string) => `${n} members · ${kind.toLowerCase()}`,
  rules: "Rules",
  rulesText: "Be kind. No selling in threads. Report anything that breaks the rules.",
  report: "Report this thread",
  reported: "Reported. An admin is checking it.",
  board: "Event board",
  openBoard: "Open board",
  back: "Back to Community",
} as const;

// One thread (Figma V94, F94): the post with its votes, the replies, and a reply box.
export default async function ThreadPage({ params, searchParams }: { params: Promise<{ threadId: string }>; searchParams: Promise<{ sort?: string; error?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const { threadId } = await params;
  const state = await getProviderState(session);
  const t = state?.threads.find((x) => x.id === threadId);
  if (!state || !t) notFound();
  const q = await searchParams;
  const now = new Date();
  const here = routes.vendorArea.thread(t.id);
  const community = state.communities.find((c) => c.id === t.communityId);
  const event = state.events.find((e) => e.id === t.eventId);
  const where = community?.name ?? (event ? `${event.title} board` : "Community");
  const sort = q.sort === "top" ? "top" : "new";
  const replies = [...t.replies].sort((a, b) => (sort === "top" ? b.upvotes - a.upvotes : b.at.localeCompare(a.at)));
  const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : formatCount(n));

  const aside = (
    <>
      {community && (
        <Panel title={community.name}>
          <p className={styles.foot}>{TEXT.members(compact(community.members), community.about)}</p>
          <form action={setJoined.bind(null, community.id, !community.joined, here)}>
            <button type="submit" className={`${ui.wideButton} ${community.joined ? "" : styles.primaryWide}`}>
              {community.joined ? TEXT.joined : TEXT.join}
            </button>
          </form>
        </Panel>
      )}
      {event && (
        <Panel title={TEXT.board}>
          <p className={styles.foot}>{event.title}</p>
          <Link href={routes.vendorArea.board(event.id)} className={ui.wideButton}>
            {TEXT.openBoard}
          </Link>
        </Panel>
      )}
      <Panel title={TEXT.rules}>
        <p className={styles.foot}>{TEXT.rulesText}</p>
        {t.reported ? (
          <p className={hiring.sub}>{TEXT.reported}</p>
        ) : (
          <form action={reportThread.bind(null, t.id)}>
            <button type="submit" className={ui.wideButton}>
              {TEXT.report}
            </button>
          </form>
        )}
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{t.title}</h1>
        <p className={hiring.lede}>{TEXT.postedBy(where, t.author, formatWhen(t.at, now))}</p>
      </header>
      <article className={`${styles.post} ${styles.threadCard}`}>
        <ProviderVotes threadId={t.id} count={t.upvotes} voted={Boolean(t.voted)} back={here} label={t.title} />
        <div className={styles.stack}>
          <span className={styles.inline}>
            <span className={ui.rowTitle}>{t.author}</span>
            <Chip tone="soft">{t.authorRole}</Chip>
            {t.verified && <Chip tone="good">{TEXT.verified}</Chip>}
          </span>
          <p className={styles.foot}>{t.body}</p>
        </div>
      </article>
      <div className={hiring.cardHead}>
        <h2 className={hiring.cardTitle}>{TEXT.replies(t.replyCount)}</h2>
        <span className={styles.pills}>
          <Link href={here} scroll={false} className={`${styles.pill} ${sort === "new" ? styles.pillOn : ""}`}>
            {TEXT.newest}
          </Link>
          <Link href={`${here}?sort=top`} scroll={false} className={`${styles.pill} ${sort === "top" ? styles.pillOn : ""}`}>
            {TEXT.top}
          </Link>
        </span>
      </div>
      <ul className={ui.rows}>
        {replies.map((x) => (
          <li key={x.id} className={`${styles.post} ${styles.threadCard}`}>
            <ProviderVotes threadId={t.id} replyId={x.id} count={x.upvotes} voted={Boolean(x.voted)} back={here} label={`reply by ${x.author}`} />
            <div className={styles.stack}>
              <span className={styles.inline}>
                <span className={ui.rowTitle}>{x.author}</span>
                <Chip tone="soft">{x.authorRole}</Chip>
                <span className={hiring.sub}>{`· ${formatWhen(x.at, now)}${x.upvotes ? ` · ${TEXT.upvotes(x.upvotes)}` : ""}`}</span>
              </span>
              <p className={styles.foot}>{x.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <form id="reply" action={replyToThread.bind(null, t.id)} className={styles.searchRow}>
        <input name="text" required maxLength={1000} placeholder={TEXT.write} aria-label={TEXT.write} className={`${forms.input} ${styles.whiteField}`} />
        <button type="submit" className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
          {TEXT.reply}
        </button>
      </form>
      {q.error === "reply" && <p className={forms.error}>{TEXT.replyError}</p>}
      <Link href={routes.vendorArea.community} className={ui.textLink}>
        {`‹ ${TEXT.back}`}
      </Link>
    </Columns>
  );
}
