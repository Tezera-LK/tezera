import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import forms from "@/components/portal/forms.module.css";
import styles from "@/components/portal/hiring/Hiring.module.css";
import { TestBanner } from "@/components/portal/hiring/PaymentBits";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { dayLabel, nextToPay, paymentStates } from "@/lib/bookings";
import { getBooking, getMyEvent, getReceipt, listPayments } from "@/lib/data/portal";
import { formatCount } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Payment done" };

const TEXT = {
  title: (label: string) => `${label} paid`,
  line: (amount: number, to: string, event: string) => [`LKR ${formatCount(amount)} to ${to}`, event].filter(Boolean).join(" · "),
  paid: "Paid",
  receipt: (id: string) => `Receipt ${id}`,
  viewReceipt: "View receipt",
  backToBooking: "Back to booking",
  next: "Next",
  nextLine: (amount: number, day: string) => `LKR ${formatCount(amount)}${day ? ` · due ${day}` : ""}`,
  allPaid: "Everything on this booking is paid.",
} as const;

// "Instalment paid" (Figma O63), right after a sandbox payment.
export default async function PaymentDonePage({ params }: { params: Promise<{ receiptId: string }> }) {
  const session = await requireRole("organiser");
  const receipt = await getReceipt(session, (await params).receiptId);
  if (!receipt || !receipt.requestId) notFound();
  const [booking, records] = await Promise.all([getBooking(session, receipt.requestId), listPayments(session)]);
  const event = booking ? await getMyEvent(session, booking.eventId) : null;
  const next = booking ? nextToPay(paymentStates(booking, records, new Date())) : null;
  const label = booking && receipt.partIndex !== null ? booking.payments[receipt.partIndex]?.label ?? "Payment" : "Payment";

  const aside = (
    <Panel title={TEXT.next} empty={next ? undefined : TEXT.allPaid}>
      {next && (
        <div className={styles.whiteRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{next.label}</span>
            <span className={styles.sub}>{TEXT.nextLine(next.amountLkr, dayLabel(next.due))}</span>
          </span>
        </div>
      )}
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <TestBanner />
      <section className={styles.hero} aria-labelledby="done-title">
        <span className={styles.heroDot} aria-hidden="true" />
        <h1 id="done-title" className={styles.heroTitle}>
          {TEXT.title(label)}
        </h1>
        <p className={styles.heroText}>{TEXT.line(receipt.amountLkr, receipt.party, event?.title ?? "")}</p>
        <div className={`${styles.chipRow} ${styles.heroChips}`}>
          <Chip tone="good">{TEXT.paid}</Chip>
          <Chip tone="neutral">{TEXT.receipt(receipt.id)}</Chip>
        </div>
        <div className={styles.heroActions}>
          <Link href={routes.receipt(receipt.id)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.viewReceipt}
          </Link>
          <Link href={routes.booking(receipt.requestId)} className={`${forms.bigButton} ${styles.plainButton}`}>
            {TEXT.backToBooking}
          </Link>
        </div>
      </section>
    </Columns>
  );
}
