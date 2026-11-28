import type { Metadata } from "next";
import ButtonLink from "@/components/portal/ButtonLink";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import PageHeader from "@/components/portal/PageHeader";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import shell from "@/components/portal/PortalShell.module.css";
import ProviderNotifications from "@/components/portal/provider/ProviderNotifications";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireSession } from "@/lib/auth/session";
import { filterNotifications, getNotifications } from "@/lib/data/portal";
import { getProviderNotifications, getProviderState } from "@/lib/data/provider";
import type { NotificationType, PortalNotification } from "@/lib/data/portal-types";
import { daysFrom, formatWhen } from "@/lib/format";
import { routes } from "@/lib/routes";
import styles from "./notifications.module.css";

export const metadata: Metadata = { title: "Notifications" };

// Words on this page, in one place for the translation files (EN-07-T4).
const TEXT = {
  title: "Notifications",
  description: "Bookings, quotes, stalls, messages and your account",
  markAllRead: "Mark all read",
  settings: "Settings",
  tabsLabel: "Notification types",
  today: "Today",
  earlier: "Earlier",
  unread: "Unread",
  note: "You also get these as push notifications and by email. Urgent ones, like a cancelled booking, also come by SMS (proposed).",
  remindersTitle: "Reminders and activity",
  remindersBody: "Due dates, event reminders, likes and new followers. Each type can be switched off.",
  notificationSettings: "Notification settings",
  emptyTitle: "No notifications here",
  emptyAll: "Bookings, quotes, stalls, messages and account news will show up here.",
  emptyTab: "Nothing of this type yet. Try All.",
} as const;

// The tabs, in Figma's order; "all" has no ?type=
const TABS: { key: NotificationType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "bookings", label: "Bookings and quotes" },
  { key: "stalls", label: "Stalls" },
  { key: "messages", label: "Messages" },
  { key: "account", label: "Account" },
];

// Reads ?type= and ignores anything that isn't one of the tabs.
function pickType(value: string | string[] | undefined): NotificationType | undefined {
  const types: string[] = ["bookings", "stalls", "messages", "account"];
  return typeof value === "string" && types.includes(value) ? (value as NotificationType) : undefined;
}

// Every notification for the signed-in user (Figma O06), split into Today and Earlier, with tabs
// to show one type. Shared by every role; vendors and freelancers get their own tabs (V23, F23).
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const session = await requireSession();
  const now = new Date();
  if (session.role === "vendor" || session.role === "freelancer") {
    const state = await getProviderState(session);
    const raw = (await searchParams).type;
    if (state) return <ProviderNotifications state={state} list={await getProviderNotifications(session)} now={now} type={typeof raw === "string" ? raw : undefined} />;
  }
  const type = pickType((await searchParams).type);
  const shown = filterNotifications(await getNotifications(session), type);
  const today = shown.filter((n) => daysFrom(now, n.at) === 0);
  const earlier = shown.filter((n) => daysFrom(now, n.at) !== 0);

  const aside = (
    <Panel title={TEXT.remindersTitle}>
      <p className={styles.panelText}>{TEXT.remindersBody}</p>
      {/* the settings page is in the Account slice (O32) */}
      <MaybeLink className={ui.wideButton}>{TEXT.notificationSettings}</MaybeLink>
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <PageHeader
        title={TEXT.title}
        description={TEXT.description}
        actions={
          <>
            {/* marking as read needs the backend (EN-09) */}
            <ButtonLink>{TEXT.markAllRead}</ButtonLink>
            <ButtonLink>{TEXT.settings}</ButtonLink>
          </>
        }
      />

      <Tabs
        label={TEXT.tabsLabel}
        current={type ?? "all"}
        tabs={TABS.map((tab) => ({
          ...tab,
          href: tab.key === "all" ? routes.notifications : `${routes.notifications}?type=${tab.key}`,
        }))}
      />

      {shown.length === 0 ? (
        <EmptyState title={TEXT.emptyTitle} description={type ? TEXT.emptyTab : TEXT.emptyAll} />
      ) : (
        <>
          <Group title={TEXT.today} items={today} now={now} />
          <Group title={TEXT.earlier} items={earlier} now={now} />
          <p className={ui.note}>{TEXT.note}</p>
        </>
      )}
    </Columns>
  );
}

// One block of rows under a heading ("Today", "Earlier"); nothing at all when it's empty.
function Group({ title, items, now }: { title: string; items: PortalNotification[]; now: Date }) {
  if (items.length === 0) return null;
  return (
    <section className={styles.group} aria-label={title}>
      <h2 className={ui.sectionTitle}>{title}</h2>
      <ul className={ui.rows}>
        {items.map((n) => (
          <li key={n.id} className={`${styles.item} ${n.unread ? styles.unread : ""}`}>
            <span className={styles.dot} aria-hidden="true" />
            <div className={ui.rowText}>
              <p className={ui.rowTitle}>
                {n.unread && <span className={shell.srOnly}>{`${TEXT.unread}: `}</span>}
                {n.title}
              </p>
              <p className={ui.muted}>{n.detail}</p>
              <p className={ui.muted}>{`${n.kind} · ${formatWhen(n.at, now)}`}</p>
            </div>
            {/* each button opens a screen from a later slice (bookings O22, quotes O21, stalls O13) */}
            <MaybeLink href={n.action.href} className={ui.rowButton}>
              {n.action.label}
            </MaybeLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
