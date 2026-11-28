import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Top providers" };

const TEXT = {
  title: "Top providers",
  lede: "Ranked by rank score in each category and district",
  howItWorks: "How rank works",
  you: "you",
  yourPosition: "Your position",
  toTop: (n: number) => `${n} points to Top Rated. Your next 2 reviews count the most.`,
  reviews: "Reviews",
  otherBoards: "Other boards you are on",
  emptyTitle: "No leaderboard yet",
  emptyText: "Leaderboards show up once providers in your category have reviews.",
} as const;

// Scores for the sample board, rank 1 first; the provider's own comes from their profile.
const SCORES = [94, 91, 82, 0, 74, 61];

// Top providers (Figma V40, F40): the leaderboard for the provider's category and first district.
export default async function LeaderboardPage() {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  if (!state) return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />;
  const p = state.profile;
  const others = p.districts.slice(1).map((d, i) => ({ board: `${p.category} · ${d}`, rank: i === 0 ? 2 : 6 }));

  const aside = (
    <>
      <Panel title={TEXT.yourPosition} link={{ label: TEXT.reviews, href: routes.vendorArea.reviews }}>
        <div className={hiring.cardHead}>
          <p className={hiring.pageTitle}>{p.rank ? `#${p.rank}` : "–"}</p>
          <Chip tone="soft">{p.badge}</Chip>
        </div>
        <p className={styles.foot}>{`${p.category} · ${p.districts[0]}`}</p>
        <p className={styles.foot}>{TEXT.toTop(Math.max(0, 85 - p.rankScore))}</p>
      </Panel>
      {others.length > 0 && (
        <Panel title={TEXT.otherBoards}>
          {others.map((o) => (
            <div key={o.board} className={hiring.whiteRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{o.board}</span>
                <span className={hiring.sub}>{`#${o.rank} · ${p.badge}`}</span>
              </span>
            </div>
          ))}
        </Panel>
      )}
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHead}>
        <div className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
          <p className={hiring.lede}>{TEXT.lede}</p>
        </div>
        <Link href={`${routes.vendorArea.reviews}?dialog=how`} className={ui.rowButton}>
          {TEXT.howItWorks}
        </Link>
      </header>
      <div className={styles.pills}>
        <span className={`${styles.pill} ${styles.pillOn}`}>{p.category}</span>
        <span className={`${styles.pill} ${styles.pillOn}`}>{p.districts[0]}</span>
      </div>
      <ol className={ui.rows}>
        {state.leaderboard.map((row, i) => (
          <li key={row.rank} className={`${styles.bigRow} ${row.you ? styles.youRow : ""}`}>
            <Thumb size={40} shape="round" />
            <span className={ui.rowText}>
              <span className={styles.bigRowTitle}>{`${row.rank} · ${row.name}${row.you ? ` · ${TEXT.you}` : ""}`}</span>
              <span className={hiring.sub}>{`${row.badge} · ★ ${row.rating} · ${row.reviews} reviews`}</span>
            </span>
            <span className={styles.amount}>{row.you ? p.rankScore : (SCORES.at(i) ?? 50)}</span>
          </li>
        ))}
      </ol>
    </Columns>
  );
}
