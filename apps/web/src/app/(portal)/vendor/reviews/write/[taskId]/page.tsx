import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import reviews from "@/components/portal/reviews/Reviews.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { ORGANISER_REVIEW_PARTS, day, daysUntil, lkr } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { reviewOrganiser } from "../../actions";

export const metadata: Metadata = { title: "Review an organiser" };

const TEXT = {
  title: (who: string) => `Review ${who}`,
  lede: (event: string, date: string) => `${event} · ${date} · booking marked completed`,
  how: "How was working with them?",
  pick: (part: string, n: number) => `${part}: ${n} out of 5`,
  yours: "Your review",
  shown: "Shown on their profile with your name and the service.",
  scoresError: "Give all three scores first.",
  submit: "Submit review",
  later: "Later",
  booking: "The booking",
  closes: "Window closes",
  closesOn: (d: string, n: number) => `${d} · ${n} day${n === 1 ? "" : "s"} left`,
  both: "They review you too",
  bothText: (who: string) => `${who} rates your quality, punctuality, communication and value for money.`,
} as const;

// "Review Agastra Events" (Figma V20, F20): three scores out of 5 and a review.
export default async function ReviewOrganiserPage({ params, searchParams }: { params: Promise<{ taskId: string }>; searchParams: Promise<{ error?: string; text?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const { taskId } = await params;
  const state = await getProviderState(session);
  const task = state?.reviewTasks.find((t) => t.id === taskId);
  if (!state || !task) notFound();
  if (task.submitted) redirect(routes.vendorArea.reviewSent(task.id));
  const q = await searchParams;
  const booking = state.bookings.find((b) => b.organiserId === task.organiserId && b.eventTitle === task.eventTitle);
  const left = Math.max(0, daysUntil(task.closesOn, new Date()));

  const aside = (
    <>
      {booking && (
        <Panel title={TEXT.booking}>
          <div className={hiring.whiteRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{booking.serviceDetail}</span>
              <span className={hiring.sub}>{`${day(booking.date)} · ${lkr(booking.priceLkr)}`}</span>
            </span>
          </div>
        </Panel>
      )}
      <Panel title={TEXT.closes}>
        <p className={styles.foot}>{TEXT.closesOn(day(task.closesOn), left)}</p>
      </Panel>
      <Panel title={TEXT.both}>
        <p className={styles.foot}>{TEXT.bothText(task.name)}</p>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title(task.name)}</h1>
        <p className={hiring.lede}>{TEXT.lede(task.eventTitle, booking ? day(booking.date) : "")}</p>
      </header>
      <form action={reviewOrganiser.bind(null, task.id)} className={forms.form}>
        <section className={reviews.card} aria-label={task.name}>
          <div className={reviews.who}>
            <Thumb size={48} shape="round" />
            <span className={ui.rowTitle}>{TEXT.how}</span>
          </div>
          {ORGANISER_REVIEW_PARTS.map((part) => (
            <fieldset key={part} className={reviews.score}>
              <legend className={reviews.scoreLabel}>{part}</legend>
              <span className={reviews.scoreChoices}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className={reviews.scoreChoice}>
                    <input type="radio" name={part} value={n} />
                    <span aria-hidden="true">{n}</span>
                    <span className={shell.srOnly}>{TEXT.pick(part, n)}</span>
                  </label>
                ))}
              </span>
            </fieldset>
          ))}
          {q.error === "scores" && <p className={forms.error}>{TEXT.scoresError}</p>}
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.yours}</span>
            <textarea name="text" rows={4} defaultValue={q.text ?? ""} className={forms.input} />
            <span className={forms.hint}>{TEXT.shown}</span>
          </label>
        </section>
        <div className={styles.pair}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.submit}
          </button>
          <Link href={routes.vendorArea.reviews} className={forms.bigButton}>
            {TEXT.later}
          </Link>
        </div>
      </form>
    </Columns>
  );
}
