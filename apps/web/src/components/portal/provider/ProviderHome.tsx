import Link from "next/link";
import { commentOnPost, followOrganiser, likePost } from "@/app/(portal)/vendor/home-actions";
import Chip, { type ChipTone } from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import ui from "@/components/portal/ui.module.css";
import type { HomePost, ProviderBooking, ProviderState } from "@/lib/data/provider-types";
import { formatWhen } from "@/lib/format";
import { bookingTab, day, lkr, organiserName, paymentState, stillDue } from "@/lib/provider";
import { routes } from "@/lib/routes";
import CopyLink from "../events/CopyLink";
import styles from "./Provider.module.css";

const TEXT = {
  greeting: (hour: number, name: string) => `${hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}, ${name}`,
  lede: "Posts and events from organisers you follow",
  following: "Following",
  review: "Review ›",
  replyNote: "Reply within 48 hours to keep your response rate up",
  onlyOrganisers: "Only organisers post here",
  filters: { all: "All", event: "Events", stalls: "Stalls open", promo: "Promos", job: "Hiring" },
  like: "Like",
  liked: "Liked",
  comment: "Comment",
  share: "Share",
  apply: "Apply for a stall",
  seeJob: "See job post",
  viewEvent: "View event",
  none: "Nothing from organisers you follow yet.",
  needsReply: "Needs your reply",
  seeAll: "See all",
  nothingWaiting: "Nothing waiting for you.",
  comingUp: "Coming up",
  myBookings: "My bookings",
  nothingComing: "Nothing booked yet.",
  paid: "Paid",
  feeDue: "Fee due",
  // where a booking's money stands (F06)
  overdue: "Overdue",
  instalmentDue: "Instalment due",
  depositDue: "Deposit due",
  depositIn: "Deposit in",
  yourRank: "Your rank",
  details: "Details",
  pointsTo: (have: number, need: number) => `${have} of ${need} points to Top Rated`,
  toFollow: "Organisers to follow",
  follow: "Follow",
  // dialogs
  close: "Close",
  commentsTitle: (who: string, n: number) => `${who} · ${n} comment${n === 1 ? "" : "s"}`,
  noComments: "No comments yet.",
  write: "Write a comment…",
  post: "Post",
  shareTitle: (title: string) => `Share ${title}`,
  shareSub: "A short link with a preview image",
  copy: "Copy link",
  copied: "Copied",
  shareTo: ["WhatsApp", "Instagram", "Facebook", "Email"],
  // the promo viewer (V86)
  likes: (n: number) => `♥ ${n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : n}`,
  openPromo: (title: string) => `Open ${title}`,
} as const;

type Filter = keyof typeof TEXT.filters;

type ProviderHomeProps = {
  state: ProviderState;
  now: Date;
  query: { filter?: string; comments?: string; share?: string; promo?: string };
};

