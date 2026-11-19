import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import books from "@/components/portal/hiring/Bookings.module.css";
import styles from "@/components/portal/hiring/Hiring.module.css";
import { PrintButton, TestBanner } from "@/components/portal/hiring/PaymentBits";
import shell from "@/components/portal/PortalShell.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { bookingRef, dayLabel, nextToPay, paymentStates } from "@/lib/bookings";
import { getBooking, getMyEvent, getPaymentAccount, getReceipt, listPayments } from "@/lib/data/portal";
import type { PaymentRecord } from "@/lib/data/portal-types";
import { formatDayMonth, formatTime } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Receipt" };

const TEXT = {
  title: "Receipt",
  lede: (id: string, at: string) => `${id} · ${formatDayMonth(at)} ${new Date(at).getFullYear()}, ${formatTime(at)}`,
  download: "Download PDF",
  heading: { paid: "Payment made", received: "Payment received", refunded: "Refund", commission: "Commission shown" },
  from: "From",
  to: "To",
  for: "For",
  payment: "Payment",
  method: "Method",
  amount: "Amount",
  commission: "Tezera commission 5% · shown, not charged",
  straight: "Money goes straight to the provider's PayHere account. Tezera never holds it.",
  booking: "Booking",
  bookingLine: (service: string, next: string) => [service, next].filter(Boolean).join(" · "),
  somethingWrong: "Something wrong?",
  wrongText: "An admin looks at it with the booking history.",
  report: "Report a problem",
} as const;

// "LKR 15,000.00"
const money = (n: number) => `LKR ${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// A receipt (Figma O64). Both sides get the same one. "Download PDF" prints it.
export default async function ReceiptPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const session = await requireRole("organiser");
  const receipt = await getReceipt(session, (await params).receiptId);
  if (!receipt) notFound();
  const [account, booking, records] = await Promise.all([
    getPaymentAccount(session),
    receipt.requestId ? getBooking(session, receipt.requestId) : null,
    listPayments(session),
  ]);
  const event = receipt.eventId ? await getMyEvent(session, receipt.eventId) : null;
  const organiser = account?.accountName ?? "You";
  const outgoing = receipt.kind === "paid" || receipt.kind === "commission";
  const service = booking?.brief.service.toLowerCase() ?? "";
  const part = booking && receipt.partIndex !== null ? booking.payments[receipt.partIndex] : null;
  const commission = records.find((r) => r.kind === "commission" && r.requestId === receipt.requestId && Math.abs(Date.parse(r.at) - Date.parse(receipt.at)) < 60_000);
  const next = booking ? nextToPay(paymentStates(booking, records, new Date())) : null;

  const rows: [string, string][] = [
    [TEXT.from, outgoing ? organiser : receipt.party],
    [TEXT.to, outgoing ? receipt.party : organiser],
    [TEXT.for, [event?.title, service, booking ? bookingRef(booking.id) : ""].filter(Boolean).join(" · ") || receipt.label],
    // "Instalment 1 of 2": instalments count without the deposit
    [TEXT.payment, part ? (part.label.startsWith("Instalment") ? `${part.label} of ${booking!.payments.filter((p) => p.label.startsWith("Instalment")).length}` : part.label) : receipt.label],
    [TEXT.method, receipt.method],
  ];

  const aside = (
    <>
      {booking && event && (
        <Panel title={TEXT.booking}>
          <Link href={routes.booking(booking.id)} className={styles.whiteRow}>
            <Thumb size={32} radius={4} />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{event.title}</span>
              <span className={styles.sub}>{TEXT.bookingLine(booking.brief.service, next ? `${next.label.toLowerCase()} due ${dayLabel(next.due)}` : "")}</span>
            </span>
          </Link>
        </Panel>
      )}
      {booking && (
        <Panel title={TEXT.somethingWrong}>
          <p className={tables.panelText}>{TEXT.wrongText}</p>
          <Link href={`${routes.booking(booking.id)}?dialog=report`} className={`${ui.rowButton} ${ui.rowButtonWhite} ${tables.panelLink}`}>
            {TEXT.report}
          </Link>
        </Panel>
      )}
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={styles.pageHead}>
        <div className={styles.pageHeadText}>
          <h1 className={styles.pageTitle}>{TEXT.title}</h1>
          <p className={styles.lede}>{TEXT.lede(receipt.id, receipt.at)}</p>
        </div>
        <PrintButton className={`${ui.rowButton} ${ui.rowButtonWhite} ${styles.bigPill} ${books.printButton}`}>{TEXT.download}</PrintButton>
      </header>
      <TestBanner />
      <article className={books.receipt} aria-label={`${TEXT.title} ${receipt.id}`}>
        <div className={books.receiptHead}>
          <span className={books.receiptLogo}>
            <span className={shell.logoMark} aria-hidden="true" />
            tezera
          </span>
          <span className={ui.rowTitle}>{receiptHeading(receipt, part?.label)}</span>
        </div>
        <dl className={styles.terms}>
          {rows.map(([label, value]) => (
            <div key={label} className={styles.partRow}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className={books.receiptAmount}>
          <span>{TEXT.amount}</span>
          <span className={books.bigAmount}>{money(receipt.amountLkr)}</span>
        </div>
        {receipt.kind === "paid" && commission && (
          <div className={books.receiptSmall}>
            <span>{TEXT.commission}</span>
            <span>{money(commission.amountLkr)}</span>
          </div>
        )}
        <p className={books.noticeText}>{TEXT.straight}</p>
        <span className={shell.srOnly}>{receipt.id}</span>
      </article>
    </Columns>
  );
}

// "Instalment paid", "Deposit refunded"…
function receiptHeading(receipt: PaymentRecord, partLabel?: string): string {
  if (partLabel && receipt.kind === "paid") return `${partLabel.startsWith("Deposit") ? "Deposit" : "Instalment"} paid`;
  if (partLabel && receipt.kind === "refunded") return `${partLabel} refunded`;
  return TEXT.heading[receipt.kind];
}
