import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import Choice from "@/components/portal/provider/Choice";
import OrganiserPanel from "@/components/portal/provider/OrganiserPanel";
import styles from "@/components/portal/provider/Provider.module.css";
import Step from "@/components/portal/provider/Step";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState, isVerified } from "@/lib/data/provider";
import type { IncomingRequest, OrganiserCard, ProviderQuote, ProviderState } from "@/lib/data/provider-types";
import { daysFrom, formatDayMonth, formatShortDate, formatTime } from "@/lib/format";
import { DECLINE_REASONS, day, lkr, paymentDue, paymentTitle, when } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { acceptBooking, declineRequest, withdrawQuote } from "../actions";

export const metadata: Metadata = { title: "Booking request" };

const TEXT = {
  title: "Booking requests",
  lede: "Organisers who want to book you. Payment and cancellation terms are shown before you accept.",
  tabsLabel: "Which requests",
  tabs: { new: "New", quoted: "Quotes sent", accepted: "Accepted", declined: "Declined" },
  wants: (name: string) => `${name} wants to book you`,
  received: (when: string) => `Received ${when} · reply within 48 hours`,
  receivedPlain: (when: string) => `Received ${when}`,
  newChip: "New",
  event: "Event",
  dateTimes: "Date and times",
  budget: "Budget",
  brief: "Brief",
  briefNote: "Only the fields the organiser filled are shown",
  service: "Service",
  duration: "Duration",
  audience: "Expected audience",
  deliverables: "Deliverables",
  equipment: "Equipment provided",
  terms: "Terms you agree to if you accept",
  paymentTerms: "Payment terms",
  cancellationTerms: "Cancellation terms",
  whenAccept: "when you accept",
  accept: "Accept booking",
  acceptLocked: "Accept booking · locked",
  quote: "Send my own quote",
  decline: "Decline",
  quoteNote: "Send my own quote is proposed: you can suggest your own price, payment and cancellation terms, and the organiser accepts or declines it.",
  otherRequests: "Other requests",
  questions: "Questions first?",
  questionsText: "Ask about the brief before you reply. Photos and files are fine.",
  chatWith: (name: string) => `Chat with ${name}`,
  verifyTitle: "Verify your business to accept bookings",
  verifyTitleFreelancer: "Verify your identity to accept bookings",
  verifyText: "You can still send your own quote or chat. Approval usually takes 2 working days.",
  getVerified: "Get verified ›",
  verification: "Verification",
  notVerified: "Not verified yet",
  toDo: "To do",
  upload: "Upload your business registration",
  uploadFreelancer: "Upload your NIC",
  // V51–V53
  quoteSentTo: (name: string) => `Quote sent to ${name}`,
  waitingChip: "Waiting",
  sentOn: (when: string) => `sent ${when}`,
  waitingFor: (name: string) => `Waiting for ${name}`,
  waitingText: "They can accept or decline your quote. We tell you either way.",
  yourQuote: "Your quote",
  sentChip: "Sent",
  price: "Price",
  theirBudget: (amount: string) => `(their budget ${amount})`,
  deposit: "Deposit",
  instalment: "Instalment",
  cancellation: "Cancellation",
  yourMessage: "Your message",
  editQuote: "Edit quote",
  messageOrganiser: "Message organiser",
  withdraw: "Withdraw quote",
  timeline: "Timeline",
  requestReceived: "Request received",
  quoteSent: "Quote sent",
  organiserDecides: "Organiser decides",
  next: "Next",
  acceptOrDecline: "Accept or decline",
  outcomes: "See the outcomes",
  ifAccept: "If they accept",
  ifAcceptText: "Booking confirmed on your terms",
  ifDecline: "If they decline",
  ifDeclineText: "The request closes",
  acceptedYourQuote: (name: string) => `${name} accepted your quote`,
  bookedChip: "Booked",
  confirmedOnTerms: "Booking confirmed on your terms",
  acceptedOn: (when: string, ref: string) => `Accepted ${when} · ref ${ref}`,
  agreed: "Agreed",
  confirmedChip: "Confirmed",
  finalInstalment: "Final instalment",
  yourTerms: "Your terms",
  openBooking: "Open booking",
  messageWho: (name: string) => `Message ${name}`,
  addedForYou: "Added for you",
  calendar: "Calendar",
  auto: "Auto",
  markedBooked: (d: string) => `${d} marked booked`,
  reminders: "Reminders",
  remindersText: "7 days and 1 day before each due date",
  declinedYourQuote: (name: string) => `${name} declined your quote`,
  declinedChip: "Declined",
  theirNote: "Their note",
  findSimilar: "Find similar job posts",
  rankTitle: "This does not affect your rank",
  rankText: "Declined quotes are private between you and the organiser.",
  youDeclined: "You declined this request",
  youDeclinedText: (reason: string, on: string) => `${reason} · ${on}. The organiser has been told.`,
  noteSent: "Your note",
  // dialogs
  close: "Close",
  acceptTitle: "Accept this booking?",
  ifTheyCancel: "If they cancel late",
  keepDeposit: "You keep the deposit",
  ifYouCancel: "If you cancel",
  refundToThem: "Full refund to them; within 7 days it shows on your profile",
  agree: "I agree to these payment and cancellation terms",
  agreeError: "Tick the box to agree to the terms first.",
  markedOnCalendar: (d: string) => `${d} is marked booked on your calendar.`,
  goBack: "Go back",
  declineTitle: "Decline this request?",
  declineText: (name: string) => `${name} is told. They will not see your reason unless you add a note.`,
  noteLabel: "Note to the organiser (optional)",
  notePlaceholder: "Sorry, we are booked on the 12th. Happy to help at your next event!",
  reasonError: "Pick a reason.",
  declineButton: "Decline request",
  sentBy: (name: string, kb: number) => `Sent by ${name} · ${kb} KB`,
  briefOf: (title: string, event: string) => `${title} brief · ${event}`,
  download: "Download",
  pageOf: (n: number) => `Page 1 of ${n}`,
  previewNote: "Files open here once storage is connected (EN-03). This is a placeholder.",
} as const;

