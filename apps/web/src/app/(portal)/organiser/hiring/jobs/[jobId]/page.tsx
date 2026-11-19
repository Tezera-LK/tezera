import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import forms from "@/components/portal/forms.module.css";
import styles from "@/components/portal/hiring/Hiring.module.css";
import { BadgeChip } from "@/components/portal/hiring/ProviderBits";
import QuotePicker from "@/components/portal/hiring/QuotePicker";
import shell from "@/components/portal/PortalShell.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getJobPost, getMyEvent, getProvidersById } from "@/lib/data/portal";
import type { HireProvider, JobPost, JobQuote } from "@/lib/data/portal-types";
import { formatCount, formatDayMonth, formatList } from "@/lib/format";
import { splitQuotes } from "@/lib/hiring";
import { routes } from "@/lib/routes";
import { acceptJobQuotes } from "../../actions";

export const metadata: Metadata = { title: "Compare quotes" };

const TEXT = {
  open: "Open",
  closed: "Closed",
  lede: (event: string, day: string, min: number, max: number, closes: string) =>
    `${event} · ${day} · Budget LKR ${formatCount(min)} to LKR ${formatCount(max)} each · Quotes close ${closes}`,
  sortPrice: "Sort: price",
  sortRating: "Sort: rating",
  count: (n: number) => `${n} ${n === 1 ? "quote" : "quotes"}`,
  over: (list: string) => `Not shown, over budget: ${list}`,
  overOne: (name: string, price: number) => `${name}, LKR ${formatCount(price)}`,
  none: "No quotes yet. We tell you as they arrive.",
  verified: "Verified",
  viewProfile: "View profile",
  rating: "Rating",
  jobs: "Jobs",
  districts: "Districts",
  ratingValue: (p: HireProvider) => `★ ${p.rating} · ${p.reviews} reviews`,
  accept: "Accept this quote",
  booked: "Booked",
  notChosen: "Not chosen",
  dialogTitle: (n: number) => `Create ${n} ${n === 1 ? "booking" : "bookings"}?`,
  dialogRow: (price: number) => `LKR ${formatCount(price)} · their payment and cancellation terms`,
  closePost: "Close the job post",
  othersTold: (names: string) => `${names} ${names.includes(" and ") ? "are" : "is"} told they were not chosen`,
  noOthers: "No other quotes are waiting",
  goBack: "Go back",
  create: (n: number) => `Create ${n} ${n === 1 ? "booking" : "bookings"}`,
  close: "Close",
  pickOne: "Tick at least one quote first.",
} as const;

type Props = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ dialog?: string; pick?: string | string[]; sort?: string; error?: string }>;
};

// A job post's quotes side by side (Figma O21). Ticking "Accept this quote" and pressing the
// button opens "Create 2 bookings?" (O89) with ?dialog=accept&pick=…, which makes the bookings.
// Quotes over the budget are left out, with a line saying whose.
export default async function JobPage({ params, searchParams }: Props) {
  const session = await requireRole("organiser");
  const { jobId } = await params;
  const query = await searchParams;
  const job = await getJobPost(session, jobId);
  if (!job) notFound();
  const [event, providers] = await Promise.all([
    getMyEvent(session, job.eventId),
    getProvidersById(session, job.quotes.map((q) => q.providerId)),
  ]);

  const byRating = query.sort === "rating";
  const { within, over } = splitQuotes(job);
  const shown = [...within].sort((a, b) =>
    byRating
      ? (providers.get(b.providerId)?.rating ?? 0) - (providers.get(a.providerId)?.rating ?? 0)
      : a.priceLkr - b.priceLkr,
  );
  const picks = new Set([query.pick ?? []].flat());
  const base = routes.job(job.id);
  const nameOf = (q: JobQuote) => providers.get(q.providerId)?.name ?? "";

  return (
    // no right-hand column here: the three quotes use the full width, as in Figma
    <>
      <header className={styles.pageHead}>
        <div className={styles.pageHeadText}>
          <h1 className={styles.pageTitle}>{job.title}</h1>
          <p className={styles.lede}>
            {TEXT.lede(event?.title ?? "", formatDayMonth(`${job.date}T12:00:00+05:30`), job.budgetMinLkr, job.budgetMaxLkr, formatDayMonth(job.closesAt))}
          </p>
        </div>
        {job.status === "open" ? <Chip tone="soft">{TEXT.open}</Chip> : <Chip tone="neutral">{TEXT.closed}</Chip>}
      </header>

      <div className={styles.compareBar}>
        <Link href={byRating ? base : `${base}?sort=rating`} className={styles.sortPill}>
          {byRating ? TEXT.sortRating : TEXT.sortPrice}
        </Link>
        <strong>{TEXT.count(job.quotes.length)}</strong>
        {over.length > 0 && <span className={ui.muted}>{TEXT.over(formatList(over.map((q) => TEXT.overOne(nameOf(q), q.priceLkr))))}</span>}
      </div>
      {query.error === "none" && (
        <p className={forms.error} role="alert">
          {TEXT.pickOne}
        </p>
      )}

      {shown.length === 0 ? (
        <p className={ui.muted}>{TEXT.none}</p>
      ) : (
        <QuotePicker
          action={base}
          prices={Object.fromEntries(shown.map((q) => [q.id, q.priceLkr]))}
          initial={[...picks].filter((id) => shown.some((q) => q.id === id && q.status === "open"))}
        >
          <ul className={styles.quoteGrid}>
            {shown.map((q) => (
              <QuoteCard key={q.id} quote={q} provider={providers.get(q.providerId)} eventId={job.eventId} picked={picks.has(q.id)} />
            ))}
          </ul>
        </QuotePicker>
      )}


      {query.dialog === "accept" && <AcceptDialog job={job} providers={providers} picks={picks} />}
    </>
  );
}

