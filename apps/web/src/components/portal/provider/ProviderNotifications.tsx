import Link from "next/link";
import { markAllRead } from "@/app/(portal)/vendor/home-actions";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import Thumb from "@/components/portal/Thumb";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import ui from "@/components/portal/ui.module.css";
import type { ProviderNotification, ProviderNotificationTab, ProviderState } from "@/lib/data/provider-types";
import { daysFrom, formatWhen } from "@/lib/format";
import { routes } from "@/lib/routes";
import styles from "./Provider.module.css";

const TEXT = {
  title: "Notifications",
  lede: (vendor: boolean) => (vendor ? "Booking requests, stall decisions, messages and event changes" : "Booking requests, quotes, messages and event changes"),
  markAllRead: "Mark all read",
  tabsLabel: "Notification types",
  tabs: { all: "All", bookings: "Bookings", stalls: "Stalls", jobs: "Job posts", messages: "Messages", events: "Events" },
  today: "Today",
  thisWeek: "This week",
  earlier: "Earlier",
  unread: "Unread",
  sms: "SMS sent",
  none: "Nothing here yet.",
  howTitle: "How you get them",
  how: [
    ["Push and in the app", "All notifications"],
    ["Email", "Requests, confirmations, decisions"],
    ["SMS for urgent ones", "Booking or event cancelled or moved"],
  ],
  smsNote: "SMS for urgent changes is proposed.",
  remindersTitle: "Reminders and activity",
  remindersText: "Due dates, event reminders and activity. Each type can be switched off.",
  settings: "Notification settings",
} as const;

type TabKey = "all" | Exclude<ProviderNotificationTab, "account">;

type ProviderNotificationsProps = {
  state: ProviderState;
  list: ProviderNotification[];
  now: Date;
  type?: string;
};

// The vendor and freelancer notifications page (Figma V23, F23): tabs by kind, grouped into today,
// this week and earlier, each row opening what it's about. Vendors get a Stalls tab, freelancers
// Job posts.
export default function ProviderNotifications({ state, list, now, type }: ProviderNotificationsProps) {
  const vendor = state.kind === "vendor";
  const keys: TabKey[] = ["all", "bookings", vendor ? "stalls" : "jobs", "messages", "events"];
  const tab: TabKey = keys.find((k) => k === type) ?? "all";
  const here = tab === "all" ? routes.notifications : `${routes.notifications}?type=${tab}`;
  const shown = list.filter((n) => tab === "all" || n.tab === tab);
  const groups: [string, ProviderNotification[]][] = [
    [TEXT.today, shown.filter((n) => daysFrom(now, n.at) === 0)],
    [TEXT.thisWeek, shown.filter((n) => daysFrom(now, n.at) < 0 && daysFrom(now, n.at) >= -6)],
    [TEXT.earlier, shown.filter((n) => daysFrom(now, n.at) < -6)],
  ];

  const aside = (
    <>
      <Panel title={TEXT.howTitle}>
        {TEXT.how.map(([title, sub]) => (
          <div key={title} className={hiring.whiteRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{title}</span>
              <span className={hiring.sub}>{sub}</span>
            </span>
          </div>
        ))}
        <p className={styles.foot}>{TEXT.smsNote}</p>
      </Panel>
      <Panel title={TEXT.remindersTitle}>
        <p className={styles.foot}>{TEXT.remindersText}</p>
        <Link href={routes.vendorArea.settings} className={ui.wideButton}>
          {TEXT.settings}
        </Link>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHead}>
        <div className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
          <p className={hiring.lede}>{TEXT.lede(vendor)}</p>
        </div>
        {list.some((n) => n.unread) && (
          <form action={markAllRead.bind(null, here)}>
            <button type="submit" className={ui.rowButton}>
              {TEXT.markAllRead}
            </button>
          </form>
        )}
      </header>
      <Tabs label={TEXT.tabsLabel} current={tab} tabs={keys.map((k) => ({ key: k, label: TEXT.tabs[k], href: k === "all" ? routes.notifications : `${routes.notifications}?type=${k}` }))} />
      {shown.length === 0 && <p className={ui.muted}>{TEXT.none}</p>}
      {groups.map(
        ([title, items]) =>
          items.length > 0 && (
            <section key={title} className={styles.stack} aria-label={title}>
              <h2 className={ui.sectionTitle}>{title}</h2>
              <ul className={ui.rows}>
                {items.map((n) => (
                  <li key={n.id}>
                    <Link href={n.action.href ?? here} className={styles.greyRow}>
                      <Thumb size={36} shape="round" />
                      <span className={ui.rowText}>
                        <span className={ui.rowTitle}>{n.title}</span>
                        <span className={hiring.sub}>{n.detail}</span>
                      </span>
                      {n.sms && <Chip tone="warn">{TEXT.sms}</Chip>}
                      <span className={hiring.sub}>{formatWhen(n.at, now)}</span>
                      {n.unread && <span className={styles.dot} aria-label={TEXT.unread} />}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}
    </Columns>
  );
}
