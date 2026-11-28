import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Dialog from "@/components/portal/events/Dialog";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import Choice from "@/components/portal/provider/Choice";
import styles from "@/components/portal/provider/Provider.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { OpenJob, ProviderState } from "@/lib/data/provider-types";
import { formatCount, formatShortDate } from "@/lib/format";
import { day, lkr, organiserName } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { toggleSaved } from "./actions";

export const metadata: Metadata = { title: "Job posts" };

const TEXT = {
  title: "Job posts",
  lede: "Organisers looking for services. Matched to your category and districts.",
  budget: "Budget",
  deadline: "Quote deadline",
  eventDate: "Event date",
  clearAll: "Clear filters",
  outside: "Outside your districts",
  budgetLine: "Budget",
  quotesBy: "Quotes by",
  quotesSoFar: (n: number) => (n === 0 ? "Be the first to quote" : `${n} quote${n === 1 ? "" : "s"} so far`),
  apply: "Apply with a quote",
  view: "View post",
  save: "Save",
  saved: "Saved",
  quoteSent: "Quote sent",
  seeQuote: "See my quote",
  none: "No open job posts match. Try clearing the filters.",
  myApplications: "My applications",
  seeAll: "See all",
  noApplications: "Quotes you send to job posts show up here.",
  howTitle: "How it works",
  how: "You send a quote and a message. The organiser compares quotes. If you are chosen the booking is confirmed; if not, you are told when the post closes.",
  chip: { waiting: "Waiting", accepted: "Accepted", "not-chosen": "Not chosen", withdrawn: "Withdrawn" },
  closed: (on: string) => `Post closed ${on}`,
  emptyTitle: "No job posts yet",
  emptyText: "Job posts that match your category and districts show up here.",
  // V62
  filters: "Filters",
  close: "Close",
  budgetRange: "Budget range",
  from: "From",
  to: "to",
  thisWeek: "This week",
  twoWeeks: "Next 2 weeks",
  anyTime: "Any time",
  onlyFree: "Only dates I am free",
  onlyFreeHint: "Uses your availability calendar",
  clear: "Clear",
  show: "Show posts",
} as const;

type Filters = { min: number; max: number; deadline: "" | "week" | "2weeks"; month: string; free: boolean };
type Props = { searchParams: Promise<{ min?: string; max?: string; deadline?: string; month?: string; free?: string; dialog?: string }> };

function readFilters(q: Awaited<Props["searchParams"]>): Filters {
  const n = (v?: string) => Number((v ?? "").replace(/[^\d]/g, "")) || 0;
  return {
    min: n(q.min),
    max: n(q.max),
    deadline: q.deadline === "week" || q.deadline === "2weeks" ? q.deadline : "",
    month: /^\d{4}-\d{2}$/.test(q.month ?? "") ? (q.month as string) : "",
    free: q.free === "1",
  };
}

