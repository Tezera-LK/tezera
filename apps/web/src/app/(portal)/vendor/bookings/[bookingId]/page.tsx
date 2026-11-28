import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip, { type ChipTone } from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import Choice from "@/components/portal/provider/Choice";
import styles from "@/components/portal/provider/Provider.module.css";
import Step from "@/components/portal/provider/Step";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { OrganiserCard, ProviderBooking, ProviderPayment, ProviderState } from "@/lib/data/provider-types";
import { formatDayMonth, formatShortDate, formatTime } from "@/lib/format";
import {
  CANCEL_REASONS,
  PAYMENT_METHODS,
  PROBLEM_REASONS,
  bookingTab,
  day,
  daysUntil,
  lkr,
  paymentState,
  paymentTitle,
  shortDay,
  stillDue,
} from "@/lib/provider";
import { routes } from "@/lib/routes";
import { answerTerms, cancelThisBooking, markReceived, reportProblem, sendReminder, withdrawTerms } from "../actions";

export const metadata: Metadata = { title: "Booking" };

const TEXT = {
  booked: (who: string, on: string, ref: string) => `${who} · booked ${on} · ref ${ref}`,
  refOnly: (who: string, on: string, ref: string) => `${who} · ${on} · ref ${ref}`,
  chip: {
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    change: "Change proposed",
    completed: "Completed",
  },
  overdueChip: (what: string) => `${what} overdue`,
  agreed: "Agreed",
  service: "Service",
  dateTimes: "Date and times",
  venue: "Venue",
  price: "Price",
  paymentTerms: "Payment terms",
  cancellationTerms: "Cancellation terms",
  receipt: "Receipt",
  markReceived: "Mark received",
  received: (on: string) => `Received ${on}`,
  dueOn: (amount: string, on: string) => `${amount} · due ${on}`,
  dueOnConfirm: (amount: string) => `${amount} · due on confirm`,
  stateChip: { received: "", overdue: "Overdue", due: "Due", upcoming: "Upcoming" },
  changeTerms: "Change terms",
  messageOrganiser: "Message organiser",
  report: "Report a problem",
  cancelBooking: "Cancel booking",
  timeline: "Timeline",
  requestReceived: "Request received",
  youAccepted: "You accepted",
  depositReceived: "Deposit received",
  finalInstalment: "Final instalment",
  eventDay: "Event day",
  organiserCompletes: "Organiser marks completed",
  thenReviews: "Then reviews open for both sides",
  next: "Next",
  due: (on: string) => `Due ${on}`,
  organiser: "Organiser",
  paidOnTime: (r: number, pct: number) => `★ ${r} · ${pct}% paid on time`,
  openChat: "Open chat",
  reported: "Report sent. An admin looks at it with the booking history.",
  reminded: "Reminder sent to the organiser by push and email.",
  // V64
  youCancelledOn: (on: string) => `You cancelled this booking on ${on}`,
  organiserCancelledOn: (on: string) => `The organiser cancelled this booking on ${on}`,
  reasonTold: (reason: string, who: string) => `Reason: ${reason.toLowerCase()} · ${who} has been told`,
  money: "Money",
  refunded: "Refunded",
  depositRefunded: "Deposit refunded",
  refundedTo: (amount: string, who: string, on: string) => `${amount} · to ${who} · ${on}`,
  noLongerDue: (amount: string) => `${amount} · no longer due`,
  cancelledChip: "Cancelled",
  onRecord: "On your record",
  lateCancel: "Late cancellation",
  noLateCancel: "No late cancellation",
  cancelledDaysBefore: (n: number) => `Cancelled ${n} days before the event`,
  inside7: "Inside 7 days it would show on your profile.",
  reopenTitle: "The organiser can reopen the job",
  reopenText: (who: string) => `${who} may post it as a job post for other providers.`,
  message: (who: string) => `Message ${who}`,
  // V66
  waitingForThem: (who: string) => `Waiting for ${who} to accept your new terms`,
  sentKeep: (on: string) => `Sent ${on} · the current terms stay until they accept`,
  withdraw: "Withdraw",
  proposed: "Proposed change",
  newChip: "New",
  ifDeclineTitle: "What if they decline?",
  ifDeclineText: "The booking carries on with the current terms. You can talk it through in chat.",
  // V67
  wantsChange: (who: string) => `${who} wants to change the terms`,
  nothingChanges: "Nothing changes unless you accept.",
  theirProposal: "Their proposal",
  date: "Date",
  finalDue: "Final instalment due",
  changed: "Changed",
  same: "Same",
  theirNote: "Their note:",
  freeOn: (d: string) => `Are you free on ${d}?`,
  free: "Free",
  busy: "Busy",
  fromCalendar: "From your availability calendar.",
  acceptTerms: "Accept new terms",
  decline: "Decline",
  chatFirst: "Chat first",
  ifYouDecline: "If you decline",
  ifYouDeclineText: (d: string) => `The booking stays on ${d}. If the event cannot happen that day, either side can cancel under the cancellation terms.`,
  // V69
  markedCompleted: (who: string) => `${who} marked this booking completed`,
  reviewsOpen: (on: string, until: string) => `${on} · reviews are open for both sides until ${until}`,
  writeReview: "Write your review ›",
  payments: "Payments",
  reviewWho: (who: string) => `Review ${who}`,
  bookAgain: "Book again? Message them",
  theirReview: "Their review of you",
  theirReviewText: (who: string, n: number) => `${who} has ${n} days left to review you. You will see it once they post it.`,
  paidInFull: "Paid in full",
  onTime: "on time",
  reviewed: "Reviewed ✓",
  // V73
  overdueTitle: (what: string, n: number) => `The ${what.toLowerCase()} is ${n} day${n === 1 ? "" : "s"} overdue`,
  overdueText: (amount: string, on: string, who: string) => `${amount} was due ${on}. We reminded ${who} today.`,
  sendReminder: "Send a reminder",
  options: "Your options",
  optionsText: "You can cancel under the booking's terms if the deposit is not paid. It will not count as a late cancellation.",
  // dialogs
  close: "Close",
  cancelTitle: "Cancel this booking?",
  daysAway: (n: number) => `${n} days away`,
  reason: "Reason",
  noteTo: (who: string) => `Note to ${who}`,
  whatHappens: "What happens, by the booking terms",
  refundToThem: "Refund to them",
  refundAmount: (amount: string) => `${amount}, in full`,
  nothingPaid: "Nothing was paid yet",
  yourProfile: "Your profile",
  lateNote: "Late cancellation (within 7 days of the event)",
  notLateNote: "No late cancellation (more than 7 days out)",
  calendar: "Calendar",
  setFree: (d: string) => `${d} set free again`,
  keep: "Keep booking",
  reasonError: "Pick a reason.",
  receivedTitle: "Mark this instalment received?",
  amount: "Amount",
  receivedOn: "Received on",
  how: "How",
  reference: "Reference (optional)",
  onlyWhen: "Only mark it when the money is in your account. A receipt goes to both sides.",
  fieldsError: "Fill in the date and how it was paid.",
  cancel: "Cancel",
  reportTitle: "Report a problem",
  reportSub: (event: string) => `${event} · an admin sees the full booking history`,
  whatHappened: "What happened",
  sendReport: "Send report",
  reportError: "Pick a reason and say what happened.",
  attach: "+ Attach",
  attachNote: "Files can be attached once storage is connected (EN-03).",
} as const;

