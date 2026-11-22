import type { Metadata } from "next";
import Link from "next/link";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import forms from "@/components/portal/forms.module.css";
import books from "@/components/portal/hiring/Bookings.module.css";
import styles from "@/components/portal/hiring/Hiring.module.css";
import { TestBanner } from "@/components/portal/hiring/PaymentBits";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Payment did not go through" };

const TEXT = {
  title: "Payment did not go through",
  text: "The card was declined. Nothing was charged.",
  tryAgain: "Try again",
  outside: "Pay outside the app",
  reasons: "Common reasons",
  list: [
    ["Card declined", "Try another card"],
    ["Wrong CVV or expiry", ""],
    ["Session timed out", "After 10 minutes"],
  ],
} as const;

// "Payment did not go through" (Figma O65), after the sandbox's declined card. Paying outside
// the app goes back to the booking, where the provider marks it received.
export default async function PaymentFailedPage({ params }: { params: Promise<{ bookingId: string; part: string }> }) {
  await requireRole("organiser");
  const { bookingId, part } = await params;

  const aside = (
    <Panel title={TEXT.reasons}>
      {TEXT.list.map(([title, detail]) => (
        <div key={title} className={styles.whiteRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{title}</span>
            {detail && <span className={styles.sub}>{detail}</span>}
          </span>
        </div>
      ))}
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <TestBanner />
      <section className={styles.hero} aria-labelledby="failed-title" role="alert">
        <span className={books.failDot} aria-hidden="true">
          !
        </span>
        <h1 id="failed-title" className={styles.heroTitle}>
          {TEXT.title}
        </h1>
        <p className={styles.heroText}>{TEXT.text}</p>
        <div className={styles.heroActions}>
          <Link href={routes.payInstalment(bookingId, Number(part))} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.tryAgain}
          </Link>
          <Link href={routes.booking(bookingId)} className={`${forms.bigButton} ${styles.plainButton}`}>
            {TEXT.outside}
          </Link>
        </div>
      </section>
    </Columns>
  );
}
