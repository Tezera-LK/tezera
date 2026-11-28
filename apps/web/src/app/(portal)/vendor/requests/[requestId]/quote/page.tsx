import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { day, lkr } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { sendQuote } from "../../actions";

export const metadata: Metadata = { title: "Send your own quote" };

const TEXT = {
  title: "Send your own quote",
  replyTo: (name: string, event: string, date: string) => `Reply to ${name} · ${event}, ${date}`,
  price: "Price",
  yourPrice: "Your price",
  includes: "What it includes",
  theirBudget: (amount: string) => `Their budget is ${amount}`,
  paymentTerms: "Payment terms",
  replaceTheirs: "Your terms replace theirs if they accept",
  deposit: "Deposit",
  depositPercent: "Deposit (% of the price)",
  depositDue: "Deposit due",
  whenAccept: "When they accept",
  instalment: (n: number) => `Instalment ${n}`,
  dueDate: "Due date",
  mustBeBefore: (date: string) => `Must be before the event on ${date}`,
  addInstalment: "+ Add an instalment",
  cancellationTerms: "Cancellation terms",
  cancel7: "If the organiser cancels within 7 days",
  cancel72: "If the organiser cancels within 72 hours",
  cancelYou: "If you cancel",
  message: "Message to the organiser",
  send: "Send quote",
  cancel: "Cancel",
  seesTitle: (name: string) => `What ${name} sees`,
  quote: "Quote",
  cancellation: "Cancellation",
  yourTerms: "Your terms",
  happensTitle: "What happens next",
  happens: "If they accept, the booking is confirmed on your terms. If they decline, the request closes and you are told.",
  errors: {
    price: "Enter your price in rupees.",
    deposit: "The deposit is a share of the price, from 0 to 100%.",
    instalment: "Each instalment needs an amount and a due date.",
    due: "Every instalment must be due before the event.",
    total: "The payments do not add up",
  } as Record<string, string>,
  totalText: (paid: string, price: string) => `Deposit and instalments come to ${paid}, but your price is ${price}.`,
} as const;

