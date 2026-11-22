import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import styles from "@/components/portal/hiring/Hiring.module.css";
import ProviderFilters from "@/components/portal/hiring/ProviderFilters";
import { BadgeChip } from "@/components/portal/hiring/ProviderBits";
import shell from "@/components/portal/PortalShell.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import {
  getLeaderboard,
  getProvidersById,
  listMyEvents,
  listMyHiring,
  listProviders,
} from "@/lib/data/portal";
import LockedDialog from "@/components/portal/verification/LockedDialog";
import type { HireProvider } from "@/lib/data/portal-types";
import { formatCount, formatDayMonth } from "@/lib/format";
import { CATEGORY_PEOPLE, hiringEvent } from "@/lib/hiring";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Hiring" };

const TEXT = {
  title: "Hiring",
  lede: "Find vendors and freelancers, post jobs and keep track of bookings.",
  postJob: "Post a job",
  count: (n: number, sort: string) =>
    `${n} ${n === 1 ? "provider" : "providers"}, ordered by ${sort}`,
  sortWords: { rank: "rank", rating: "rating", price: "price" } as Record<string, string>,
  verified: "Verified",
  meta: (p: HireProvider) => `${p.kind} · ${p.categoryLabel} · Serves ${p.districts.join(", ")}`,
  stats: (p: HireProvider) =>
    `★ ${p.rating} · ${p.reviews} reviews · ${p.jobs} jobs · from LKR ${formatCount(p.fromLkr)}`,
  message: "Message",
  messageWho: (name: string) => `Message ${name}`,
  viewProfile: "View profile",
  viewWho: (name: string) => `View ${name}'s profile`,
  none: "No providers match. Try fewer filters, or post a job and let them come to you.",
  stripTitle: "Not finding the right person?",
  stripText: "Post a job and let providers send you quotes.",
  leaderboard: "Leaderboard",
  all: "All",
  topIn: (people: string, district: string) => `Top ${people} in ${district}, by rank`,
  noRanks: "No ranked providers here yet.",
  yourBookings: "Your bookings",
  confirmed: (n: number) => `${n} confirmed`,
  toAnswer: (n: number) => `${n} ${n === 1 ? "quote" : "quotes"} to answer`,
  noBookings: "Bookings you make show up here.",
} as const;

type Query = {
  q?: string;
  category?: string;
  district?: string;
  rating?: string;
  verified?: string;
  free?: string;
  sort?: string;
  event?: string;
  // set when a page that needs the Verified badge sent the organiser here (O41)
  locked?: string;
};

