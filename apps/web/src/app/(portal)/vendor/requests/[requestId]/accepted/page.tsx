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
import { day, lkr } from "@/lib/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "You are booked" };

const TEXT = {
  title: "You are booked",
  confirmed: "Confirmed",
  ref: (ref: string) => `Ref ${ref}`,
  told: (name: string, amount: string) => `${name} has been told. Their ${amount} deposit is due now; we will remind them and you.`,
  openBooking: "Open booking",
  message: (name: string) => `Message ${name}`,
  next: "Next steps",
  deposit: "Deposit",
  due: "Due",
  dueNow: (amount: string) => `${amount} · due now`,
  finalInstalment: "Final instalment",
  eventDay: "Event day",
} as const;

// "You are booked" (Figma V49, F49): right after accepting a request, with what happens next.
export default async function AcceptedPage({ params }: { params: Promise<{ requestId: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const { requestId } = await params;
  const state = await getProviderState(session);
  const request = state?.requests.find((x) => x.id === requestId);
  if (!state || !request) notFound();
  const booking = state.bookings.find((b) => b.id === request.bookingId);
  if (!booking) redirect(routes.vendorArea.request(request.id));
  const organiser = state.organisers.find((o) => o.id === request.organiserId)?.name ?? "";
  const [deposit, ...rest] = booking.payments;
  const last = rest.at(-1);

  const aside = (
    <Panel title={TEXT.next}>
      {deposit && (
        <div className={styles.tintRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.deposit}</span>
            <span className={hiring.sub}>{TEXT.dueNow(lkr(deposit.amountLkr))}</span>
          </span>
          <Chip tone="warn">{TEXT.due}</Chip>
        </div>
      )}
      {last && (
        <div className={styles.tintRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.finalInstalment}</span>
            <span className={hiring.sub}>{`${lkr(last.amountLkr)} · ${last.due ? day(last.due) : ""}`}</span>
          </span>
        </div>
      )}
      <div className={styles.tintRow}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.eventDay}</span>
          <span className={hiring.sub}>{`${day(booking.date)} · ${booking.times}`}</span>
        </span>
      </div>
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <section className={styles.done} aria-labelledby="done-title">
        <span className={styles.doneMark} aria-hidden="true">
          ✓
        </span>
        <h1 id="done-title" className={styles.doneTitle}>
          {TEXT.title}
        </h1>
        <p className={hiring.lede}>{`${booking.eventTitle} · ${booking.service} · ${day(booking.date)}`}</p>
        <span className={styles.inline}>
          <Chip tone="good">{TEXT.confirmed}</Chip>
          <span className={ui.rowTitle}>{TEXT.ref(booking.ref)}</span>
        </span>
        {deposit && <p className={styles.foot}>{TEXT.told(organiser, lkr(deposit.amountLkr))}</p>}
        <div className={styles.doneButtons}>
          <Link href={routes.vendorArea.booking(booking.id)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.openBooking}
          </Link>
          <Link href={`${routes.vendorArea.messages}?to=${request.organiserId}`} className={forms.bigButton}>
            {TEXT.message(organiser)}
          </Link>
        </div>
      </section>
    </Columns>
  );
}