// One quote: who, their price, their numbers and message, and the tick box. A quote already
// booked or turned down shows that instead.
function QuoteCard({ quote, provider, eventId, picked }: { quote: JobQuote; provider?: HireProvider; eventId: string; picked: boolean }) {
  if (!provider) return null;
  return (
    <li className={`${styles.quote} ${quote.status === "accepted" ? styles.quoteAccepted : ""}`}>
      <div className={styles.quoteHead}>
        <Thumb size={44} shape="round" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{provider.name}</span>
          <span className={styles.chipRow}>
            {provider.verified && <Chip tone="good">{TEXT.verified}</Chip>}
            <BadgeChip badge={provider.badge} />
          </span>
        </span>
      </div>
      <Link href={`${routes.provider(provider.id)}?event=${encodeURIComponent(eventId)}`} className={ui.textLink}>
        <span aria-hidden="true">{TEXT.viewProfile}</span>
        <span className={shell.srOnly}>{`${TEXT.viewProfile}: ${provider.name}`}</span>
      </Link>
      <p className={styles.quotePrice}>{`LKR ${formatCount(quote.priceLkr)}`}</p>
      <dl className={`${styles.quoteFacts} ${styles.quoteFactsSmall}`}>
        <div className={styles.partRow}>
          <dt>{TEXT.rating}</dt>
          <dd>{TEXT.ratingValue(provider)}</dd>
        </div>
        <div className={styles.partRow}>
          <dt>{TEXT.jobs}</dt>
          <dd>{provider.jobs}</dd>
        </div>
        <div className={styles.partRow}>
          <dt>{TEXT.districts}</dt>
          <dd>{provider.districts.join(", ")}</dd>
        </div>
      </dl>
      <p className={styles.messageText}>{quote.message}</p>
      {quote.status === "open" ? (
        <label className={styles.accept}>
          <input type="checkbox" name="pick" value={quote.id} defaultChecked={picked} />
          {TEXT.accept}
        </label>
      ) : (
        <Chip tone={quote.status === "accepted" ? "good" : "neutral"}>{quote.status === "accepted" ? TEXT.booked : TEXT.notChosen}</Chip>
      )}
    </li>
  );
}

// "Create 2 bookings?" (O89): the picked quotes, whether to close the post, and the button.
function AcceptDialog({ job, providers, picks }: { job: JobPost; providers: Map<string, HireProvider>; picks: Set<string> }) {
  const chosen = job.quotes.filter((q) => picks.has(q.id) && q.status === "open");
  const others = job.quotes.filter((q) => !picks.has(q.id) && q.status === "open");
  const back = `${routes.job(job.id)}?${new URLSearchParams(chosen.map((q) => ["pick", q.id]))}`;
  if (chosen.length === 0) return null;
  const names = formatList(others.map((q) => providers.get(q.providerId)?.name ?? ""));

  return (
    <Dialog title={TEXT.dialogTitle(chosen.length)} subtitle={job.title} closeHref={back} closeLabel={TEXT.close} narrow>
      <form action={acceptJobQuotes.bind(null, job.id)} className={tables.dialogForm}>
        <ul className={ui.rows}>
          {chosen.map((q) => (
            <li key={q.id} className={`${styles.whiteRow} ${styles.pageRow}`}>
              <input type="hidden" name="pick" value={q.id} />
              <Thumb size={36} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{providers.get(q.providerId)?.name}</span>
                <span className={styles.sub}>{TEXT.dialogRow(q.priceLkr)}</span>
              </span>
            </li>
          ))}
        </ul>
        <label className={styles.closeChoice}>
          <input type="checkbox" name="close" defaultChecked={job.status === "open"} />
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.closePost}</span>
            <span className={styles.sub}>{others.length > 0 ? TEXT.othersTold(names) : TEXT.noOthers}</span>
          </span>
        </label>
        <div className={tables.dialogActions}>
          <Link href={back} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {TEXT.goBack}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.create(chosen.length)}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