type Props = {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

const digits = (value: string | undefined) => Number((value ?? "").replace(/[^\d]/g, "")) || 0;

// "Send your own quote" (Figma V09, F09): price, payment terms, cancellation terms and a message.
// The server checks the payments add up (V55) and comes back here with what was typed.
export default async function QuotePage({ params, searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  const { requestId } = await params;
  const state = await getProviderState(session);
  const request = state?.requests.find((x) => x.id === requestId);
  if (!state || !request) notFound();
  if (request.status === "accepted" || request.status === "declined") redirect(routes.vendorArea.request(request.id));
  const organiser = state.organisers.find((o) => o.id === request.organiserId);
  const q = await searchParams;

  // what to show in each field: what was typed, the quote being edited, or a starting point
  const editing = request.quote;
  const startPrice = Math.round(request.budgetLkr * 1.0833 / 1000) * 1000;
  const price = q.price ?? String(editing?.priceLkr ?? startPrice);
  const depositPercent = q.depositPercent ?? String(editing?.payments[0]?.percent ?? 40);
  const firstInstalment = editing?.payments[1];
  const instalment1 = q.instalment1 ?? String(firstInstalment?.amountLkr ?? digits(price) - Math.round((digits(price) * digits(depositPercent)) / 100));
  const lastPayment = request.payments.at(-1);
  const due1 = q.due1 ?? firstInstalment?.due ?? lastPayment?.due ?? "";
  const showSecond = Boolean(q.instalment2 || q.due2 || q.add === "1" || editing?.payments[2]);
  const depositLkr = Math.round((digits(price) * digits(depositPercent)) / 100);
  const paid = depositLkr + digits(instalment1) + digits(q.instalment2 ?? (editing?.payments[2] ? String(editing.payments[2].amountLkr) : ""));
  const error = q.error;

  const aside = (
    <>
      <Panel title={TEXT.seesTitle(organiser?.name ?? "")}>
        <div className={styles.tintRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{`${state.profile.name} ✓`}</span>
            <span className={hiring.sub}>{`★ ${state.profile.rating} · ${state.profile.badge} · ${state.profile.category}`}</span>
          </span>
        </div>
        <dl className={`${events.facts} ${styles.tintRow}`}>
          <dt>{TEXT.quote}</dt>
          <dd>{lkr(digits(price))}</dd>
          <dt>{`${TEXT.deposit} ${digits(depositPercent)}%`}</dt>
          <dd>{`${lkr(depositLkr)} on accept`}</dd>
          <dt>{TEXT.instalment(1)}</dt>
          <dd>{`${lkr(digits(instalment1))}${due1 ? ` · ${day(due1)}` : ""}`}</dd>
          <dt>{TEXT.cancellation}</dt>
          <dd>{TEXT.yourTerms}</dd>
        </dl>
      </Panel>
      <Panel title={TEXT.happensTitle}>
        <p className={styles.foot}>{TEXT.happens}</p>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.replyTo(organiser?.name ?? "", request.eventTitle, day(request.date))}</p>
      </header>

      {error === "total" && (
        <div className={`${styles.banner} ${styles.dangerBanner}`} role="alert">
          <span className={styles.bannerText}>
            <span className={ui.rowTitle}>{TEXT.errors.total}</span>
            <span className={hiring.sub}>{TEXT.totalText(lkr(paid), lkr(digits(price)))}</span>
          </span>
        </div>
      )}
      {error && error !== "total" && TEXT.errors[error] && (
        <p className={forms.error} role="alert">
          {TEXT.errors[error]}
        </p>
      )}

      <form action={sendQuote.bind(null, request.id)} className={styles.stack}>
        <section className={forms.card} aria-labelledby="price-title">
          <h2 id="price-title" className={hiring.cardTitle}>
            {TEXT.price}
          </h2>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.yourPrice}</span>
              <input name="price" inputMode="numeric" required defaultValue={price} className={forms.input} />
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.includes}</span>
              <input name="includes" defaultValue={q.includes ?? editing?.includes ?? ""} className={forms.input} />
            </label>
          </div>
          <p className={forms.hint}>{TEXT.theirBudget(lkr(request.budgetLkr))}</p>
        </section>

        <section className={forms.card} aria-labelledby="pay-title">
          <div className={hiring.cardHead}>
            <h2 id="pay-title" className={hiring.cardTitle}>
              {TEXT.paymentTerms}
            </h2>
            <span className={hiring.sub}>{TEXT.replaceTheirs}</span>
          </div>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.depositPercent}</span>
              <input name="depositPercent" inputMode="numeric" required defaultValue={depositPercent} className={forms.input} />
              <span className={forms.hint}>{lkr(depositLkr)}</span>
            </label>
            <div className={forms.field}>
              <span className={forms.label}>{TEXT.depositDue}</span>
              <span className={`${forms.input} ${styles.inline}`}>{TEXT.whenAccept}</span>
            </div>
          </div>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.instalment(1)}</span>
              <input name="instalment1" inputMode="numeric" required defaultValue={instalment1} className={forms.input} />
              {error === "total" && <span className={forms.error}>{`${lkr(digits(price) - paid)} short. Should be ${lkr(digits(price) - depositLkr - digits(q.instalment2))}.`}</span>}
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.dueDate}</span>
              <input name="due1" type="date" required defaultValue={due1} max={request.date} className={forms.input} />
              {error === "due" && <span className={forms.error}>{TEXT.mustBeBefore(day(request.date))}</span>}
            </label>
          </div>
          {showSecond ? (
            <div className={forms.row2}>
              <label className={forms.field}>
                <span className={forms.label}>{TEXT.instalment(2)}</span>
                <input name="instalment2" inputMode="numeric" defaultValue={q.instalment2 ?? (editing?.payments[2] ? String(editing.payments[2].amountLkr) : "")} className={forms.input} />
              </label>
              <label className={forms.field}>
                <span className={forms.label}>{TEXT.dueDate}</span>
                <input name="due2" type="date" defaultValue={q.due2 ?? editing?.payments[2]?.due ?? ""} max={request.date} className={forms.input} />
              </label>
            </div>
          ) : (
            <Link href={`${routes.vendorArea.quote(request.id)}?add=1`} scroll={false} className={ui.textLink}>
              {TEXT.addInstalment}
            </Link>
          )}
        </section>

        <section className={forms.card} aria-labelledby="cancel-title">
          <h2 id="cancel-title" className={hiring.cardTitle}>
            {TEXT.cancellationTerms}
          </h2>
          <Term name="cancel7" label={TEXT.cancel7} value={q.cancel7 ?? "You keep the deposit"} />
          <Term name="cancel72" label={TEXT.cancel72} value={q.cancel72 ?? "You keep 50% of the total"} />
          <Term name="cancelYou" label={TEXT.cancelYou} value={q.cancelYou ?? "Full refund of anything paid"} />
        </section>

        <section className={forms.card} aria-labelledby="message-title">
          <label className={forms.field}>
            <span id="message-title" className={hiring.cardTitle}>
              {TEXT.message}
            </span>
            <textarea name="message" rows={3} defaultValue={q.message ?? editing?.message ?? ""} className={forms.input} />
          </label>
        </section>

        <div className={styles.pair}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.send}
          </button>
          <Link href={routes.vendorArea.request(request.id)} className={forms.bigButton}>
            {TEXT.cancel}
          </Link>
        </div>
      </form>
    </Columns>
  );
}

// One cancellation term: who cancels when, and what happens (V09).
function Term({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <label className={styles.greyRow}>
      <span className={ui.rowText}>
        <span className={ui.rowTitle}>{label}</span>
      </span>
      <input name={name} defaultValue={value} className={`${forms.input} ${styles.termInput}`} aria-label={label} />
    </label>
  );
}
