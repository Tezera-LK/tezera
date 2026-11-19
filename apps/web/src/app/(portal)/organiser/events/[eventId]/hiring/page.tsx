import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import EventHeader from "@/components/portal/events/EventHeader";
import events from "@/components/portal/events/EventPages.module.css";
import { hasEnded } from "@/components/portal/events/eventText";
import styles from "@/components/portal/hiring/Hiring.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getEventHiring, getHiringMessages, getMyEvent, getProvidersById } from "@/lib/data/portal";
import type { BookingRequest, HireProvider } from "@/lib/data/portal-types";
import { formatCount, formatDayMonth } from "@/lib/format";
import { bookingsOf, hiringCounts, priceOf, recentRequests } from "@/lib/hiring";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Hiring" };

const TEXT = {
  title: "Hiring for this event",
  postJob: "Post a job",
  findProviders: "Find providers",
  requestsSent: "Requests sent",
  quotesReceived: "Quotes received",
  confirmed: "Confirmed bookings",
  requests: "Booking requests",
  provider: "Provider",
  service: "Service",
  status: "Status",
  actions: "Actions",
  sent: (kind: string, when: string) => `${kind} · sent ${when}`,
  waiting: "Waiting for a reply",
  ownQuote: (price: number) => `Own quote · LKR ${formatCount(price)}`,
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
  reviewQuote: "Review quote",
  openBooking: "Open booking",
  findAnother: "Find another",
  noRequests: "No booking requests yet. Find a provider and send one.",
  jobs: "Job posts",
  job: "Job",
  quotes: "Quotes",
  quotesClose: "Quotes close",
  open: "Open",
  closed: "Closed",
  compare: "Compare quotes",
  viewQuotes: "View quotes",
  noJobs: "No job posts. Post one and providers send you quotes.",
  date: "Date",
  price: "Price",
  noBookings: "No confirmed bookings yet.",
  closingSoon: "Quotes closing soon",
  closingDetail: (quotes: number, when: string) => `${quotes} ${quotes === 1 ? "quote" : "quotes"} · close ${when}`,
  messages: "Messages with providers",
  noMessages: "Messages with providers show up here.",
} as const;

// The service a request is for: what its brief says, or the provider's line of work.
const serviceOf = (r: BookingRequest, p?: HireProvider) => r.brief.service || p?.role || "";

