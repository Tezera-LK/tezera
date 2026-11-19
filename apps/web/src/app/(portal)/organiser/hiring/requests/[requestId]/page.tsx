import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import forms from "@/components/portal/forms.module.css";
import styles from "@/components/portal/hiring/Hiring.module.css";
import { ProviderSummary } from "@/components/portal/hiring/ProviderBits";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getBookingRequest, getMyEvent, getProvider } from "@/lib/data/portal";
import type { BookingRequest, PaymentPart } from "@/lib/data/portal-types";
import { formatCount, formatDayMonth } from "@/lib/format";
import { routes } from "@/lib/routes";
import { acceptQuote, declineQuote } from "../../actions";

export const metadata: Metadata = { title: "Booking request" };

const TEXT = {
  quoted: (name: string) => `${name} sent their own quote`,
  waiting: (name: string) => `Waiting for ${name} to reply`,
  accepted: (name: string) => `${name} accepted`,
  declined: (name: string) => `${name} declined`,
  cancelled: (name: string) => `Booking with ${name} cancelled`,
  chip: {
    waiting: "Waiting for a reply",
    quoted: "Waiting for you",
    accepted: "Booking confirmed",
    declined: "Declined",
    cancelled: "Cancelled",
  },
  youAsked: "You asked for",
  theirQuote: (first: string) => `${first}'s quote`,
  price: "Price",
  cancellation: "Cancellation",
  yourTerms: "Your terms",
  onAccept: "on accept",
  message: "Their message",
  accept: "Accept quote",
  decline: "Decline",
  messageWho: (first: string) => `Message ${first}`,
  backToHiring: "Back to event hiring",
  line: (rating: number, reviews: number) => `★ ${rating} · ${reviews} reviews`,
  noteTitle: "Accepting confirms the booking",
  note: (first: string) => `On ${first}'s terms. You can ask to change terms later; ${first} must agree.`,
} as const;

const lkr = (n: number) => `LKR ${formatCount(n)}`;
const day = (date: string) => formatDayMonth(`${date}T12:00:00+05:30`);

// The payment rows of one side: "Deposit · LKR 10,000 · Mon 30 Nov", then each instalment.
// A deposit with no date is due on accepting.
function paymentFacts(payments: PaymentPart[]) {
  return payments.map((p) => ({
    label: p.label,
    value: `${lkr(p.amountLkr)} · ${p.due ? day(p.due) : TEXT.onAccept}`,
  }));
}

// One booking request (Figma O78 when the provider sent their own quote): what the organiser
// asked for, the provider's answer, and Accept or Decline. The other states show the same page
// without the buttons.
export default async function BookingRequestPage({ params }: { params: Promise<{ requestId: string }> }) {
  const session = await requireRole("organiser");
  const request = await getBookingRequest(session, (await params).requestId);
  if (!request) notFound();
  // once it's a booking, the booking page (O22) has everything
  if (request.status === "accepted" || request.status === "cancelled") redirect(routes.booking(request.id));
  const [provider, event] = await Promise.all([getProvider(session, request.providerId), getMyEvent(session, request.eventId)]);
  if (!provider) notFound();

  const first = provider.kind === "Freelancer" ? provider.name.split(" ")[0] : provider.name;
  const quote = request.quote;
  const title = {
    waiting: TEXT.waiting(first),
    quoted: TEXT.quoted(provider.name),
    accepted: TEXT.accepted(provider.name),
    declined: TEXT.declined(provider.name),
    cancelled: TEXT.cancelled(provider.name),
  }[request.status];

  const aside = (
    <>
      <ProviderSummary provider={provider} line={TEXT.line(provider.rating, provider.reviews)} heading />
      {request.status === "quoted" && (
        <div className={styles.notePanel}>
          <p className={styles.notePanelTitle}>{TEXT.noteTitle}</p>
          <p className={tables.panelText}>{TEXT.note(first)}</p>
        </div>
      )}
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={styles.pageHead}>
        <div className={styles.pageHeadText}>
          <h1 className={styles.pageTitle}>{title}</h1>
          <p className={styles.lede}>{[request.brief.service || provider.role, event?.title, day(request.date)].filter(Boolean).join(" · ")}</p>
        </div>
        <StatusChip status={request.status} />
      </header>

      <div className={styles.quotePair}>
        <section className={styles.quoteCard} aria-labelledby="asked-title">
          <h2 id="asked-title" className={styles.cardTitle}>
            {TEXT.youAsked}
          </h2>
          <Facts
            rows={[
              { label: TEXT.price, value: lkr(request.budgetLkr) },
              ...paymentFacts(request.payments),
              { label: TEXT.cancellation, value: TEXT.yourTerms },
            ]}
          />
        </section>
        {quote && (
          <section className={`${styles.quoteCard} ${styles.quoteCardTheirs}`} aria-labelledby="quote-title">
            <h2 id="quote-title" className={styles.cardTitle}>
              {TEXT.theirQuote(first)}
            </h2>
            <Facts
              rows={[
                { label: TEXT.price, value: lkr(quote.priceLkr) },
                ...paymentFacts(quote.payments),
                { label: TEXT.cancellation, value: quote.cancellation },
              ]}
            />
          </section>
        )}
      </div>

      {quote?.message && (
        <section className={styles.messageCard} aria-labelledby="message-title">
          <h2 id="message-title" className={styles.cardTitle}>
            {TEXT.message}
          </h2>
          <p className={styles.messageText}>{quote.message}</p>
        </section>
      )}

      {request.status === "quoted" ? (
        <div className={styles.quoteActions}>
          <form action={acceptQuote.bind(null, request.id)}>
            <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
              {TEXT.accept}
            </button>
          </form>
          <form action={declineQuote.bind(null, request.id)}>
            <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
              {TEXT.decline}
            </button>
          </form>
          <MaybeLink href={`${routes.messages}?to=${encodeURIComponent(provider.id)}`} className={forms.bigButton}>
            {TEXT.messageWho(first)}
          </MaybeLink>
        </div>
      ) : (
        <Link href={routes.eventHiring(request.eventId)} className={ui.textLink}>
          {`‹ ${TEXT.backToHiring}`}
        </Link>
      )}
    </Columns>
  );
}

// Label and value in two columns, as in O78's two cards.
function Facts({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className={styles.quoteFacts}>
      {rows.map((r) => (
        <div key={r.label} className={styles.partRow}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatusChip({ status }: { status: BookingRequest["status"] }) {
  const tone = status === "quoted" ? "warn" : status === "accepted" ? "good" : status === "waiting" ? "neutral" : "danger";
  return <Chip tone={tone}>{TEXT.chip[status]}</Chip>;
}
