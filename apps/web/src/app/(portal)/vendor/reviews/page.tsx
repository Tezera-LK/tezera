import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import Choice from "@/components/portal/provider/Choice";
import styles from "@/components/portal/provider/Provider.module.css";
import CountedTextarea from "@/components/portal/reviews/CountedTextarea";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { ProviderReview } from "@/lib/data/provider-types";
import { PROVIDER_REPORT_REASONS, daysUntil, stars } from "@/lib/provider";
import { REPLY_MAX } from "@/lib/reviews";
import { routes } from "@/lib/routes";
import { replyToReview, reportReview } from "./actions";

export const metadata: Metadata = { title: "Reviews and rank" };

const TEXT = {
  title: "Reviews and rank",
  ledeVendor: "What organisers and guests say about you, and where you rank",
  ledeFreelancer: "What organisers say about you, and where you rank",
  reviews: (n: number) => `${n} reviews`,
  filters: { all: "All", organiser: "From organisers", guest: "From guests" },
  role: { organiser: "Organiser", guest: "Guest who marked Going" },
  yourReply: "Your reply",
  reply: "Reply",
  report: "Report",
  reported: "Reported · an admin is checking it",
  none: "No reviews here yet.",
  rankScore: "Rank score",
  howItWorks: "How it works",
  outOf: "of 100 · orders search results",
  tiers: ["New", "Rising", "Top Rated at 85"],
  top: (cat: string, district: string) => `Top providers · ${cat} · ${district}`,
  fullBoard: "Full board",
  you: "you",
  reviewOrganisers: "Review organisers",
  review: "Review",
  closesIn: (event: string, n: number) => `${event} · closes in ${n} day${n === 1 ? "" : "s"}`,
  nothingToReview: "Nobody to review right now.",
  opensNote: "Opens when a booking completes or the event ends, and closes 14 days later (proposed).",
  emptyTitle: "No reviews yet",
  emptyText: "Reviews from organisers and guests show up here.",
  // dialogs
  close: "Close",
  replyTitle: (who: string) => `Reply to ${who}`,
  replySub: "One public reply per review",
  replyHint: "Shown under the review on your profile. Keep it friendly.",
  replyError: "Write a reply first.",
  cancel: "Cancel",
  post: "Post reply",
  reportTitle: "Report this review",
  reportSub: "An admin hides it if it breaks the rules",
  details: "Details (optional)",
  reasonError: "Pick a reason.",
  send: "Send report",
  howTitle: "How your rank score works",
  howSub: "Out of 100 · orders provider search and leaderboards",
  weights: [
    ["Average rating", "50%", "Organiser and guest reviews"],
    ["Number of reviews", "20%", "More reviews, more confidence"],
    ["Completed bookings", "20%", "Without late cancellations"],
    ["Response rate", "10%", "Replies to requests within 48 hours"],
  ],
  tiersTitle: "Tiers",
  tierLines: ["New · under 3 reviews", "Rising · 3+ reviews", "Top Rated · 85+"],
  proposed: "Weights are proposed and may change before launch.",
  gotIt: "Got it",
} as const;

type Filter = keyof typeof TEXT.filters;
type Props = { searchParams: Promise<{ from?: string; reply?: string; report?: string; dialog?: string; error?: string }> };

