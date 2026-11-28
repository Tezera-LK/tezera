import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ThreadCard from "@/components/portal/provider/ThreadCard";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { day } from "@/lib/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Event board" };

const TEXT = {
  title: (event: string) => `${event} board`,
  lede: "For everyone going, working or selling at the event",
  newPost: "New post",
  // freelancers' boards call vendors and freelancers "Crew" (F97)
  filters: (vendor: boolean) => ({ all: "All", meetups: "Meetups", vendors: vendor ? "Vendors" : "Crew", organiser: "From the organiser" }),
  none: "No posts here yet.",
  event: "Event",
  openEvent: "Open event page",
} as const;

type Filter = keyof ReturnType<typeof TEXT.filters>;
const FILTERS: Filter[] = ["all", "meetups", "vendors", "organiser"];

// An event's board (Figma V97, F97): posts from the organiser, vendors and people going.
export default async function EventBoardPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ filter?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const { eventId } = await params;
  const state = await getProviderState(session);
  const event = state?.events.find((e) => e.id === eventId);
  if (!state || !event) notFound();
  const q = await searchParams;
  const filter: Filter = FILTERS.find((f) => f === q.filter) ?? "all";
  const names = TEXT.filters(state.kind === "vendor");
  const here = filter === "all" ? routes.vendorArea.board(event.id) : `${routes.vendorArea.board(event.id)}?filter=${filter}`;
  const now = new Date();
  const threads = state.threads
    .filter((t) => t.eventId === event.id)
    .filter((t) =>
      filter === "all" ? true : filter === "organiser" ? t.authorRole === "Organiser" : filter === "vendors" ? t.authorRole === "Vendor" || t.authorRole === "Freelancer" : t.authorRole === "Consumer",
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at));

  return (
    <Columns
      aside={
        <Panel title={TEXT.event}>
          <div className={hiring.whiteRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{event.title}</span>
              <span className={hiring.sub}>{day(event.date)}</span>
            </span>
          </div>
          <Link href={routes.vendorArea.event(event.id)} className={ui.wideButton}>
            {TEXT.openEvent}
          </Link>
        </Panel>
      }
    >
      <header className={hiring.pageHead}>
        <div className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{TEXT.title(event.title)}</h1>
          <p className={hiring.lede}>{TEXT.lede}</p>
        </div>
        <Link href={`${routes.vendorArea.community}?dialog=new`} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
          {TEXT.newPost}
        </Link>
      </header>
      <div className={styles.pills}>
        {FILTERS.map((f) => (
          <Link key={f} href={f === "all" ? routes.vendorArea.board(event.id) : `${routes.vendorArea.board(event.id)}?filter=${f}`} scroll={false} className={`${styles.pill} ${f === filter ? styles.pillOn : ""}`}>
            {names[f]}
          </Link>
        ))}
      </div>
      {threads.length === 0 ? (
        <p className={ui.muted}>{TEXT.none}</p>
      ) : (
        <ul className={ui.rows}>
          {threads.map((t) => (
            <li key={t.id}>
              <ThreadCard thread={t} where={TEXT.title(event.title)} back={here} now={now} />
            </li>
          ))}
        </ul>
      )}
    </Columns>
  );
}
