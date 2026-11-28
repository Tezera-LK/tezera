import type { Metadata } from "next";
import Link from "next/link";
import Chip, { type ChipTone } from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import Thumb from "@/components/portal/Thumb";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { IncomingRequest, ProviderState } from "@/lib/data/provider-types";
import { daysFrom, formatCount, formatShortDate, formatTime } from "@/lib/format";
import { day, hoursLeft, lkr, noon, organiserName } from "@/lib/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Booking requests" };

const TEXT = {
  title: "Booking requests",
  lede: "Organisers who want to book you. Reply within 48 hours to keep your response rate up.",
  tabsLabel: "Which requests",
  all: "All",
  new: "New",
  quoted: "Quotes sent",
  accepted: "Accepted",
  declined: "Declined",
  none: "No requests here.",
  responseRate: "Response rate",
  great: "Great",
  ok: "Could be better",
  rateNote: "Replies within 48 hours over the last 90 days. It feeds your rank score.",
  freeDates: "Free dates this month",
  calendar: "Calendar",
  noFree: "No free weekend days in the next month.",
  emptyTitle: "No booking requests yet",
  emptyText: "When an organiser asks to book you, the request shows up here.",
  received: (when: string) => `received ${when}`,
  left: (hours: number) => `${hours} hours left`,
  yourQuote: (amount: string, sent: string) => `your quote ${amount} · sent ${sent}`,
  confirmed: (amount: string, on: string) => `${amount} · booking confirmed ${on}`,
  declinedOn: (on: string) => `declined ${on}`,
  budget: (amount: string) => `budget ${amount}`,
  chip: { new: "New", waiting: "Waiting", declined: "Declined", booked: "Booked" },
} as const;

type Tab = "all" | "new" | "quoted" | "accepted" | "declined";
const TABS: Tab[] = ["all", "new", "quoted", "accepted", "declined"];

type Props = { searchParams: Promise<{ tab?: string }> };

// Which tab a request is under. A quote the organiser declined still sits under "Quotes sent" on
// All (V47 shows Wave Events there), but counts as Declined.
function inTab(r: IncomingRequest, tab: Tab): boolean {
  if (tab === "all") return true;
  if (tab === "new") return r.status === "new";
  if (tab === "quoted") return r.quote !== null && r.status !== "accepted";
  return r.status === tab;
}

