import Link from "next/link";
import Chip from "@/components/portal/Chip";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import people from "@/components/portal/people/People.module.css";
import ui from "@/components/portal/ui.module.css";
import type { CommunityThread } from "@/lib/data/portal-types";
import { formatWhen } from "@/lib/format";
import { routes } from "@/lib/routes";
import ProviderVotes from "./ProviderVotes";
import styles from "./Provider.module.css";

const TEXT = {
  verified: "✓ Verified",
  pinned: "pinned",
  reply: "Reply",
  replies: (n: number) => `${n} ${n === 1 ? "reply" : "replies"}`,
} as const;

// One thread on Community or an event board (V24, V97): votes, who posted where, the title and
// text, the newest replies, and Reply. `where` is the community or board name.
export default function ThreadCard({ thread: t, where, back, now, preview = 0 }: { thread: CommunityThread; where: string; back: string; now: Date; preview?: number }) {
  return (
    <article className={`${styles.post} ${styles.threadCard}`}>
      <ProviderVotes threadId={t.id} count={t.upvotes} voted={Boolean(t.voted)} back={back} label={t.title} />
      <div className={styles.stack}>
        <span className={styles.inline}>
          <span className={ui.rowTitle}>{t.author}</span>
          <Chip tone="soft">{t.authorRole}</Chip>
          {t.verified && <Chip tone="good">{TEXT.verified}</Chip>}
          <span className={hiring.sub}>{`· ${where} · ${t.pinned ? TEXT.pinned : formatWhen(t.at, now)}`}</span>
        </span>
        <Link href={routes.vendorArea.thread(t.id)} className={`${people.threadTitle} ${people.threadLink}`}>
          {t.title}
        </Link>
        {t.body && <p className={styles.foot}>{t.body}</p>}
        {t.replies.slice(0, preview).map((x) => (
          <div key={x.id} className={styles.greyRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{`${x.author} · ${x.authorRole}`}</span>
              <span className={styles.foot}>{x.text}</span>
            </span>
          </div>
        ))}
        <span className={styles.postButtons}>
          <Link href={`${routes.vendorArea.thread(t.id)}#reply`} className={ui.rowButton}>
            {TEXT.reply}
          </Link>
          <span className={hiring.sub}>{TEXT.replies(t.replyCount)}</span>
        </span>
      </div>
    </article>
  );
}