type Props = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ dialog?: string; part?: string; error?: string; reported?: string; reminded?: string }>;
};

// One booking (Figma V13, F13) in each of its states: confirmed, cancelled (V64), new terms waiting
// for the organiser (V66), new terms from the organiser (V67), completed (V69) and a payment
// overdue (V73). Cancel (V63), Mark received (V68) and Report (V72) open as dialogs with ?dialog=.
export default async function BookingPage({ params, searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  const { bookingId } = await params;
  const state = await getProviderState(session);
  const b = state?.bookings.find((x) => x.id === bookingId);
  if (!state || !b) notFound();
  const o = state.organisers.find((x) => x.id === b.organiserId);
  if (!o) notFound();
  const q = await searchParams;
  const now = new Date();
  const here = routes.vendorArea.booking(b.id);
  const live = !b.cancelled && bookingTab(b, now) === "upcoming";
  const overdue = live ? stillDue(b).find((p) => paymentState(p, now) === "overdue") : undefined;
  const partIndex = Number(q.part);
  const part = Number.isInteger(partIndex) ? b.payments[partIndex] : undefined;

  const notices = (
    <>
      {q.reported && (
        <p className={styles.foot} role="status">
          {TEXT.reported}
        </p>
      )}
      {q.reminded && (
        <p className={styles.foot} role="status">
          {TEXT.reminded}
        </p>
      )}
    </>
  );

  let page: React.ReactNode;
  if (b.cancelled) page = <Cancelled b={b} o={o} state={state} />;
  else if (b.completedAt || !live) page = <Completed b={b} o={o} state={state} now={now} />;
  else if (b.termsChange?.from === "organiser") page = <TheirTerms b={b} o={o} state={state} />;
  else if (b.termsChange?.from === "you") page = <YourTerms b={b} o={o} />;
  else if (overdue) page = <Overdue b={b} o={o} payment={overdue} now={now} here={here} notices={notices} />;
  else page = <Confirmed b={b} o={o} state={state} now={now} here={here} notices={notices} />;

  return (
    <>
      {page}
      {q.dialog === "cancel" && live && <CancelDialog b={b} o={o} now={now} close={here} error={q.error} />}
      {q.dialog === "received" && live && part && !part.receivedAt && (
        <ReceivedDialog b={b} o={o} index={partIndex} part={part} now={now} close={here} error={q.error} />
      )}
      {q.dialog === "report" && (
        <Dialog title={TEXT.reportTitle} subtitle={TEXT.reportSub(b.eventTitle)} closeHref={here} closeLabel={TEXT.close} narrow>
          <form action={reportProblem.bind(null, b.id)} className={tables.dialogForm}>
            <fieldset className={hiring.plainFieldset}>
              <legend className={forms.label}>{TEXT.reason}</legend>
              {PROBLEM_REASONS.map((r) => (
                <Choice key={r} type="radio" name="reason" value={r} title={r} required />
              ))}
            </fieldset>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.whatHappened}</span>
              <textarea name="text" rows={3} required className={forms.input} />
            </label>
            <span className={`${ui.textLink} ${ui.soon}`} title={TEXT.attachNote}>
              {TEXT.attach}
            </span>
            {q.error === "fields" && <p className={forms.error}>{TEXT.reportError}</p>}
            <div className={tables.dialogActions}>
              <Link href={here} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
                {TEXT.cancel}
              </Link>
              <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                {TEXT.sendReport}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}

function Head({ b, o, chip, tone, short }: { b: ProviderBooking; o: OrganiserCard; chip: string; tone: ChipTone; short?: boolean }) {
  return (
    <header className={hiring.pageHead}>
      <div className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{`${b.eventTitle} · ${b.service}`}</h1>
        <p className={hiring.lede}>{short ? TEXT.refOnly(o.name, day(b.date), b.ref) : TEXT.booked(o.name, formatShortDate(b.bookedAt), b.ref)}</p>
      </div>
      <Chip tone={tone}>{chip}</Chip>
    </header>
  );
}

function Agreed({ b, price }: { b: ProviderBooking; price?: React.ReactNode }) {
  return (
    <section className={events.card} aria-labelledby="agreed-title">
      <h2 id="agreed-title" className={hiring.cardTitle}>
        {TEXT.agreed}
      </h2>
      <dl className={events.facts}>
        <dt>{TEXT.service}</dt>
        <dd>{b.serviceDetail}</dd>
        <dt>{TEXT.dateTimes}</dt>
        <dd>{`${day(b.date)} · ${b.times}`}</dd>
        <dt>{TEXT.venue}</dt>
        <dd>{b.venue}</dd>
        <dt>{TEXT.price}</dt>
        <dd>{price ?? lkr(b.priceLkr)}</dd>
      </dl>
    </section>
  );
}

// The receipt for a received payment, from Payments (V70).
function receiptFor(state: ProviderState, b: ProviderBooking, p: ProviderPayment) {
  return state.money.find((m) => m.bookingId === b.id && m.amountLkr === p.amountLkr && m.kind === "received");
}

function PaymentRows({ b, now, here, state }: { b: ProviderBooking; now: Date; here: string; state?: ProviderState }) {
  return (
    <>
      {b.payments.map((p, i) => {
        const s = paymentState(p, now);
        const receipt = state ? receiptFor(state, b, p) : undefined;
        return (
          <div key={p.label} className={styles.greyRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{paymentTitle(p)}</span>
              <span className={hiring.sub}>{p.due ? TEXT.dueOn(lkr(p.amountLkr), day(p.due)) : TEXT.dueOnConfirm(lkr(p.amountLkr))}</span>
            </span>
            {s === "received" && p.receivedAt ? (
              <>
                <Chip tone="good">{TEXT.received(formatShortDate(p.receivedAt))}</Chip>
                {receipt && (
                  <Link href={routes.vendorArea.receipt(receipt.id)} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                    {TEXT.receipt}
                  </Link>
                )}
              </>
            ) : (
              <>
                <Chip tone={s === "overdue" ? "danger" : s === "due" ? "warn" : "neutral"}>{TEXT.stateChip[s]}</Chip>
                <Link href={`${here}?dialog=received&part=${i}`} scroll={false} className={`${ui.rowButton} ${s === "upcoming" ? ui.rowButtonWhite : ui.rowButtonPrimary}`}>
                  {TEXT.markReceived}
                </Link>
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

function OrganiserBox({ o }: { o: OrganiserCard }) {
  return (
    <Panel title={TEXT.organiser}>
      <Link href={routes.vendorArea.organiser(o.id)} className={hiring.whiteRow}>
        <Thumb size={40} shape="round" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{o.name}</span>
          <span className={hiring.sub}>{TEXT.paidOnTime(o.rating, o.paidOnTime)}</span>
        </span>
      </Link>
      <Link href={`${routes.vendorArea.messages}?to=${o.id}`} className={ui.wideButton}>
        {TEXT.openChat}
      </Link>
    </Panel>
  );
}

// V13: the confirmed booking with its payments, terms and timeline.
function Confirmed({ b, o, state, now, here, notices }: { b: ProviderBooking; o: OrganiserCard; state: ProviderState; now: Date; here: string; notices: React.ReactNode }) {
  const [deposit, ...rest] = b.payments;
  const last = rest.at(-1);
  const nextDue = stillDue(b)[0];
  const aside = (
    <>
      <Panel title={TEXT.timeline}>
        <ol className={styles.steps}>
          <Step title={TEXT.requestReceived} sub={`${formatShortDate(b.bookedAt)} · ${formatTime(b.bookedAt)}`} done />
          <Step title={TEXT.youAccepted} sub={`${formatShortDate(b.bookedAt)} · ${formatTime(b.bookedAt)}`} done />
          {deposit && (
            <Step
              title={TEXT.depositReceived}
              sub={deposit.receivedAt ? `${formatShortDate(deposit.receivedAt)} · ${lkr(deposit.amountLkr)}` : TEXT.due(deposit.due ? shortDay(deposit.due) : "now")}
              done={Boolean(deposit.receivedAt)}
              next={!deposit.receivedAt && nextDue === deposit ? TEXT.next : undefined}
            />
          )}
          {last && (
            <Step
              title={TEXT.finalInstalment}
              sub={last.receivedAt ? `${formatShortDate(last.receivedAt)} · ${lkr(last.amountLkr)}` : TEXT.due(last.due ? shortDay(last.due) : "")}
              done={Boolean(last.receivedAt)}
              next={!last.receivedAt && nextDue === last ? TEXT.next : undefined}
            />
          )}
          <Step title={TEXT.eventDay} sub={day(b.date)} />
          <Step title={TEXT.organiserCompletes} sub={TEXT.thenReviews} />
        </ol>
      </Panel>
      <OrganiserBox o={o} />
    </>
  );
  return (
    <Columns aside={aside}>
      <Head b={b} o={o} chip={TEXT.chip.confirmed} tone="good" />
      {notices}
      <Agreed b={b} />
      <section className={events.card} aria-labelledby="pay-title">
        <h2 id="pay-title" className={hiring.cardTitle}>
          {TEXT.paymentTerms}
        </h2>
        <PaymentRows b={b} now={now} here={here} state={state} />
      </section>
      <section className={events.card} aria-labelledby="cancel-title">
        <h2 id="cancel-title" className={hiring.cardTitle}>
          {TEXT.cancellationTerms}
        </h2>
        <p className={styles.foot}>{b.cancellation.organiser}</p>
        <p className={styles.foot}>{b.cancellation.provider}</p>
      </section>
      <div className={styles.buttonRow}>
        <Link href={routes.vendorArea.changeTerms(b.id)} className={forms.bigButton}>
          {TEXT.changeTerms}
        </Link>
        <Link href={`${routes.vendorArea.messages}?to=${o.id}`} className={forms.bigButton}>
          {TEXT.messageOrganiser}
        </Link>
        <Link href={`${here}?dialog=report`} scroll={false} className={forms.bigButton}>
          {TEXT.report}
        </Link>
        <Link href={`${here}?dialog=cancel`} scroll={false} className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
          {TEXT.cancelBooking}
        </Link>
      </div>
    </Columns>
  );
}

// V73: a payment past its due date.
function Overdue({ b, o, payment, now, here, notices }: { b: ProviderBooking; o: OrganiserCard; payment: ProviderPayment; now: Date; here: string; notices: React.ReactNode }) {
  const late = -daysUntil(payment.due ?? b.date, now);
  const aside = (
    <>
      <Panel title={TEXT.options}>
        <p className={styles.foot}>{TEXT.optionsText}</p>
        <Link href={`${here}?dialog=cancel`} scroll={false} className={ui.wideButton}>
          {TEXT.cancelBooking}
        </Link>
      </Panel>
      <OrganiserBox o={o} />
    </>
  );
  return (
    <Columns aside={aside}>
      <Head b={b} o={o} chip={TEXT.overdueChip(payment.label)} tone="danger" short />
      {notices}
      <div className={`${styles.banner} ${styles.dangerBanner}`}>
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{TEXT.overdueTitle(payment.label, late)}</span>
          <span className={hiring.sub}>{TEXT.overdueText(lkr(payment.amountLkr), payment.due ? day(payment.due) : "", o.name)}</span>
        </span>
      </div>
      <section className={events.card} aria-labelledby="pay-title">
        <h2 id="pay-title" className={hiring.cardTitle}>
          {TEXT.paymentTerms}
        </h2>
        <PaymentRows b={b} now={now} here={here} />
      </section>
      <div className={styles.buttonRow}>
        <form action={sendReminder.bind(null, b.id)} className={styles.formFill}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.sendReminder}
          </button>
        </form>
        <Link href={`${routes.vendorArea.messages}?to=${o.id}`} className={forms.bigButton}>
          {TEXT.message(o.name)}
        </Link>
        <Link href={`${here}?dialog=report`} scroll={false} className={forms.bigButton}>
          {TEXT.report}
        </Link>
      </div>
    </Columns>
  );
}

// V64: cancelled, with what happened to the money and the provider's record.
function Cancelled({ b, o, state }: { b: ProviderBooking; o: OrganiserCard; state: ProviderState }) {
  const c = b.cancelled;
  if (!c) return null;
  const daysBefore = Math.max(0, Math.round((Date.parse(`${b.date}T12:00:00+05:30`) - Date.parse(c.at)) / 86_400_000));
  const late = c.by === "you" && daysBefore < 7;
  const paid = b.payments.filter((p) => p.receivedAt);
  const unpaid = b.payments.filter((p) => !p.receivedAt);
  const refundReceipt = state.money.find((m) => m.bookingId === b.id);
  const aside = (
    <>
      {c.by === "you" && (
        <Panel title={TEXT.onRecord}>
          <div className={styles.tintRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{late ? TEXT.lateCancel : TEXT.noLateCancel}</span>
              <span className={hiring.sub}>{TEXT.cancelledDaysBefore(daysBefore)}</span>
            </span>
          </div>
          <p className={styles.foot}>{TEXT.inside7}</p>
        </Panel>
      )}
      <Panel title={TEXT.reopenTitle}>
        <p className={styles.foot}>{TEXT.reopenText(o.name)}</p>
      </Panel>
    </>
  );
  return (
    <Columns aside={aside}>
      <Head b={b} o={o} chip={TEXT.chip.cancelled} tone="neutral" />
      <div className={`${styles.banner} ${styles.infoBanner}`}>
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{c.by === "you" ? TEXT.youCancelledOn(formatDayMonth(c.at)) : TEXT.organiserCancelledOn(formatDayMonth(c.at))}</span>
          <span className={hiring.sub}>{TEXT.reasonTold(c.reason, c.by === "you" ? o.name : "you")}</span>
        </span>
      </div>
      <Agreed b={b} />
      <section className={events.card} aria-labelledby="money-title">
        <h2 id="money-title" className={hiring.cardTitle}>
          {TEXT.money}
        </h2>
        {paid.map((p) => (
          <div key={p.label} className={styles.greyRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{p.label === "Deposit" ? TEXT.depositRefunded : `${p.label} refunded`}</span>
              <span className={hiring.sub}>{TEXT.refundedTo(lkr(p.amountLkr), o.name, formatShortDate(c.at))}</span>
            </span>
            <Chip tone="neutral">{TEXT.refunded}</Chip>
            {refundReceipt && (
              <Link href={routes.vendorArea.receipt(refundReceipt.id)} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                {TEXT.receipt}
              </Link>
            )}
          </div>
        ))}
        {unpaid.map((p) => (
          <div key={p.label} className={styles.greyRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{p.label}</span>
              <span className={hiring.sub}>{TEXT.noLongerDue(lkr(p.amountLkr))}</span>
            </span>
            <Chip tone="neutral">{TEXT.cancelledChip}</Chip>
          </div>
        ))}
      </section>
      <Link href={`${routes.vendorArea.messages}?to=${o.id}`} className={forms.bigButton}>
        {TEXT.message(o.name)}
      </Link>
    </Columns>
  );
}

// V66: the provider's new terms, waiting for the organiser.
function YourTerms({ b, o }: { b: ProviderBooking; o: OrganiserCard }) {
  const change = b.termsChange;
  if (!change) return null;
  const oldFinal = b.payments.filter((p) => !p.receivedAt).at(-1);
  const newFinal = change.payments.filter((p) => !p.receivedAt).at(-1);
  const aside = (
    <Panel title={TEXT.ifDeclineTitle}>
      <p className={styles.foot}>{TEXT.ifDeclineText}</p>
      <Link href={`${routes.vendorArea.messages}?to=${o.id}`} className={ui.wideButton}>
        {TEXT.openChat}
      </Link>
    </Panel>
  );
  return (
    <Columns aside={aside}>
      <Head b={b} o={o} chip={TEXT.chip.change} tone="warn" />
      <div className={`${styles.banner} ${styles.warnBanner}`}>
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{TEXT.waitingForThem(o.name)}</span>
          <span className={hiring.sub}>{TEXT.sentKeep(`${formatDayMonth(change.at)}, ${formatTime(change.at)}`)}</span>
        </span>
        <form action={withdrawTerms.bind(null, b.id)}>
          <button type="submit" className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
            {TEXT.withdraw}
          </button>
        </form>
      </div>
      <section className={events.card} aria-labelledby="proposed-title">
        <h2 id="proposed-title" className={hiring.cardTitle}>
          {TEXT.proposed}
        </h2>
        <div className={styles.greyRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.price}</span>
            <span className={hiring.sub}>{`${lkr(b.priceLkr)} → ${lkr(change.priceLkr)}`}</span>
          </span>
          <Chip tone="soft">{TEXT.newChip}</Chip>
        </div>
        {oldFinal && newFinal && (
          <div className={styles.greyRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{TEXT.finalInstalment}</span>
              <span className={hiring.sub}>{`${lkr(oldFinal.amountLkr)} → ${lkr(newFinal.amountLkr)} · ${newFinal.due ? day(newFinal.due) : ""}`}</span>
            </span>
            <Chip tone="soft">{TEXT.newChip}</Chip>
          </div>
        )}
        <p className={styles.foot}>{change.note}</p>
      </section>
      <Agreed b={b} />
    </Columns>
  );
}

// V67: the organiser proposes new terms, e.g. a moved date.
function TheirTerms({ b, o, state }: { b: ProviderBooking; o: OrganiserCard; state: ProviderState }) {
  const change = b.termsChange;
  if (!change) return null;
  const oldFinal = b.payments.at(-1);
  const newFinal = change.payments.at(-1);
  const newDate = change.date;
  const busy = newDate ? state.calendar.some((m) => m.date === newDate && !(m.kind === "booked" && m.date === b.date)) : false;
  const aside = (
    <Panel title={TEXT.ifYouDecline}>
      <p className={styles.foot}>{TEXT.ifYouDeclineText(day(b.date))}</p>
    </Panel>
  );
  const changedRow = (label: string, from: string, to: string) => (
    <div className={styles.greyRow}>
      <span className={ui.rowText}>
        <span className={ui.rowTitle}>{label}</span>
        <span className={hiring.sub}>{from === to ? to : `${from} → ${to}`}</span>
      </span>
      <Chip tone={from === to ? "neutral" : "warn"}>{from === to ? TEXT.same : TEXT.changed}</Chip>
    </div>
  );
  return (
    <Columns aside={aside}>
      <Head b={b} o={o} chip={TEXT.chip.change} tone="warn" short />
      <div className={`${styles.banner} ${styles.warnBanner}`}>
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{TEXT.wantsChange(o.name)}</span>
          <span className={hiring.sub}>{newDate ? `The event moved to ${day(newDate)}. ${TEXT.nothingChanges}` : TEXT.nothingChanges}</span>
        </span>
      </div>
      <section className={events.card} aria-labelledby="their-title">
        <h2 id="their-title" className={hiring.cardTitle}>
          {TEXT.theirProposal}
        </h2>
        {newDate && changedRow(TEXT.date, day(b.date), day(newDate))}
        {oldFinal?.due && newFinal?.due && changedRow(TEXT.finalDue, day(oldFinal.due), day(newFinal.due))}
        {changedRow(TEXT.price, lkr(b.priceLkr), lkr(change.priceLkr))}
        <p className={styles.foot}>
          <strong>{`${TEXT.theirNote} `}</strong>
          {change.note}
        </p>
      </section>
      {newDate && (
        <div className={`${styles.banner} ${busy ? styles.dangerBanner : ""}`}>
          <span className={styles.bannerText}>
            <span className={ui.rowTitle}>{TEXT.freeOn(day(newDate))}</span>
            <span className={hiring.sub}>{TEXT.fromCalendar}</span>
          </span>
          <Chip tone={busy ? "danger" : "good"}>{busy ? TEXT.busy : TEXT.free}</Chip>
        </div>
      )}
      <div className={styles.buttonRow}>
        <form action={answerTerms.bind(null, b.id, true)} className={styles.formFill}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.acceptTerms}
          </button>
        </form>
        <form action={answerTerms.bind(null, b.id, false)} className={styles.formFill}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
            {TEXT.decline}
          </button>
        </form>
        <Link href={`${routes.vendorArea.messages}?to=${o.id}`} className={forms.bigButton}>
          {TEXT.chatFirst}
        </Link>
      </div>
    </Columns>
  );
}

// V69: completed, with the payments and reviews.
function Completed({ b, o, state, now }: { b: ProviderBooking; o: OrganiserCard; state: ProviderState; now: Date }) {
  const done = b.completedAt ?? `${b.date}T23:00:00+05:30`;
  const closes = new Date(Date.parse(`${b.date}T12:00:00+05:30`) + 14 * 86_400_000).toISOString().slice(0, 10);
  const daysLeft = Math.max(0, daysUntil(closes, now));
  const task = state.reviewTasks.find((t) => t.organiserId === b.organiserId && t.eventTitle === b.eventTitle);
  const paidAll = b.payments.every((p) => p.receivedAt);
  const reviewHref = task && !task.submitted ? routes.vendorArea.reviewOrganiser(task.id) : undefined;
  const aside = (
    <>
      <Panel title={TEXT.theirReview}>
        <p className={styles.foot}>{TEXT.theirReviewText(o.name, daysLeft)}</p>
      </Panel>
      {paidAll && (
        <Panel title={TEXT.paidInFull}>
          <p className={hiring.pageTitle}>{lkr(b.priceLkr)}</p>
          <p className={styles.foot}>{TEXT.onTime}</p>
        </Panel>
      )}
    </>
  );
  return (
    <Columns aside={aside}>
      <Head b={b} o={o} chip={TEXT.chip.completed} tone="good" short />
      <div className={styles.banner}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{TEXT.markedCompleted(o.name)}</span>
          <span className={hiring.sub}>{TEXT.reviewsOpen(formatDayMonth(done), day(closes))}</span>
        </span>
        {reviewHref ? (
          <Link href={reviewHref} className={ui.textLink}>
            {TEXT.writeReview}
          </Link>
        ) : (
          task?.submitted && <span className={ui.textLink}>{TEXT.reviewed}</span>
        )}
      </div>
      <section className={events.card} aria-labelledby="agreed-title">
        <h2 id="agreed-title" className={hiring.cardTitle}>
          {TEXT.agreed}
        </h2>
        <dl className={events.facts}>
          <dt>{TEXT.service}</dt>
          <dd>{b.serviceDetail}</dd>
          <dt>{TEXT.price}</dt>
          <dd>{lkr(b.priceLkr)}</dd>
        </dl>
      </section>
      <section className={events.card} aria-labelledby="pay-title">
        <h2 id="pay-title" className={hiring.cardTitle}>
          {TEXT.payments}
        </h2>
        <PaymentRows b={b} now={now} here={routes.vendorArea.booking(b.id)} state={state} />
      </section>
      <div className={styles.pair}>
        {reviewHref && (
          <Link href={reviewHref} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.reviewWho(o.name)}
          </Link>
        )}
        <Link href={`${routes.vendorArea.messages}?to=${o.id}`} className={forms.bigButton}>
          {TEXT.bookAgain}
        </Link>
      </div>
    </Columns>
  );
}

// "Cancel this booking?" (V63): a reason, a note, and what happens by the booking's terms.
function CancelDialog({ b, o, now, close, error }: { b: ProviderBooking; o: OrganiserCard; now: Date; close: string; error?: string }) {
  const away = daysUntil(b.date, now);
  const paid = b.payments.filter((p) => p.receivedAt).reduce((sum, p) => sum + p.amountLkr, 0);
  return (
    <Dialog title={TEXT.cancelTitle} subtitle={`${b.eventTitle} · ${day(b.date)} · ${TEXT.daysAway(away)}`} closeHref={close} closeLabel={TEXT.close} narrow>
      <form action={cancelThisBooking.bind(null, b.id)} className={tables.dialogForm}>
        <fieldset className={hiring.plainFieldset}>
          <legend className={forms.label}>{TEXT.reason}</legend>
          {CANCEL_REASONS.map((r) => (
            <Choice key={r} type="radio" name="reason" value={r} title={r} required />
          ))}
        </fieldset>
        {error === "reason" && <p className={forms.error}>{TEXT.reasonError}</p>}
        <label className={forms.field}>
          <span className={forms.label}>{TEXT.noteTo(o.name)}</span>
          <textarea name="note" rows={2} className={forms.input} />
        </label>
        <div className={events.happens}>
          <p className={forms.label}>{TEXT.whatHappens}</p>
          <dl className={events.facts}>
            <dt>{TEXT.refundToThem}</dt>
            <dd>{paid ? TEXT.refundAmount(lkr(paid)) : TEXT.nothingPaid}</dd>
            <dt>{TEXT.yourProfile}</dt>
            <dd>{away < 7 ? TEXT.lateNote : TEXT.notLateNote}</dd>
            <dt>{TEXT.calendar}</dt>
            <dd>{TEXT.setFree(day(b.date))}</dd>
          </dl>
        </div>
        <div className={tables.dialogActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {TEXT.keep}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
            {TEXT.cancelBooking}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// "Mark this instalment received?" (V68).
function ReceivedDialog({ b, o, index, part, now, close, error }: { b: ProviderBooking; o: OrganiserCard; index: number; part: ProviderPayment; now: Date; close: string; error?: string }) {
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
  return (
    <Dialog title={TEXT.receivedTitle} subtitle={`${part.label} · ${o.name}`} closeHref={close} closeLabel={TEXT.close} narrow>
      <form action={markReceived.bind(null, b.id, index)} className={tables.dialogForm}>
        <div className={styles.greyRow}>
          <span className={ui.rowText}>
            <span className={hiring.sub}>{TEXT.amount}</span>
            <span className={ui.rowTitle}>{lkr(part.amountLkr)}</span>
          </span>
          {part.due && <span className={hiring.sub}>{day(part.due)}</span>}
        </div>
        <div className={forms.row2}>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.receivedOn}</span>
            <input type="date" name="on" required defaultValue={today} max={today} className={forms.input} />
          </label>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.how}</span>
            <select name="method" required defaultValue={PAYMENT_METHODS[0]} className={forms.input}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
        <label className={forms.field}>
          <span className={forms.label}>{TEXT.reference}</span>
          <input name="reference" className={forms.input} />
        </label>
        <p className={styles.foot}>{TEXT.onlyWhen}</p>
        {error === "fields" && <p className={forms.error}>{TEXT.fieldsError}</p>}
        <div className={tables.dialogActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {TEXT.cancel}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.markReceived}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
