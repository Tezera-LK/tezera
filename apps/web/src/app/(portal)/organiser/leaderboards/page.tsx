import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import styles from "@/components/portal/reviews/Reviews.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getLeaderboard, getMyOrganiserProfile, listOrganiserRanks } from "@/lib/data/portal";
import { formatCount } from "@/lib/format";
import { DISTRICTS, PROVIDER_CATEGORIES } from "@/lib/hiring";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Leaderboards" };

const TEXT = {
  title: "Leaderboards",
  lede: "Rank orders search results. Tiers: New, Rising and Top Rated.",
  organisers: "Top organisers",
  providers: "Top providers",
  district: "District",
  category: "Category",
  allDistricts: "All districts",
  show: "Show",
  rank: "#",
  name: "Name",
  rating: "Rating",
  tier: "Tier",
  you: (name: string) => `${name} (you)`,
  ratingLine: (rating: number, reviews: number) => `${rating} · ${formatCount(reviews)} reviews`,
  none: "Nobody ranked here yet.",
  yourRank: "Your rank",
  rankLine: "among organisers · up 2 this month",
  howTitle: "How rank works",
  howText: "Rating, number of reviews, events that went ahead as planned and paying providers on time. Newer reviews count more.",
} as const;

const tone = (tier: string) => (tier === "Top Rated" ? "strong" : tier === "Rising" ? "soft" : "neutral");

// Leaderboards (Figma O31): top organisers, with the signed-in one marked, and the top providers
// in a category and district. Each table's filters are a small GET form.
export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<{ district?: string; category?: string; area?: string }> }) {
  const session = await requireRole("organiser");
  const query = await searchParams;
  const district = DISTRICTS.includes(query.district ?? "") ? query.district! : "";
  const category = PROVIDER_CATEGORIES.includes(query.category ?? "") ? query.category! : "Photography";
  const area = DISTRICTS.includes(query.area ?? "") ? query.area! : "Colombo";
  const [organisers, providers, profile] = await Promise.all([
    listOrganiserRanks(session, district),
    getLeaderboard(session, category, area),
    getMyOrganiserProfile(session),
  ]);

  const aside = (
    <>
      <Panel title={TEXT.yourRank}>
        <p className={styles.bigNumber}>{profile?.rank ? `#${profile.rank}` : "–"}</p>
        <p className={tables.small}>{TEXT.rankLine}</p>
      </Panel>
      <Panel title={TEXT.howTitle}>
        <p className={tables.panelText}>{TEXT.howText}</p>
      </Panel>
    </>
  );

  // keeps the other table's filter when one changes
  const keep = (name: string, value: string) => <input type="hidden" name={name} value={value} />;

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.lede}</p>
      </header>

      <section className={tables.section} aria-labelledby="org-title">
        <div className={tables.sectionHead}>
          <h2 id="org-title" className={ui.sectionTitle}>
            {TEXT.organisers}
          </h2>
          <form action={routes.leaderboards} className={styles.filterForm}>
            {keep("category", category)}
            {keep("area", area)}
            <label className={shell.srOnly} htmlFor="org-district">
              {TEXT.district}
            </label>
            <select id="org-district" name="district" defaultValue={district} className={styles.pillSelect}>
              <option value="">{TEXT.allDistricts}</option>
              {DISTRICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <button type="submit" className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
              {TEXT.show}
            </button>
          </form>
        </div>
        <RankTable
          rows={organisers.map((o) => ({
            key: o.name,
            rank: o.rank,
            name: o.you ? TEXT.you(profile?.name ?? o.name) : o.name,
            rating: TEXT.ratingLine(o.rating, o.reviews),
            tier: o.tier,
            you: o.you,
          }))}
        />
      </section>

      <section className={tables.section} aria-labelledby="prov-title">
        <div className={tables.sectionHead}>
          <h2 id="prov-title" className={ui.sectionTitle}>
            {TEXT.providers}
          </h2>
          <form action={routes.leaderboards} className={styles.filterForm}>
            {keep("district", district)}
            <label className={shell.srOnly} htmlFor="prov-category">
              {TEXT.category}
            </label>
            <select id="prov-category" name="category" defaultValue={category} className={styles.pillSelect}>
              {PROVIDER_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <label className={shell.srOnly} htmlFor="prov-area">
              {TEXT.district}
            </label>
            <select id="prov-area" name="area" defaultValue={area} className={styles.pillSelect}>
              {DISTRICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <button type="submit" className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
              {TEXT.show}
            </button>
          </form>
        </div>
        <RankTable
          rows={providers.map((p) => ({
            key: p.id,
            rank: p.rank ?? 0,
            name: p.name,
            href: routes.provider(p.id),
            rating: String(p.rating),
            tier: p.badge ?? "New",
            you: false,
          }))}
        />
      </section>
    </Columns>
  );
}

type Row = { key: string; rank: number; name: string; href?: string; rating: string; tier: string; you: boolean };

function RankTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <p className={ui.muted}>{TEXT.none}</p>;
  return (
    <div className={tables.tableCard}>
      <table className={`${tables.table} ${styles.rankTable}`}>
        <thead>
          <tr>
            <th scope="col">{TEXT.rank}</th>
            <th scope="col">{TEXT.name}</th>
            <th scope="col">{TEXT.rating}</th>
            <th scope="col">{TEXT.tier}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.you ? styles.youRow : undefined} aria-current={r.you ? "true" : undefined}>
              <td>
                <span className={tables.strong}>{r.rank}</span>
              </td>
              <th scope="row" className={tables.strong}>
                {r.href ? (
                  <Link href={r.href} className={styles.rowLink}>
                    {r.name}
                  </Link>
                ) : (
                  r.name
                )}
              </th>
              <td>{r.rating}</td>
              <td>
                <Chip tone={tone(r.tier)}>{r.tier}</Chip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
