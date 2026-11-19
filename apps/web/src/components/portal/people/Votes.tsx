import { vote } from "@/app/(portal)/organiser/community/actions";
import shell from "../PortalShell.module.css";
import styles from "./People.module.css";

// The ▲ count ▼ column beside a thread or reply (O16, O24, O25). ▲ upvotes, or takes the
// organiser's upvote back; ▼ only takes it back, as downvotes aren't counted.
export default function Votes({
  threadId,
  replyId = null,
  count,
  voted,
  back,
  label,
}: {
  threadId: string;
  replyId?: string | null;
  count: number;
  voted: boolean;
  // the page to return to
  back: string;
  // what's being voted on, for screen readers
  label: string;
}) {
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
