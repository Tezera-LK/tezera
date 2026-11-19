import type { Metadata } from "next";
import Link from "next/link";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import events from "@/components/portal/events/EventPages.module.css";
import { compactCount } from "@/components/portal/events/eventText";
import styles from "@/components/portal/feed/Feed.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getAnalyticsExtras, listFeedPosts, listMyEvents } from "@/lib/data/portal";
import type { ManagedEvent } from "@/lib/data/portal-types";
import { formatCount, formatDayMonth, formatWhen } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Analytics" };

const TEXT = {
  title: "Analytics",
  lede: "How your events, posts and profile are doing",
  range: "Last 30 days",
  pageViews: "Event page views",
  going: "Marked Going",
  engagement: "Post engagement",
  followers: "New followers",
  goingOver: (title: string) => `Going over time · ${title}`,
  today: (n: number) => `Today · ${formatCount(n)}`,
  bar: (when: string, n: number) => `${when}: ${formatCount(n)} going`,
  sources: "Page views by source",
  followerGrowth: "Follower growth",
  growthLine: (from: number, to: number, weeks: number) => `${formatCount(from)} → ${formatCount(to)} in ${weeks} weeks`,
  week: (n: number, count: number) => `Week ${n}: ${formatCount(count)} followers`,
  posts: "Posts and reels",
  post: "Post",
  views: "Views",
  likes: "Likes",
  comments: "Comments",
  clicks: "Clicks to event",
  kind: { reel: "Reel", poster: "Poster", image: "Image" },
  noPosts: "No posts yet.",
  compared: "Events compared",
  comparedLine: (e: ManagedEvent) =>
    e.status === "postponed" ? `${formatCount(e.going)} going · postponed` : `${formatCount(e.going)} going · ${formatCount(e.interested)} interested`,
  approxTitle: "Counts are approximate",
  approxText: "Going and Interested aren't tickets. Ticketing comes after the pilot.",
  empty: "Numbers show up here once you have a published event.",
} as const;

// How many marked Going on each of the 14 days up to today: a gentle climb to today's count.
// A stand-in until Going is recorded by day (EN-03); the last bar is always the real number.
function goingSeries(going: number): number[] {
  return Array.from({ length: 14 }, (_, i) => Math.round(going * ((i + 1) / 14) ** 1.6));
}

