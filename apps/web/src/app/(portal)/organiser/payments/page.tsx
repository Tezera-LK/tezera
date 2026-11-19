import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import books from "@/components/portal/hiring/Bookings.module.css";
import styles from "@/components/portal/hiring/Hiring.module.css";
import { TestBanner } from "@/components/portal/hiring/PaymentBits";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { dayLabel, nextToPay, paymentStates } from "@/lib/bookings";
import { getPaymentAccount, getProvidersById, getStallFeeTotals, listMyHiring, listPayments } from "@/lib/data/portal";
import type { PaymentRecord } from "@/lib/data/portal-types";
import { daysFrom, formatCount, formatShortDate } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Payments" };

const TEXT = {
  title: "Payments",
  lede: "Deposits, instalments and stall fees. Sandbox only for now.",
  connected: "Your payment account is connected.",
  account: "Payment account",
  connectedChip: "Connected",
  notConnected: "Not connected",
  merchant: "PayHere merchant · sandbox",
  merchantLine: (id: string, name: string) => `Merchant ID ${id} · ${name}`,
  manage: "Manage",
  connect: "Connect",
  noAccount: "No payment account yet",
  noAccountLine: "Vendors pay stall fees outside the app and you mark them paid.",
  accountNote: "Stall fees from vendors settle straight to this account. You pay providers through their own PayHere checkout.",
  history: "History and receipts",
  filterLabel: "Which payments",
  filters: [
    ["", "All"],
    ["paid", "Paid"],
    ["received", "Received"],
    ["refunded", "Refunds"],
  ],
  empty: "Nothing here yet.",
  today: "Today",
  chip: { paid: "Paid", received: "Received", refunded: "Refunded", commission: "Not charged" },
  comingUp: "Coming up",
  nothingDue: "Nothing due. Payments on your bookings show up here.",
  dueLine: (label: string, day: string) => (day ? `${label} · due ${day}` : `${label} · due now`),
  pay: (amount: number) => `Pay LKR ${formatCount(amount)} (test)`,
  stallFees: "Stall fees",
  stalls: "Stalls",
  stallLine: (paid: number, of: number) => `${paid} of ${of} stalls paid · test money`,
  noStalls: "No stall fees yet.",
  refundsTitle: "Refunds and cancellation fees",
  refundsText: "Worked out from each booking's cancellation terms. Both sides get a receipt.",
} as const;

// "+ LKR 15,000" coming in, "− LKR 10,000" going out, "LKR 500" for the commission shown
function signed(r: PaymentRecord): string {
  const amount = `LKR ${formatCount(r.amountLkr)}`;
  if (r.kind === "received" || r.kind === "refunded") return `+ ${amount}`;
  if (r.kind === "paid") return `− ${amount}`;
  return amount;
}

const CHIP_TONE = { paid: "good", received: "good", refunded: "soft", commission: "neutral" } as const;

