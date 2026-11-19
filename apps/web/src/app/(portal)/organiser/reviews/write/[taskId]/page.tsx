import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Thumb from "@/components/portal/Thumb";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import styles from "@/components/portal/reviews/Reviews.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getReviewTask, getWrittenReview } from "@/lib/data/portal";
import { formatDayMonth } from "@/lib/format";
import { REVIEW_PARTS } from "@/lib/reviews";
import { submitReview } from "../../actions";

export const metadata: Metadata = { title: "Review a provider" };

const TEXT = {
  title: "Review a provider",
  lede: (name: string, kind: string, event: string, day: string) => [name, kind, event, day].join(" · "),
  completed: (day: string) => `Booking completed on ${day}`,
  completedText: "One review per booking · reviews show your name",
  outOf: (n: number) => `${n} / 5`,
  pick: (part: string, n: number) => `${part}: ${n} out of 5`,
  write: "Write a review (optional)",
  placeholder: (name: string) => `What was it like to work with ${name}?`,
  scoresError: "Give a score for each of the four.",
  save: "Save for later",
  submit: "Submit review",
  closes: (day: string) => `Reviews close ${day}`,
  closesText: (name: string) => `Two weeks after the event. ${name} reviews you too.`,
} as const;

// "Review a provider" (Figma O30): four scores out of 5 and an optional review. Submitting goes
// to "Review submitted" (O48); "Save for later" keeps a draft.
export default async function WriteReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireRole("organiser");
  const { taskId } = await params;
  const error = (await searchParams).error;
  const [task, draft] = await Promise.all([getReviewTask(session, taskId), getWrittenReview(session, taskId)]);
  if (!task) notFound();

  const aside = (
    <div className={hiring.notePanel}>
      <p className={hiring.notePanelTitle}>{TEXT.closes(formatDayMonth(task.closesOn))}</p>
      <p className={tables.panelText}>{TEXT.closesText(task.name)}</p>
    </div>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.lede(task.name, task.kind, task.eventTitle, formatDayMonth(task.completedOn))}</p>
      </header>
      <div className={styles.goodNotice}>
        <span className={styles.goodDot} aria-hidden="true" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.completed(formatDayMonth(task.completedOn))}</span>
          <span className={tables.small}>{TEXT.completedText}</span>
        </span>
      </div>

      <form action={submitReview.bind(null, task.id)} className={forms.form}>
        <section className={styles.card} aria-label={task.name}>
          <div className={styles.who}>
            <Thumb size={48} shape="round" />
            <span className={ui.rowTitle}>{`${task.name} · ${task.kind}`}</span>
          </div>
          {REVIEW_PARTS.map((part) => (
            <fieldset key={part} className={styles.score}>
              <legend className={styles.scoreLabel}>{part}</legend>
              <span className={styles.scoreChoices}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className={styles.scoreChoice}>
                    <input type="radio" name={part} value={n} defaultChecked={draft?.scores[part] === n} />
                    <span aria-hidden="true">{n}</span>
                    <span className={shell.srOnly}>{TEXT.pick(part, n)}</span>
                  </label>
                ))}
              </span>
            </fieldset>
          ))}
          {error === "scores" && <p className={forms.error}>{TEXT.scoresError}</p>}
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.write}</span>
            <textarea name="text" rows={4} defaultValue={draft?.text} placeholder={TEXT.placeholder(task.name)} className={`${forms.input} ${styles.textarea}`} />
          </label>
        </section>
        <div className={hiring.formActions}>
          <button type="submit" name="intent" value="save" className={forms.bigButton}>
            {TEXT.save}
          </button>
          <button type="submit" name="intent" value="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary} ${hiring.send}`}>
            {TEXT.submit}
          </button>
        </div>
      </form>
    </Columns>
  );
}
