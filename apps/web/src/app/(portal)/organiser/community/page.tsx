import type { Metadata } from "next";
import Link from "next/link";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import { compactCount } from "@/components/portal/events/eventText";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/people/People.module.css";
import ThreadList from "@/components/portal/people/ThreadList";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { listCommunities, listMyEvents, listThreads } from "@/lib/data/portal";
import { routes } from "@/lib/routes";
import { createThread, setMembership } from "./actions";

export const metadata: Metadata = { title: "Community" };

const TEXT = {
  title: "Community",
  lede: "Your events' boards and communities about topics and cities",
  newThread: "New thread",
  tabsLabel: "Boards or communities",
  boards: "Event boards",
  communities: "Communities",
  board: (title: string) => `${title} · board`,
  openBoard: "Open board ›",
  yourCommunities: "Your communities",
  communityLine: (members: number, posts: number) => `${compactCount(members)} members · ${posts} new posts`,
  open: "Open",
  noCommunities: "You haven't joined a community yet. Find one on the right.",
  latest: "Latest in your communities",
  yourBoards: "Your event boards",
  newPosts: (n: number) => `${n} new ${n === 1 ? "post" : "posts"}`,
  find: "Find communities",
  members: (n: number) => `${compactCount(n)} members`,
  join: "Join",
  joinWho: (name: string) => `Join ${name}`,
  nothingToFind: "You're in every community we have.",
} as const;

type Query = { tab?: string; dialog?: string; in?: string; error?: string };

