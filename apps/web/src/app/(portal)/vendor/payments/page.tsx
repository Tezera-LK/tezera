import type { Metadata } from "next";
import Link from "next/link";
import Chip, { type ChipTone } from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import events from "@/components/portal/events/EventPages.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { ProviderMoney } from "@/lib/data/provider-types";
import { formatShortDate } from "@/lib/format";
import { bookingTab, lkr, organiserName, paymentState, shortDay, stillDue } from "@/lib/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Payments" };

const TEXT = {
  title: "Payments",
  ledeVendor: "Deposits, instalments and stall fees. Sandbox only for now.",
  ledeFreelancer: "Deposits and instalments from organisers. Sandbox only for now.",
  testTitle: "Test payment, no real money",
  testText: "PayHere sandbox · nothing is charged",
  account: "Payment account",
  connected: "Connected",
  notConnected: "Not connected",
  manage: "Manage",
  connect: "Connect",
  merchant: (id: string, name: string) => `Merchant ID ${id} · ${name}`,
  noAccount: "Organisers pay you outside the app and you mark payments received.",
  settles: "Deposits and instalments settle straight to your own PayHere account. Without one, payments happen outside the app and are tracked here.",
  history: "History and receipts",
  tabsLabel: "Which payments",
  tabs: { all: "All", received: "Received", paid: "Paid", refunds: "Refunds" },
  chip: { received: "Received", paid: "Paid", refunded: "Refunded", notCharged: "Not charged" },
  receipt: "Receipt",
  commission: "Commission 5% · shown, not charged",
  none: "Nothing here yet.",
  connectedNotice: "Payment account connected. A LKR 10 test payment went through.",
  thisMonth: "This month",
  receivedTest: "received · test money",
  dueToYou: "Due to you",
  instalments: (n: number) => `${n} instalment${n === 1 ? "" : "s"}`,
  overdue: "Overdue",
  payStallFee: "Pay a stall fee",
  payFor: (amount: string) => `Pay ${amount} (test)`,
  payNote: "Paid through the organiser’s connected account. The stall is then marked paid and confirmed.",
  refunds: "Refunds and cancellation fees",
  refundsText: "Worked out from each booking’s cancellation terms. Both sides get a receipt.",
  tax: "Tax on freelance fees",
  taxChip: "To decide",
  taxText: "5% withholding tax applies to freelance fees over LKR 100,000 a month. Who deducts it is still being decided.",
  emptyTitle: "No payments yet",
  emptyText: "Deposits, instalments and stall fees show up here.",
} as const;

type Tab = keyof typeof TEXT.tabs;
const TABS = Object.keys(TEXT.tabs) as Tab[];

// One line of the history: a record, or the commission shown (not charged) on an in-app payment.
type Line = { key: string; party: string; at: string; label: string; amount: string; chip: [ChipTone, string]; receipt: string | null };

function lines(money: ProviderMoney[]): Line[] {
  return money.flatMap((m) => {
    const sign = m.kind === "received" ? "+ " : "− ";
    const line: Line = {
      key: m.id,
      party: m.party,
      at: m.at,
      label: m.label,
      amount: `${sign}${lkr(m.amountLkr)}`,
      chip: m.kind === "received" ? ["good", TEXT.chip.received] : ["soft", TEXT.chip.paid],
      receipt: m.id,
    };
    // Tezera's 5% is shown on in-app booking payments but not charged (PRD, proposed)
    const commission: Line[] =
      m.kind === "received" && m.bookingId && m.method.startsWith("PayHere")
        ? [{ key: `${m.id}-c`, party: "Tezera", at: m.at, label: TEXT.commission, amount: lkr(Math.round(m.amountLkr * 0.05)), chip: ["neutral", TEXT.chip.notCharged], receipt: m.id }]
        : [];
    return [line, ...commission];
  });
}

