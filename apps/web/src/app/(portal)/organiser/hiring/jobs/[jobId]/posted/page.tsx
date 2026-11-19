import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import forms from "@/components/portal/forms.module.css";
import styles from "@/components/portal/hiring/Hiring.module.css";
import tables from "@/components/portal/tables.module.css";
import { requireRole } from "@/lib/auth/session";
import { getJobPost } from "@/lib/data/portal";
import { formatDayMonth, formatTime } from "@/lib/format";
import { CATEGORY_PEOPLE } from "@/lib/hiring";
import { routes } from "@/lib/routes";
import { closeJob } from "../../../actions";

export const metadata: Metadata = { title: "Job posted" };

const TEXT = {
  title: "Your job post is live",
  closedTitle: "Your job post is closed",
  line: (title: string, closes: string) => `${title} · quotes close ${closes}`,
  seenBy: (n: number, people: string) => `Seen by ${n} matching ${people}`,
  back: "Back to event hiring",
  edit: "Edit post",
  closeEarly: "Close early",
  noteTitle: "We tell you as quotes arrive",
  note: "You can accept quotes before the deadline too.",
} as const;

// "Your job post is live" (Figma O79), after posting a job.
export default async function JobPostedPage({ params }: { params: Promise<{ jobId: string }> }) {
  const session = await requireRole("organiser");
  const job = await getJobPost(session, (await params).jobId);
  if (!job) notFound();
  const open = job.status === "open";

  const aside = (
    <div className={styles.notePanel}>
      <p className={styles.notePanelTitle}>{TEXT.noteTitle}</p>
      <p className={tables.panelText}>{TEXT.note}</p>
    </div>
  );

  return (
    <Columns aside={aside}>
      <section className={styles.hero} aria-labelledby="posted-title">
        <span className={styles.heroDot} aria-hidden="true" />
        <h1 id="posted-title" className={styles.heroTitle}>
          {open ? TEXT.title : TEXT.closedTitle}
        </h1>
        <p className={styles.heroText}>{TEXT.line(job.title, `${formatDayMonth(job.closesAt)}, ${formatTime(job.closesAt)}`)}</p>
        <span className={styles.heroChip}>{TEXT.seenBy(job.seenBy, CATEGORY_PEOPLE[job.category] ?? "providers")}</span>
        <div className={styles.heroActions}>
          <Link href={routes.eventHiring(job.eventId)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.back}
          </Link>
          {/* editing a post is left for later; Figma has no edit screen for it */}
          <MaybeLink className={`${forms.bigButton} ${styles.plainButton}`}>{TEXT.edit}</MaybeLink>
          {open && (
            <form action={closeJob.bind(null, job.id)}>
              <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
                {TEXT.closeEarly}
              </button>
            </form>
          )}
        </div>
      </section>
    </Columns>
  );
}
