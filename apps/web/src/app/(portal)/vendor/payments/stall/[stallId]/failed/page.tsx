import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Payment did not go through" };

const TEXT = {
  title: "Payment did not go through",
  declined: "The card was declined. Nothing was charged.",
  tryAgain: "Try again",
  outside: "Pay outside the app",
  outsideNote: "Pay the organiser directly; they mark the stall paid.",
  reasons: "Common reasons",
  list: [
    ["Card declined", "Try another card"],
    ["Wrong CVV or expiry", "Check the card details"],
    ["Session timed out", "After 10 minutes"],
  ],
  testText: "Test payment, no real money · PayHere sandbox · nothing is charged",
} as const;

// "Payment did not go through" (Figma V80): the sandbox's failed payment.
export default async function StallPayFailedPage({ params }: { params: Promise<{ stallId: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  if (session.role === "freelancer") redirect(routes.vendorArea.payments);
  const { stallId } = await params;

  return (
    <Columns
      aside={
        <Panel title={TEXT.reasons}>
          {TEXT.list.map(([title, sub]) => (
            <div key={title} className={styles.tintRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{title}</span>
                <span className={hiring.sub}>{sub}</span>
              </span>
            </div>
          ))}
        </Panel>
      }
    >
      <p className={styles.foot}>{TEXT.testText}</p>
      <section className={styles.done} aria-labelledby="done-title">
        <span className={`${styles.doneMark} ${styles.doneMarkBad}`} aria-hidden="true">
          !
        </span>
        <h1 id="done-title" className={styles.doneTitle}>
          {TEXT.title}
        </h1>
        <p className={hiring.lede}>{TEXT.declined}</p>
        <div className={styles.doneButtons}>
          <Link href={routes.vendorArea.payStall(stallId)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.tryAgain}
          </Link>
          <Link href={`${routes.vendorArea.messages}`} className={forms.bigButton} title={TEXT.outsideNote}>
            {TEXT.outside}
          </Link>
        </div>
      </section>
    </Columns>
  );
}
