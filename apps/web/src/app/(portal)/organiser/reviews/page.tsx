import type { Metadata } from "next";
import Link from "next/link";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import CountedTextarea from "@/components/portal/reviews/CountedTextarea";
import styles from "@/components/portal/reviews/Reviews.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getMyOrganiserProfile, getReceivedReviews, listReviewTasks } from "@/lib/data/portal";
import type { ReceivedReview } from "@/lib/data/portal-types";
import { formatCount } from "@/lib/format";
import { REPLY_MAX, REPORT_REASONS } from "@/lib/reviews";
import { routes } from "@/lib/routes";
import { replyToReview, reportReview } from "./actions";

export const metadata: Metadata = { title: "Reviews" };

const TEXT = {
  title: "Reviews",
  lede: "From providers you worked with and people who marked your events Going",
  average: "Average rating",
  reviews: "Reviews",
  tier: "Tier",
  rank: "Rank among organisers",
  tabsLabel: "Whose reviews",
  fromProviders: (n: number) => `From providers (${formatCount(n)})`,
  fromConsumers: (n: number) => `From consumers (${formatCount(n)})`,
  averagesProviders: "Averages from providers",
  averagesConsumers: "Averages from consumers",
  went: (event: string) => `Went to ${event}`,
  reply: "Reply",
  report: "Report",
  replyTo: (name: string) => `Reply to ${name}`,
  reportWho: (name: string) => `Report ${name}'s review`,
  yourReply: "Your reply",
  reported: "Reported · an admin is checking it",
  none: "No reviews yet.",
  consumersNote: "Only people who marked the event Going can review it, after it ends.",
  saved: "Saved. Finish it from Waiting for your review.",
  waiting: "Waiting for your review",
  nothingWaiting: "Nothing to review right now.",
  review: "Review",
  reviewWho: (name: string) => `Review ${name}`,
  reportTitle: "Report a review that breaks the rules",
  reportText: "An admin checks it and hides it if it does.",
} as const;

type Props = { searchParams: Promise<{ tab?: string; reply?: string; report?: string; error?: string; saved?: string }> };

// "Oct", the month a review was written
const month = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", timeZone: "Asia/Colombo" });

// "4.5 · Payment 5 · Communication 4 · Planning 4.5"
const scoreLine = (r: ReceivedReview) => [String(r.overall), ...r.scores.map((s) => `${s.label} ${s.value}`)].join(" · ");