// Reviews and rank (Figma V19, F19): the provider's scores and reviews with Reply (V99) and
// Report (V100), their rank score (How it works, V41), the top of their leaderboard and the
// organisers they can review (V20).
export default async function ReviewsPage({ searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const q = await searchParams;
  const vendor = session.role === "vendor";
  if (!state) return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />;

  const filters: Filter[] = vendor ? ["all", "organiser", "guest"] : ["all", "organiser"];
  const from: Filter = filters.find((f) => f === q.from) ?? "all";
  const here = from === "all" ? routes.vendorArea.reviews : `${routes.vendorArea.reviews}?from=${from}`;
  const join = here.includes("?") ? "&" : "?";
  const list = state.reviews.filter((r) => from === "all" || r.from === from);
  // the totals, not just the reviews listed here (V19 "All · 38")
  const split = state.profile.reviewSplit;
  const count = (f: Filter) => (f === "all" ? split.organisers + split.guests : f === "organiser" ? split.organisers : split.guests);
  const p = state.profile;
  const now = new Date();
  const tasks = state.reviewTasks.filter((t) => !t.submitted && daysUntil(t.closesOn, now) >= 0);
  const replying = state.reviews.find((r) => r.id === q.reply && !r.reply);
  const reporting = state.reviews.find((r) => r.id === q.report && !r.reported);

  const aside = (
    <>
      <Panel title={TEXT.rankScore} link={{ label: TEXT.howItWorks, href: `${here}${join}dialog=how` }}>
        <div className={hiring.cardHead}>
          <p className={hiring.pageTitle}>{p.rankScore}</p>
          <Chip tone="soft">{p.badge}</Chip>
        </div>
        <p className={styles.foot}>{TEXT.outOf}</p>
        <span className={styles.bar} aria-hidden="true">
          <span className={styles.barFill} style={{ width: `${p.rankScore}%` }} />
        </span>
        <ul className={ui.chipList}>
          {TEXT.tiers.map((t) => (
            <li key={t} className={`${styles.pill} ${t.startsWith(p.badge) ? styles.pillOn : ""}`}>
              {t}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title={TEXT.top(p.rankCategory, p.districts[0])} link={{ label: TEXT.fullBoard, href: routes.vendorArea.leaderboard }}>
        {state.leaderboard.slice(0, 4).map((row) => (
          <div key={row.rank} className={`${hiring.whiteRow} ${row.you ? styles.youRow : ""}`}>
            <Thumb size={32} shape="round" />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{`${row.rank} · ${row.name}`}</span>
              <span className={hiring.sub}>{`${row.badge} · ★ ${row.rating}${row.you ? ` · ${TEXT.you}` : ""}`}</span>
            </span>
          </div>
        ))}
      </Panel>
      <Panel title={TEXT.reviewOrganisers} empty={tasks.length === 0 ? TEXT.nothingToReview : undefined}>
        {tasks.length > 0 &&
          tasks.map((t) => (
            <div key={t.id} className={hiring.whiteRow}>
              <Thumb size={32} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{t.name}</span>
                <span className={hiring.sub}>{TEXT.closesIn(t.eventTitle, daysUntil(t.closesOn, now))}</span>
              </span>
              <Link href={routes.vendorArea.reviewOrganiser(t.id)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                {TEXT.review}
              </Link>
            </div>
          ))}
        <p className={styles.foot}>{TEXT.opensNote}</p>
      </Panel>
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <header className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
          <p className={hiring.lede}>{vendor ? TEXT.ledeVendor : TEXT.ledeFreelancer}</p>
        </header>
        <section className={`${events.card} ${styles.scoreCard}`} aria-label={TEXT.title}>
          <div className={ui.rowText}>
            <p className={styles.bigScore}>{p.rating}</p>
            <p className={hiring.sub}>{TEXT.reviews(p.reviews)}</p>
          </div>
          <dl className={styles.bars}>
            {p.scores.map(([label, value]) => (
              <Bar key={label} label={label} value={value} />
            ))}
          </dl>
        </section>
        <div className={styles.pills}>
          {filters.map((f) => (
            <Link key={f} href={f === "all" ? routes.vendorArea.reviews : `${routes.vendorArea.reviews}?from=${f}`} scroll={false} className={`${styles.pill} ${f === from ? styles.pillOn : ""}`} aria-current={f === from ? "page" : undefined}>
              {`${TEXT.filters[f]} · ${count(f)}`}
            </Link>
          ))}
        </div>
        {list.length === 0 ? (
          <p className={ui.muted}>{TEXT.none}</p>
        ) : (
          <ul className={ui.rows}>
            {list.map((r) => (
              <li key={r.id}>
                <ReviewCard review={r} here={here} join={join} />
              </li>
            ))}
          </ul>
        )}
      </Columns>

      {replying && (
        <Dialog title={TEXT.replyTitle(replying.by)} subtitle={TEXT.replySub} closeHref={here} closeLabel={TEXT.close} narrow>
          <div className={styles.greyRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{`${stars(replying.stars)} · ${replying.event}`}</span>
              <span className={styles.foot}>{replying.text}</span>
            </span>
          </div>
          <form action={replyToReview.bind(null, replying.id)} className={tables.dialogForm}>
            <CountedTextarea name="reply" max={REPLY_MAX} label={TEXT.yourReply} />
            <p className={styles.foot}>{TEXT.replyHint}</p>
            {q.error === "reply" && <p className={forms.error}>{TEXT.replyError}</p>}
            <div className={tables.dialogActions}>
              <Link href={here} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
                {TEXT.cancel}
              </Link>
              <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                {TEXT.post}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {reporting && (
        <Dialog title={TEXT.reportTitle} subtitle={TEXT.reportSub} closeHref={here} closeLabel={TEXT.close} narrow>
          <form action={reportReview.bind(null, reporting.id)} className={tables.dialogForm}>
            <fieldset className={hiring.plainFieldset}>
              <legend className={forms.label}>{TEXT.report}</legend>
              {PROVIDER_REPORT_REASONS.map((reason) => (
                <Choice key={reason} type="radio" name="reason" value={reason} title={reason} required />
              ))}
            </fieldset>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.details}</span>
              <textarea name="note" rows={2} className={forms.input} />
            </label>
            {q.error === "reason" && <p className={forms.error}>{TEXT.reasonError}</p>}
            <div className={tables.dialogActions}>
              <Link href={here} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
                {TEXT.cancel}
              </Link>
              <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                {TEXT.send}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {q.dialog === "how" && (
        <Dialog title={TEXT.howTitle} subtitle={TEXT.howSub} closeHref={here} closeLabel={TEXT.close} narrow>
          {TEXT.weights.map(([title, weight, sub]) => (
            <div key={title} className={styles.greyRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{title}</span>
                <span className={hiring.sub}>{sub}</span>
              </span>
              <span className={styles.amount}>{weight}</span>
            </div>
          ))}
          <p className={forms.label}>{TEXT.tiersTitle}</p>
          <ul className={ui.chipList}>
            {TEXT.tierLines.map((t) => (
              <li key={t} className={`${styles.pill} ${styles.pillGrey}`}>
                {t}
              </li>
            ))}
          </ul>
          <p className={styles.foot}>{TEXT.proposed}</p>
          <Link href={here} scroll={false} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.gotIt}
          </Link>
        </Dialog>
      )}
    </>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={styles.bar}>
        <span className={styles.barFill} style={{ width: `${(value / 5) * 100}%` }} />
      </dd>
      <dd className={ui.rowTitle}>{value}</dd>
    </>
  );
}

// One review (V19): who and from what event, its tags, the text, the reply, and Reply / Report.
function ReviewCard({ review: r, here, join }: { review: ProviderReview; here: string; join: string }) {
  const month = new Date(r.at).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "Asia/Colombo" });
  return (
    <article className={styles.post}>
      <span className={styles.inline}>
        <Thumb size={36} shape="round" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{r.by}</span>
          <span className={hiring.sub}>{`${TEXT.role[r.from]} · ${r.event} · ${month} · ${stars(r.stars)}`}</span>
        </span>
      </span>
      {r.tags.length > 0 && (
        <ul className={ui.chipList}>
          {r.tags.map((t) => (
            <li key={t} className={`${styles.pill} ${styles.pillGrey}`}>
              {t}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.foot}>{r.text}</p>
      {r.reply && (
        <div className={styles.greyRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.yourReply}</span>
            <span className={styles.foot}>{r.reply}</span>
          </span>
        </div>
      )}
      {r.reported ? (
        <p className={hiring.sub}>{TEXT.reported}</p>
      ) : (
        <div className={styles.postButtons}>
          {!r.reply && (
            <Link href={`${here}${join}reply=${r.id}`} scroll={false} className={`${ui.rowButton} ${styles.replyButton}`}>
              {TEXT.reply}
            </Link>
          )}
          <Link href={`${here}${join}report=${r.id}`} scroll={false} className={ui.rowButton}>
            {TEXT.report}
          </Link>
        </div>
      )}
    </article>
  );
}