// Payments (Figma V21, F21): the payment account, the history with receipts, and what's due.
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ tab?: string; connected?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const q = await searchParams;
  const tab: Tab = TABS.find((t) => t === q.tab) ?? "all";
  const vendor = session.role === "vendor";
  const now = new Date();

  if (!state) {
    return (
      <>
        <Header vendor={vendor} />
        <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />
      </>
    );
  }

  const shown = lines(
    state.money.filter((m) => (tab === "received" ? m.kind === "received" : tab === "paid" ? m.kind === "stall-fee" : tab === "refunds" ? /refund|cancellation/i.test(m.label) : true)),
  ).filter((l) => tab === "all" || !l.key.endsWith("-c"));
  const month = now.toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }).slice(0, 7);
  const thisMonth = state.money.filter((m) => m.kind === "received" && new Date(m.at).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }).startsWith(month)).reduce((s, m) => s + m.amountLkr, 0);
  const live = state.bookings.filter((b) => bookingTab(b, now) === "upcoming" && !b.cancelled);
  const owed = live.flatMap((b) => stillDue(b).map((p) => ({ b, p })));
  const late = owed.find((x) => paymentState(x.p, now) === "overdue");
  const feeDue = vendor ? state.stalls.find((s) => s.application?.status === "approved" && !s.application.fee.paidAt) : undefined;

  const aside = (
    <>
      <Panel title={TEXT.thisMonth}>
        <p className={hiring.pageTitle}>{lkr(thisMonth)}</p>
        <p className={styles.foot}>{TEXT.receivedTest}</p>
        <div className={styles.tintRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.dueToYou}</span>
            <span className={hiring.sub}>{TEXT.instalments(owed.length)}</span>
          </span>
          <span className={styles.amount}>{lkr(owed.reduce((s, x) => s + x.p.amountLkr, 0))}</span>
        </div>
        {late && (
          <Link href={routes.vendorArea.booking(late.b.id)} className={styles.tintRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{TEXT.overdue}</span>
              <span className={hiring.sub}>{`${organiserName(state, late.b.organiserId)} ${late.p.label.toLowerCase()}`}</span>
            </span>
            <Chip tone="danger">{TEXT.overdue}</Chip>
          </Link>
        )}
      </Panel>
      {feeDue?.application && (
        <Panel title={TEXT.payStallFee}>
          <div className={hiring.whiteRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{feeDue.eventTitle}</span>
              <span className={hiring.sub}>{`${organiserName(state, feeDue.organiserId)} · due ${shortDay(feeDue.application.fee.due)}`}</span>
            </span>
            <span className={styles.amount}>{lkr(feeDue.feeLkr)}</span>
          </div>
          <p className={styles.foot}>{TEXT.payNote}</p>
          <Link href={routes.vendorArea.payStall(feeDue.id)} className={`${ui.wideButton} ${styles.primaryWide}`}>
            {TEXT.payFor(lkr(feeDue.feeLkr))}
          </Link>
        </Panel>
      )}
      {!vendor && (
        <Panel title={TEXT.tax}>
          <Chip tone="warn">{TEXT.taxChip}</Chip>
          <p className={styles.foot}>{TEXT.taxText}</p>
        </Panel>
      )}
      <div className={hiring.notePanel}>
        <p className={hiring.notePanelTitle}>{TEXT.refunds}</p>
        <p className={styles.foot}>{TEXT.refundsText}</p>
      </div>
    </>
  );

  return (
    <Columns aside={aside}>
      <Header vendor={vendor} />
      {q.connected && (
        <p className={styles.foot} role="status">
          {TEXT.connectedNotice}
        </p>
      )}
      <div className={`${styles.banner} ${styles.warnBanner}`}>
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{TEXT.testTitle}</span>
          <span className={hiring.sub}>{TEXT.testText}</span>
        </span>
      </div>
      <section className={events.card} aria-labelledby="account-title">
        <div className={hiring.cardHead}>
          <span className={styles.inline}>
            <h2 id="account-title" className={hiring.cardTitle}>
              {TEXT.account}
            </h2>
            <Chip tone={state.payout ? "good" : "neutral"}>{state.payout ? TEXT.connected : TEXT.notConnected}</Chip>
          </span>
          <Link href={routes.vendorArea.connect} className={ui.rowButton}>
            {state.payout ? TEXT.manage : TEXT.connect}
          </Link>
        </div>
        <p className={styles.foot}>{state.payout ? `${state.payout.bank} · ${TEXT.merchant(state.payout.last4, state.payout.accountName)}` : TEXT.noAccount}</p>
        <p className={styles.foot}>{TEXT.settles}</p>
      </section>
      <section className={events.card} aria-labelledby="history-title">
        <h2 id="history-title" className={hiring.cardTitle}>
          {TEXT.history}
        </h2>
        <Tabs
          label={TEXT.tabsLabel}
          current={tab}
          tabs={TABS.map((t) => ({ key: t, label: TEXT.tabs[t], href: t === "all" ? routes.vendorArea.payments : `${routes.vendorArea.payments}?tab=${t}` }))}
        />
        {shown.length === 0 && <p className={ui.muted}>{TEXT.none}</p>}
        <ul className={ui.rows}>
          {shown.map((l) => (
            <li key={l.key} className={styles.greyRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{l.party}</span>
                <span className={hiring.sub}>{`${formatShortDate(l.at)} · ${l.label}`}</span>
              </span>
              <span className={styles.amount}>{l.amount}</span>
              <Chip tone={l.chip[0]}>{l.chip[1]}</Chip>
              {l.receipt && (
                <Link href={routes.vendorArea.receipt(l.receipt)} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                  {TEXT.receipt}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Columns>
  );
}

function Header({ vendor }: { vendor: boolean }) {
  return (
    <header className={hiring.pageHeadText}>
      <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
      <p className={hiring.lede}>{vendor ? TEXT.ledeVendor : TEXT.ledeFreelancer}</p>
    </header>
  );
}
