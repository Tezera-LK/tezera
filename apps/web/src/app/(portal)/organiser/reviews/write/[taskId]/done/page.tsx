import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getWrittenReview, listReviewTasks } from "@/lib/data/portal";
import { formatDayMonth } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Review posted" };

const TEXT = {
  title: "Review posted",
  line: (name: string, average: string) => `${name} · ${average} · it now shows on their profile`,
  next: (name: string) => `Review ${name} next`,
  back: "Back to reviews",
  waiting: "Still waiting",
  waitingLine: (kind: string, day: string) => `${kind} · closes ${day}`,
  nothing: "Nothing else to review.",
} as const;

// "Review posted" (Figma O48), with the next one to write.
export default async function ReviewPostedPage({ params }: { params: Promise<{ taskId: string }> }) {
  const session = await requireRole("organiser");
  const { taskId } = await params;
  const [review, tasks] = await Promise.all([getWrittenReview(session, taskId), listReviewTasks(session)]);
  if (!review || !review.submitted) notFound();
  const values = Object.values(review.scores);
  const average = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1).replace(/\.0$/, "") : "–";
  const next = tasks[0];

  const aside = (
    <Panel title={TEXT.waiting} empty={tasks.length === 0 ? TEXT.nothing : undefined}>
      {tasks.length > 0 &&
        tasks.map((t) => (
          <Link key={t.id} href={routes.writeReview(t.id)} className={hiring.whiteRow}>
            <Thumb size={32} shape="round" />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{t.name}</span>
              <span className={hiring.sub}>{TEXT.waitingLine(t.kind, formatDayMonth(t.closesOn))}</span>
            </span>
          </Link>
        ))}
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <section className={hiring.hero} aria-labelledby="posted-title">
        <span className={hiring.heroDot} aria-hidden="true" />
        <h1 id="posted-title" className={hiring.heroTitle}>
          {TEXT.title}
        </h1>
        <p className={hiring.heroText}>{TEXT.line(review.about, average)}</p>
        <div className={hiring.heroActions}>
          {next && (
            <Link href={routes.writeReview(next.id)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
              {TEXT.next(next.name)}
            </Link>
          )}
          <Link href={routes.reviews} className={`${forms.bigButton} ${hiring.plainButton}`}>
            {TEXT.back}
          </Link>
        </div>
      </section>
    </Columns>
  );
}