// Reviews (Figma O29 from providers; ?tab=consumers is O49): the organiser's numbers, the
// averages, each review with Reply and Report (O46, O47), and who they still have to review.
export default async function ReviewsPage({ searchParams }: Props) {
  const session = await requireRole("organiser");
  const query = await searchParams;
  const [data, profile, tasks] = await Promise.all([getReceivedReviews(session), getMyOrganiserProfile(session), listReviewTasks(session)]);
  const consumers = query.tab === "consumers";
  const list = (data?.reviews ?? []).filter((r) => r.from === (consumers ? "consumer" : "provider"));
  const averages = data ? data.averages[consumers ? "consumer" : "provider"] : [];
  const tab = consumers ? `${routes.reviews}?tab=consumers` : routes.reviews;
  const join = consumers ? "&" : "?";
  const replying = list.find((r) => r.id === query.reply && !r.reply);
  const reporting = list.find((r) => r.id === query.report && !r.reported);

  const aside = (
    <>
      <Panel title={TEXT.waiting} empty={tasks.length === 0 ? TEXT.nothingWaiting : undefined}>
        {tasks.length > 0 &&
          tasks.map((t) => (
            <div key={t.id} className={hiring.whiteRow}>
              <Thumb size={36} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{t.name}</span>
                <span className={hiring.sub}>{`${t.kind} · ${t.eventTitle}`}</span>
              </span>
              <Link href={routes.writeReview(t.id)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`} aria-label={TEXT.reviewWho(t.name)}>
                {TEXT.review}
              </Link>
            </div>
          ))}
      </Panel>
      <div className={hiring.notePanel}>
        <p className={hiring.notePanelTitle}>{TEXT.reportTitle}</p>
        <p className={tables.panelText}>{TEXT.reportText}</p>
      </div>
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <header className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
          <p className={hiring.lede}>{TEXT.lede}</p>
        </header>
        {query.saved && (
          <p className={styles.notice} role="status">
            {TEXT.saved}
          </p>
        )}
        <dl className={styles.tiles}>
          <Tile value={String(profile?.rating ?? "–")} label={TEXT.average} />
          <Tile value={formatCount(profile?.reviews ?? 0)} label={TEXT.reviews} />
          <Tile value={profile?.badge ?? "New"} label={TEXT.tier} />
          <Tile value={profile?.rank ? `#${profile.rank}` : "–"} label={TEXT.rank} />
        </dl>

        <nav className={styles.tabs} aria-label={TEXT.tabsLabel}>
          <Link href={routes.reviews} className={styles.tab} aria-current={!consumers ? "page" : undefined}>
            {TEXT.fromProviders(data?.totals.provider ?? 0)}
          </Link>
          <Link href={`${routes.reviews}?tab=consumers`} className={styles.tab} aria-current={consumers ? "page" : undefined}>
            {TEXT.fromConsumers(data?.totals.consumer ?? 0)}
          </Link>
        </nav>

        {averages.length > 0 && (
          <section className={styles.card} aria-labelledby="averages-title">
            <h2 id="averages-title" className={hiring.cardTitle}>
              {consumers ? TEXT.averagesConsumers : TEXT.averagesProviders}
            </h2>
            <dl className={styles.averages}>
              {averages.map(([label, value]) => (
                <div key={label} className={styles.average}>
                  <dt className={tables.small}>{label}</dt>
                  <dd className={styles.averageValue}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {list.length === 0 ? (
          <p className={ui.muted}>{TEXT.none}</p>
        ) : (
          <ul className={ui.rows}>
            {list.map((r) => (
              <li key={r.id} className={styles.card}>
                <div className={styles.reviewHead}>
                  <span className={tables.small}>
                    {consumers ? `${r.by} · ${TEXT.went(r.event)}` : [r.by, r.byRole, r.event, month(r.at)].join(" · ")}
                  </span>
                  <span className={styles.reviewButtons}>
                    {!r.reply && (
                      <Link href={`${tab}${join}reply=${r.id}`} scroll={false} className={ui.rowButton} aria-label={TEXT.replyTo(r.by)}>
                        {TEXT.reply}
                      </Link>
                    )}
                    {!r.reported && (
                      <Link href={`${tab}${join}report=${r.id}`} scroll={false} className={ui.rowButton} aria-label={TEXT.reportWho(r.by)}>
                        {TEXT.report}
                      </Link>
                    )}
                  </span>
                </div>
                <p className={styles.scores}>{scoreLine(r)}</p>
                <p className={styles.text}>{r.text}</p>
                {r.reply && (
                  <div className={styles.reply}>
                    <span className={ui.rowTitle}>{TEXT.yourReply}</span>
                    <span className={styles.text}>{r.reply}</span>
                  </div>
                )}
                {r.reported && <p className={tables.small}>{TEXT.reported}</p>}
              </li>
            ))}
          </ul>
        )}
        {consumers && <p className={tables.small}>{TEXT.consumersNote}</p>}
      </Columns>
      {replying && <ReplyDialog review={replying} close={tab} error={query.error} />}
      {reporting && <ReportDialog review={reporting} close={tab} error={query.error} />}
    </>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className={events.tile}>
      <dt className={`${ui.muted} ${events.tileLabel}`}>{label}</dt>
      <dd className={events.tileValue}>{value}</dd>
    </div>
  );
}

const DIALOG = {
  close: "Close",
  replyTitle: (name: string) => `Reply to ${name}`,
  replySubtitle: "Your reply shows under the review. One reply per review.",
  yourReply: "Your reply",
  replyPlaceholder: "Thanks for the review…",
  replyError: "Write a reply first.",
  cancel: "Cancel",
  post: "Post reply",
  reportTitle: "Report this review",
  reportSubtitle: "An admin checks it and hides it if it breaks the rules",
  why: "Why",
  more: "Tell us more (optional)",
  lowRating: "You can't report a review just because the rating is low.",
  reasonError: "Pick a reason.",
  send: "Send report",
} as const;

// "Reply to Tharindu Jayawardena" (Figma O46).
function ReplyDialog({ review, close, error }: { review: ReceivedReview; close: string; error?: string }) {
  return (
    <Dialog title={DIALOG.replyTitle(review.by)} subtitle={DIALOG.replySubtitle} closeHref={close} closeLabel={DIALOG.close} narrow>
      <div className={styles.quoted}>
        <span className={ui.rowTitle}>{review.overall}</span>
        <span className={styles.text}>{review.text}</span>
      </div>
      <form action={replyToReview.bind(null, review.id)} className={tables.dialogForm}>
        <CountedTextarea name="reply" max={REPLY_MAX} label={DIALOG.yourReply} placeholder={DIALOG.replyPlaceholder} className={styles.textarea} />
        {error === "reply" && <p className={forms.error}>{DIALOG.replyError}</p>}
        <div className={tables.dialogActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {DIALOG.cancel}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {DIALOG.post}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// "Report this review" (Figma O47).
function ReportDialog({ review, close, error }: { review: ReceivedReview; close: string; error?: string }) {
  return (
    <Dialog title={DIALOG.reportTitle} subtitle={DIALOG.reportSubtitle} closeHref={close} closeLabel={DIALOG.close} narrow>
      <form action={reportReview.bind(null, review.id)} className={tables.dialogForm}>
        <fieldset className={styles.reasons}>
          <legend className={shell.srOnly}>{DIALOG.why}</legend>
          {REPORT_REASONS.map(([value, label]) => (
            <label key={value} className={styles.radio}>
              <input type="radio" name="reason" value={value} required />
              {label}
            </label>
          ))}
        </fieldset>
        {error === "reason" && <p className={forms.error}>{DIALOG.reasonError}</p>}
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.more}</span>
          <textarea name="note" rows={3} className={`${forms.input} ${styles.textarea}`} />
        </label>
        <p className={tables.small}>{DIALOG.lowRating}</p>
        <div className={tables.dialogActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {DIALOG.cancel}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {DIALOG.send}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
