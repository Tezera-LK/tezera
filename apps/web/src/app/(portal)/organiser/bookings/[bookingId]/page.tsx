import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Dialog from "@/components/portal/events/Dialog";
import forms from "@/components/portal/forms.module.css";
import books from "@/components/portal/hiring/Bookings.module.css";
import styles from "@/components/portal/hiring/Hiring.module.css";
import { ProviderSummary } from "@/components/portal/hiring/ProviderBits";
import shell from "@/components/portal/PortalShell.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { LATE_DAYS, bookingHistory, cancelOutcome, dayLabel, nextToPay, paidTotal, paymentStates, type PartState } from "@/lib/bookings";
import { getBooking, getMyEvent, getProvider, listPayments } from "@/lib/data/portal";
import type { BookingRequest, HireProvider, ManagedEvent } from "@/lib/data/portal-types";
import { formatCount, formatDayMonth, formatShortDate } from "@/lib/format";
import { priceOf } from "@/lib/hiring";
import { routes } from "@/lib/routes";
import { cancelBooking, markCompleted, reportProblem } from "../actions";

export const metadata: Metadata = { title: "Booking" };

const lkr = (n: number) => `LKR ${formatCount(n)}`;
// "5:00 PM", from a "17:00" time input
const clock = (time: string) =>
  time ? new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

const TEXT = {
  confirmed: "Confirmed",
  completed: "Completed",
  cancelledByYou: "Cancelled by you",
  cancelledByThem: "Cancelled by provider",
  message: "Message",
  changeTerms: "Change terms",
  agreed: "What was agreed",
  event: "Event",
  date: "Date",
  time: "Time",
  location: "Location",
  service: "Service",
  price: "Price",
  timeRange: (start: string, end: string) => [clock(start), clock(end)].filter(Boolean).join(" to "),
  paymentTerms: "Payment terms",
  payment: "Payment",
  amount: "Amount",
  due: "Due",
  status: "Status",
  actions: "Actions",
  paidOn: (iso: string) => `Paid ${formatShortDate(iso)}`,
  refunded: "Refunded",
  overdue: "Overdue",
  dueIn: (days: number) => (days === 0 ? "Due today" : `Due in ${days} ${days === 1 ? "day" : "days"}`),
  upcoming: "Upcoming",
  receipt: "Receipt",
  pay: "Pay (test)",
  outside: (first: string) => `Paying outside Tezera? ${first} marks it received and you both get a receipt.`,
  noPayments: "No payments were set for this booking.",
  cancellation: "Cancellation terms",
  ifYouCancel: "If you cancel",
  ifTheyCancel: (first: string) => `If ${first} cancels`,
  youCancel: (first: string) => `${first} keeps the deposit if you cancel within ${LATE_DAYS} days of the event.`,
  theyCancel: "You get back everything you paid.",
  brief: "Brief",
  briefRows: [
    ["service", "Service"],
    ["duration", "Duration"],
    ["audience", "Expected audience"],
    ["deliverables", "Deliverables"],
    ["runOfShow", "Run-of-show timings"],
    ["equipment", "Equipment provided"],
  ] as const,
  people: (n: string) => (/^[\d,]+$/.test(n) ? `${n} people` : n),
  history: "History",
  afterEvent: "After the event",
  afterText: "Mark the booking completed to open reviews for both of you.",
  markCompleted: "Mark completed",
  completedText: (when: string) => `Marked completed on ${when}. Reviews are open for both of you.`,
  somethingWrong: "Something wrong?",
  report: "Report a problem",
  reportText: "For example a no-show. An admin looks at it with this booking's history.",
  cancelBooking: "Cancel booking",
  sent: {
    terms: (first: string) => `New terms sent. The booking keeps its current terms until ${first} accepts.`,
    report: "Report sent. An admin will look at it with this booking's history.",
    completed: "Marked completed. Reviews are open for both of you.",
  },
  pending: (first: string) => `New terms are waiting for ${first}.`,
  // the cancelled view (O85)
  theyCancelled: (name: string) => `${name} cancelled`,
  youCancelled: "You cancelled this booking",
  cancelledOn: (who: string, when: string, days: number) =>
    days === 0 ? `${who} cancelled on ${when}, the day of the event` : `${who} cancelled on ${when}, ${days} ${days === 1 ? "day" : "days"} before the event`,
  // the reasons are stored as their option labels ("Budget changed"); mid-sentence they start small
  reasonLine: (reason: string, refund: string) => `Reason: ${reason.charAt(0).toLowerCase()}${reason.slice(1)}.${refund}`,
  refundLine: (amount: number) => ` Your ${lkr(amount)} is refunded under the terms.`,
  replaceTitle: "Find a replacement fast",
  replaceText: (people: string, district: string, day: string) =>
    `Reopen it as a job post, filled in from this booking. ${people} who serve ${district} and are free on ${day} see it.`,
  reopen: "Reopen as a job post",
  findMore: (people: string) => `Find ${people}`,
  refund: "Refund",
  refundRow: (amount: number, when: string) => `${lkr(amount)} · refunded ${formatShortDate(when)} (test)`,
  nothingToRefund: "Nothing was paid, so there's nothing to refund.",
  depositKept: (who: string, amount: number) => `${who} kept the ${lkr(amount)} deposit under the cancellation terms.`,
  onRecord: (first: string) => `On ${first}'s record`,
  onYourRecord: "On your record",
  recordText: (late: boolean, whose: string) =>
    late
      ? `A late cancellation (within ${LATE_DAYS} days). It shows on ${whose} profile.`
      : `Not a late cancellation (more than ${LATE_DAYS} days out). It would show on ${whose} profile if it were.`,
} as const;

