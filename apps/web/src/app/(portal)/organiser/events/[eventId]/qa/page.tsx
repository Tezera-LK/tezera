import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import EventHeader from "@/components/portal/events/EventHeader";
import styles from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getMyEvent } from "@/lib/data/portal";
import type { Question } from "@/lib/data/portal-types";
import { daysFrom, formatWhen, newestFirst } from "@/lib/format";
import { routes } from "@/lib/routes";
import { answerQuestion } from "../../actions";

export const metadata: Metadata = { title: "Questions and answers" };

const TEXT = {
  title: "Questions and answers",
  hint: "Questions and your answers are public on the event page.",
  waiting: (n: number) => `Waiting · ${n}`,
  answered: (n: number) => `Answered · ${n}`,
  filterLabel: "Which questions",
  answer: "Answer",
  yourAnswer: (question: string) => `Your answer to: ${question}`,
  cancel: "Cancel",
  post: "Post answer",
  empty: "Can't be empty.",
  noneWaiting: "No questions waiting. New ones show up here.",
  noneAnswered: "You haven't answered any questions yet.",
  recent: "Answered recently",
  today: "Today",
  yesterday: "Yesterday",
} as const;

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ show?: string; answer?: string; error?: string }>;
};

// "Today", "Yesterday", "Mon", "2 Oct"
function when(iso: string, now: Date): string {
  const days = daysFrom(now, iso);
  if (days === 0) return TEXT.today;
  if (days === -1) return TEXT.yesterday;
  return formatWhen(iso, now);
}

// The event's Q&A tab (Figma O15): questions waiting for an answer, or the answered ones.
// ?answer=<id> opens the answer box on one question; posting it saves the answer.
export default async function EventQaPage({ params, searchParams }: Props) {
  const session = await requireRole("organiser");
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getMyEvent(session, eventId);
  if (!event || event.status === "draft" || event.status === "unpublished") notFound();

  const now = new Date();
  const showAnswered = query.show === "answered";
  const waiting = event.questions.filter((q) => !q.answer);
  const answered = event.questions
    .filter((q) => q.answer)
    .sort((a, b) => newestFirst(a.answeredAt, b.answeredAt));
  const shown = showAnswered ? answered : waiting;
  const base = routes.eventQa(event.id);

  const aside =
    answered.length > 0 ? (
      <Panel title={TEXT.recent}>
        <ul className={ui.rows}>
          {answered.slice(0, 2).map((q) => (
            <li key={q.id} className={`${ui.row} ${styles.announcement}`}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{q.text}</span>
                <span className={ui.muted}>{q.answer}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    ) : null;

  return (
    <Columns aside={aside}>
      <EventHeader event={event} current="qa" />
      <div className={styles.listHead}>
        <div className={styles.listHeadText}>
          <h2 className={ui.sectionTitle}>{TEXT.title}</h2>
          <p className={ui.muted}>{TEXT.hint}</p>
        </div>
        <nav className={styles.filters} aria-label={TEXT.filterLabel}>
          <Link href={base} className={styles.filter} aria-current={!showAnswered ? "page" : undefined}>
            {TEXT.waiting(waiting.length)}
          </Link>
          <Link href={`${base}?show=answered`} className={styles.filter} aria-current={showAnswered ? "page" : undefined}>
            {TEXT.answered(answered.length)}
          </Link>
        </nav>
      </div>

      {shown.length === 0 ? (
        <p className={ui.muted}>{showAnswered ? TEXT.noneAnswered : TEXT.noneWaiting}</p>
      ) : (
        <ul className={ui.rows}>
          {shown.map((q) => (
            <li key={q.id}>
              <QuestionCard
                eventId={event.id}
                question={q}
                when={when(q.askedAt, now)}
                open={!showAnswered && query.answer === q.id}
                error={query.answer === q.id && query.error === "empty"}
              />
            </li>
          ))}
        </ul>
      )}
    </Columns>
  );
}

// One question: who asked and when, then either its answer, an "Answer" button, or (when open)
// the answer box with Cancel and Post answer.
function QuestionCard({
  eventId,
  question,
  when,
  open,
  error,
}: {
  eventId: string;
  question: Question;
  when: string;
  open: boolean;
  error: boolean;
}) {
  const boxId = `answer-${question.id}`;
  return (
    <article className={styles.post} aria-labelledby={`q-${question.id}`}>
      <div className={styles.postRow}>
        <Thumb size={36} shape="round" />
        <span className={ui.rowText}>
          <span id={`q-${question.id}`} className={ui.rowTitle}>
            {question.text}
          </span>
          <span className={ui.muted}>{`${question.askedBy} · ${question.askedByRole} · ${when}`}</span>
        </span>
        {!question.answer && !open && (
          <Link href={`${routes.eventQa(eventId)}?answer=${question.id}`} scroll={false} className={ui.rowButton}>
            {TEXT.answer}
          </Link>
        )}
      </div>
      {question.answer && <p className={styles.answer}>{question.answer}</p>}
      {open && (
        <form action={answerQuestion.bind(null, eventId, question.id)} className={ui.rows}>
          <label htmlFor={boxId} className={shell.srOnly}>
            {TEXT.yourAnswer(question.text)}
          </label>
          <textarea id={boxId} name="answer" rows={3} required autoFocus className={forms.input} aria-invalid={error || undefined} />
          {error && <p className={forms.error}>{TEXT.empty}</p>}
          <div className={styles.answerActions}>
            <Link href={routes.eventQa(eventId)} scroll={false} className={ui.rowButton}>
              {TEXT.cancel}
            </Link>
            <button type="submit" className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
              {TEXT.post}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
