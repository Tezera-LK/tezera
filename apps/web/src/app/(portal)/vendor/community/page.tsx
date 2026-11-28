import type { Metadata } from "next";
import Link from "next/link";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import Dialog from "@/components/portal/events/Dialog";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ThreadCard from "@/components/portal/provider/ThreadCard";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { ProviderState } from "@/lib/data/provider-types";
import { formatCount } from "@/lib/format";
import { routes } from "@/lib/routes";
import { newThread } from "./actions";

export const metadata: Metadata = { title: "Community" };

const TEXT = {
  title: "Community",
  lede: "Event boards and topic or city communities",
  newThread: "New thread",
  tabsLabel: "Which threads",
  tabs: { following: "Following", boards: "Event boards", topics: "Topics and cities" },
  newest: "Newest",
  top: "Most upvoted",
  none: "No threads here yet. Start one with New thread.",
  eventBoards: "Event boards",
  boardLine: (n: number) => `Board · ${n} new posts`,
  noBoards: "Boards for events you're booked at or selling at show up here.",
  yours: "Your communities",
  members: (n: string) => `${n} members`,
  browse: "Browse communities",
  badge: "Your badge",
  badgeText: (role: string) => `Posts show ‘${role}’, plus ‘Verified’ once your documents are approved.`,
  emptyTitle: "No community yet",
  emptyText: "Event boards and communities show up here.",
  // V95
  close: "Close",
  newTitle: "New thread",
  newSub: (role: string) => `Posts show your ${role} and Verified badges`,
  postIn: "Post in",
  titleLabel: "Title",
  text: "Text",
  cancel: "Cancel",
  post: "Post thread",
  error: "Pick where to post and give it a title.",
} as const;

type Tab = keyof typeof TEXT.tabs;
const TABS = Object.keys(TEXT.tabs) as Tab[];

type Props = { searchParams: Promise<{ show?: string; sort?: string; dialog?: string; error?: string; title?: string; body?: string }> };

// "1.2k" for member counts
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : formatCount(n));

// The events the provider takes part in: booked at, or selling at.
function myEvents(state: ProviderState) {
  return state.events.filter((e) => state.bookings.some((b) => b.eventTitle === e.title && !b.cancelled) || state.stalls.some((s) => s.eventId === e.id && s.application?.status === "approved"));
}

// Community for vendors and freelancers (Figma V24, F24): threads from their event boards and
// communities, with New thread (V95) at ?dialog=new.
export default async function ProviderCommunityPage({ searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const q = await searchParams;
  if (!state) return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />;
  const tab: Tab = TABS.find((t) => t === q.show) ?? "following";
  const sort = q.sort === "top" ? "top" : "new";
  const here = `${routes.vendorArea.community}?show=${tab}&sort=${sort}`;
  const role = state.kind === "vendor" ? "Vendor" : "Freelancer";
  const boards = myEvents(state);
  const joined = state.communities.filter((c) => c.joined);
  const where = (eventId: string | null, communityId: string | null) =>
    eventId ? `${state.events.find((e) => e.id === eventId)?.title ?? "Event"} board` : (state.communities.find((c) => c.id === communityId)?.name ?? "Community");

  const threads = state.threads
    .filter((t) => {
      if (tab === "boards") return Boolean(t.eventId);
      if (tab === "topics") return Boolean(t.communityId);
      return (t.eventId && boards.some((e) => e.id === t.eventId)) || (t.communityId && joined.some((c) => c.id === t.communityId));
    })
    .sort((a, b) => (sort === "top" ? b.upvotes - a.upvotes : b.at.localeCompare(a.at)));
  const now = new Date();

  const aside = (
    <>
      <Panel title={TEXT.eventBoards} empty={boards.length === 0 ? TEXT.noBoards : undefined}>
        {boards.length > 0 &&
          boards.map((e) => (
            <Link key={e.id} href={routes.vendorArea.board(e.id)} className={hiring.whiteRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{e.title}</span>
                <span className={hiring.sub}>{TEXT.boardLine(e.boardPosts)}</span>
              </span>
            </Link>
          ))}
      </Panel>
      <Panel title={TEXT.yours} link={{ label: TEXT.browse, href: routes.vendorArea.communities }}>
        {joined.map((c) => (
          <div key={c.id} className={hiring.whiteRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{c.name}</span>
              <span className={hiring.sub}>{TEXT.members(compact(c.members))}</span>
            </span>
          </div>
        ))}
      </Panel>
      <Panel title={TEXT.badge}>
        <p className={styles.foot}>{TEXT.badgeText(role)}</p>
      </Panel>
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <header className={hiring.pageHead}>
          <div className={hiring.pageHeadText}>
            <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
            <p className={hiring.lede}>{TEXT.lede}</p>
          </div>
          <Link href={`${here}&dialog=new`} scroll={false} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
            {TEXT.newThread}
          </Link>
        </header>
        <div className={hiring.cardHead}>
          <Tabs label={TEXT.tabsLabel} current={tab} tabs={TABS.map((t) => ({ key: t, label: TEXT.tabs[t], href: `${routes.vendorArea.community}?show=${t}&sort=${sort}` }))} />
          <span className={styles.pills}>
            <Link href={`${routes.vendorArea.community}?show=${tab}&sort=new`} scroll={false} className={`${styles.pill} ${sort === "new" ? styles.pillOn : ""}`}>
              {TEXT.newest}
            </Link>
            <Link href={`${routes.vendorArea.community}?show=${tab}&sort=top`} scroll={false} className={`${styles.pill} ${sort === "top" ? styles.pillOn : ""}`}>
              {TEXT.top}
            </Link>
          </span>
        </div>
        {threads.length === 0 ? (
          <p className={ui.muted}>{TEXT.none}</p>
        ) : (
          <ul className={ui.rows}>
            {threads.map((t) => (
              <li key={t.id}>
                <ThreadCard thread={t} where={where(t.eventId, t.communityId)} back={here} now={now} preview={1} />
              </li>
            ))}
          </ul>
        )}
      </Columns>

      {q.dialog === "new" && (
        <Dialog title={TEXT.newTitle} subtitle={TEXT.newSub(role)} closeHref={here} closeLabel={TEXT.close} narrow>
          <form action={newThread} className={tables.dialogForm}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.postIn}</span>
              <select name="where" required defaultValue={joined[0]?.id ?? boards[0]?.id ?? ""} className={forms.input}>
                {joined.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                {boards.map((e) => (
                  <option key={e.id} value={e.id}>
                    {`${e.title} board`}
                  </option>
                ))}
              </select>
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.titleLabel}</span>
              <input name="title" required maxLength={120} defaultValue={q.title ?? ""} className={forms.input} />
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.text}</span>
              <textarea name="body" rows={4} defaultValue={q.body ?? ""} className={forms.input} />
            </label>
            {q.error === "fields" && <p className={forms.error}>{TEXT.error}</p>}
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
    </>
  );
}