// "photographers", "MCs" — a provider's people, for "Find MCs"
const PEOPLE: Record<string, string> = { Photography: "photographers", DJ: "DJs", "Sound and lighting": "sound crews", Staging: "staging crews", Hosting: "MCs" };

type Props = { params: Promise<{ bookingId: string }>; searchParams: Promise<{ dialog?: string; sent?: string; error?: string }> };

// One booking (Figma O22): what was agreed, its payments, the cancellation terms and the brief,
// with history and the after-the-event and something-wrong panels. A cancelled booking shows
// O85 instead. ?dialog= opens cancel (O84), report (O87) or mark completed (O88).
export default async function BookingPage({ params, searchParams }: Props) {
  const session = await requireRole("organiser");
  const { bookingId } = await params;
  const query = await searchParams;
  const booking = await getBooking(session, bookingId);
  if (!booking) notFound();
  const [provider, event, records] = await Promise.all([
    getProvider(session, booking.providerId),
    getMyEvent(session, booking.eventId),
    listPayments(session),
  ]);
  if (!provider || !event) notFound();

  const now = new Date();
  const first = provider.kind === "Freelancer" ? provider.name.split(" ")[0] : provider.name;
  const states = paymentStates(booking, records, now);
  const service = booking.brief.service || provider.role;
  const lede = [service, event.title, dayLabel(booking.date)].filter(Boolean).join(" · ");

  if (booking.status === "cancelled") {
    return <Cancelled booking={booking} provider={provider} event={event} states={states} first={first} lede={lede} />;
  }

  const next = nextToPay(states);
  const history = bookingHistory(booking, records, first);
  const eventDay = booking.date <= now.toISOString().slice(0, 10);
  const base = routes.booking(booking.id);
  const sent = query.sent === "terms" ? TEXT.sent.terms(first) : query.sent === "report" ? TEXT.sent.report : query.sent === "completed" ? TEXT.sent.completed : null;

  const aside = (
    <>
      <ProviderSummary provider={provider} line={provider.role} />
      <Panel title={TEXT.history}>
        {history.map((h) => (
          <div key={`${h.title}-${h.at}`} className={styles.whiteRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{h.title}</span>
              <span className={styles.sub}>{h.detail}</span>
            </span>
            <span className={books.historyDot} aria-hidden="true" />
          </div>
        ))}
      </Panel>
      <Panel title={TEXT.afterEvent}>
        {booking.completedAt ? (
          <p className={tables.panelText}>{TEXT.completedText(formatDayMonth(booking.completedAt))}</p>
        ) : (
          <>
            <p className={tables.panelText}>{TEXT.afterText}</p>
            {/* only from the day of the event: before that there's nothing to complete */}
            <MaybeLink
              href={eventDay ? `${base}?dialog=complete` : undefined}
              className={`${ui.rowButton} ${ui.rowButtonPrimary} ${tables.panelLink}`}
            >
              {TEXT.markCompleted}
            </MaybeLink>
          </>
        )}
      </Panel>
      <Panel title={TEXT.somethingWrong}>
        <Link href={`${base}?dialog=report`} scroll={false} className={`${ui.rowButton} ${ui.rowButtonWhite} ${tables.panelLink}`}>
          {TEXT.report}
        </Link>
        <p className={tables.panelText}>{TEXT.reportText}</p>
        {!booking.completedAt && (
          <Link href={`${base}?dialog=cancel`} scroll={false} className={books.dangerLink}>
            {TEXT.cancelBooking}
          </Link>
        )}
      </Panel>
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <header className={styles.pageHead}>
          <div className={styles.pageHeadText}>
            <h1 className={styles.pageTitle}>{provider.name}</h1>
            <p className={styles.lede}>{lede}</p>
          </div>
          <div className={books.headActions}>
            <Chip tone="good">{booking.completedAt ? TEXT.completed : TEXT.confirmed}</Chip>
            <MaybeLink href={`${routes.messages}?to=${encodeURIComponent(provider.id)}`} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
              {TEXT.message}
            </MaybeLink>
            {!booking.completedAt && (
              <Link href={routes.bookingTerms(booking.id)} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                {TEXT.changeTerms}
              </Link>
            )}
          </div>
        </header>

        {sent && (
          <p className={books.notice} role="status">
            {sent}
          </p>
        )}
        {!sent && booking.proposedTerms && <p className={books.notice}>{TEXT.pending(first)}</p>}

        <section className={tables.section} aria-labelledby="agreed-title">
          <h2 id="agreed-title" className={ui.sectionTitle}>
            {TEXT.agreed}
          </h2>
          <div className={books.factsCard}>
            <Facts
              rows={[
                [TEXT.event, event.title],
                [TEXT.date, dayLabel(booking.date)],
                [TEXT.time, TEXT.timeRange(booking.startTime, booking.endTime)],
                [TEXT.location, booking.location],
                [TEXT.service, service],
                [TEXT.price, lkr(priceOf(booking))],
              ]}
            />
          </div>
        </section>

        <section className={tables.section} aria-labelledby="payments-title">
          <h2 id="payments-title" className={ui.sectionTitle}>
            {TEXT.paymentTerms}
          </h2>
          {states.length === 0 ? (
            <p className={ui.muted}>{TEXT.noPayments}</p>
          ) : (
            <div className={tables.tableCard}>
              <table className={`${tables.table} ${books.paymentsTable}`}>
                <thead>
                  <tr>
                    <th scope="col">{TEXT.payment}</th>
                    <th scope="col">{TEXT.amount}</th>
                    <th scope="col">{TEXT.due}</th>
                    <th scope="col">{TEXT.status}</th>
                    <th scope="col">
                      <span className={shell.srOnly}>{TEXT.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {states.map((s) => (
                    <tr key={s.index}>
                      <th scope="row" className={tables.strong}>
                        {s.label}
                      </th>
                      <td>{lkr(s.amountLkr)}</td>
                      <td>{s.due ? dayLabel(s.due) : "On accept"}</td>
                      <td>
                        <PartChip part={s} />
                      </td>
                      <td>
                        {s.paid ? (
                          <Link href={routes.receipt(s.paid.id)} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                            {TEXT.receipt}
                          </Link>
                        ) : (
                          next?.index === s.index && (
                            <Link href={routes.payInstalment(booking.id, s.index)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                              {TEXT.pay}
                            </Link>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={books.footnote}>{TEXT.outside(first)}</p>
        </section>

        <section className={tables.section} aria-labelledby="cancel-title">
          <h2 id="cancel-title" className={ui.sectionTitle}>
            {TEXT.cancellation}
          </h2>
          <div className={books.factsCard}>
            <dl className={styles.terms}>
              <dt>{TEXT.ifYouCancel}</dt>
              <dd>{TEXT.youCancel(first)}</dd>
              <dt>{TEXT.ifTheyCancel(first)}</dt>
              <dd>{TEXT.theyCancel}</dd>
            </dl>
          </div>
        </section>

        <BriefSection booking={booking} />
      </Columns>

      {query.dialog === "cancel" && !booking.completedAt && (
        <CancelDialog booking={booking} states={states} first={first} provider={provider} close={base} error={query.error} />
      )}
      {query.dialog === "report" && <ReportDialog booking={booking} provider={provider} close={base} error={query.error} />}
      {query.dialog === "complete" && !booking.completedAt && eventDay && (
        <CompleteDialog booking={booking} states={states} provider={provider} event={event} close={base} />
      )}
    </>
  );
}

// Label and value in two columns, as in O22's cards.
function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className={styles.terms}>
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className={styles.partRow}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

// The brief, with only the fields that were filled in.
function BriefSection({ booking }: { booking: BookingRequest }) {
  const rows = TEXT.briefRows
    .map(([key, label]) => [label, key === "audience" ? TEXT.people(booking.brief[key]) : booking.brief[key]] as [string, string])
    .filter(([, value]) => value);
  if (rows.length === 0) return null;
  return (
    <section className={tables.section} aria-labelledby="brief-title">
      <h2 id="brief-title" className={ui.sectionTitle}>
        {TEXT.brief}
      </h2>
      <div className={books.factsCard}>
        <Facts rows={rows} />
      </div>
    </section>
  );
}

// "Paid 28 Nov" green, "Due in 9 days" amber, "Upcoming" grey.
function PartChip({ part }: { part: PartState }) {
  switch (part.state) {
    case "paid":
      return <Chip tone="good">{TEXT.paidOn(part.paid!.at)}</Chip>;
    case "refunded":
      return <Chip tone="soft">{TEXT.refunded}</Chip>;
    case "overdue":
      return <Chip tone="danger">{TEXT.overdue}</Chip>;
    case "due":
      return <Chip tone="warn">{TEXT.dueIn(part.daysLeft ?? 0)}</Chip>;
    default:
      return <Chip tone="neutral">{TEXT.upcoming}</Chip>;
  }
}

// ---------- Cancelled (O85) ----------

function Cancelled({
  booking,
  provider,
  event,
  states,
  first,
  lede,
}: {
  booking: BookingRequest;
  provider: HireProvider;
  event: ManagedEvent;
  states: PartState[];
  first: string;
  lede: string;
}) {
  const byThem = booking.cancelledBy === "provider";
  const cancelledAt = booking.cancelledAt ?? booking.answeredAt ?? booking.sentAt;
  const days = Math.max(0, Math.round((Date.parse(`${booking.date}T12:00:00+05:30`) - Date.parse(cancelledAt)) / 86_400_000));
  const refunds = states.filter((s) => s.refunded);
  const refundedTotal = refunds.reduce((sum, s) => sum + s.amountLkr, 0);
  const people = PEOPLE[provider.category] ?? "providers";
  const district = provider.districts[0];
  const late = days < LATE_DAYS;

  const aside = (
    <Panel title={byThem ? TEXT.onRecord(first) : TEXT.onYourRecord}>
      <p className={tables.panelText}>{TEXT.recordText(late, byThem ? "their" : "your")}</p>
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <header className={styles.pageHead}>
        <div className={styles.pageHeadText}>
          <h1 className={styles.pageTitle}>{byThem ? TEXT.theyCancelled(provider.name) : TEXT.youCancelled}</h1>
          <p className={styles.lede}>{lede}</p>
        </div>
        <Chip tone="danger">{byThem ? TEXT.cancelledByThem : TEXT.cancelledByYou}</Chip>
      </header>

      <div className={books.warnNotice}>
        <span className={books.warnDot} aria-hidden="true" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.cancelledOn(byThem ? first : "You", formatDayMonth(cancelledAt), days)}</span>
          <span className={books.noticeText}>
            {TEXT.reasonLine(booking.cancelReason ?? "not given", refundedTotal > 0 ? TEXT.refundLine(refundedTotal) : "")}
          </span>
        </span>
      </div>

      {event.status !== "cancelled" && (
        <section className={books.replaceCard} aria-labelledby="replace-title">
          <h2 id="replace-title" className={styles.cardTitle}>
            {TEXT.replaceTitle}
          </h2>
          <p className={books.noticeText}>{TEXT.replaceText(people[0].toUpperCase() + people.slice(1), district, dayLabel(booking.date))}</p>
          <div className={books.twoButtons}>
            <Link href={`${routes.newJob}?from=${encodeURIComponent(booking.id)}`} className={`${ui.rowButton} ${ui.rowButtonPrimary} ${tables.panelLink}`}>
              {TEXT.reopen}
            </Link>
            <Link
              href={`${routes.hiring}?event=${encodeURIComponent(event.id)}&category=${encodeURIComponent(provider.category)}`}
              className={`${ui.rowButton} ${ui.rowButtonWhite} ${tables.panelLink}`}
            >
              {TEXT.findMore(people)}
            </Link>
          </div>
        </section>
      )}

      <section className={books.factsCard} aria-labelledby="refund-title">
        <h2 id="refund-title" className={styles.cardTitle}>
          {TEXT.refund}
        </h2>
        {refunds.length === 0 ? (
          <p className={books.noticeText}>
            {states[0]?.state === "paid" ? TEXT.depositKept(provider.name, states[0].amountLkr) : TEXT.nothingToRefund}
          </p>
        ) : (
          refunds.map((s) => (
            <div key={s.index} className={`${styles.whiteRow} ${styles.pageRow}`}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{s.label}</span>
                <span className={styles.sub}>{TEXT.refundRow(s.amountLkr, s.refunded!.at)}</span>
              </span>
              <Chip tone="soft">{TEXT.refunded}</Chip>
              <Link href={routes.receipt(s.refunded!.id)} className={`${ui.rowButton} ${books.plainRowButton}`}>
                {TEXT.receipt}
              </Link>
            </div>
          ))
        )}
      </section>
    </Columns>
  );
}

// ---------- Dialogs (O84, O87, O88) ----------

const DIALOG = {
  close: "Close",
  cancelTitle: "Cancel this booking?",
  cancelSubtitle: (name: string, day: string, days: number) => `${name} · ${day} · ${days} ${days === 1 ? "day" : "days"} away`,
  reasons: [
    ["event", "Event cancelled or postponed"],
    ["other_provider", "Found another provider"],
    ["budget", "Budget changed"],
    ["other", "Other"],
  ],
  reasonLabel: "Why",
  reasonError: "Pick a reason.",
  noteTo: (first: string) => `Note to ${first}`,
  notePlaceholder: "Sorry, our sponsor pulled out and we are cutting costs.",
  whatHappens: "What happens, by the booking terms",
  deposit: "Deposit",
  depositKept: (amount: number, first: string, days: number) =>
    `${lkr(amount)} · ${first} keeps it, as you are ${days} ${days === 1 ? "day" : "days"} out`,
  depositRefunded: (amount: number, first: string, days: number) =>
    `${lkr(amount)} · ${first} keeps it only within ${LATE_DAYS} days; you are ${days} days out, so it is refunded`,
  depositUnpaid: "Not paid yet, so nothing changes hands",
  otherPaid: "Other payments",
  otherPaidValue: (amount: number) => `${lkr(amount)} refunded`,
  yourProfile: "Your profile",
  late: "Shows a late cancellation",
  notLate: "No late cancellation",
  told: "Told by push, email and SMS (proposed)",
  keep: "Keep booking",
  cancel: "Cancel booking",
  reportTitle: "Report a problem",
  reportSubtitle: (name: string) => `${name} · an admin sees the full booking history`,
  problems: [
    ["no-show", "No-show"],
    ["work", "Work not as agreed"],
    ["safety", "Safety or conduct"],
    ["else", "Something else"],
  ],
  whatHappened: "What happened",
  whatPlaceholder: "Did not arrive by 6 PM and is not answering calls.",
  textError: "Say what happened.",
  attach: "+ Attach",
  cancelPlain: "Cancel",
  send: "Send report",
  completeTitle: "Mark this booking completed?",
  paid: "Paid",
  paidValue: (paid: number, total: number) => `${lkr(paid)} of ${lkr(total)}`,
  stillDue: "Still due",
  nothingDue: "Nothing",
  completeNote: "Reviews open for both of you and close 14 days later (proposed). Payments still due stay on the booking.",
  notYet: "Not yet",
  complete: "Mark completed and review",
} as const;

// One radio option drawn as a choice card, as in O76 and O84.
function Choice({ name, value, label, checked }: { name: string; value: string; label: string; checked?: boolean }) {
  return (
    <label className={`${forms.choice} ${books.choice}`}>
      <input type="radio" name={name} value={value} required defaultChecked={checked} />
      <span className={forms.choiceTitle}>{label}</span>
      <span className={forms.choiceDot} aria-hidden="true" />
    </label>
  );
}

// "Cancel this booking?" (O84): a reason, a note, and what the terms say happens to the money.
function CancelDialog({
  booking,
  states,
  first,
  provider,
  close,
  error,
}: {
  booking: BookingRequest;
  states: PartState[];
  first: string;
  provider: HireProvider;
  close: string;
  error?: string;
}) {
  const { daysAway, late } = cancelOutcome(booking, new Date());
  const deposit = states[0];
  const otherPaid = states.slice(1).filter((s) => s.state === "paid").reduce((sum, s) => sum + s.amountLkr, 0);
  const depositLine = !deposit || deposit.state !== "paid"
    ? DIALOG.depositUnpaid
    : late
      ? DIALOG.depositKept(deposit.amountLkr, first, daysAway)
      : DIALOG.depositRefunded(deposit.amountLkr, first, daysAway);

  return (
    <Dialog title={DIALOG.cancelTitle} subtitle={DIALOG.cancelSubtitle(provider.name, dayLabel(booking.date), daysAway)} closeHref={close} closeLabel={DIALOG.close}>
      <form action={cancelBooking.bind(null, booking.id)} className={tables.dialogForm}>
        <fieldset className={books.choices}>
          <legend className={shell.srOnly}>{DIALOG.reasonLabel}</legend>
          {DIALOG.reasons.map(([value, label]) => (
            <Choice key={value} name="reason" value={value} label={label} />
          ))}
        </fieldset>
        {error === "reason" && <p className={forms.error}>{DIALOG.reasonError}</p>}
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.noteTo(first)}</span>
          <textarea name="note" rows={2} placeholder={DIALOG.notePlaceholder} className={`${forms.input} ${books.textarea}`} />
        </label>
        <div className={books.happens}>
          <p className={ui.rowTitle}>{DIALOG.whatHappens}</p>
          <dl className={styles.terms}>
            <dt>{DIALOG.deposit}</dt>
            <dd>{depositLine}</dd>
            {otherPaid > 0 && (
              <>
                <dt>{DIALOG.otherPaid}</dt>
                <dd>{DIALOG.otherPaidValue(otherPaid)}</dd>
              </>
            )}
            <dt>{DIALOG.yourProfile}</dt>
            <dd>{late ? DIALOG.late : DIALOG.notLate}</dd>
            <dt>{first}</dt>
            <dd>{DIALOG.told}</dd>
          </dl>
        </div>
        <div className={books.cancelActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {DIALOG.keep}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
            {DIALOG.cancel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// "Report a problem" (O87): what kind, what happened, and Send report.
function ReportDialog({ booking, provider, close, error }: { booking: BookingRequest; provider: HireProvider; close: string; error?: string }) {
  return (
    <Dialog title={DIALOG.reportTitle} subtitle={DIALOG.reportSubtitle(provider.name)} closeHref={close} closeLabel={DIALOG.close} narrow>
      <form action={reportProblem.bind(null, booking.id)} className={tables.dialogForm}>
        <fieldset className={books.choices}>
          <legend className={shell.srOnly}>{DIALOG.reportTitle}</legend>
          {DIALOG.problems.map(([value, label]) => (
            <Choice key={value} name="reason" value={value} label={label} />
          ))}
        </fieldset>
        {error === "reason" && <p className={forms.error}>{DIALOG.reasonError}</p>}
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.whatHappened}</span>
          <textarea name="text" rows={2} required placeholder={DIALOG.whatPlaceholder} className={`${forms.input} ${books.textarea}`} aria-invalid={error === "text" || undefined} />
          {error === "text" && <span className={forms.error}>{DIALOG.textError}</span>}
        </label>
        {/* files need storage (EN-03) */}
        <MaybeLink className={`${ui.rowButton} ${styles.attach}`}>{DIALOG.attach}</MaybeLink>
        <div className={tables.dialogActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {DIALOG.cancelPlain}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {DIALOG.send}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// "Mark this booking completed?" (O88): what's been paid and what's still due.
function CompleteDialog({
  booking,
  states,
  provider,
  event,
  close,
}: {
  booking: BookingRequest;
  states: PartState[];
  provider: HireProvider;
  event: ManagedEvent;
  close: string;
}) {
  const due = states.filter((s) => s.state !== "paid" && s.state !== "refunded");
  return (
    <Dialog title={DIALOG.completeTitle} subtitle={`${provider.name} · ${event.title}`} closeHref={close} closeLabel={DIALOG.close} narrow>
      <form action={markCompleted.bind(null, booking.id)} className={tables.dialogForm}>
        <dl className={styles.terms}>
          <dt>{DIALOG.paid}</dt>
          <dd>{DIALOG.paidValue(paidTotal(states), priceOf(booking))}</dd>
          <dt>{DIALOG.stillDue}</dt>
          <dd>
            {due.length === 0
              ? DIALOG.nothingDue
              : due.map((s) => [s.label, lkr(s.amountLkr), s.due ? dayLabel(s.due) : ""].filter(Boolean).join(" · ")).join("; ")}
          </dd>
        </dl>
        <p className={books.footnote}>{DIALOG.completeNote}</p>
        <div className={tables.dialogActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {DIALOG.notYet}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {DIALOG.complete}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

