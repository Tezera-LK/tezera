import type { Metadata } from "next";
import Columns from "@/components/portal/Columns";
import Thumb from "@/components/portal/Thumb";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/settings/Settings.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { listConversations } from "@/lib/data/portal";
import { daysFrom, formatShortDate } from "@/lib/format";
import { unblock } from "../actions";

export const metadata: Metadata = { title: "Blocked users" };

const TEXT = {
  title: "Blocked users",
  lede: "They can't message you, send quotes or apply for your stalls",
  line: (kind: string, when: string) => `${kind} · blocked ${when}`,
  today: "today",
  unblock: "Unblock",
  unblockWho: (name: string) => `Unblock ${name}`,
  none: "You haven't blocked anyone.",
  stayTitle: "Bookings stay",
  stayText: "Blocking doesn't cancel a booking. Use Report if something is wrong.",
} as const;

// Blocked users (Figma O97), from Settings.
export default async function BlockedUsersPage() {
  const session = await requireRole("organiser");
  const now = new Date();
  const blocked = (await listConversations(session)).filter((c) => c.blocked);

  const aside = (
    <div className={hiring.notePanel}>
      <p className={hiring.notePanelTitle}>{TEXT.stayTitle}</p>
      <p className={tables.panelText}>{TEXT.stayText}</p>
    </div>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.lede}</p>
      </header>
      {blocked.length === 0 ? (
        <p className={ui.muted}>{TEXT.none}</p>
      ) : (
        <ul className={ui.rows}>
          {blocked.map((c) => (
            <li key={c.id} className={styles.personRow}>
              <Thumb size={40} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{c.name}</span>
                <span className={styles.small}>
                  {TEXT.line(c.kind, c.blockedAt ? (daysFrom(now, c.blockedAt) === 0 ? TEXT.today : formatShortDate(c.blockedAt)) : "")}
                </span>
              </span>
              <form action={unblock.bind(null, c.id)}>
                <button type="submit" className={ui.rowButton} aria-label={TEXT.unblockWho(c.name)}>
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
