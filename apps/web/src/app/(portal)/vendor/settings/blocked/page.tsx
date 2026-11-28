import type { Metadata } from "next";
import Link from "next/link";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { daysFrom, formatShortDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { unblock } from "../actions";

export const metadata: Metadata = { title: "Blocked users" };

const TEXT = {
  title: "Blocked users",
  lede: "They cannot message you or send booking requests",
  back: "Back to settings",
  unblock: "Unblock",
  unblockWho: (name: string) => `Unblock ${name}`,
  blockedOn: (when: string) => `Organiser · blocked ${when}`,
  justNow: "just now",
  none: "You haven't blocked anyone.",
  stayTitle: "Bookings stay",
  stayText: "Blocking does not cancel bookings. To end one, cancel it under its terms.",
  emptyTitle: "Blocked users aren't available yet",
  emptyText: "They need the backend (EN-03), which isn't connected yet.",
} as const;

// Blocked users (Figma V103, F103): organisers the provider blocked, with Unblock.
export default async function BlockedPage() {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  if (!state) return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />;
  const now = new Date();
  const list = [...state.blocked].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Columns
      aside={
        <Panel title={TEXT.stayTitle}>
          <p className={styles.foot}>{TEXT.stayText}</p>
        </Panel>
      }
    >
      <header className={hiring.pageHead}>
        <div className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
          <p className={hiring.lede}>{TEXT.lede}</p>
        </div>
        <Link href={routes.vendorArea.settings} className={ui.rowButton}>
          {TEXT.back}
        </Link>
      </header>
      {list.length === 0 ? (
        <p className={ui.muted}>{TEXT.none}</p>
      ) : (
        <ul className={ui.rows}>
          {list.map((b) => (
            <li key={b.id} className={styles.bigRow}>
              <Thumb size={40} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{b.name}</span>
                <span className={hiring.sub}>{TEXT.blockedOn(now.getTime() - Date.parse(b.at) < 3_600_000 && daysFrom(now, b.at) === 0 ? TEXT.justNow : formatShortDate(b.at))}</span>
              </span>
              <form action={unblock.bind(null, b.id)}>
                <button type="submit" className={ui.rowButton} aria-label={TEXT.unblockWho(b.name)}>
                  {TEXT.unblock}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Columns>
  );
}