// The query string for a set of filters, without the empty ones.
function query(f: Filters, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  if (f.min) p.set("min", String(f.min));
  if (f.max) p.set("max", String(f.max));
  if (f.deadline) p.set("deadline", f.deadline);
  if (f.month) p.set("month", f.month);
  if (f.free) p.set("free", "1");
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

function matches(job: OpenJob, f: Filters, state: ProviderState, now: Date): boolean {
  if (f.min && job.budgetMaxLkr < f.min) return false;
  if (f.max && job.budgetMinLkr > f.max) return false;
  const daysToDeadline = (Date.parse(job.quotesBy) - now.getTime()) / 86_400_000;
  if (f.deadline === "week" && daysToDeadline > 7) return false;
  if (f.deadline === "2weeks" && daysToDeadline > 14) return false;
  if (f.month && !job.date.startsWith(f.month)) return false;
  if (f.free && state.calendar.some((m) => m.date === job.date)) return false;
  return true;
}

// Job posts (Figma V10, F10): open posts matched to the provider, the quotes they've sent on the
// right, and the filters dialog (V62) at ?dialog=filters.
export default async function JobsPage({ searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const q = await searchParams;
  const now = new Date();

  if (!state) {
    return (
      <>
        <Header />
        <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />
      </>
    );
  }

  const f = readFilters(q);
  const open = state.jobs.filter((j) => Date.parse(j.quotesBy) >= now.getTime() && j.application?.status !== "accepted");
  const shown = open.filter((j) => matches(j, f, state, now));
  const applied = state.jobs.filter((j) => j.application && j.application.status !== "withdrawn").sort((a, b) => (b.application?.sentAt ?? "").localeCompare(a.application?.sentAt ?? ""));
  const here = `${routes.vendorArea.jobs}${query(f)}`;
  const filtered = Boolean(f.min || f.max || f.deadline || f.month || f.free);
  // the months that have open posts, for the Event date choice
  const months = [...new Set(open.map((j) => j.date.slice(0, 7)))].sort();
  const monthName = (m: string) => new Date(`${m}-15T12:00:00+05:30`).toLocaleDateString("en-GB", { month: "long", timeZone: "Asia/Colombo" });

  const aside = (
    <>
      <Panel title={TEXT.myApplications} link={{ label: TEXT.seeAll, href: routes.vendorArea.applications }} empty={applied.length === 0 ? TEXT.noApplications : undefined}>
        {applied.length > 0 &&
          applied.slice(0, 3).map((j) => {
            const a = j.application;
            if (!a) return null;
            const tone = a.status === "accepted" ? "good" : a.status === "not-chosen" ? "danger" : "neutral";
            return (
              <Link key={j.id} href={a.status === "waiting" ? routes.vendorArea.job(j.id) : routes.vendorArea.application(j.id)} className={hiring.whiteRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{j.title}</span>
                  <span className={hiring.sub}>
                    {a.status === "not-chosen" ? TEXT.closed(formatShortDate(a.decidedAt ?? j.quotesBy)) : `${organiserName(state, j.organiserId)} · quote ${lkr(a.priceLkr)}`}
                  </span>
                </span>
                <Chip tone={tone}>{TEXT.chip[a.status]}</Chip>
              </Link>
            );
          })}
      </Panel>
      <div className={hiring.notePanel}>
        <p className={hiring.notePanelTitle}>{TEXT.howTitle}</p>
        <p className={styles.foot}>{TEXT.how}</p>
      </div>
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <Header />
        <div className={styles.pills}>
          <span className={`${styles.pill} ${styles.pillOn}`}>{state.profile.category}</span>
          {state.profile.districts.map((d) => (
            <span key={d} className={`${styles.pill} ${styles.pillOn}`}>
              {d}
            </span>
          ))}
          <Link href={`${here}${here.includes("?") ? "&" : "?"}dialog=filters`} scroll={false} className={`${styles.pill} ${f.min || f.max ? styles.pillOn : ""}`}>
            {f.min || f.max ? `${TEXT.budget} · ${lkr(f.min)}${f.max ? ` – ${formatCount(f.max)}` : "+"}` : TEXT.budget}
          </Link>
          <Link href={`${here}${here.includes("?") ? "&" : "?"}dialog=filters`} scroll={false} className={`${styles.pill} ${f.deadline ? styles.pillOn : ""}`}>
            {f.deadline === "week" ? TEXT.thisWeek : f.deadline === "2weeks" ? TEXT.twoWeeks : TEXT.deadline}
          </Link>
          <Link href={`${here}${here.includes("?") ? "&" : "?"}dialog=filters`} scroll={false} className={`${styles.pill} ${f.month || f.free ? styles.pillOn : ""}`}>
            {f.month ? monthName(f.month) : f.free ? TEXT.onlyFree : TEXT.eventDate}
          </Link>
          {filtered && (
            <Link href={routes.vendorArea.jobs} className={ui.textLink}>
              {TEXT.clearAll}
            </Link>
          )}
        </div>
        {shown.length === 0 ? (
          <p className={ui.muted}>{TEXT.none}</p>
        ) : (
          <ul className={ui.rows}>
            {shown.map((j) => (
              <li key={j.id}>
                <JobCard job={j} state={state} back={here} />
              </li>
            ))}
          </ul>
        )}
      </Columns>

      {q.dialog === "filters" && (
        <Dialog title={TEXT.filters} closeHref={here} closeLabel={TEXT.close} narrow>
          <form action={routes.vendorArea.jobs} className={tables.dialogForm}>
            <fieldset className={hiring.plainFieldset}>
              <legend className={forms.label}>{TEXT.budgetRange}</legend>
              <div className={forms.row2}>
                <input name="min" inputMode="numeric" defaultValue={f.min || ""} placeholder="LKR 50,000" aria-label={TEXT.from} className={forms.input} />
                <input name="max" inputMode="numeric" defaultValue={f.max || ""} placeholder="LKR 400,000" aria-label={TEXT.to} className={forms.input} />
              </div>
            </fieldset>
            <fieldset className={hiring.plainFieldset}>
              <legend className={forms.label}>{TEXT.deadline}</legend>
              <Choice type="radio" name="deadline" value="week" title={TEXT.thisWeek} defaultChecked={f.deadline === "week"} />
              <Choice type="radio" name="deadline" value="2weeks" title={TEXT.twoWeeks} defaultChecked={f.deadline === "2weeks"} />
              <Choice type="radio" name="deadline" value="" title={TEXT.anyTime} defaultChecked={!f.deadline} />
            </fieldset>
            <fieldset className={hiring.plainFieldset}>
              <legend className={forms.label}>{TEXT.eventDate}</legend>
              {months.map((m) => (
                <Choice key={m} type="radio" name="month" value={m} title={monthName(m)} defaultChecked={f.month === m} />
              ))}
              <Choice type="radio" name="month" value="" title={TEXT.anyTime} defaultChecked={!f.month} />
              <Choice type="checkbox" name="free" value="1" title={TEXT.onlyFree} hint={TEXT.onlyFreeHint} defaultChecked={f.free} />
            </fieldset>
            <div className={tables.dialogActions}>
              <Link href={routes.vendorArea.jobs} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
                {TEXT.clear}
              </Link>
              <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                {TEXT.show}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}

function Header() {
  return (
    <header className={hiring.pageHeadText}>
      <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
      <p className={hiring.lede}>{TEXT.lede}</p>
    </header>
  );
}

// One post (V10): title, who and when, its tags, the budget and deadline, and what to do.
function JobCard({ job: j, state, back }: { job: OpenJob; state: ProviderState; back: string }) {
  const sent = j.application?.status === "waiting";
  return (
    <article className={styles.post} aria-labelledby={`job-${j.id}`}>
      <div className={styles.postHead}>
        <span className={ui.rowText}>
          <Link id={`job-${j.id}`} href={routes.vendorArea.job(j.id)} className={styles.postTitle}>
            {j.title}
          </Link>
          <span className={hiring.sub}>{`${organiserName(state, j.organiserId)} · ${j.eventTitle}, ${day(j.date)}`}</span>
        </span>
        {sent ? <Chip tone="soft">{TEXT.quoteSent}</Chip> : !j.inYourDistricts && <Chip tone="neutral">{TEXT.outside}</Chip>}
      </div>
      {j.tags.length > 0 && (
        <ul className={ui.chipList}>
          {j.tags.map((t) => (
            <li key={t} className={`${styles.pill} ${styles.pillGrey}`}>
              {t}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.postFacts}>
        <span>
          {`${TEXT.budgetLine} `}
          <strong>{`${lkr(j.budgetMinLkr)} – ${formatCount(j.budgetMaxLkr)}`}</strong>
        </span>
        <span>
          {`${TEXT.quotesBy} `}
          <strong>{day(j.quotesBy.slice(0, 10))}</strong>
        </span>
        <span>{TEXT.quotesSoFar(j.quotes)}</span>
      </p>
      <div className={styles.postButtons}>
        {sent ? (
          <Link href={routes.vendorArea.job(j.id)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
            {TEXT.seeQuote}
          </Link>
        ) : (
          <Link href={routes.vendorArea.apply(j.id)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
            {TEXT.apply}
          </Link>
        )}
        <Link href={routes.vendorArea.job(j.id)} className={ui.rowButton}>
          {TEXT.view}
        </Link>
        <form action={toggleSaved.bind(null, j.id, back)}>
          <button type="submit" className={ui.rowButton} aria-pressed={j.saved}>
            {j.saved ? TEXT.saved : TEXT.save}
          </button>
        </form>
      </div>
    </article>
  );
}