type Props = {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ dialog?: string; error?: string }>;
};

// One booking request (Figma V08, F08) and what happens to it: not verified yet (V46), your quote
// waiting (V51), accepted (V52) or declined (V53). Accept (V48), Decline (V50) and the brief (V56)
// open as dialogs with ?dialog=.
export default async function RequestPage({ params, searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  const { requestId } = await params;
  const state = await getProviderState(session);
  const request = state?.requests.find((x) => x.id === requestId);
  if (!state || !request) notFound();
  const query = await searchParams;
  const organiser = state.organisers.find((o) => o.id === request.organiserId);
  if (!organiser) notFound();
  const now = new Date();
  const here = routes.vendorArea.request(request.id);

  if (request.status === "quoted" && request.quote) return <QuoteWaiting request={request} quote={request.quote} organiser={organiser} now={now} />;
  if (request.status === "accepted") return <QuoteAccepted request={request} organiser={organiser} state={state} />;
  if (request.status === "declined" && request.quote) return <QuoteDeclined request={request} quote={request.quote} organiser={organiser} />;
  if (request.status === "declined") return <YouDeclined request={request} organiser={organiser} />;

  const verified = isVerified(state);
  const freelancer = state.kind === "freelancer";
  const receivedDay = daysFrom(now, request.receivedAt);
  const received = receivedDay === 0 ? `today, ${formatTime(request.receivedAt)}` : receivedDay === -1 ? `yesterday, ${formatTime(request.receivedAt)}` : formatDayMonth(request.receivedAt);
  const count = (status: IncomingRequest["status"]) => state.requests.filter((x) => x.status === status).length;
  const others = state.requests.filter((x) => x.id !== request.id && (x.status === "new" || x.status === "quoted"));
  const invitation = freelancer ? null : state.stalls.find((s) => s.invited && !s.application);
  const brief = request.brief;
  const briefRows: [string, string][] = (
    [
      [TEXT.service, brief.service],
      [TEXT.duration, brief.duration],
      [TEXT.audience, brief.audience],
      [TEXT.deliverables, brief.deliverables],
      [TEXT.equipment, brief.equipment],
    ] as [string, string][]
  ).filter(([, value]) => value);

  const aside = verified ? (
    <>
      <OrganiserPanel organiser={organiser} />
      {(others.length > 0 || invitation) && (
        <Panel title={TEXT.otherRequests}>
          {invitation && (
            <Link href={`${routes.vendorArea.stalls}?dialog=invitation&stall=${invitation.id}`} className={hiring.whiteRow}>
              <Thumb size={36} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{state.organisers.find((o) => o.id === invitation.organiserId)?.name}</span>
                <span className={hiring.sub}>{`Stall invitation · ${invitation.eventTitle}`}</span>
              </span>
            </Link>
          )}
          {others.map((x) => (
            <Link key={x.id} href={routes.vendorArea.request(x.id)} className={hiring.whiteRow}>
              <Thumb size={36} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{state.organisers.find((o) => o.id === x.organiserId)?.name}</span>
                <span className={hiring.sub}>{x.status === "quoted" ? `Quote sent · ${x.eventTitle}` : `${x.title} · ${x.eventTitle}`}</span>
              </span>
              {x.status === "quoted" && <Chip tone="neutral">{TEXT.waitingChip}</Chip>}
            </Link>
          ))}
        </Panel>
      )}
      <Panel title={TEXT.questions}>
        <p className={styles.foot}>{TEXT.questionsText}</p>
        <Link href={`${routes.vendorArea.messages}?to=${organiser.id}`} className={ui.wideButton}>
          {TEXT.chatWith(organiser.name)}
        </Link>
      </Panel>
    </>
  ) : (
    <Panel title={TEXT.verification}>
      <Link href={routes.vendorArea.verification} className={hiring.whiteRow}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.notVerified}</span>
          <span className={hiring.sub}>{freelancer ? TEXT.uploadFreelancer : TEXT.upload}</span>
        </span>
        <Chip tone="warn">{TEXT.toDo}</Chip>
      </Link>
    </Panel>
  );

  return (
    <>
      <Columns aside={aside}>
        {verified ? (
          <>
            <header className={hiring.pageHeadText}>
              <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
              <p className={hiring.lede}>{TEXT.lede}</p>
            </header>
            <Tabs
              label={TEXT.tabsLabel}
              current="new"
              tabs={(["new", "quoted", "accepted", "declined"] as const).map((t) => {
                const n = t === "quoted" ? state.requests.filter((x) => x.quote && x.status !== "accepted").length : count(t);
                return { key: t, label: n > 0 && t !== "accepted" && t !== "declined" ? `${TEXT.tabs[t]} · ${n}` : TEXT.tabs[t], href: `${routes.vendorArea.requests}?tab=${t}` };
              })}
            />
          </>
        ) : (
          <>
            <header className={hiring.pageHeadText}>
              <h1 className={hiring.pageTitle}>Booking request</h1>
              <p className={hiring.lede}>{`${organiser.name} · ${request.eventTitle}`}</p>
            </header>
            <div className={`${styles.banner} ${styles.warnBanner}`}>
              <span className={styles.bannerText}>
                <span className={ui.rowTitle}>{freelancer ? TEXT.verifyTitleFreelancer : TEXT.verifyTitle}</span>
                <span className={hiring.sub}>{TEXT.verifyText}</span>
              </span>
              <Link href={routes.vendorArea.verification} className={ui.textLink}>
                {TEXT.getVerified}
              </Link>
            </div>
          </>
        )}

        <section className={events.card} aria-labelledby="request-title">
          <div className={hiring.cardHead}>
            <span className={styles.inline}>
              <Thumb size={40} shape="round" />
              <span className={ui.rowText}>
                <h2 id="request-title" className={styles.bigRowTitle}>
                  {TEXT.wants(organiser.name)}
                </h2>
                <span className={hiring.sub}>{verified ? TEXT.received(received) : TEXT.receivedPlain(received)}</span>
              </span>
            </span>
            <Chip tone="soft">{TEXT.newChip}</Chip>
          </div>
          <dl className={events.facts}>
            <dt>{TEXT.event}</dt>
            <dd>{request.eventTitle}</dd>
            <dt>{TEXT.dateTimes}</dt>
            <dd>{when(request)}</dd>
            <dt>{TEXT.budget}</dt>
            <dd>{lkr(request.budgetLkr)}</dd>
            {!verified && (
              <>
                <dt>{TEXT.service}</dt>
                <dd>{brief.service}</dd>
              </>
            )}
          </dl>
          {verified && (
            <>
              <div className={hiring.cardHead}>
                <h3 className={hiring.cardTitle}>{TEXT.brief}</h3>
                <span className={hiring.sub}>{TEXT.briefNote}</span>
              </div>
              <dl className={events.facts}>
                {briefRows.map(([label, value]) => (
                  <BriefRow key={label} label={label} value={value} />
                ))}
              </dl>
              {brief.file && (
                <Link href={`${here}?dialog=brief`} scroll={false} className={ui.textLink}>
                  {`${brief.file.name} · ${brief.file.sizeKb} KB`}
                </Link>
              )}
            </>
          )}
        </section>

        {verified && (
          <>
            <h2 className={styles.groupLabel}>{TEXT.terms}</h2>
            <div className={styles.pair}>
              <section className={styles.tint} aria-label={TEXT.paymentTerms}>
                <h3 className={hiring.cardTitle}>{TEXT.paymentTerms}</h3>
                {request.payments.map((p) => (
                  <div key={p.label} className={styles.tintRow}>
                    <span className={ui.rowText}>
                      <span className={ui.rowTitle}>{paymentTitle(p)}</span>
                      <span className={hiring.sub}>{p.due ? lkr(p.amountLkr) : `${lkr(p.amountLkr)} · ${TEXT.whenAccept}`}</span>
                    </span>
                    <span className={ui.rowTitle}>{paymentDue(p)}</span>
                  </div>
                ))}
              </section>
              <section className={styles.tint} aria-label={TEXT.cancellationTerms}>
                <h3 className={hiring.cardTitle}>{TEXT.cancellationTerms}</h3>
                <p className={styles.foot}>{request.cancellation.organiser}</p>
                <p className={styles.foot}>{request.cancellation.provider}</p>
              </section>
            </div>
          </>
        )}

        <div className={styles.decide}>
          {verified ? (
            <Link href={`${here}?dialog=accept`} scroll={false} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
              {TEXT.accept}
            </Link>
          ) : (
            <span className={`${forms.bigButton} ${forms.bigButtonQuiet}`} aria-disabled="true">
              {TEXT.acceptLocked}
            </span>
          )}
          <Link href={routes.vendorArea.quote(request.id)} className={forms.bigButton}>
            {TEXT.quote}
          </Link>
          <Link href={`${here}?dialog=decline`} scroll={false} className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
            {TEXT.decline}
          </Link>
        </div>
        {verified && <p className={styles.foot}>{TEXT.quoteNote}</p>}
      </Columns>

      {query.dialog === "accept" && verified && <AcceptDialog request={request} organiser={organiser} close={here} error={query.error} />}
      {query.dialog === "decline" && <DeclineDialog request={request} organiser={organiser} close={here} error={query.error} />}
      {query.dialog === "brief" && brief.file && (
        <Dialog title={brief.file.name} subtitle={TEXT.sentBy(organiser.name, brief.file.sizeKb)} closeHref={here} closeLabel={TEXT.close}>
          <div className={styles.tint}>
            <p className={hiring.cardTitle}>{TEXT.briefOf(request.title, request.eventTitle)}</p>
            <dl className={events.facts}>
              {briefRows.map(([label, value]) => (
                <BriefRow key={label} label={label} value={value} />
              ))}
            </dl>
            <p className={styles.foot}>{TEXT.previewNote}</p>
          </div>
          <div className={tables.dialogActions}>
            <span className={styles.foot}>{TEXT.pageOf(brief.file.pages)}</span>
            <span className={`${forms.bigButton} ${forms.bigButtonQuiet}`} aria-disabled="true">
              {TEXT.download}
            </span>
            <Link href={here} scroll={false} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
              {TEXT.close}
            </Link>
          </div>
        </Dialog>
      )}
    </>
  );
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

// "Accept this booking?" (V48): the price, the payments and the cancellation terms, and a box to tick.
function AcceptDialog({ request, organiser, close, error }: { request: IncomingRequest; organiser: OrganiserCard; close: string; error?: string }) {
  const [depositPart, ...rest] = request.payments;
  const last = rest.at(-1);
  return (
    <Dialog title={TEXT.acceptTitle} subtitle={`${organiser.name} · ${request.eventTitle} · ${day(request.date)}`} closeHref={close} closeLabel={TEXT.close} narrow>
      <form action={acceptBooking.bind(null, request.id)} className={tables.dialogForm}>
        <dl className={events.facts}>
          <dt>{TEXT.service}</dt>
          <dd>{request.brief.service}</dd>
          <dt>{TEXT.price}</dt>
          <dd>{lkr(request.budgetLkr)}</dd>
          {depositPart && (
            <>
              <dt>{TEXT.deposit}</dt>
              <dd>{`${lkr(depositPart.amountLkr)} · due when you accept`}</dd>
            </>
          )}
          {last && (
            <>
              <dt>{TEXT.finalInstalment}</dt>
              <dd>{`${lkr(last.amountLkr)} · due ${last.due ? day(last.due) : ""}`}</dd>
            </>
          )}
          <dt>{TEXT.ifTheyCancel}</dt>
          <dd>{TEXT.keepDeposit}</dd>
          <dt>{TEXT.ifYouCancel}</dt>
          <dd>{TEXT.refundToThem}</dd>
        </dl>
        <Choice type="checkbox" name="agree" value="yes" title={TEXT.agree} required />
        {error === "agree" && <p className={forms.error}>{TEXT.agreeError}</p>}
        <p className={styles.foot}>{TEXT.markedOnCalendar(day(request.date))}</p>
        <div className={tables.dialogActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {TEXT.goBack}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.accept}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// "Decline this request?" (V50): a reason, and an optional note the organiser sees.
function DeclineDialog({ request, organiser, close, error }: { request: IncomingRequest; organiser: OrganiserCard; close: string; error?: string }) {
  return (
    <Dialog title={TEXT.declineTitle} subtitle={TEXT.declineText(organiser.name)} closeHref={close} closeLabel={TEXT.close} narrow>
      <form action={declineRequest.bind(null, request.id)} className={tables.dialogForm}>
        <fieldset className={hiring.plainFieldset}>
          <legend className={forms.label}>{TEXT.decline}</legend>
          {DECLINE_REASONS.map((reason) => (
            <Choice key={reason} type="radio" name="reason" value={reason} title={reason} required />
          ))}
        </fieldset>
        {error === "reason" && <p className={forms.error}>{TEXT.reasonError}</p>}
        <label className={forms.field}>
          <span className={forms.label}>{TEXT.noteLabel}</span>
          <textarea name="note" rows={3} className={forms.input} placeholder={TEXT.notePlaceholder} />
        </label>
        <div className={tables.dialogActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {TEXT.goBack}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
            {TEXT.declineButton}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// The quote's facts, shared by V51 and V53.
function QuoteFacts({ request, quote }: { request: IncomingRequest; quote: ProviderQuote }) {
  const [dep, ...instalments] = quote.payments;
  return (
    <dl className={events.facts}>
      <dt>{TEXT.price}</dt>
      <dd>{`${lkr(quote.priceLkr)} ${TEXT.theirBudget(lkr(request.budgetLkr))}`}</dd>
      {dep && (
        <>
          <dt>{TEXT.deposit}</dt>
          <dd>{`${dep.percent ?? 0}% · ${lkr(dep.amountLkr)} when they accept`}</dd>
        </>
      )}
      {instalments.map((p) => (
        <BriefRow key={p.label} label={TEXT.instalment} value={`${lkr(p.amountLkr)} · ${p.due ? day(p.due) : ""}`} />
      ))}
      {quote.cancellation.length > 0 && (
        <>
          <dt>{TEXT.cancellation}</dt>
          <dd>{quote.cancellation.join(" · ")}</dd>
        </>
      )}
    </dl>
  );
}

function Head({ title, chip, tone, sub }: { title: string; chip: string; tone: "good" | "neutral" | "danger"; sub: string }) {
  return (
    <header className={hiring.pageHeadText}>
      <div className={styles.inline}>
        <h1 className={hiring.pageTitle}>{title}</h1>
        <Chip tone={tone}>{chip}</Chip>
      </div>
      <p className={hiring.lede}>{sub}</p>
    </header>
  );
}

// "Quote sent to Agastra Events" (V51): waiting for the organiser, with a timeline.
function QuoteWaiting({ request, quote, organiser, now }: { request: IncomingRequest; quote: ProviderQuote; organiser: OrganiserCard; now: Date }) {
  const sent = daysFrom(now, quote.sentAt) === 0 ? `today, ${formatTime(quote.sentAt)}` : formatShortDate(quote.sentAt);
  const stamp = (iso: string) => `${formatShortDate(iso)} · ${formatTime(iso)}`;
  const aside = (
    <>
      <Panel title={TEXT.timeline}>
        <ol className={styles.steps}>
          <Step title={TEXT.requestReceived} sub={stamp(request.receivedAt)} done />
          <Step title={TEXT.quoteSent} sub={stamp(quote.sentAt)} done />
          <Step title={TEXT.organiserDecides} sub={TEXT.acceptOrDecline} next={TEXT.next} />
        </ol>
      </Panel>
      <Panel title={TEXT.outcomes}>
        <div className={styles.tintRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.ifAccept}</span>
            <span className={hiring.sub}>{TEXT.ifAcceptText}</span>
          </span>
        </div>
        <div className={styles.tintRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.ifDecline}</span>
            <span className={hiring.sub}>{TEXT.ifDeclineText}</span>
          </span>
        </div>
      </Panel>
    </>
  );
  return (
    <Columns aside={aside}>
      <Head title={TEXT.quoteSentTo(organiser.name)} chip={TEXT.waitingChip} tone="neutral" sub={`${request.eventTitle} · ${day(request.date)} · ${TEXT.sentOn(sent)}`} />
      <div className={`${styles.banner} ${styles.infoBanner}`}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{TEXT.waitingFor(organiser.name)}</span>
          <span className={hiring.sub}>{TEXT.waitingText}</span>
        </span>
      </div>
      <section className={events.card} aria-labelledby="quote-title">
        <div className={hiring.cardHead}>
          <h2 id="quote-title" className={hiring.cardTitle}>
            {TEXT.yourQuote}
          </h2>
          <Chip tone="soft">{TEXT.sentChip}</Chip>
        </div>
        <QuoteFacts request={request} quote={quote} />
      </section>
      {quote.message && (
        <section className={events.card} aria-labelledby="message-title">
          <h2 id="message-title" className={hiring.cardTitle}>
            {TEXT.yourMessage}
          </h2>
          <p className={styles.foot}>{quote.message}</p>
        </section>
      )}
      <div className={styles.buttonRow}>
        <Link href={routes.vendorArea.quote(request.id)} className={forms.bigButton}>
          {TEXT.editQuote}
        </Link>
        <Link href={routes.vendorArea.messages} className={forms.bigButton}>
          {TEXT.messageOrganiser}
        </Link>
        <form action={withdrawQuote.bind(null, request.id)} className={styles.formFill}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
            {TEXT.withdraw}
          </button>
        </form>
      </div>
    </Columns>
  );
}

// "Hill Events accepted your quote" (V52), or a request the provider accepted themselves.
function QuoteAccepted({ request, organiser, state }: { request: IncomingRequest; organiser: OrganiserCard; state: ProviderState }) {
  const booking = state.bookings.find((b) => b.id === request.bookingId);
  const quote = request.quote;
  const [dep, ...rest] = booking?.payments ?? quote?.payments ?? request.payments;
  const last = rest.at(-1);
  const decided = quote?.decidedAt ?? booking?.bookedAt ?? request.receivedAt;
  const aside = (
    <Panel title={TEXT.addedForYou}>
      <div className={styles.tintRow}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.calendar}</span>
          <span className={hiring.sub}>{TEXT.markedBooked(day(booking?.date ?? request.date))}</span>
        </span>
        <Chip tone="soft">{TEXT.auto}</Chip>
      </div>
      <div className={styles.tintRow}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.reminders}</span>
          <span className={hiring.sub}>{TEXT.remindersText}</span>
        </span>
      </div>
    </Panel>
  );
  return (
    <Columns aside={aside}>
      <Head
        title={quote ? TEXT.acceptedYourQuote(organiser.name) : `${request.eventTitle} · ${request.title.toLowerCase()}`}
        chip={TEXT.bookedChip}
        tone="good"
        sub={`${request.eventTitle} · ${request.title.toLowerCase()} · ${day(booking?.date ?? request.date)}`}
      />
      <div className={styles.banner}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{TEXT.confirmedOnTerms}</span>
          <span className={hiring.sub}>{TEXT.acceptedOn(`${formatDayMonth(decided)}, ${formatTime(decided)}`, booking?.ref ?? "")}</span>
        </span>
      </div>
      <section className={events.card} aria-labelledby="agreed-title">
        <div className={hiring.cardHead}>
          <h2 id="agreed-title" className={hiring.cardTitle}>
            {TEXT.agreed}
          </h2>
          <Chip tone="good">{TEXT.confirmedChip}</Chip>
        </div>
        <dl className={events.facts}>
          <dt>{TEXT.price}</dt>
          <dd>{lkr(booking?.priceLkr ?? quote?.priceLkr ?? request.budgetLkr)}</dd>
          {dep && (
            <>
              <dt>{TEXT.deposit}</dt>
              <dd>{[dep.percent ? `${dep.percent}%` : null, lkr(dep.amountLkr), dep.receivedAt ? `received ${formatShortDate(dep.receivedAt)}` : "due now"].filter(Boolean).join(" · ")}</dd>
            </>
          )}
          {last && (
            <>
              <dt>{TEXT.finalInstalment}</dt>
              <dd>{`${lkr(last.amountLkr)} · ${last.due ? day(last.due) : ""}`}</dd>
            </>
          )}
          <dt>{TEXT.cancellation}</dt>
          <dd>{quote ? TEXT.yourTerms : "As in the request"}</dd>
        </dl>
      </section>
      <div className={styles.pair}>
        {booking && (
          <Link href={routes.vendorArea.booking(booking.id)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.openBooking}
          </Link>
        )}
        <Link href={routes.vendorArea.messages} className={forms.bigButton}>
          {TEXT.messageWho(organiser.name)}
        </Link>
      </div>
    </Columns>
  );
}

// "Wave Events declined your quote" (V53).
function QuoteDeclined({ request, quote, organiser }: { request: IncomingRequest; quote: ProviderQuote; organiser: OrganiserCard }) {
  const aside = (
    <Panel title={TEXT.rankTitle}>
      <p className={styles.foot}>{TEXT.rankText}</p>
    </Panel>
  );
  return (
    <Columns aside={aside}>
      <Head title={TEXT.declinedYourQuote(organiser.name)} chip={TEXT.declinedChip} tone="danger" sub={`${request.eventTitle} · ${request.title.toLowerCase()} · ${day(request.date)}`} />
      {quote.note && (
        <section className={events.card} aria-labelledby="note-title">
          <h2 id="note-title" className={hiring.cardTitle}>
            {TEXT.theirNote}
          </h2>
          <p className={styles.foot}>{quote.note}</p>
        </section>
      )}
      <section className={events.card} aria-labelledby="quote-title">
        <div className={hiring.cardHead}>
          <h2 id="quote-title" className={hiring.cardTitle}>
            {TEXT.yourQuote}
          </h2>
          <Chip tone="danger">{TEXT.declinedChip}</Chip>
        </div>
        <QuoteFacts request={request} quote={quote} />
      </section>
      <div className={styles.pair}>
        <Link href={routes.vendorArea.jobs} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
          {TEXT.findSimilar}
        </Link>
        <Link href={routes.vendorArea.messages} className={forms.bigButton}>
          {TEXT.messageWho(organiser.name)}
        </Link>
      </div>
    </Columns>
  );
}

// A request the provider declined (V50, after sending).
function YouDeclined({ request, organiser }: { request: IncomingRequest; organiser: OrganiserCard }) {
  const declined = request.declined;
  return (
    <Columns aside={<OrganiserPanel organiser={organiser} short />}>
      <Head title={`${organiser.name} · ${request.title}`} chip={TEXT.declinedChip} tone="danger" sub={`${request.eventTitle} · ${day(request.date)} · ${lkr(request.budgetLkr)}`} />
      <section className={events.card} aria-labelledby="declined-title">
        <h2 id="declined-title" className={hiring.cardTitle}>
          {TEXT.youDeclined}
        </h2>
        {declined && <p className={styles.foot}>{TEXT.youDeclinedText(declined.reason, formatDayMonth(declined.at))}</p>}
        {declined?.note && (
          <p className={styles.foot}>
            <strong>{`${TEXT.noteSent}: `}</strong>
            {declined.note}
          </p>
        )}
      </section>
      <Link href={`${routes.vendorArea.requests}?tab=declined`} className={forms.bigButton}>
        {TEXT.goBack}
      </Link>
    </Columns>
  );
}
