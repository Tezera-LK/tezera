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
import type { ProviderBooking, ProviderState } from "@/lib/data/provider-types";
import { formatCount } from "@/lib/format";
import { bookingTab, day, lkr, noon, organiserName, paymentState, shortDay, stillDue } from "@/lib/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "My bookings" };

const TEXT = {
  title: "My bookings",
  lede: "Agreed service, dates, prices and terms for every booking",
  calendarView: "Calendar view",
  tabsLabel: "Which bookings",
  tabs: { upcoming: "Upcoming", completed: "Completed", cancelled: "Cancelled" },
  waitingReview: "Completed, waiting for your review",
  review: "Review",
  none: "No bookings here.",
  moneyDue: "Money due to you",
  payments: "Payments",
  across: (n: number) => `across ${n} booking${n === 1 ? "" : "s"}`,
  dueThisWeek: "Due this week",
  overdue: "Overdue",
  nothingDue: "Nothing due right now.",
  reminders: "Reminders",
  remindersText: "We remind you before due dates and events. Turn types off in Settings.",
  reminderSettings: "Reminder settings",
  emptyTitle: "No bookings yet",
  emptyText: "Bookings you accept, and quotes organisers accept, show up here.",
  markedCompleted: "marked completed",
  cancelledBy: (who: string) => `cancelled by ${who}`,
} as const;

type Tab = keyof typeof TEXT.tabs;
const TABS = Object.keys(TEXT.tabs) as Tab[];

