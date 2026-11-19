import Link from "next/link";
import type { CommunityThread } from "@/lib/data/portal-types";
import { routes } from "@/lib/routes";
import ui from "../ui.module.css";
import styles from "./People.module.css";
import Votes from "./Votes";

const TEXT = {
  reply: "Reply",
  replyTo: (title: string) => `Reply to ${title}`,
  meta: (t: CommunityThread) => [t.author, t.authorRole, `${t.replyCount} ${t.replyCount === 1 ? "reply" : "replies"}`].join(" · "),
  none: "No threads yet. Start one with New thread.",
} as const;

// Threads with their votes, title, who posted and Reply (Figma O24). `back` is the page the votes
// return to.
export default function ThreadList({ threads, back }: { threads: CommunityThread[]; back: string }) {
  if (threads.length === 0) return <p className={ui.muted}>{TEXT.none}</p>;
  return (
    <ul className={ui.rows}>
      {threads.map((t) => (
        <li key={t.id} className={styles.thread}>
          <Votes threadId={t.id} count={t.upvotes} voted={Boolean(t.voted)} back={back} label={t.title} />
          <span className={ui.rowText}>
            <Link href={routes.thread(t.id)} className={`${styles.threadTitle} ${styles.threadLink}`}>
              {t.title}
            </Link>
            <span className={styles.small}>{TEXT.meta(t)}</span>
          </span>
          <Link href={`${routes.thread(t.id)}#reply`} className={ui.rowButton} aria-label={TEXT.replyTo(t.title)}>
            {TEXT.reply}
          </Link>
        </li>
      ))}
    </ul>
  );
}
