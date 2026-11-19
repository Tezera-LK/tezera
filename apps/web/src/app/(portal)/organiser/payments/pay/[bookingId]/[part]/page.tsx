import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import forms from "@/components/portal/forms.module.css";
import books from "@/components/portal/hiring/Bookings.module.css";
import styles from "@/components/portal/hiring/Hiring.module.css";
import { TestBanner } from "@/components/portal/hiring/PaymentBits";
import shell from "@/components/portal/PortalShell.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { dayLabel, paymentStates } from "@/lib/bookings";
import { getBooking, getMyEvent, getProvider, listPayments } from "@/lib/data/portal";
import { formatCount } from "@/lib/format";
import { priceOf } from "@/lib/hiring";
import { routes } from "@/lib/routes";
import { failPayment, payInstalment } from "../../../actions";

export const metadata: Metadata = { title: "Pay instalment" };

const TEXT = {
  title: (label: string) => `Pay ${label.toLowerCase().startsWith("deposit") ? "deposit" : "instalment"}`,
  lede: (name: string, service: string, event: string) => [name, service, event].filter(Boolean).join(" · "),
  summary: "Summary",
  payment: "Payment",
  // "Instalment 1 of 2": instalments count without the deposit, as on O62
  paymentValue: (label: string, instalments: number) => (label.startsWith("Instalment") ? `${label} of ${instalments}` : label),
  paidTo: "Paid to",
  paidToValue: (name: string) => `${name} · their PayHere account`,
  due: "Due",
  total: "Total",
  checkout: "PayHere checkout",
  sandbox: "Sandbox",
  method: "How to pay",
  methods: [
    ["card", "Card"],
    ["ezcash", "eZ Cash"],
    ["bank", "Bank transfer"],
  ],
  number: "Card number",
  expiry: "Expiry",
  cvv: "CVV",
  name: "Name on card",
  otherMethod: "The sandbox completes eZ Cash and bank transfers straight away.",
  pay: (n: number) => `Pay LKR ${formatCount(n)} (test)`,
  fail: "Try a failed payment",
  noMoneyTitle: "No real money moves",
  noMoneyText: "The sandbox runs the whole flow so the instalment is marked paid on the booking.",
  booking: "Booking",
  bookingLine: (service: string, price: number) => `${service} · LKR ${formatCount(price)}`,
  errors: {
    method: "Pick how to pay.",
    number: "A card number has 16 digits. The sandbox takes 4242 4242 4242 4242.",
    expiry: "Add an expiry that hasn't passed, like 12 / 28.",
    cvv: "The CVV is the 3 or 4 digits on the back.",
    name: "Add the name on the card.",
    save: "That didn't go through. Saving needs the backend (EN-03).",
  } as Record<string, string>,
} as const;

type Props = { params: Promise<{ bookingId: string; part: string }>; searchParams: Promise<{ error?: string }> };

// Pay one instalment of a booking (Figma O62) through the PayHere sandbox. Card details are
// only checked for shape by the action; nothing is charged or kept.
export default async function PayInstalmentPage({ params, searchParams }: Props) {
  const session = await requireRole("organiser");
  const { bookingId, part } = await params;
  const error = (await searchParams).error;
  const booking = await getBooking(session, bookingId);
  if (!booking || booking.status !== "accepted") notFound();
  const states = paymentStates(booking, await listPayments(session), new Date());
  const index = Number(part);
  const state = states[index];
  if (!state) notFound();
  if (state.state === "paid" || state.state === "refunded") redirect(routes.booking(bookingId));
  const [provider, event] = await Promise.all([getProvider(session, booking.providerId), getMyEvent(session, booking.eventId)]);
  const service = booking.brief.service || provider?.role || "";

  const aside = (
    <>
      <div className={styles.notePanel}>
        <p className={styles.notePanelTitle}>{TEXT.noMoneyTitle}</p>
        <p className={tables.panelText}>{TEXT.noMoneyText}</p>
      </div>
      <Panel title={TEXT.booking}>
        <Link href={routes.booking(booking.id)} className={styles.whiteRow}>
          <Thumb size={32} radius={4} />
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{event?.title}</span>
            <span className={styles.sub}>{TEXT.bookingLine(service, priceOf(booking))}</span>
          </span>
        </Link>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={styles.pageHeadText}>
        <h1 className={styles.pageTitle}>{TEXT.title(state.label)}</h1>
        <p className={styles.lede}>{TEXT.lede(provider?.name ?? "", service.toLowerCase(), event?.title ?? "")}</p>
      </header>
      <TestBanner />

      <section className={books.card} aria-labelledby="summary-title">
        <h2 id="summary-title" className={styles.cardTitle}>
          {TEXT.summary}
        </h2>
        <dl className={styles.terms}>
          <dt>{TEXT.payment}</dt>
          <dd>{TEXT.paymentValue(state.label, states.filter((s) => s.label.startsWith("Instalment")).length)}</dd>
          <dt>{TEXT.paidTo}</dt>
          <dd>{TEXT.paidToValue(provider?.name ?? "")}</dd>
          <dt>{TEXT.due}</dt>
          <dd>{state.due ? dayLabel(state.due) : "Now"}</dd>
        </dl>
        <div className={books.totalRow}>
          <span>{TEXT.total}</span>
          <span className={books.bigAmount}>{`LKR ${formatCount(state.amountLkr)}`}</span>
        </div>
      </section>

      <form action={payInstalment.bind(null, booking.id, index)} className={`${forms.form} ${books.payForm}`}>
        {error && TEXT.errors[error] && (
          <p className={forms.alert} role="alert">
            {TEXT.errors[error]}
          </p>
        )}
        <section className={books.card} aria-labelledby="checkout-title">
          <div className={books.cardHead}>
            <h2 id="checkout-title" className={styles.cardTitle}>
              {TEXT.checkout}
            </h2>
            <span className={books.sandboxChip}>{TEXT.sandbox}</span>
          </div>
          <fieldset className={books.methods}>
            <legend className={shell.srOnly}>{TEXT.method}</legend>
            {TEXT.methods.map(([value, label]) => (
              <label key={value} className={books.method}>
                <input type="radio" name="method" value={value} defaultChecked={value === "card"} />
                {label}
              </label>
            ))}
          </fieldset>
          <div className={`${books.cardOnly} ${forms.card} ${books.flatCard}`}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.number}</span>
              <input name="number" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" className={forms.input} aria-invalid={error === "number" || undefined} />
            </label>
            <div className={forms.row2}>
              <label className={forms.field}>
                <span className={forms.label}>{TEXT.expiry}</span>
                <input name="expiry" autoComplete="cc-exp" placeholder="12 / 28" className={forms.input} aria-invalid={error === "expiry" || undefined} />
              </label>
              <label className={forms.field}>
                <span className={forms.label}>{TEXT.cvv}</span>
                <input name="cvv" type="password" inputMode="numeric" autoComplete="cc-csc" placeholder="•••" className={forms.input} aria-invalid={error === "cvv" || undefined} />
              </label>
            </div>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.name}</span>
              <input name="name" autoComplete="cc-name" className={forms.input} aria-invalid={error === "name" || undefined} />
            </label>
          </div>
          <p className={`${books.noticeText} ${books.notCard}`}>{TEXT.otherMethod}</p>
        </section>
        <div className={books.payActions}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.pay(state.amountLkr)}
          </button>
          <button type="submit" formAction={failPayment.bind(null, booking.id, index)} formNoValidate className={forms.bigButton}>
            {TEXT.fail}
          </button>
        </div>
      </form>
    </Columns>
  );
}