// Booking requests (Figma V47, F47): new ones, the quotes sent and the ones accepted, with the
// response rate and the next free dates on the right.
export default async function RequestsPage({ searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const asked = (await searchParams).tab;
  const tab: Tab = TABS.find((t) => t === asked) ?? "all";
  const now = new Date();

  if (!state) {
    return (
      <>
        <Header />
        <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />
      </>
    );
  }

  const count = (t: Tab) => state.requests.filter((r) => inTab(r, t)).length;
  const label = (t: Tab) => (t === "all" || count(t) > 0 ? `${TEXT[t]} · ${formatCount(count(t))}` : TEXT[t]);
  const shown = state.requests.filter((r) => inTab(r, tab));
  // on All, three groups as in V47; on a tab, one list
  const groups: [string | null, IncomingRequest[]][] =
    tab === "all"
      ? [
          [TEXT.new, shown.filter((r) => r.status === "new")],
          [TEXT.quoted, shown.filter((r) => inTab(r, "quoted"))],
          [TEXT.accepted, shown.filter((r) => r.status === "accepted")],
          [TEXT.declined, shown.filter((r) => r.status === "declined" && !r.quote)],
        ]
      : [[null, shown]];

  const aside = (
    <>
      <Panel title={TEXT.responseRate}>
        <div className={hiring.cardHead}>
          <p className={hiring.pageTitle}>{`${state.responseRate}%`}</p>
          <Chip tone={state.responseRate >= 90 ? "good" : "warn"}>{state.responseRate >= 90 ? TEXT.great : TEXT.ok}</Chip>
        </div>
        <p className={styles.foot}>{TEXT.rateNote}</p>
      </Panel>
      <Panel title={TEXT.freeDates} link={{ label: TEXT.calendar, href: routes.vendorArea.availability }}>
        <FreeDates state={state} now={now} />
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <Header />
      <Tabs
        label={TEXT.tabsLabel}
        current={tab}
        tabs={TABS.map((t) => ({ key: t, label: label(t), href: t === "all" ? routes.vendorArea.requests : `${routes.vendorArea.requests}?tab=${t}` }))}
      />
      {shown.length === 0 && <p className={ui.muted}>{TEXT.none}</p>}
      {groups.map(([title, list]) =>
        list.length === 0 ? null : (
          <section key={title ?? "list"} className={styles.stack} aria-label={title ?? TEXT[tab]}>
            {title && <h2 className={styles.groupLabel}>{title}</h2>}
            <ul className={ui.rows}>
              {list.map((r) => (
                <li key={r.id}>
                  <RequestRow request={r} state={state} now={now} />
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

// "Agastra Events · Crew catering" over its event, date and where it stands (V47).
function RequestRow({ request: r, state, now }: { request: IncomingRequest; state: ProviderState; now: Date }) {
  const organiser = organiserName(state, r.organiserId);
  const receivedDay = daysFrom(now, r.receivedAt);
  const received =
    receivedDay === 0 ? `today, ${formatTime(r.receivedAt)}` : receivedDay === -1 ? "yesterday" : formatShortDate(r.receivedAt);
  let detail: string;
  let chip: [ChipTone, string];
  if (r.status === "new") {
    const left = hoursLeft(r.receivedAt, now);
    detail = [r.eventTitle, day(r.date), TEXT.budget(lkr(r.budgetLkr)), TEXT.received(received), receivedDay < 0 && left > 0 ? TEXT.left(left) : null]
      .filter(Boolean)
      .join(" · ");
    chip = ["soft", TEXT.chip.new];
  } else if (r.status === "accepted") {
    detail = [r.eventTitle, TEXT.confirmed(lkr(r.quote?.priceLkr ?? r.budgetLkr), formatShortDate(r.quote?.decidedAt ?? r.receivedAt))].join(" · ");
    chip = ["good", TEXT.chip.booked];
  } else if (r.quote) {
    detail = [r.eventTitle, TEXT.yourQuote(lkr(r.quote.priceLkr), formatShortDate(r.quote.sentAt))].join(" · ");
    chip = r.status === "declined" ? ["danger", TEXT.chip.declined] : ["neutral", TEXT.chip.waiting];
  } else {
    detail = [r.eventTitle, day(r.date), TEXT.declinedOn(formatShortDate(r.declined?.at ?? r.receivedAt))].join(" · ");
    chip = ["danger", TEXT.chip.declined];
  }
  return (
    <Link href={routes.vendorArea.request(r.id)} className={styles.bigRow}>
      <Thumb size={40} shape="round" />
      <span className={ui.rowText}>
        <span className={styles.bigRowTitle}>{`${organiser} · ${r.title}`}</span>
        <span className={hiring.sub}>{detail}</span>
      </span>
      <Chip tone={chip[0]}>{chip[1]}</Chip>
    </Link>
  );
}

// The next three weekend days in the coming month with nothing on the calendar.
function FreeDates({ state, now }: { state: ProviderState; now: Date }) {
  const taken = new Set(state.calendar.map((m) => m.date));
  const free: string[] = [];
  for (let i = 1; i <= 31 && free.length < 3; i++) {
    const date = new Date(now.getTime() + i * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
    const weekday = new Date(noon(date)).getUTCDay();
    if ((weekday === 6 || weekday === 0) && !taken.has(date)) free.push(date);
  }
  if (free.length === 0) return <p className={styles.foot}>{TEXT.noFree}</p>;
  return (
    <ul className={ui.chipList}>
      {free.map((date) => (
        <li key={date}>
          <span className={styles.pill}>{day(date)}</span>
        </li>
      ))}
    </ul>
  );
}
