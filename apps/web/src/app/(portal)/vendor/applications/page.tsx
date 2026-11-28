import type { Metadata } from "next";
import Link from "next/link";
import Chip, { type ChipTone } from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { OpenJob, ProviderState } from "@/lib/data/provider-types";
import { formatCount, formatShortDate } from "@/lib/format";
import { day, lkr, organiserName } from "@/lib/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "My applications" };

const TEXT = {
  title: "My applications",
  lede: "Quotes you sent to job posts",
  tabsLabel: "Which applications",
  tabs: { all: "All", waiting: "Waiting", accepted: "Accepted", "not-chosen": "Not chosen", saved: "Saved" },
  waiting: "Waiting",
  decided: "Decided",
  savedTitle: "Saved posts",
  none: "Nothing here yet.",
  thisYear: "This year",
  chosenShare: "of quotes chosen",
  sent: "Sent",
  chosen: "Chosen",
  chip: { waiting: "Waiting", accepted: "Accepted", "not-chosen": "Not chosen", withdrawn: "Withdrawn" },
  waitingLine: (who: string, amount: string, closes: string) => `${who} · quote ${amount} · closes ${closes}`,
  acceptedLine: (who: string, amount: string) => `${who} · ${amount} · booking confirmed`,
  notChosenLine: (on: string) => `Post closed ${on}`,
  withdrawnLine: (on: string) => `You withdrew on ${on}`,
  savedLine: (who: string, closes: string) => `${who} · quotes by ${closes}`,
  emptyTitle: "No applications yet",
  emptyText: "Quotes you send to job posts show up here.",
} as const;

type Tab = keyof typeof TEXT.tabs;
const TABS = Object.keys(TEXT.tabs) as Tab[];

const TONE: Record<keyof typeof TEXT.chip, ChipTone> = { waiting: "neutral", accepted: "good", "not-chosen": "danger", withdrawn: "neutral" };

// My applications (Figma V59, F59): quotes sent to job posts, waiting and decided, and saved posts.
export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const asked = (await searchParams).tab;
  const tab: Tab = TABS.find((t) => t === asked) ?? "all";

  if (!state) {
    return (
      <>
        <Header />
        <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />
      </>
    );
  }

  const applied = state.jobs.filter((j) => j.application).sort((a, b) => (b.application?.sentAt ?? "").localeCompare(a.application?.sentAt ?? ""));
  const of = (status: keyof typeof TEXT.chip) => applied.filter((j) => j.application?.status === status);
  const saved = state.jobs.filter((j) => j.saved);
  const count = (t: Tab) => (t === "all" ? applied.length : t === "saved" ? saved.length : of(t).length);
  const sentCount = applied.filter((j) => j.application?.status !== "withdrawn").length;
  const chosen = of("accepted").length;

  const sections: [string, OpenJob[]][] =
    tab === "all"
      ? [
          [TEXT.waiting, of("waiting")],
          [TEXT.decided, applied.filter((j) => j.application?.status !== "waiting")],
        ]
      : tab === "saved"
        ? [[TEXT.savedTitle, saved]]
        : [[TEXT.tabs[tab], of(tab)]];

  const aside = (
    <Panel title={TEXT.thisYear}>
      <p className={hiring.pageTitle}>{`${sentCount ? Math.round((chosen / sentCount) * 100) : 0}%`}</p>
      <p className={styles.foot}>{TEXT.chosenShare}</p>
      <div className={styles.pair}>
        <div className={styles.tintRow}>
          <span className={ui.rowText}>
            <span className={hiring.sub}>{TEXT.sent}</span>
            <span className={ui.rowTitle}>{formatCount(sentCount)}</span>
          </span>
        </div>
        <div className={styles.tintRow}>
          <span className={ui.rowText}>
            <span className={hiring.sub}>{TEXT.chosen}</span>
            <span className={ui.rowTitle}>{formatCount(chosen)}</span>
          </span>
        </div>
      </div>
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <Header />
      <Tabs
        label={TEXT.tabsLabel}
        current={tab}
        tabs={TABS.map((t) => ({ key: t, label: `${TEXT.tabs[t]} · ${formatCount(count(t))}`, href: t === "all" ? routes.vendorArea.applications : `${routes.vendorArea.applications}?tab=${t}` }))}
      />
      {sections.every(([, list]) => list.length === 0) && <p className={ui.muted}>{TEXT.none}</p>}
      {sections.map(([title, list]) =>
        list.length === 0 ? null : (
          <section key={title} className={`${styles.post}`} aria-label={title}>
            <h2 className={hiring.cardTitle}>{title}</h2>
            <ul className={ui.rows}>
              {list.map((j) => (
                <li key={j.id}>
                  <ApplicationRow job={j} state={state} saved={tab === "saved"} />
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </Columns>
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

function ApplicationRow({ job: j, state, saved }: { job: OpenJob; state: ProviderState; saved: boolean }) {
  const who = organiserName(state, j.organiserId);
  const a = j.application;
  if (saved || !a) {
    return (
      <Link href={routes.vendorArea.job(j.id)} className={styles.greyRow}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{j.title}</span>
          <span className={hiring.sub}>{TEXT.savedLine(who, day(j.quotesBy.slice(0, 10)))}</span>
        </span>
      </Link>
    );
  }
  const line = {
    waiting: TEXT.waitingLine(who, lkr(a.priceLkr), day(j.quotesBy.slice(0, 10))),
    accepted: TEXT.acceptedLine(who, lkr(a.priceLkr)),
    "not-chosen": TEXT.notChosenLine(formatShortDate(a.decidedAt ?? j.quotesBy)),
    withdrawn: TEXT.withdrawnLine(formatShortDate(a.decidedAt ?? a.sentAt)),
  }[a.status];
  const href = a.status === "waiting" || a.status === "withdrawn" ? routes.vendorArea.job(j.id) : routes.vendorArea.application(j.id);
  return (
    <Link href={href} className={styles.greyRow}>
      <span className={ui.rowText}>
        <span className={ui.rowTitle}>{j.title}</span>
        <span className={hiring.sub}>{line}</span>
      </span>
      <Chip tone={TONE[a.status]}>{TEXT.chip[a.status]}</Chip>
    </Link>
  );
}
