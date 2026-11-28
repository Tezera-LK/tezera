import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import OrganiserPanel from "@/components/portal/provider/OrganiserPanel";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { formatCount, formatTime } from "@/lib/format";
import { day, lkr } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { applyToJob } from "../../actions";

export const metadata: Metadata = { title: "Apply with a quote" };

const TEXT = {
  title: "Apply with a quote",
  thePost: "The post",
  event: "Event",
  requirements: "Requirements",
  budgetRange: "Budget range",
  deadline: "Quote deadline",
  yourQuote: "Your quote",
  price: "Price",
  depositPercent: "Deposit (% on confirm)",
  final: "Final instalment",
  due: "Due date",
  cancellation: "Cancellation terms",
  ifOrganiser: "If the organiser cancels within 7 days",
  keepDeposit: "You keep the deposit",
  ifYou: "If you cancel",
  fullRefund: "Full refund of anything paid",
  message: "Message",
  attach: "+ Attach file",
  attachNote: "Files can be attached once storage is connected (EN-03).",
  send: "Send application",
  cancel: "Cancel",
  sees: "The organiser sees",
  seesNote: "Your profile, portfolio and reviews are shown next to your quote.",
  errors: {
    price: "Enter your price in rupees.",
    deposit: "The deposit is a share of the price, from 0 to 100%.",
    final: "Add the final instalment and when it is due.",
    due: "The final instalment must be due before the event.",
    total: "The deposit and the final instalment must add up to your price.",
  } as Record<string, string>,
} as const;

type Props = { params: Promise<{ jobId: string }>; searchParams: Promise<Record<string, string | undefined>> };

const digits = (v?: string) => Number((v ?? "").replace(/[^\d]/g, "")) || 0;

// "Apply with a quote" (Figma V11, F11): the post on top, then the provider's price, payment
// terms, cancellation terms and message.
export default async function ApplyPage({ params, searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  const { jobId } = await params;
  const state = await getProviderState(session);
  const job = state?.jobs.find((j) => j.id === jobId);
  if (!state || !job) notFound();
  if (job.application && job.application.status !== "withdrawn") redirect(routes.vendorArea.job(job.id));
  const organiser = state.organisers.find((o) => o.id === job.organiserId);
  const q = await searchParams;

  const startPrice = Math.round((job.budgetMinLkr + job.budgetMaxLkr) / 2 / 10_000) * 10_000;
  const price = q.price ?? String(startPrice);
  const percent = q.depositPercent ?? "30";
  const depositLkr = Math.round((digits(price) * digits(percent)) / 100);
  const final = q.final ?? String(digits(price) - depositLkr);
  // a week before the event by default
  const due = q.due ?? new Date(Date.parse(`${job.date}T12:00:00+05:30`) - 3 * 86_400_000).toISOString().slice(0, 10);

  const aside = (
    <>
      <Panel title={TEXT.sees}>
        <div className={styles.tintRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{`${state.profile.name} ✓`}</span>
            <span className={hiring.sub}>{`Verified · ★ ${state.profile.rating} (${state.profile.reviews}) · ${state.profile.badge}`}</span>
          </span>
        </div>
        <p className={styles.foot}>{TEXT.seesNote}</p>
      </Panel>
      {organiser && <OrganiserPanel organiser={organiser} short />}
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{`${job.title} · ${organiser?.name ?? ""}`}</p>
      </header>
      {q.error && TEXT.errors[q.error] && (
        <p className={forms.error} role="alert">
          {TEXT.errors[q.error]}
        </p>
      )}
      <section className={events.card} aria-labelledby="post-title">
        <h2 id="post-title" className={hiring.cardTitle}>
          {TEXT.thePost}
        </h2>
        <dl className={events.facts}>
          <dt>{TEXT.event}</dt>
          <dd>{`${job.eventTitle} · ${day(job.date)} · ${job.venue}`}</dd>
          <dt>{TEXT.requirements}</dt>
          <dd>{job.brief.deliverables}</dd>
          <dt>{TEXT.budgetRange}</dt>
          <dd>{`${lkr(job.budgetMinLkr)} – ${formatCount(job.budgetMaxLkr)}`}</dd>
          <dt>{TEXT.deadline}</dt>
          <dd>{`${day(job.quotesBy.slice(0, 10))} · ${formatTime(job.quotesBy)}`}</dd>
        </dl>
      </section>

      <form action={applyToJob.bind(null, job.id)} className={styles.stack}>
        <section className={forms.card} aria-labelledby="quote-title">
          <h2 id="quote-title" className={hiring.cardTitle}>
            {TEXT.yourQuote}
          </h2>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.price}</span>
              <input name="price" inputMode="numeric" required defaultValue={price} className={forms.input} />
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.depositPercent}</span>
              <input name="depositPercent" inputMode="numeric" required defaultValue={percent} className={forms.input} />
              <span className={forms.hint}>{lkr(depositLkr)}</span>
            </label>
          </div>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.final}</span>
              <input name="final" inputMode="numeric" required defaultValue={final} className={forms.input} />
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.due}</span>
              <input name="due" type="date" required defaultValue={due} max={job.date} className={forms.input} />
            </label>
          </div>
        </section>
        <section className={forms.card} aria-labelledby="cancel-title">
          <h2 id="cancel-title" className={hiring.cardTitle}>
            {TEXT.cancellation}
          </h2>
          <div className={styles.greyRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{TEXT.ifOrganiser}</span>
            </span>
            <span className={styles.amount}>{TEXT.keepDeposit}</span>
          </div>
          <div className={styles.greyRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{TEXT.ifYou}</span>
            </span>
            <span className={styles.amount}>{TEXT.fullRefund}</span>
          </div>
        </section>
        <section className={forms.card} aria-labelledby="message-title">
          <label className={forms.field}>
            <span id="message-title" className={hiring.cardTitle}>
              {TEXT.message}
            </span>
            <textarea name="message" rows={3} defaultValue={q.message ?? ""} className={forms.input} />
          </label>
          <span className={`${ui.textLink} ${ui.soon}`} title={TEXT.attachNote}>
            {TEXT.attach}
          </span>
        </section>
        <div className={styles.pair}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.send}
          </button>
          <Link href={routes.vendorArea.job(job.id)} className={forms.bigButton}>
            {TEXT.cancel}
          </Link>
        </div>
      </form>
    </Columns>
  );
}