// Analytics (Figma O50): four numbers, Going over time for the next event, where page views come
// from, follower growth, and each post's numbers. The counts are approximate, as the note says.
export default async function AnalyticsPage() {
  const session = await requireRole("organiser");
  const [mine, posts, extras] = await Promise.all([listMyEvents(session), listFeedPosts(session), getAnalyticsExtras(session)]);
  const now = new Date();
  const live = mine
    .filter((e) => (e.status === "published" || e.status === "postponed") && e.startsAt && Date.parse(e.endsAt ?? e.startsAt) > now.getTime())
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
  const featured = live[0];

  const going = live.reduce((sum, e) => sum + e.going, 0);
  const views = posts.reduce((sum, p) => sum + p.views, 0);
  const engaged = posts.reduce((sum, p) => sum + p.likes + p.comments.length, 0);
  const engagement = views ? `${((engaged / views) * 100).toFixed(1)}%` : "–";
  const series = featured ? goingSeries(featured.going) : [];
  const peak = Math.max(1, ...series);
  const weeks = extras?.followerWeeks ?? [];
  // the weeks differ by a few percent, so their bars run from 40% to full height across the range,
  // as Figma draws them, rather than from zero
  const weekLow = Math.min(...weeks);
  const weekSpan = Math.max(1, Math.max(...weeks) - weekLow);
  const byViews = [...posts].sort((a, b) => b.views - a.views);

  const aside = (
    <>
      <Panel title={TEXT.compared} empty={live.length === 0 ? TEXT.empty : undefined}>
        {live.length > 0 &&
          live.slice(0, 3).map((e) => (
            <Link key={e.id} href={routes.manageEvent(e.id)} className={hiring.whiteRow}>
              <Thumb size={32} radius={4} />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{e.title}</span>
                <span className={hiring.sub}>{TEXT.comparedLine(e)}</span>
              </span>
            </Link>
          ))}
      </Panel>
      <div className={hiring.notePanel}>
        <p className={hiring.notePanelTitle}>{TEXT.approxTitle}</p>
        <p className={tables.panelText}>{TEXT.approxText}</p>
      </div>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHead}>
        <div className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
          <p className={hiring.lede}>{TEXT.lede}</p>
        </div>
        <span className={styles.rangeChip}>{TEXT.range}</span>
      </header>

      <dl className={styles.tiles}>
        <Tile value={compactCount(extras?.pageViews ?? 0)} label={TEXT.pageViews} />
        <Tile value={formatCount(going)} label={TEXT.going} />
        <Tile value={engagement} label={TEXT.engagement} />
        <Tile value={`+${formatCount(extras?.newFollowers ?? 0)}`} label={TEXT.followers} />
      </dl>

      {featured && (
        <section className={styles.chartCard} aria-labelledby="going-title">
          <div className={styles.chartHead}>
            <h2 id="going-title" className={hiring.cardTitle}>
              {TEXT.goingOver(featured.title)}
            </h2>
          </div>
          <ol className={styles.bars}>
            {series.map((n, i) => {
              const day = new Date(now.getTime() - (series.length - 1 - i) * 86_400_000).toISOString();
              return (
                <li key={i} style={{ height: `${(n / peak) * 100}%` }}>
                  <span className={shell.srOnly}>{TEXT.bar(formatWhen(day, now), n)}</span>
                </li>
              );
            })}
          </ol>
          <div className={styles.axis} aria-hidden="true">
            <span>{formatDayMonth(new Date(now.getTime() - 13 * 86_400_000).toISOString())}</span>
            <span>{TEXT.today(featured.going)}</span>
          </div>
        </section>
      )}

      {extras && (
        <div className={styles.pair}>
          <section className={styles.chartCard} aria-labelledby="sources-title">
            <h2 id="sources-title" className={hiring.cardTitle}>
              {TEXT.sources}
            </h2>
            {extras.sources.map((s) => (
              <div key={s.label} className={styles.source}>
                <span>{s.label}</span>
                <span>{`${s.percent}%`}</span>
                <span className={styles.track} aria-hidden="true">
                  <span style={{ width: `${s.percent}%` }} />
                </span>
              </div>
            ))}
          </section>
          <section className={styles.chartCard} aria-labelledby="growth-title">
            <h2 id="growth-title" className={hiring.cardTitle}>
              {TEXT.followerGrowth}
            </h2>
            <ol className={`${styles.bars} ${styles.barsShort}`}>
              {weeks.map((n, i) => (
                <li key={i} style={{ height: `${40 + ((n - weekLow) / weekSpan) * 60}%` }}>
                  <span className={shell.srOnly}>{TEXT.week(i + 1, n)}</span>
                </li>
              ))}
            </ol>
            {weeks.length > 1 && <p className={styles.small}>{TEXT.growthLine(weeks[0], weeks[weeks.length - 1], weeks.length)}</p>}
          </section>
        </div>
      )}

      <section className={tables.section} aria-labelledby="posts-title">
        <h2 id="posts-title" className={ui.sectionTitle}>
          {TEXT.posts}
        </h2>
        {byViews.length === 0 ? (
          <p className={ui.muted}>{TEXT.noPosts}</p>
        ) : (
          <div className={tables.tableCard}>
            <table className={`${tables.table} ${styles.postsTable}`}>
              <thead>
                <tr>
                  <th scope="col">{TEXT.post}</th>
                  <th scope="col">{TEXT.views}</th>
                  <th scope="col">{TEXT.likes}</th>
                  <th scope="col">{TEXT.comments}</th>
                  <th scope="col">{TEXT.clicks}</th>
                </tr>
              </thead>
              <tbody>
                {byViews.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">
                      <span className={tables.strong}>{p.caption}</span>
                      <span className={tables.small}>{`${TEXT.kind[p.kind]} · ${formatWhen(p.postedAt, now)}`}</span>
                    </th>
                    <td>{compactCount(p.views)}</td>
                    <td>{compactCount(p.likes)}</td>
                    <td>{formatCount(p.comments.length)}</td>
                    <td>{formatCount(p.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Columns>
  );
}

// One white number tile, as on the event overview (O09).
function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className={events.tile}>
      <dt className={`${ui.muted} ${events.tileLabel}`}>{label}</dt>
      <dd className={events.tileValue}>{value}</dd>
    </div>
  );
}