// Payments (Figma O60): the PayHere account, every payment with its receipt, what's due next,
// and the stall fees collected. ?show= picks paid, received or refunds.
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ show?: string; connected?: string }> }) {
  const session = await requireRole("organiser");
  const query = await searchParams;
  const [account, records, hiring, stallFees] = await Promise.all([
    getPaymentAccount(session),
    listPayments(session),
    listMyHiring(session),
    getStallFeeTotals(session),
  ]);
  const now = new Date();
  const show = query.show === "paid" || query.show === "received" || query.show === "refunded" ? query.show : "";
  const shown = show ? records.filter((r) => r.kind === show) : records;

  // the next payment on each confirmed booking, soonest first
  const bookings = hiring.requests.filter((r) => r.status === "accepted" && !r.completedAt);
  const providers = await getProvidersById(session, bookings.map((b) => b.providerId));
  const upcoming = bookings
    .map((b) => ({ booking: b, part: nextToPay(paymentStates(b, records, now)) }))
    .filter((u) => u.part !== null)
    .sort((a, b) => (a.part!.due || "0").localeCompare(b.part!.due || "0"))
    .slice(0, 2);

  const aside = (
    <>
      <Panel title={TEXT.comingUp} empty={upcoming.length === 0 ? TEXT.nothingDue : undefined}>
        {upcoming.length > 0 && (
          <>
            {upcoming.map(({ booking, part }) => (
              <Link key={booking.id} href={routes.booking(booking.id)} className={styles.whiteRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{providers.get(booking.providerId)?.name}</span>
                  <span className={styles.sub}>{TEXT.dueLine(part!.label, dayLabel(part!.due))}</span>
                </span>
                <span className={books.amount}>{`LKR ${formatCount(part!.amountLkr)}`}</span>
              </Link>
            ))}
            <Link
              href={routes.payInstalment(upcoming[0].booking.id, upcoming[0].part!.index)}
              className={`${ui.rowButton} ${ui.rowButtonPrimary} ${tables.panelLink}`}
            >
              {TEXT.pay(upcoming[0].part!.amountLkr)}
            </Link>
          </>
        )}
      </Panel>
      <Panel
        title={TEXT.stallFees}
        link={stallFees.eventId ? { label: TEXT.stalls, href: routes.eventStalls(stallFees.eventId) } : undefined}
      >
        {stallFees.of > 0 ? (
          <>
            <p className={books.bigAmount}>{`LKR ${formatCount(stallFees.amountLkr)}`}</p>
            <p className={tables.panelText}>{TEXT.stallLine(stallFees.paid, stallFees.of)}</p>
          </>
        ) : (
          <p className={tables.panelText}>{TEXT.noStalls}</p>
        )}
      </Panel>
      <div className={styles.notePanel}>
        <p className={styles.notePanelTitle}>{TEXT.refundsTitle}</p>
        <p className={tables.panelText}>{TEXT.refundsText}</p>
      </div>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={styles.pageHeadText}>
        <h1 className={styles.pageTitle}>{TEXT.title}</h1>
        <p className={styles.lede}>{TEXT.lede}</p>
      </header>
      <TestBanner />
      {query.connected && (
        <p className={books.notice} role="status">
          {TEXT.connected}
        </p>
      )}

      <section className={books.card} aria-labelledby="account-title">
        <div className={books.cardHead}>
          <h2 id="account-title" className={styles.cardTitle}>
            {TEXT.account}
          </h2>
          {account ? <Chip tone="good">{TEXT.connectedChip}</Chip> : <Chip tone="warn">{TEXT.notConnected}</Chip>}
        </div>
        <div className={books.ledgerRow}>
          <Thumb size={36} radius={4} />
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{account ? TEXT.merchant : TEXT.noAccount}</span>
            <span className={styles.sub}>{account ? TEXT.merchantLine(account.merchantId, account.accountName) : TEXT.noAccountLine}</span>
          </span>
          <Link href={routes.connectPayments} className={`${ui.rowButton} ${books.plainRowButton}`}>
            {account ? TEXT.manage : TEXT.connect}
          </Link>
        </div>
        <p className={books.noticeText}>{TEXT.accountNote}</p>
      </section>

      <section className={books.card} aria-labelledby="history-title">
        <div className={books.cardHead}>
          <h2 id="history-title" className={styles.cardTitle}>
            {TEXT.history}
          </h2>
          <nav className={styles.filters} aria-label={TEXT.filterLabel}>
            {TEXT.filters.map(([key, label]) => (
              <Link
                key={key}
                href={key ? `${routes.payments}?show=${key}` : routes.payments}
                className={`${books.method} ${books.filterLink}`}
                aria-current={show === key ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        {shown.length === 0 ? (
          <p className={books.noticeText}>{TEXT.empty}</p>
        ) : (
          <ul className={ui.rows}>
            {shown.map((r) => (
              <li key={r.id}>
                <Link href={routes.receipt(r.id)} className={books.ledgerRow}>
                  <Thumb size={36} radius={4} />
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{r.party}</span>
                    <span className={styles.sub}>{`${daysFrom(now, r.at) === 0 ? TEXT.today : formatShortDate(r.at)} · ${r.label}`}</span>
                  </span>
                  <span className={books.amount}>{signed(r)}</span>
                  <Chip tone={CHIP_TONE[r.kind]}>{TEXT.chip[r.kind]}</Chip>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Columns>
  );
}