// The vendor and freelancer home (Figma V06, F06): posts from organisers they follow, what needs a
// reply, what's coming up, their rank and organisers to follow. Comments (V85), a promo (V86) and
// Share (V87) open as dialogs with ?comments=, ?promo= and ?share=.
export default function ProviderHome({ state, now, query }: ProviderHomeProps) {
  const vendor = state.kind === "vendor";
  const filters: Filter[] = vendor ? ["all", "event", "stalls", "promo"] : ["all", "event", "job", "promo"];
  const filter: Filter = filters.find((f) => f === query.filter) ?? "all";
  const here = filter === "all" ? routes.dashboard : `${routes.dashboard}?filter=${filter}`;
  const join = here.includes("?") ? "&" : "?";
  const posts = state.posts
    .filter((p) => state.following.includes(p.organiserId))
    .filter((p) => filter === "all" || p.kind === filter)
    .sort((a, b) => b.at.localeCompare(a.at));
  const hour = Number(now.toLocaleString("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Colombo" }));

  const newRequests = state.requests.filter((r) => r.status === "new");
  const invitations = vendor ? state.stalls.filter((s) => s.invited && !s.application) : [];
  const newJobs = vendor ? 0 : state.jobs.filter((j) => !j.application && Date.parse(j.quotesBy) > now.getTime()).length;
  const notice = [
    newRequests.length ? `${newRequests.length} new booking request${newRequests.length === 1 ? "" : "s"}` : "",
    invitations.length ? `${invitations.length} stall invitation${invitations.length === 1 ? "" : "s"}` : "",
    newJobs ? `${newJobs} new job post${newJobs === 1 ? "" : "s"} for ${state.profile.rankCategory.toLowerCase()}` : "",
  ]
    .filter(Boolean)
    .join(" and ");

  // bookings and approved stalls, soonest first
  const upcoming = [
    ...state.bookings
      .filter((b) => bookingTab(b, now) === "upcoming")
      .map((b) => ({ key: b.id, title: b.eventTitle, sub: `${day(b.date)} · ${b.service}`, date: b.date, href: routes.vendorArea.booking(b.id), chip: moneyChip(b, now) })),
    ...state.stalls
      .filter((s) => s.application?.status === "approved")
      .map((s) => ({
        key: s.id,
        title: s.eventTitle,
        sub: `${day(s.date)} · ${s.application?.stall ? `Stall ${s.application.stall}` : `${s.types[0]} stall`}`,
        date: s.date,
        href: `${routes.vendorArea.listing}?stall=${s.id}`,
        chip: (s.application?.fee.paidAt ? [TEXT.paid, "good"] : [TEXT.feeDue, "warn"]) as [string, ChipTone],
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 2);

  const commentsOn = state.posts.find((p) => p.id === query.comments);
  const sharing = state.posts.find((p) => p.id === query.share);
  const promo = state.posts.find((p) => p.id === query.promo && p.kind === "promo");
  const promoEvent = promo?.eventId ? state.events.find((e) => e.id === promo.eventId) : undefined;
  const promoHere = promo ? `${here}${join}promo=${promo.id}` : here;
  const topScore = state.leaderboard.find((r) => r.badge === "Top Rated") ? 85 : 100;

  const aside = (
    <>
      <Panel title={TEXT.needsReply} link={{ label: TEXT.seeAll, href: routes.vendorArea.requests }} empty={newRequests.length + invitations.length === 0 ? TEXT.nothingWaiting : undefined}>
        {newRequests.length + invitations.length > 0 && (
          <>
            {newRequests.slice(0, 2).map((r) => (
              <Link key={r.id} href={routes.vendorArea.request(r.id)} className={hiring.whiteRow}>
                <Thumb size={36} shape="round" />
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{organiserName(state, r.organiserId)}</span>
                  <span className={hiring.sub}>{`${r.title} · ${day(r.date)} · ${lkr(r.budgetLkr)}`}</span>
                </span>
              </Link>
            ))}
            {invitations.slice(0, 1).map((s) => (
              <Link key={s.id} href={`${routes.vendorArea.stalls}?dialog=invitation&stall=${s.id}`} className={hiring.whiteRow}>
                <Thumb size={36} shape="round" />
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{organiserName(state, s.organiserId)}</span>
                  <span className={hiring.sub}>{`Stall invitation · ${s.eventTitle}`}</span>
                </span>
              </Link>
            ))}
          </>
        )}
      </Panel>
      <Panel title={TEXT.comingUp} link={{ label: TEXT.myBookings, href: routes.vendorArea.bookings }} empty={upcoming.length === 0 ? TEXT.nothingComing : undefined}>
        {upcoming.length > 0 &&
          upcoming.map((u) => (
            <Link key={u.key} href={u.href} className={hiring.whiteRow}>
              <Thumb size={32} />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{u.title}</span>
                <span className={hiring.sub}>{u.sub}</span>
              </span>
              {u.chip && <Chip tone={u.chip[1]}>{u.chip[0]}</Chip>}
            </Link>
          ))}
      </Panel>
      <Panel title={TEXT.yourRank} link={{ label: TEXT.details, href: routes.vendorArea.reviews }}>
        <div className={hiring.cardHead}>
          <p className={hiring.pageTitle}>{state.profile.rank ? `#${state.profile.rank}` : "–"}</p>
          <Chip tone="soft">{state.profile.badge}</Chip>
        </div>
        <p className={styles.foot}>{`${state.profile.rankCategory} · ${state.profile.districts[0]}`}</p>
        <span className={styles.bar} aria-hidden="true">
          <span className={styles.barFill} style={{ width: `${Math.min(100, Math.round((state.profile.rankScore / topScore) * 100))}%` }} />
        </span>
        <p className={styles.foot}>{TEXT.pointsTo(state.profile.rankScore, topScore)}</p>
      </Panel>
      {state.suggestions.length > 0 && (
        <Panel title={TEXT.toFollow}>
          {state.suggestions.map((o) => (
            <div key={o.id} className={hiring.whiteRow}>
              <Thumb size={36} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{o.name}</span>
                <span className={hiring.sub}>{o.detail}</span>
              </span>
              <form action={followOrganiser.bind(null, o.id, true, here)}>
                <button type="submit" className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                  {TEXT.follow}
                </button>
              </form>
            </div>
          ))}
        </Panel>
      )}
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <header className={hiring.pageHead}>
          <div className={hiring.pageHeadText}>
            <h1 className={hiring.pageTitle}>{TEXT.greeting(hour, state.profile.shortName)}</h1>
            <p className={hiring.lede}>{TEXT.lede}</p>
          </div>
          <span className={ui.wideButton}>{TEXT.following}</span>
        </header>
        {notice && (
          <Link href={routes.vendorArea.requests} className={styles.banner}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.bannerText}>
              <span className={ui.rowTitle}>{notice}</span>
              <span className={hiring.sub}>{TEXT.replyNote}</span>
            </span>
            <span className={ui.textLink}>{TEXT.review}</span>
          </Link>
        )}
        <div className={styles.pills}>
          <span className={hiring.sub}>{TEXT.onlyOrganisers}</span>
          {filters.map((f) => (
            <Link key={f} href={f === "all" ? routes.dashboard : `${routes.dashboard}?filter=${f}`} scroll={false} className={`${styles.pill} ${f === filter ? styles.pillOn : ""}`} aria-current={f === filter ? "page" : undefined}>
              {TEXT.filters[f]}
            </Link>
          ))}
        </div>
        {posts.length === 0 ? (
          <p className={ui.muted}>{TEXT.none}</p>
        ) : (
          <ul className={styles.feed}>
            {posts.map((p) => (
              <li key={p.id}>
                <PostCard post={p} state={state} now={now} here={here} join={join} />
              </li>
            ))}
          </ul>
        )}
      </Columns>

      {commentsOn && (
        <Dialog title={TEXT.commentsTitle(commentsOn.organiser, commentsOn.comments.length)} closeHref={here} closeLabel={TEXT.close} narrow>
          {commentsOn.comments.length === 0 ? (
            <p className={ui.muted}>{TEXT.noComments}</p>
          ) : (
            <ul className={ui.rows}>
              {commentsOn.comments.map((c) => (
                <li key={c.id} className={styles.greyRow}>
                  <Thumb size={32} shape="round" />
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{c.by}</span>
                    <span className={styles.foot}>{c.text}</span>
                    <span className={hiring.sub}>{formatWhen(c.at, now)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form action={commentOnPost.bind(null, commentsOn.id, `${here}${join}comments=${commentsOn.id}`)} className={styles.searchRow}>
            <input name="comment" required maxLength={500} placeholder={TEXT.write} aria-label={TEXT.write} className={forms.input} />
            <button type="submit" className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
              {TEXT.post}
            </button>
          </form>
        </Dialog>
      )}
      {promo && (
        <Dialog
          title={`${promo.organiser}${state.organisers.find((o) => o.id === promo.organiserId)?.verified ? " ✓" : ""}`}
          subtitle={promoEvent ? `${promo.title.split(" · ")[0]} · ${promoEvent.title}` : promo.title}
          closeHref={here}
          closeLabel={TEXT.close}
        >
          <div className={styles.pair}>
            <span className={styles.fluid}>
              <Thumb size={320} height={420} shape="image" />
            </span>
            <div className={styles.promoActions}>
              <form action={likePost.bind(null, promo.id, promoHere)} className={styles.formFill}>
                <button type="submit" className={forms.bigButton} aria-pressed={promo.liked}>
                  {TEXT.likes((promo.reach?.likes ?? 0) + (promo.liked ? 1 : 0))}
                </button>
              </form>
              <Link href={`${here}${join}comments=${promo.id}`} scroll={false} className={forms.bigButton}>
                {`${TEXT.comment} · ${(promo.reach?.comments ?? 0) + promo.comments.length}`}
              </Link>
              <Link href={`${here}${join}share=${promo.id}`} scroll={false} className={forms.bigButton}>
                {TEXT.share}
              </Link>
              {promo.eventId && (
                <Link href={routes.vendorArea.event(promo.eventId)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                  {TEXT.viewEvent}
                </Link>
              )}
            </div>
          </div>
        </Dialog>
      )}
      {sharing && (
        <Dialog title={TEXT.shareTitle(sharing.title)} subtitle={TEXT.shareSub} closeHref={here} closeLabel={TEXT.close} narrow>
          <span className={styles.fluid}>
            <Thumb size={520} height={180} shape="image" />
          </span>
          {sharing.eventId && <CopyLink path={routes.event(sharing.eventId)} label={TEXT.copy} copied={TEXT.copied} />}
          <ul className={ui.chipList}>
            {TEXT.shareTo.map((s) => (
              <li key={s} className={`${styles.pill} ${styles.pillGrey}`}>
                {s}
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </>
  );
}

// A booking's money in a word (F06): overdue, due within two weeks, or the deposit already in.
function moneyChip(b: ProviderBooking, now: Date): [string, ChipTone] | null {
  const next = stillDue(b)[0];
  const state = next ? paymentState(next, now) : null;
  if (state === "overdue") return [TEXT.overdue, "danger"];
  if (next && state === "due") return [next.label === "Deposit" ? TEXT.depositDue : TEXT.instalmentDue, "warn"];
  return b.payments.some((p) => p.receivedAt) ? [TEXT.depositIn, "good"] : null;
}

// One feed post (V06): a picture with its tag, the title, who and when, and its buttons.
function PostCard({ post: p, state, now, here, join }: { post: HomePost; state: ProviderState; now: Date; here: string; join: string }) {
  return (
    <article className={styles.feedCard} aria-labelledby={`post-${p.id}`}>
      {p.kind === "promo" ? (
        <Link href={`${here}${join}promo=${p.id}`} scroll={false} className={`${styles.tile} ${styles.fluid}`} aria-label={TEXT.openPromo(p.title)}>
          <Thumb size={330} height={150} shape="image" />
          <span className={`${styles.tileTag} ${styles.pill}`}>{p.tag}</span>
        </Link>
      ) : (
        <span className={`${styles.tile} ${styles.fluid}`}>
          <Thumb size={330} height={150} shape="image" />
          <span className={`${styles.tileTag} ${styles.pill}`}>{p.tag}</span>
        </span>
      )}
      <div className={styles.feedText}>
        <span id={`post-${p.id}`} className={ui.rowTitle}>
          {p.title}
        </span>
        <span className={hiring.sub}>{p.detail}</span>
        <span className={styles.feedLine}>
          <strong>{`${state.organisers.find((o) => o.id === p.organiserId)?.verified ? "✓ " : ""}${p.organiser}`}</strong>
          <span>{p.side || formatWhen(p.at, now)}</span>
        </span>
      </div>
      <div className={styles.feedButtons}>
        {p.kind === "stalls" && p.stallId ? (
          <Link href={routes.vendorArea.applyForStall(p.stallId)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
            {TEXT.apply}
          </Link>
        ) : p.kind === "job" && p.jobId ? (
          <Link href={routes.vendorArea.job(p.jobId)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
            {TEXT.seeJob}
          </Link>
        ) : (
          <>
            <form action={likePost.bind(null, p.id, here)}>
              <button type="submit" className={`${ui.rowButton} ${ui.rowButtonWhite}`} aria-pressed={p.liked}>
                {p.liked ? TEXT.liked : TEXT.like}
              </button>
            </form>
            <Link href={`${here}${join}comments=${p.id}`} scroll={false} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
              {p.comments.length ? `${TEXT.comment} · ${p.comments.length}` : TEXT.comment}
            </Link>
          </>
        )}
        <Link href={`${here}${join}share=${p.id}`} scroll={false} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
          {TEXT.share}
        </Link>
      </div>
    </article>
  );
}