// My bookings (Figma V12, F12): upcoming ones by month with where their payments stand, completed
// and cancelled ones, and the money still due on the right.
export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const asked = (await searchParams).tab;
  const tab: Tab = TABS.find((t) => t === asked) ?? "upcoming";
  const now = new Date();

  if (!state) {
    return (
      <>
        <Header />
        <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />
      </>
    );
  }

  const inTab = (t: Tab) => state.bookings.filter((b) => bookingTab(b, now) === t).sort((a, b) => a.date.localeCompare(b.date));
  const shown = inTab(tab);
  // upcoming ones in month groups ("December"), as in V12
  const months = [...new Set(shown.map((b) => b.date.slice(0, 7)))];
  const monthName = (m: string) => new Date(noon(`${m}-15`)).toLocaleDateString("en-GB", { month: "long", timeZone: "Asia/Colombo" });
  const toReview = tab === "upcoming" ? inTab("completed").filter((b) => b.completedAt && !b.reviewed && !b.cancelled) : [];

  // money still owed on live bookings
  const live = inTab("upcoming");
  const owed = live.flatMap((b) => stillDue(b).map((p) => ({ b, p, state: paymentState(p, now) })));
  const total = owed.reduce((sum, x) => sum + x.p.amountLkr, 0);
  const soon = owed.filter((x) => x.state === "due" && x.p.due && Date.parse(noon(x.p.due)) - now.getTime() <= 7 * 86_400_000);
  const late = owed.filter((x) => x.state === "overdue");

  const aside = (
    <>
      <Panel title={TEXT.moneyDue} link={{ label: TEXT.payments, href: routes.vendorArea.payments }}>
        <p className={hiring.pageTitle}>{lkr(total)}</p>
        <p className={styles.foot}>{TEXT.across(new Set(owed.map((x) => x.b.id)).size)}</p>
        {owed.length === 0 && <p className={styles.foot}>{TEXT.nothingDue}</p>}
        {soon.slice(0, 1).map((x) => (
          <Link key={x.b.id} href={routes.vendorArea.booking(x.b.id)} className={styles.tintRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{TEXT.dueThisWeek}</span>
              <span className={hiring.sub}>{`${organiserName(state, x.b.organiserId)} · ${x.p.due ? shortDay(x.p.due) : ""}`}</span>
            </span>
            <span className={styles.amount}>{lkr(x.p.amountLkr)}</span>
          </Link>
        ))}
        {late.slice(0, 1).map((x) => (
          <Link key={x.b.id} href={routes.vendorArea.booking(x.b.id)} className={styles.tintRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{TEXT.overdue}</span>
              <span className={hiring.sub}>{`${organiserName(state, x.b.organiserId)} · ${x.p.label.toLowerCase()}`}</span>
            </span>
            <span className={styles.amount}>{lkr(x.p.amountLkr)}</span>
          </Link>
        ))}
      </Panel>
      <Panel title={TEXT.reminders}>
        <p className={styles.foot}>{TEXT.remindersText}</p>
        <Link href={routes.vendorArea.settings} className={ui.wideButton}>
          {TEXT.reminderSettings}
        </Link>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <Header />
      <Tabs
        label={TEXT.tabsLabel}
        current={tab}
        tabs={TABS.map((t) => ({ key: t, label: `${TEXT.tabs[t]} · ${formatCount(inTab(t).length)}`, href: t === "upcoming" ? routes.vendorArea.bookings : `${routes.vendorArea.bookings}?tab=${t}` }))}
      />
      {shown.length === 0 && <p className={ui.muted}>{TEXT.none}</p>}
      {months.map((m) => (
        <section key={m} className={styles.post} aria-label={monthName(m)}>
          <h2 className={hiring.cardTitle}>{monthName(m)}</h2>
          <ul className={ui.rows}>
            {shown
              .filter((b) => b.date.startsWith(m))
              .map((b) => (
                <li key={b.id}>
                  <BookingRow booking={b} state={state} now={now} />
                </li>
              ))}
          </ul>
        </section>
      ))}
      {toReview.length > 0 && (
        <section className={styles.post} aria-label={TEXT.waitingReview}>
          <h2 className={hiring.cardTitle}>{TEXT.waitingReview}</h2>
          <ul className={ui.rows}>
            {toReview.map((b) => {
              const task = state.reviewTasks.find((t) => t.organiserId === b.organiserId && t.eventTitle === b.eventTitle && !t.submitted);
              return (
                <li key={b.id} className={styles.greyRow}>
                  <Thumb size={28} />
                  <Link href={routes.vendorArea.booking(b.id)} className={`${ui.rowText} ${styles.plainLink}`}>
                    <span className={ui.rowTitle}>{`${b.eventTitle} · ${b.service}`}</span>
                    <span className={hiring.sub}>{`${organiserName(state, b.organiserId)} · ${day(b.date)} · ${TEXT.markedCompleted}`}</span>
                  </Link>
                  <span className={styles.amount}>{lkr(b.priceLkr)}</span>
                  {task && (
                    <Link href={routes.vendorArea.reviewOrganiser(task.id)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                      {TEXT.review}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Columns>
  );
}

function Header() {
  return (
    <header className={hiring.pageHead}>
      <div className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.lede}</p>
      </div>
      <Link href={routes.vendorArea.availability} className={ui.wideButton}>
        {TEXT.calendarView}
      </Link>
    </header>
  );
}

// One booking: event and service, who and when, the price and where its payments stand (V12).
function BookingRow({ booking: b, state, now }: { booking: ProviderBooking; state: ProviderState; now: Date }) {
  let chip: [ChipTone, string] | null = null;
  if (b.cancelled) chip = ["neutral", TEXT.cancelledBy(b.cancelled.by === "you" ? "you" : "organiser")];
  else if (b.termsChange) chip = ["warn", "Change proposed"];
  else {
    const next = stillDue(b)[0];
    if (next) {
      const s = paymentState(next, now);
      const what = next.label === "Deposit" ? "Deposit" : "Instalment";
      chip = s === "overdue" ? ["danger", `${what} overdue`] : [s === "due" ? "warn" : "soft", `${what} due ${next.due ? shortDay(next.due) : "now"}`];
    } else if (b.payments.length > 0) {
      chip = ["good", b.completedAt || bookingTab(b, now) === "completed" ? "Paid in full" : `${b.payments[0].label} received`];
    }
  }
  return (
    <Link href={routes.vendorArea.booking(b.id)} className={styles.greyRow}>
      <Thumb size={28} />
      <span className={ui.rowText}>
        <span className={ui.rowTitle}>{`${b.eventTitle} · ${b.service}`}</span>
        <span className={hiring.sub}>{`${organiserName(state, b.organiserId)} · ${day(b.date)}`}</span>
      </span>
      <span className={styles.amount}>{lkr(b.priceLkr)}</span>
      {chip && <Chip tone={chip[0]}>{chip[1]}</Chip>}
    </Link>
  );
}
