import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { day, daysUntil } from "@/lib/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Thanks for your review" };

const TEXT = {
  title: "Thanks for your review",
  onProfile: (d: string) => `It is now on their profile. You can edit it until the window closes on ${d}.`,
  back: "Back to reviews",
  bookings: "My bookings",
  still: "Still to review",
  closesIn: (event: string, n: number) => `${event} · closes in ${n} days`,
  review: "Review",
} as const;

// "Thanks for your review" (Figma V98, F98).
export default async function ReviewSentPage({ params }: { params: Promise<{ taskId: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const { taskId } = await params;
  const state = await getProviderState(session);
  const task = state?.reviewTasks.find((t) => t.id === taskId);
  if (!state || !task) notFound();
  if (!task.submitted) redirect(routes.vendorArea.reviewOrganiser(task.id));
  const now = new Date();
  const still = state.reviewTasks.filter((t) => !t.submitted && daysUntil(t.closesOn, now) >= 0);

  return (
    <Columns
      aside={
        still.length > 0 && (
          <Panel title={TEXT.still}>
            {still.map((t) => (
              <div key={t.id} className={hiring.whiteRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{t.name}</span>
                  <span className={hiring.sub}>{TEXT.closesIn(t.eventTitle, daysUntil(t.closesOn, now))}</span>
                </span>
                <Link href={routes.vendorArea.reviewOrganiser(t.id)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                  {TEXT.review}
                </Link>
              </div>
            ))}
          </Panel>
        )
      }
    >
      <section className={styles.done} aria-labelledby="done-title">
        <span className={styles.doneMark} aria-hidden="true">
          ✓
        </span>
        <h1 id="done-title" className={styles.doneTitle}>
          {TEXT.title}
        </h1>
        <p className={hiring.lede}>{`${task.name} · ${task.eventTitle}`}</p>
        <p className={ui.rowTitle}>{Object.entries(task.submitted.scores).map(([part, n]) => `${part} ★ ${n}`).join(" · ")}</p>
        <p className={styles.foot}>{TEXT.onProfile(day(task.closesOn))}</p>
        <div className={styles.doneButtons}>
          <Link href={routes.vendorArea.reviews} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.back}
          </Link>
          <Link href={routes.vendorArea.bookings} className={forms.bigButton}>
            {TEXT.bookings}
          </Link>
        </div>
      </section>
    </Columns>
  );
}
