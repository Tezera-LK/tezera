import type { Metadata } from "next";
import Link from "next/link";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import Thumb from "@/components/portal/Thumb";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { formatCount } from "@/lib/format";
import { routes } from "@/lib/routes";
import { setJoined } from "../actions";

export const metadata: Metadata = { title: "Browse communities" };

const TEXT = {
  title: "Browse communities",
  lede: "Topic and city communities",
  tabsLabel: "Which communities",
  tabs: { topics: "Topics", cities: "Cities" },
  search: "Search communities",
  members: (n: string) => `${n} members`,
  joined: "Joined ✓",
  join: "Join",
  none: "No communities match.",
  startTitle: "Start a city community?",
  startText: "Communities are created by Tezera admins for now. Ask us for one.",
  ask: "Ask the Tezera team",
  emptyTitle: "No communities yet",
  emptyText: "Communities show up here once the backend is connected.",
} as const;

// Browse communities (Figma V96, F96): topic and city communities to join or leave.
export default async function BrowseCommunitiesPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const q = await searchParams;
  if (!state) return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />;
  const type = q.type === "cities" ? "cities" : "topics";
  const words = (q.q ?? "").trim().toLowerCase();
  const here = `${routes.vendorArea.communities}?type=${type}${words ? `&q=${encodeURIComponent(words)}` : ""}`;
  const list = state.communities.filter((c) => (type === "cities" ? c.about.startsWith("City") : !c.about.startsWith("City"))).filter((c) => !words || c.name.toLowerCase().includes(words));
  const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : formatCount(n));

  return (
    <Columns
      aside={
        <Panel title={TEXT.startTitle}>
          <p className={styles.foot}>{TEXT.startText}</p>
          <Link href={routes.vendorArea.messages} className={ui.wideButton}>
            {TEXT.ask}
          </Link>
        </Panel>
      }
    >
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.lede}</p>
      </header>
      <div className={hiring.cardHead}>
        <Tabs label={TEXT.tabsLabel} current={type} tabs={(["topics", "cities"] as const).map((t) => ({ key: t, label: TEXT.tabs[t], href: `${routes.vendorArea.communities}?type=${t}` }))} />
        <form action={routes.vendorArea.communities} role="search">
          <input type="hidden" name="type" value={type} />
          <input type="search" name="q" defaultValue={q.q ?? ""} placeholder={TEXT.search} aria-label={TEXT.search} className={`${forms.input} ${styles.whiteField}`} />
        </form>
      </div>
      {list.length === 0 ? (
        <p className={ui.muted}>{TEXT.none}</p>
      ) : (
        <ul className={styles.feed}>
          {list.map((c) => (
            <li key={c.id} className={styles.post}>
              <span className={styles.inline}>
                <Thumb size={44} radius={12} />
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{c.name}</span>
                  <span className={hiring.sub}>{TEXT.members(compact(c.members))}</span>
                </span>
              </span>
              <form action={setJoined.bind(null, c.id, !c.joined, here)}>
                <button type="submit" className={`${ui.rowButton} ${c.joined ? "" : ui.rowButtonPrimary}`} aria-pressed={c.joined}>
                  {c.joined ? TEXT.joined : TEXT.join}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Columns>
  );
}
