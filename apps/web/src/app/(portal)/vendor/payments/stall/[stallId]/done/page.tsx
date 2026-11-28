import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { lkr, organiserName } from "@/lib/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Stall fee paid" };

const TEXT = {
  title: "Stall fee paid",
  sub: (amount: string, who: string, event: string) => `${amount} to ${who} · ${event}`,
  paid: "Paid and confirmed",
  receipt: (id: string) => `Receipt ${id}`,
  viewReceipt: "View receipt",
  back: "Back to stalls",
  next: "Next",
  number: "Get your stall number",
  numberSub: (who: string) => `${who} assigns it`,
  listing: "Set up your listing",
  listingSub: "Items and prices for the map",
  testText: "Test payment, no real money · PayHere sandbox · nothing is charged",
} as const;

// "Stall fee paid" (Figma V79).
export default async function StallPaidPage({ params }: { params: Promise<{ stallId: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  if (session.role === "freelancer") redirect(routes.vendorArea.payments);
  const { stallId } = await params;
  const state = await getProviderState(session);
  const stall = state?.stalls.find((s) => s.id === stallId);
  const fee = stall?.application?.fee;
  if (!state || !stall || !fee) notFound();
  if (!fee.paidAt) redirect(routes.vendorArea.payStall(stall.id));
  const who = organiserName(state, stall.organiserId);

  return (
    <Columns
      aside={
        <Panel title={TEXT.next}>
          {!stall.application?.stall && (
            <div className={styles.tintRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{TEXT.number}</span>
                <span className={hiring.sub}>{TEXT.numberSub(who)}</span>
              </span>
            </div>
          )}
          <Link href={`${routes.vendorArea.listing}?stall=${stall.id}`} className={styles.tintRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{TEXT.listing}</span>
              <span className={hiring.sub}>{TEXT.listingSub}</span>
            </span>
          </Link>
        </Panel>
      }
    >
      <p className={styles.foot}>{TEXT.testText}</p>
      <section className={styles.done} aria-labelledby="done-title">
        <span className={styles.doneMark} aria-hidden="true">
          ✓
        </span>
        <h1 id="done-title" className={styles.doneTitle}>
          {TEXT.title}
        </h1>
        <p className={hiring.lede}>{TEXT.sub(lkr(stall.feeLkr), who, stall.eventTitle)}</p>
        <span className={styles.inline}>
          <Chip tone="good">{TEXT.paid}</Chip>
          {fee.receipt && <span className={ui.rowTitle}>{TEXT.receipt(fee.receipt)}</span>}
        </span>
        <div className={styles.doneButtons}>
          {fee.receipt && (
            <Link href={routes.vendorArea.receipt(fee.receipt)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
              {TEXT.viewReceipt}
            </Link>
          )}
          <Link href={routes.vendorArea.stalls} className={forms.bigButton}>
            {TEXT.back}
          </Link>
        </div>
      </section>
    </Columns>
  );
}
