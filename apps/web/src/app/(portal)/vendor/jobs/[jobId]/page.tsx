import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
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
import { formatCount, formatDayMonth, formatTime } from "@/lib/format";
import { day, lkr } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { toggleSaved, withdrawApplication } from "../actions";

export const metadata: Metadata = { title: "Job post" };

const TEXT = {
  open: "Open",
  closedChip: "Closed",
  posted: (who: string, event: string, on: string) => `${who} · ${event} · posted ${on}`,
  matchesCategory: "Matches your category",
  inDistricts: "In your districts",
  outside: "Outside your districts",
  theJob: "The job",
  event: "Event",
  venue: "Venue",
  budgetRange: "Budget range",
  quotesBy: "Quotes by",
  quotesSoFar: "Quotes so far",
  brief: "Brief",
  service: "Service",
  audience: "Expected audience",
  deliverables: "Deliverables",
  runOfShow: "Run of show",
  equipment: "Equipment provided",
  apply: "Apply with a quote",
  save: "Save",
  saved: "Saved",
  ask: "Ask a question",
  deadline: "Deadline",
  daysLeft: (n: number) => `${n} day${n === 1 ? "" : "s"}`,
  leftToQuote: (on: string) => `left to quote · ${on}`,
  closedNote: "Quotes are closed. The organiser is choosing.",
  yourQuote: "Your quote",
  sent: (on: string) => `Sent ${on}`,
  waiting: "Waiting",
  withdraw: "Withdraw",
  closedError: "Quotes closed before you sent yours.",
} as const;

// One job post (Figma V57, F57): the job and the brief, with the organiser check and the deadline.
export default async function JobPage({ params, searchParams }: { params: Promise<{ jobId: string }>; searchParams: Promise<{ error?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const { jobId } = await params;
  const state = await getProviderState(session);
  const job = state?.jobs.find((j) => j.id === jobId);
  if (!state || !job) notFound();
  const organiser = state.organisers.find((o) => o.id === job.organiserId);
  const { error } = await searchParams;
  const now = new Date();
  const msLeft = Date.parse(job.quotesBy) - now.getTime();
  const open = msLeft > 0;
  const daysLeft = Math.ceil(msLeft / 86_400_000);
  const application = job.application?.status === "waiting" ? job.application : null;
  const brief: [string, string][] = (
    [
      [TEXT.service, job.brief.service],
      [TEXT.audience, job.brief.audience],
      [TEXT.deliverables, job.brief.deliverables],
      [TEXT.runOfShow, job.brief.duration],
      [TEXT.equipment, job.brief.equipment],
    ] as [string, string][]
  ).filter(([, v]) => v);

  const aside = (
    <>
      {organiser && <OrganiserPanel organiser={organiser} short />}
      <Panel title={TEXT.deadline}>
        {open ? (
          <>
            <p className={hiring.pageTitle}>{TEXT.daysLeft(daysLeft)}</p>
            <p className={styles.foot}>{TEXT.leftToQuote(day(job.quotesBy.slice(0, 10)))}</p>
          </>
        ) : (
          <p className={styles.foot}>{TEXT.closedNote}</p>
        )}
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <div className={styles.inline}>
          <h1 className={hiring.pageTitle}>{job.title}</h1>
          <Chip tone={open ? "good" : "neutral"}>{open ? TEXT.open : TEXT.closedChip}</Chip>
        </div>
        <p className={hiring.lede}>{TEXT.posted(organiser?.name ?? "", job.eventTitle, formatDayMonth(job.postedAt))}</p>
      </header>
      {error === "closed" && (
        <p className={forms.error} role="alert">
          {TEXT.closedError}
        </p>
      )}
      <ul className={ui.chipList}>
        {job.tags.slice(0, 2).map((t) => (
          <li key={t} className={`${styles.pill} ${styles.pillGrey}`}>
            {t}
          </li>
        ))}
        <li>
          <Chip tone="soft">{TEXT.matchesCategory}</Chip>
        </li>
        <li>
          <Chip tone={job.inYourDistricts ? "soft" : "neutral"}>{job.inYourDistricts ? TEXT.inDistricts : TEXT.outside}</Chip>
        </li>
      </ul>

      {application && (
        <div className={styles.banner}>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.bannerText}>
            <span className={ui.rowTitle}>{`${TEXT.yourQuote} · ${lkr(application.priceLkr)}`}</span>
            <span className={hiring.sub}>{TEXT.sent(`${formatDayMonth(application.sentAt)}, ${formatTime(application.sentAt)}`)}</span>
          </span>
          <Chip tone="neutral">{TEXT.waiting}</Chip>
        </div>
      )}

      <section className={events.card} aria-labelledby="job-title">
        <h2 id="job-title" className={hiring.cardTitle}>
          {TEXT.theJob}
        </h2>
        <dl className={events.facts}>
          <dt>{TEXT.event}</dt>
          <dd>{`${job.eventTitle} · ${day(job.date)}`}</dd>
          <dt>{TEXT.venue}</dt>
          <dd>{job.venue}</dd>
          <dt>{TEXT.budgetRange}</dt>
          <dd>{`${lkr(job.budgetMinLkr)} – ${formatCount(job.budgetMaxLkr)}`}</dd>
          <dt>{TEXT.quotesBy}</dt>
          <dd>{`${day(job.quotesBy.slice(0, 10))} · ${formatTime(job.quotesBy)}`}</dd>
          <dt>{TEXT.quotesSoFar}</dt>
          <dd>{formatCount(job.quotes)}</dd>
        </dl>
        <h3 className={hiring.cardTitle}>{TEXT.brief}</h3>
        <dl className={events.facts}>
          {brief.map(([label, value]) => (
            <Row key={label} label={label} value={value} />
          ))}
        </dl>
      </section>

      <div className={styles.buttonRow}>
        {application ? (
          <form action={withdrawApplication.bind(null, job.id)} className={styles.formFill}>
            <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
              {TEXT.withdraw}
            </button>
          </form>
        ) : (
          open && (
            <Link href={routes.vendorArea.apply(job.id)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
              {TEXT.apply}
            </Link>
          )
        )}
        <form action={toggleSaved.bind(null, job.id, routes.vendorArea.job(job.id))} className={styles.formFill}>
          <button type="submit" className={forms.bigButton} aria-pressed={job.saved}>
            {job.saved ? TEXT.saved : TEXT.save}
          </button>
        </form>
        <Link href={`${routes.vendorArea.messages}?to=${job.organiserId}`} className={forms.bigButton}>
          {TEXT.ask}
        </Link>
      </div>
    </Columns>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