// Find providers (Figma O17): search and filter vendors and freelancers, ranked. The page hires
// for one event at a time (?event=, or the next one), which "Free on …" and the requests use.
export default async function HiringPage({ searchParams }: { searchParams: Promise<Query> }) {
  const session = await requireRole("organiser");
  const query = await searchParams;
  const now = new Date();
  const event = hiringEvent(await listMyEvents(session), query.event, now);
  const sort = query.sort === "rating" || query.sort === "price" ? query.sort : "rank";

  const providers = await listProviders(session, {
    q: query.q ?? "",
    category: query.category ?? "",
    district: query.district ?? "",
    minRating: Number(query.rating) || 0,
    verifiedOnly: query.verified === "1",
    freeOn: query.free === "1" && event ? event.date : "",
    sort,
  });
  // the leaderboard follows the filters, and starts on photographers in Colombo as Figma does
  const boardCategory = query.category || "Photography";
  const boardDistrict = query.district || "Colombo";
  const [leaders, hiring] = await Promise.all([
    getLeaderboard(session, boardCategory, boardDistrict),
    listMyHiring(session),
  ]);
  const withEvent = (href: string) =>
    event ? `${href}?event=${encodeURIComponent(event.id)}` : href;

  const forEvent = event ? hiring.requests.filter((r) => r.eventId === event.id) : [];
  const confirmed = forEvent.filter((r) => r.status === "accepted").length;
  const quoted = hiring.requests.filter((r) => r.status === "quoted");
  const quotedBy = await getProvidersById(
    session,
    quoted.map((r) => r.providerId),
  );

  const aside = (
    <>
      <Panel title={TEXT.leaderboard} link={{ label: TEXT.all }}>
        <p className={tables.panelText}>
          {TEXT.topIn(CATEGORY_PEOPLE[boardCategory] ?? boardCategory, boardDistrict)}
        </p>
        {leaders.length === 0 && <p className={tables.panelText}>{TEXT.noRanks}</p>}
        {leaders.map((p) => (
          <Link key={p.id} href={withEvent(routes.provider(p.id))} className={styles.whiteRow}>
            <Thumb size={32} shape="round" />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{`${p.rank} · ${p.name}`}</span>
              {p.badge && <span className={styles.sub}>{p.badge}</span>}
            </span>
          </Link>
        ))}
      </Panel>
      <Panel
        title={TEXT.yourBookings}
        empty={confirmed === 0 && quoted.length === 0 ? TEXT.noBookings : undefined}
      >
        {(confirmed > 0 || quoted.length > 0) && (
          <>
            {event && confirmed > 0 && (
              <Link href={routes.eventHiring(event.id)} className={styles.whiteRow}>
                <Thumb size={28} radius={4} />
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{TEXT.confirmed(confirmed)}</span>
                  <span className={styles.sub}>{event.title}</span>
                </span>
              </Link>
            )}
            {quoted.length > 0 && (
              <Link href={routes.bookingRequest(quoted[0].id)} className={styles.whiteRow}>
                <Thumb size={28} radius={4} />
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{TEXT.toAnswer(quoted.length)}</span>
                  <span className={styles.sub}>
                    {[quotedBy.get(quoted[0].providerId)?.name, quoted[0].brief.service]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
            )}
          </>
        )}
      </Panel>
    </>
  );

  return (
    <>
      {query.locked && (
        <LockedDialog
          title={
            query.locked === "job"
              ? "Get verified to post jobs"
              : "Get verified to send booking requests"
          }
          closeHref={withEvent(routes.hiring)}
        />
      )}
      <Columns aside={aside}>
        <header className={styles.pageHead}>
          <div className={styles.pageHeadText}>
            <h1 className={styles.pageTitle}>{TEXT.title}</h1>
            <p className={styles.lede}>{TEXT.lede}</p>
          </div>
          <Link
            href={withEvent(routes.newJob)}
            className={`${ui.rowButton} ${ui.rowButtonWhite} ${styles.bigPill}`}
          >
            {TEXT.postJob}
          </Link>
        </header>

        <ProviderFilters
          eventId={event?.id ?? null}
          eventDay={event ? formatDayMonth(`${event.date}T12:00:00+05:30`) : null}
          values={{
            q: query.q ?? "",
            category: query.category ?? "",
            district: query.district ?? "",
            rating: query.rating ?? "",
            verified: query.verified === "1",
            free: query.free === "1",
            sort,
          }}
        />

        <p className={styles.resultCount} role="status">
          {TEXT.count(providers.length, TEXT.sortWords[sort])}
        </p>

        {providers.length === 0 ? (
          <p className={ui.muted}>{TEXT.none}</p>
        ) : (
          <ul className={ui.rows}>
            {providers.map((p) => (
              <li key={p.id} className={styles.providerCard}>
                <Thumb size={56} shape="round" />
                <div className={styles.providerText}>
                  <div className={styles.nameLine}>
                    <h2 className={styles.providerName}>{p.name}</h2>
                    {p.verified && <Chip tone="good">{TEXT.verified}</Chip>}
                    <BadgeChip badge={p.badge} />
                  </div>
                  <span className={styles.meta}>{TEXT.meta(p)}</span>
                  <span className={styles.stats}>{TEXT.stats(p)}</span>
                </div>
                <div className={styles.cardButtons}>
                  <MaybeLink href={`${routes.messages}?to=${encodeURIComponent(p.id)}`} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                    <span aria-hidden="true">{TEXT.message}</span>
                    <span className={shell.srOnly}>{TEXT.messageWho(p.name)}</span>
                  </MaybeLink>
                  <Link
                    href={withEvent(routes.provider(p.id))}
                    className={`${ui.rowButton} ${ui.rowButtonPrimary}`}
                    aria-label={TEXT.viewWho(p.name)}
                  >
                    {TEXT.viewProfile}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.strip}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.stripTitle}</span>
            <span className={styles.sub}>{TEXT.stripText}</span>
          </span>
          <Link href={withEvent(routes.newJob)} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
            {TEXT.postJob}
          </Link>
        </div>
      </Columns>
    </>
  );
}