// Community (Figma O24): the board of the organiser's next event and their communities, with
// their event boards and communities to join on the right. ?dialog=new opens New thread (O93).
export default async function CommunityPage({ searchParams }: { searchParams: Promise<Query> }) {
  const session = await requireRole("organiser");
  const query = await searchParams;
  const [threads, communities, mine] = await Promise.all([listThreads(session), listCommunities(session), listMyEvents(session)]);
  const now = new Date();
  const communitiesTab = query.tab === "communities";

  // the organiser's public events, the next one first, with their board threads
  const boards = mine
    .filter((e) => e.status === "published" || e.status === "postponed")
    .filter((e) => e.startsAt && Date.parse(e.endsAt ?? e.startsAt) > now.getTime())
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""))
    .map((e) => ({ event: e, threads: threads.filter((t) => t.eventId === e.id) }));
  const featured = boards[0];
  const joined = communities.filter((c) => c.joined);
  const toJoin = communities.filter((c) => !c.joined);
  const joinedIds = new Set(joined.map((c) => c.id));
  const communityThreads = threads.filter((t) => t.communityId && joinedIds.has(t.communityId));
  const here = communitiesTab ? `${routes.community}?tab=communities` : routes.community;

  const aside = (
    <>
      <Panel title={TEXT.yourBoards}>
        {boards.map((b) => (
          <Link key={b.event.id} href={routes.eventBoard(b.event.id)} className={hiring.whiteRow}>
            <Thumb size={32} radius={4} />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{b.event.title}</span>
              <span className={hiring.sub}>{TEXT.newPosts(b.threads.length)}</span>
            </span>
          </Link>
        ))}
      </Panel>
      <Panel title={TEXT.find} empty={toJoin.length === 0 ? TEXT.nothingToFind : undefined}>
        {toJoin.length > 0 &&
          toJoin.map((c) => (
            <div key={c.id} className={hiring.whiteRow}>
              <Thumb size={32} radius={4} />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{c.name}</span>
                <span className={hiring.sub}>{TEXT.members(c.members)}</span>
              </span>
              <form action={setMembership.bind(null, c.id, true, here)}>
                <button type="submit" className={ui.rowButton} aria-label={TEXT.joinWho(c.name)}>
                  {TEXT.join}
                </button>
              </form>
            </div>
          ))}
      </Panel>
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <header className={styles.headRow}>
          <div className={hiring.pageHeadText}>
            <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
            <p className={hiring.lede}>{TEXT.lede}</p>
          </div>
          <Link href={`${here}${communitiesTab ? "&" : "?"}dialog=new`} scroll={false} className={`${ui.rowButton} ${ui.rowButtonPrimary} ${hiring.bigPill}`}>
            {TEXT.newThread}
          </Link>
        </header>
        <nav className={styles.tabs} aria-label={TEXT.tabsLabel}>
          <Link href={routes.community} className={styles.tab} aria-current={!communitiesTab ? "page" : undefined}>
            {TEXT.boards}
          </Link>
          <Link href={`${routes.community}?tab=communities`} className={styles.tab} aria-current={communitiesTab ? "page" : undefined}>
            {TEXT.communities}
          </Link>
        </nav>

        {!communitiesTab && featured && (
          <section className={tables.section} aria-labelledby="board-title">
            <div className={tables.sectionHead}>
              <h2 id="board-title" className={ui.sectionTitle}>
                {TEXT.board(featured.event.title)}
              </h2>
              <Link href={routes.eventBoard(featured.event.id)} className={ui.textLink}>
                {TEXT.openBoard}
              </Link>
            </div>
            <ThreadList threads={featured.threads.slice(0, 3)} back={here} />
          </section>
        )}

        {communitiesTab && (
          <section className={tables.section} aria-labelledby="latest-title">
            <h2 id="latest-title" className={ui.sectionTitle}>
              {TEXT.latest}
            </h2>
            <ThreadList threads={communityThreads.slice(0, 5)} back={here} />
          </section>
        )}

        <section className={tables.section} aria-labelledby="communities-title">
          <h2 id="communities-title" className={ui.sectionTitle}>
            {TEXT.yourCommunities}
          </h2>
          {joined.length === 0 ? (
            <p className={ui.muted}>{TEXT.noCommunities}</p>
          ) : (
            <ul className={ui.rows}>
              {joined.map((c) => (
                <li key={c.id} className={styles.communityRow}>
                  <Thumb size={40} radius={4} />
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{c.name}</span>
                    <span className={hiring.sub}>{TEXT.communityLine(c.members, c.newPosts)}</span>
                  </span>
                  <Link href={routes.communityPage(c.id)} className={ui.rowButton} aria-label={`${TEXT.open} ${c.name}`}>
                    {TEXT.open}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Columns>
      {query.dialog === "new" && (
        <NewThreadDialog
          close={here}
          places={[
            ...boards.map((b) => ({ value: `event:${b.event.id}`, label: TEXT.board(b.event.title) })),
            ...joined.map((c) => ({ value: `community:${c.id}`, label: c.name })),
          ]}
          events={boards.map((b) => ({ id: b.event.id, title: b.event.title }))}
          picked={query.in}
          error={query.error}
        />
      )}
    </>
  );
}

const DIALOG = {
  title: "New thread",
  subtitle: "Post to a board or a community",
  postIn: "Post in",
  threadTitle: "Title",
  titlePlaceholder: "Parking update for Saturday",
  post: "Post",
  postPlaceholder: "The Green Path car park opens at 4 PM. Use Gate 2 if you're coming by tuk.",
  link: "Link an event (optional)",
  noLink: "No event",
  cancel: "Cancel",
  send: "Post thread",
  close: "Close",
  errors: { where: "Pick a board or a community you're in.", title: "Give the thread a title." } as Record<string, string>,
} as const;

// "New thread" (Figma O93).
function NewThreadDialog({
  close,
  places,
  events,
  picked,
  error,
}: {
  close: string;
  places: { value: string; label: string }[];
  events: { id: string; title: string }[];
  picked?: string;
  error?: string;
}) {
  return (
    <Dialog title={DIALOG.title} subtitle={DIALOG.subtitle} closeHref={close} closeLabel={DIALOG.close} narrow>
      <form action={createThread} className={tables.dialogForm}>
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.postIn}</span>
          <select name="in" defaultValue={picked ?? places[0]?.value} className={forms.input}>
            {places.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.threadTitle}</span>
          <input name="title" required placeholder={DIALOG.titlePlaceholder} className={forms.input} aria-invalid={error === "title" || undefined} />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.post}</span>
          <textarea name="body" rows={3} placeholder={DIALOG.postPlaceholder} className={`${forms.input} ${styles.textarea}`} />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.link}</span>
          <select name="link" defaultValue="" className={forms.input}>
            <option value="">{DIALOG.noLink}</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
        {error && DIALOG.errors[error] && <p className={forms.error}>{DIALOG.errors[error]}</p>}
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
