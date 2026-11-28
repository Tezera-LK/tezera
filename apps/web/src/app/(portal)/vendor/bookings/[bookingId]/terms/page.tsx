import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { formatShortDate } from "@/lib/format";
import { lkr } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { proposeTerms } from "../../actions";

export const metadata: Metadata = { title: "Propose new terms" };

const TEXT = {
  title: "Propose new terms",
  mustAccept: (event: string, who: string) => `${event} · ${who} must accept before anything changes`,
  price: "Price",
  newPrice: "New price",
  current: "Current",
  paymentTerms: "Payment terms",
  receivedCannot: (on: string) => `Received ${on} · cannot change`,
  finalInstalment: "Final instalment",
  dueDate: "Due date",
  was: (amount: string) => `was ${amount}`,
  cancellationTerms: "Cancellation terms",
  keep: "Keep as they are",
  why: "Why the change",
  send: (who: string) => `Send to ${who}`,
  cancel: "Cancel",
  beforeAfter: "Before and after",
  cancellation: "Cancellation",
  noChange: "No change",
  errors: {
    price: "Enter the new price in rupees.",
    note: "Say why the terms are changing. The organiser sees it.",
    due: "The final instalment must be due before the event.",
    total: "What's already received plus the final instalment must add up to the new price.",
  } as Record<string, string>,
} as const;

type Props = { params: Promise<{ bookingId: string }>; searchParams: Promise<Record<string, string | undefined>> };

const digits = (v?: string) => Number((v ?? "").replace(/[^\d]/g, "")) || 0;

// "Propose new terms" (Figma V65, F65): a new price and final instalment, with a reason. Payments
// already received stay as they are; the organiser must accept before anything changes.
export default async function TermsPage({ params, searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  const { bookingId } = await params;
  const state = await getProviderState(session);
  const b = state?.bookings.find((x) => x.id === bookingId);
  if (!state || !b) notFound();
  if (b.cancelled || b.completedAt || b.termsChange) redirect(routes.vendorArea.booking(b.id));
  const who = state.organisers.find((o) => o.id === b.organiserId)?.name ?? "";
  const q = await searchParams;
  const received = b.payments.filter((p) => p.receivedAt);
  const open = b.payments.filter((p) => !p.receivedAt).at(-1);
  const receivedTotal = received.reduce((sum, p) => sum + p.amountLkr, 0);
  const price = q.price ?? String(b.priceLkr);
  const final = q.final ?? String(digits(price) - receivedTotal);
  const due = q.due ?? open?.due ?? "";

  const aside = (
    <Panel title={TEXT.beforeAfter}>
      <div className={styles.tintRow}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.price}</span>
          <span className={hiring.sub}>{`${lkr(b.priceLkr)} → ${lkr(digits(price))}`}</span>
        </span>
      </div>
      {open && (
        <div className={styles.tintRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.finalInstalment}</span>
            <span className={hiring.sub}>{`${lkr(open.amountLkr)} → ${lkr(digits(final))}`}</span>
          </span>
        </div>
      )}
      <div className={styles.tintRow}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.cancellation}</span>
          <span className={hiring.sub}>{TEXT.noChange}</span>
        </span>
      </div>
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.mustAccept(b.eventTitle, who)}</p>
      </header>
      {q.error && TEXT.errors[q.error] && (
        <p className={forms.error} role="alert">
          {TEXT.errors[q.error]}
        </p>
      )}
      <form action={proposeTerms.bind(null, b.id)} className={styles.stack}>
        <section className={forms.card} aria-labelledby="price-title">
          <h2 id="price-title" className={hiring.cardTitle}>
            {TEXT.price}
          </h2>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.newPrice}</span>
              <input name="price" inputMode="numeric" required defaultValue={price} className={forms.input} />
            </label>
            <div className={forms.field}>
              <span className={forms.label}>{TEXT.current}</span>
              <span className={`${forms.input} ${styles.inline}`}>{lkr(b.priceLkr)}</span>
            </div>
          </div>
        </section>
        <section className={forms.card} aria-labelledby="pay-title">
          <h2 id="pay-title" className={hiring.cardTitle}>
            {TEXT.paymentTerms}
          </h2>
          {received.map((p) => (
            <div key={p.label} className={styles.greyRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{`${p.label} · ${lkr(p.amountLkr)}`}</span>
                <span className={hiring.sub}>{TEXT.receivedCannot(formatShortDate(p.receivedAt ?? ""))}</span>
              </span>
            </div>
          ))}
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.finalInstalment}</span>
              <input name="final" inputMode="numeric" required defaultValue={final} className={forms.input} />
              {open && <span className={forms.hint}>{TEXT.was(lkr(open.amountLkr))}</span>}
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.dueDate}</span>
              <input name="due" type="date" required defaultValue={due} max={b.date} className={forms.input} />
            </label>
          </div>
        </section>
        <section className={forms.card} aria-labelledby="cancel-title">
          <h2 id="cancel-title" className={hiring.cardTitle}>
            {TEXT.cancellationTerms}
          </h2>
          <p className={styles.foot}>{TEXT.keep}</p>
        </section>
        <section className={forms.card} aria-labelledby="why-title">
          <label className={forms.field}>
            <span id="why-title" className={hiring.cardTitle}>
              {TEXT.why}
            </span>
            <textarea name="note" rows={3} required defaultValue={q.note ?? ""} className={forms.input} />
          </label>
        </section>
        <div className={styles.pair}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.send(who)}
          </button>
          <Link href={routes.vendorArea.booking(b.id)} className={forms.bigButton}>
            {TEXT.cancel}
          </Link>
        </div>
      </form>
    </Columns>
  );
}