// The event's Hiring tab (Figma O14): what's been asked for and booked for this event. Requests,
// job posts and bookings each link on to their own page.
export default async function EventHiringPage({ params }: { params: Promise<{ eventId: string }> }) {
  const session = await requireRole("organiser");
  const { eventId } = await params;
  const event = await getMyEvent(session, eventId);
  if (!event || event.status === "draft" || event.status === "unpublished") notFound();

  const [{ requests, jobs }, messages] = await Promise.all([getEventHiring(session, eventId), getHiringMessages(session, eventId)]);
  const now = new Date();
  const providers = await getProvidersById(session, requests.map((r) => r.providerId));
  const counts = hiringCounts(requests, jobs);
  const recent = recentRequests(requests, now);
  const bookings = bookingsOf(requests);
  const canHire = !hasEnded(event) && (event.status === "published" || event.status === "postponed");
  const closing = jobs.filter((j) => j.status === "open").sort((a, b) => a.closesAt.localeCompare(b.closesAt))[0];
  const withEvent = (href: string) => `${href}?event=${encodeURIComponent(event.id)}`;

  const aside = (
    <>
      {closing && (
        <Panel title={TEXT.closingSoon}>
          <div className={styles.whiteRow}>
            <Thumb size={36} radius={4} />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{closing.title}</span>
              <span className={styles.sub}>{TEXT.closingDetail(closing.quotes.length, formatDayMonth(closing.closesAt))}</span>
            </span>
          </div>
          <Link href={routes.job(closing.id)} className={`${ui.rowButton} ${ui.rowButtonPrimary} ${tables.panelLink}`}>
            {TEXT.compare}
          </Link>
        </Panel>
      )}
      <Panel title={TEXT.messages} empty={TEXT.noMessages}>
        {messages.length > 0 &&
          messages.map((m) => (
            // a conversation opens in Messages, a later slice
            <MaybeLink key={m.id} className={styles.whiteRow}>
              <Thumb size={36} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{m.name}</span>
                <span className={styles.sub}>{m.text}</span>
              </span>
            </MaybeLink>
          ))}
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <EventHeader event={event} current="hiring" />

      <section className={`${tables.section} ${tables.sectionTight}`} aria-labelledby="hiring-title">
        <div className={tables.sectionHead}>
          <h2 id="hiring-title" className={ui.sectionTitle}>
            {TEXT.title}
          </h2>
          {canHire && (
            <div className={tables.headButtons}>
              <Link href={withEvent(routes.newJob)} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                {TEXT.postJob}
              </Link>
              <Link href={withEvent(routes.hiring)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                {TEXT.findProviders}
              </Link>
            </div>
          )}
        </div>
        <dl className={`${events.tiles} ${events.tiles3}`}>
          <Tile value={counts.requestsSent} label={TEXT.requestsSent} />
          <Tile value={counts.quotesReceived} label={TEXT.quotesReceived} />
          <Tile value={counts.confirmed} label={TEXT.confirmed} />
        </dl>
      </section>

      <section className={tables.section} aria-labelledby="requests-title">
        <h2 id="requests-title" className={ui.sectionTitle}>
          {TEXT.requests}
        </h2>
        {recent.length === 0 ? (
          <p className={ui.muted}>{TEXT.noRequests}</p>
        ) : (
          <div className={tables.tableCard}>
            <table className={`${tables.table} ${styles.requestsTable}`}>
              <thead>
                <tr>
                  <th scope="col">{TEXT.provider}</th>
                  <th scope="col">{TEXT.service}</th>
                  <th scope="col">{TEXT.status}</th>
                  <th scope="col">
                    <span className={shell.srOnly}>{TEXT.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => {
                  const p = providers.get(r.providerId);
                  return (
                    <tr key={r.id} className={r.status === "quoted" ? styles.quotedRow : undefined}>
                      <th scope="row">
                        <span className={tables.strong}>{p?.name}</span>
                        <span className={tables.small}>{TEXT.sent(p?.kind ?? "", formatDayMonth(r.sentAt))}</span>
                      </th>
                      <td>{serviceOf(r, p)}</td>
                      <td>
                        <RequestStatus request={r} />
                      </td>
                      <td>
                        {r.status === "quoted" ? (
                          <Link href={routes.bookingRequest(r.id)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                            {TEXT.reviewQuote}
                          </Link>
                        ) : r.status === "accepted" ? (
                          <Link href={routes.booking(r.id)} className={ui.textLink}>{`${TEXT.openBooking} ›`}</Link>
                        ) : r.status === "declined" && canHire ? (
                          <Link href={`${withEvent(routes.hiring)}&category=${encodeURIComponent(p?.category ?? "")}`} className={ui.textLink}>
                            {`${TEXT.findAnother} ›`}
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={tables.section} aria-labelledby="jobs-title">
        <h2 id="jobs-title" className={ui.sectionTitle}>
          {TEXT.jobs}
        </h2>
        {jobs.length === 0 ? (
          <p className={ui.muted}>{TEXT.noJobs}</p>
        ) : (
          <div className={tables.tableCard}>
            <table className={`${tables.table} ${styles.jobsTable}`}>
              <thead>
                <tr>
                  <th scope="col">{TEXT.job}</th>
                  <th scope="col">{TEXT.quotes}</th>
                  <th scope="col">{TEXT.quotesClose}</th>
                  <th scope="col">{TEXT.status}</th>
                  <th scope="col">
                    <span className={shell.srOnly}>{TEXT.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <th scope="row" className={tables.strong}>
                      {j.title}
                    </th>
                    <td>{j.quotes.length}</td>
                    <td>{formatDayMonth(j.closesAt)}</td>
                    <td>{j.status === "open" ? <Chip tone="soft">{TEXT.open}</Chip> : <Chip tone="neutral">{TEXT.closed}</Chip>}</td>
                    <td>
                      <Link href={routes.job(j.id)} className={ui.textLink}>
                        {`${j.status === "open" ? TEXT.compare : TEXT.viewQuotes} ›`}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={tables.section} aria-labelledby="bookings-title">
        <h2 id="bookings-title" className={ui.sectionTitle}>
          {TEXT.confirmed}
        </h2>
        {bookings.length === 0 ? (
          <p className={ui.muted}>{TEXT.noBookings}</p>
        ) : (
          <div className={tables.tableCard}>
            <table className={`${tables.table} ${styles.bookingsTable}`}>
              <thead>
                <tr>
                  <th scope="col">{TEXT.provider}</th>
                  <th scope="col">{TEXT.service}</th>
                  <th scope="col">{TEXT.date}</th>
                  <th scope="col">{TEXT.price}</th>
                  <th scope="col">
                    <span className={shell.srOnly}>{TEXT.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((r) => {
                  const p = providers.get(r.providerId);
                  return (
                    <tr key={r.id}>
                      <th scope="row">
                        <span className={tables.strong}>{p?.name}</span>
                        <span className={tables.small}>{p?.kind}</span>
                      </th>
                      <td>{serviceOf(r, p)}</td>
                      <td>{formatDayMonth(`${r.date}T12:00:00+05:30`)}</td>
                      <td className={styles.price}>{`LKR ${formatCount(priceOf(r))}`}</td>
                      <td>
                        {r.status === "cancelled" ? (
                          <Link href={routes.booking(r.id)} aria-label={`${TEXT.cancelled}: ${p?.name}`}>
                            <Chip tone="danger">{TEXT.cancelled}</Chip>
                          </Link>
                        ) : (
                          <Link href={routes.booking(r.id)} className={ui.textLink}>{"Open ›"}</Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Columns>
  );
}

// One white number tile, as on the overview (O09).
function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className={events.tile}>
      <dt className={`${ui.muted} ${events.tileLabel}`}>{label}</dt>
      <dd className={events.tileValue}>{value}</dd>
    </div>
  );
}

// A request's status chip: grey while waiting, amber with the price when they sent their own.
function RequestStatus({ request }: { request: BookingRequest }) {
  switch (request.status) {
    case "waiting":
      return <Chip tone="neutral">{TEXT.waiting}</Chip>;
    case "quoted":
      return <Chip tone="warn">{TEXT.ownQuote(request.quote?.priceLkr ?? 0)}</Chip>;
    case "accepted":
      return <Chip tone="good">{TEXT.accepted}</Chip>;
    case "declined":
      return <Chip tone="danger">{TEXT.declined}</Chip>;
    default:
      return <Chip tone="danger">{TEXT.cancelled}</Chip>;
  }
}
