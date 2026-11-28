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
import { day, lkr } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { withdrawApplication } from "../../actions";

export const metadata: Metadata = { title: "Application sent" };

const TEXT = {
  title: "Application sent",
  quote: (amount: string) => `Quote ${amount}`,
  closes: (on: string) => `Quotes close ${on}`,
  how: (name: string) => `${name} compares quotes after the deadline. If they choose you, the booking is confirmed. If not, we tell you when the post closes.`,
  mine: "My applications",
  more: "Browse more posts",
  canStill: "You can still",
  edit: "Edit your quote",
  until: (on: string) => `Until ${on}`,
  withdraw: "Withdraw",
  untilDecides: "Until the organiser decides",
} as const;

// "Application sent" (Figma V58, F58), right after applying to a job post.
export default async function SentPage({ params }: { params: Promise<{ jobId: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const { jobId } = await params;
  const state = await getProviderState(session);
  const job = state?.jobs.find((j) => j.id === jobId);
  if (!state || !job) notFound();
  if (job.application?.status !== "waiting") redirect(routes.vendorArea.job(job.id));
  const organiser = state.organisers.find((o) => o.id === job.organiserId)?.name ?? "";
  const closes = day(job.quotesBy.slice(0, 10));

  const aside = (
    <Panel title={TEXT.canStill}>
      <div className={styles.tintRow}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.withdraw}</span>
          <span className={hiring.sub}>{TEXT.untilDecides}</span>
        </span>
        <form action={withdrawApplication.bind(null, job.id)}>
          <button type="submit" className={ui.rowButton}>
            {TEXT.withdraw}
          </button>
        </form>
      </div>
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <section className={styles.done} aria-labelledby="done-title">
        <span className={styles.doneMark} aria-hidden="true">
          ✓
        </span>
        <h1 id="done-title" className={styles.doneTitle}>
          {TEXT.title}
        </h1>
        <p className={hiring.lede}>{`${job.title} · ${organiser}`}</p>
        <p className={ui.rowTitle}>{`${TEXT.quote(lkr(job.application.priceLkr))} · ${TEXT.closes(closes)}`}</p>
        <p className={styles.foot}>{TEXT.how(organiser)}</p>
        <div className={styles.doneButtons}>
          <Link href={routes.vendorArea.applications} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.mine}
          </Link>
          <Link href={routes.vendorArea.jobs} className={forms.bigButton}>
            {TEXT.more}
          </Link>
        </div>
      </section>
    </Columns>
  );
}
