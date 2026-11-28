import { vote } from "@/app/(portal)/vendor/community/actions";
import styles from "@/components/portal/people/People.module.css";
import shell from "@/components/portal/PortalShell.module.css";

// The ▲ count ▼ column beside a thread or reply (V24, V94), like Damian's Votes.tsx but saving to
// the provider's records. ▲ upvotes or takes the upvote back; ▼ only takes it back.
export default function ProviderVotes({ threadId, replyId = null, count, voted, back, label }: { threadId: string; replyId?: string | null; count: number; voted: boolean; back: string; label: string }) {
  const action = vote.bind(null, threadId, replyId, back);
  return (
    <div className={styles.votes}>
      <form action={action}>
        <button type="submit" className={`${styles.voteButton} ${voted ? styles.voteButtonOn : ""}`} aria-pressed={voted} aria-label={`Upvote ${label}`}>
          ▲
        </button>
      </form>
      <span>
        {count}
        <span className={shell.srOnly}> upvotes</span>
      </span>
      <form action={action}>
        <button type="submit" className={styles.voteButton} disabled={!voted} aria-label={`Take back your upvote on ${label}`}>
          ▼
        </button>
      </form>
    </div>
  );
}
