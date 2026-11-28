import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import events from "@/components/portal/events/EventPages.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { formatDateTime } from "@/lib/format";
import { day, lkr, stillDue } from "@/lib/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Receipt" };

const TEXT = {
  title: "Receipt",
  download: "Download PDF",
  downloadNote: "PDFs come with the payments backend (EN-10).",
  testTitle: "Test payment, no real money",
  testText: "PayHere sandbox · nothing is charged",
  from: "From",
  to: "To",
  for: "For",
  payment: "Payment",
  method: "Method",
  amount: "Amount",
  commission: "Tezera commission 5% · shown, not charged",
  settles: "Money settles straight to your PayHere merchant account. Tezera never holds it.",
  feeSettles: "Stall fees go to the organiser's own PayHere account. Tezera never holds them.",
  booking: "Booking",
  nextDue: (label: string, on: string) => `${label} due ${on}`,
  paidInFull: "Paid in full",
  wrong: "Something wrong?",
  wrongText: "An admin looks at it with the booking history.",
  report: "Report a problem",
} as const;

// A receipt (Figma V70, F70): a payment received on a booking or a stall fee paid.
export default async function ReceiptPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const { receiptId } = await params;
  const state = await getProviderState(session);
  const m = state?.money.find((x) => x.id === receiptId);
  if (!state || !m) notFound();
  const booking = state.bookings.find((b) => b.id === m.bookingId);
  const received = m.kind === "received";
  const next = booking ? stillDue(booking)[0] : undefined;
  const amount = (n: number) => `${lkr(n)}.00`;

  const aside = (
    <>
      {booking && (
        <Panel title={TEXT.booking}>
          <Link href={routes.vendorArea.booking(booking.id)} className={hiring.whiteRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{booking.eventTitle}</span>
              <span className={hiring.sub}>{next ? TEXT.nextDue(next.label, next.due ? day(next.due) : "now") : TEXT.paidInFull}</span>
            </span>
          </Link>
        </Panel>
      )}
      <Panel title={TEXT.wrong}>
        <p className={styles.foot}>{TEXT.wrongText}</p>
        <Link href={booking ? `${routes.vendorArea.booking(booking.id)}?dialog=report` : state.kind === "vendor" ? routes.vendorArea.stalls : routes.vendorArea.messages} className={ui.wideButton}>
          {TEXT.report}
        </Link>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHead}>
        <div className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
          <p className={hiring.lede}>{`${m.id} · ${formatDateTime(m.at)}`}</p>
        </div>
        <span className={`${ui.rowButton} ${ui.soon}`} title={TEXT.downloadNote}>
          {TEXT.download}
        </span>
      </header>
      <div className={`${styles.banner} ${styles.warnBanner}`}>
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{TEXT.testTitle}</span>
          <span className={hiring.sub}>{TEXT.testText}</span>
        </span>
      </div>
      <section className={events.card} aria-labelledby="receipt-title">
        <h2 id="receipt-title" className={hiring.cardTitle}>
          {m.label.split(" · ")[0]}
        </h2>
        <dl className={events.facts}>
          <dt>{TEXT.from}</dt>
          <dd>{received ? m.party : state.profile.name}</dd>
          <dt>{TEXT.to}</dt>
          <dd>{received ? state.profile.name : m.party}</dd>
          <dt>{TEXT.for}</dt>
          <dd>{booking ? `${booking.eventTitle} · ${booking.service} · ${booking.ref}` : m.label}</dd>
          {booking && (
            <>
              <dt>{TEXT.payment}</dt>
              <dd>{`${m.label.split(" · ")[0]}, of ${lkr(booking.priceLkr)}`}</dd>
            </>
          )}
          <dt>{TEXT.method}</dt>
          <dd>{m.method}</dd>
          <dt>{TEXT.amount}</dt>
          <dd>{amount(m.amountLkr)}</dd>
          {received && m.method.startsWith("PayHere") && (
            <>
              <dt>{TEXT.commission}</dt>
              <dd>{amount(Math.round(m.amountLkr * 0.05))}</dd>
            </>
          )}
        </dl>
        <p className={styles.foot}>{received ? TEXT.settles : TEXT.feeSettles}</p>
      </section>
    </Columns>
  );
}
