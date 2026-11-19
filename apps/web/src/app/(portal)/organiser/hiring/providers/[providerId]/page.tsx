import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import events from "@/components/portal/events/EventPages.module.css";
import styles from "@/components/portal/hiring/Hiring.module.css";
import { BadgeChip } from "@/components/portal/hiring/ProviderBits";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProvider, listMyEvents } from "@/lib/data/portal";
import { formatCount, formatDayMonth } from "@/lib/format";
import { hiringEvent } from "@/lib/hiring";
import { routes } from "@/lib/routes";

type Props = { params: Promise<{ providerId: string }>; searchParams: Promise<{ event?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await requireRole("organiser");
  const provider = await getProvider(session, (await params).providerId);
  return { title: provider?.name ?? "Provider" };
}

const TEXT = {
  sendRequest: "Send booking request",
  message: "Message",
  verified: "Verified",
  rating: "rating",
  reviews: "reviews",
  jobs: "completed jobs",
  rankIn: (category: string, district: string) => `in ${category}, ${district}`,
  unranked: "Not ranked yet",
  services: "Services and prices",
  service: "Service",
  price: "Indicative price",
  from: (n: number) => `From LKR ${formatCount(n)}`,
  portfolio: "Portfolio",
  item: (n: number, video: boolean) => `${video ? "Video" : "Photo"} ${n}`,
  video: "Video",
  reviewsTitle: "Reviews",
  fromReviews: (n: number) => `from ${n} reviews`,
  parts: [
    ["quality", "Quality"],
    ["punctuality", "Punctuality"],
    ["communication", "Communication"],
    ["value", "Value for money"],
  ] as const,
  filterService: "Service ▾",
  filterEventType: "Event type ▾",
  noReviews: "No written reviews yet.",
  stars: (n: number) => `${n} out of 5 stars`,
  districts: "Districts served",
  freeDates: "Free dates",
  free: (day: string) => `${day} · free`,
  booked: (day: string) => `${day} · booked`,
  leaderboard: "Leaderboard",
  rankLine: (rank: number, category: string, district: string) => `#${rank} in ${category}, ${district}`,
  seeLeaderboards: "See leaderboards",
  howTitle: "How booking works",
  how: (first: string) =>
    `Send a request with your event, times, budget, brief and terms. ${first} can accept, decline or send their own quote.`,
} as const;

// A provider's profile (Figma O18): who they are, their numbers, services, portfolio and reviews,
// with "Send booking request" for the event the organiser is hiring for.
export default async function ProviderPage({ params, searchParams }: Props) {
  const session = await requireRole("organiser");
  const { providerId } = await params;
  const query = await searchParams;
  const provider = await getProvider(session, providerId);
  if (!provider) notFound();

  const event = hiringEvent(await listMyEvents(session), query.event, new Date());
  const first = provider.kind === "Freelancer" ? provider.name.split(" ")[0] : provider.name;
  const district = provider.districts[0];
  const requestHref = event ? `${routes.requestBooking(provider.id)}?event=${encodeURIComponent(event.id)}` : undefined;
  // the event's day and the next one, and whether they're booked then
  const days = event
    ? [0, 1].map((n) => {
        const day = new Date(Date.parse(`${event.date}T12:00:00+05:30`) + n * 86_400_000).toISOString().slice(0, 10);
        return { day, booked: provider.bookedDates.includes(day) };
      })
    : [];

  const aside = (
    <>
      <Panel title={TEXT.districts}>
        <div className={styles.chipRow}>
          {provider.districts.map((d) => (
            <span key={d} className={styles.whiteChip}>
              {d}
            </span>
          ))}
        </div>
      </Panel>
      {days.length > 0 && (
        <Panel title={TEXT.freeDates}>
          <div className={styles.chipRow}>
            {days.map((d) => {
              const label = formatDayMonth(`${d.day}T12:00:00+05:30`);
              return (
                <span key={d.day} className={`${styles.whiteChip} ${d.booked ? "" : styles.darkChip}`}>
                  {d.booked ? TEXT.booked(label) : TEXT.free(label)}
                </span>
              );
            })}
          </div>
        </Panel>
      )}
      {provider.rank !== null && (
        <Panel title={TEXT.leaderboard}>
          <p className={styles.panelStrong}>{TEXT.rankLine(provider.rank, provider.category, district)}</p>
          {/* the leaderboards page is a later slice */}
          <MaybeLink className={`${ui.rowButton} ${ui.rowButtonWhite} ${tables.panelLink}`}>{TEXT.seeLeaderboards}</MaybeLink>
        </Panel>
      )}
      <Panel title={TEXT.howTitle}>
        <p className={tables.panelText}>{TEXT.how(first)}</p>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <section className={styles.profileCard} aria-labelledby="provider-name">
        <div className={styles.profileTop}>
          <Thumb size={88} shape="round" />
          <div className={styles.providerText}>
            <h1 id="provider-name" className={styles.profileName}>
              {provider.name}
            </h1>
            <span className={styles.meta}>{`${provider.kind} · ${provider.categoryLabel} · Serves ${provider.districts.join(", ")}`}</span>
            <span className={styles.chipRow}>
              {provider.verified && <Chip tone="good">{TEXT.verified}</Chip>}
              <BadgeChip badge={provider.badge} />
            </span>
          </div>
          <div className={styles.profileButtons}>
            <MaybeLink href={requestHref} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
              {TEXT.sendRequest}
            </MaybeLink>
            <MaybeLink href={`${routes.messages}?to=${encodeURIComponent(provider.id)}`} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
              {TEXT.message}
            </MaybeLink>
          </div>
        </div>
        <p className={styles.bio}>{provider.bio}</p>
        <dl className={styles.profileTiles}>
          <Tile value={`★ ${provider.rating}`} label={TEXT.rating} />
          <Tile value={String(provider.reviews)} label={TEXT.reviews} />
          <Tile value={String(provider.jobs)} label={TEXT.jobs} />
          <Tile
            value={provider.rank !== null ? `#${provider.rank}` : "–"}
            label={provider.rank !== null ? TEXT.rankIn(provider.category, district) : TEXT.unranked}
          />
        </dl>
      </section>

      <section className={tables.section} aria-labelledby="services-title">
        <h2 id="services-title" className={ui.sectionTitle}>
          {TEXT.services}
        </h2>
        <div className={tables.tableCard}>
          <table className={`${tables.table} ${styles.servicesTable}`}>
            <thead>
              <tr>
                <th scope="col">{TEXT.service}</th>
                <th scope="col">{TEXT.price}</th>
              </tr>
            </thead>
            <tbody>
              {provider.services.map((s) => (
                <tr key={s.name}>
                  <th scope="row">
                    <span className={tables.strong}>{s.name}</span>
                    <span className={tables.small}>{s.detail}</span>
                  </th>
                  <td className={styles.servicePrice}>{TEXT.from(s.fromLkr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {provider.portfolio.length > 0 && (
        <section className={tables.section} aria-labelledby="portfolio-title">
          <h2 id="portfolio-title" className={ui.sectionTitle}>
            {TEXT.portfolio}
          </h2>
          {/* pictures arrive with storage (EN-03); until then each item is a placeholder */}
          <ul className={styles.portfolio}>
            {provider.portfolio.map((video, i) => (
              <li key={i} aria-label={TEXT.item(i + 1, video)}>
                <Thumb size={116} height={110} shape="image" />
                {video && <span className={styles.videoTag}>{TEXT.video}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={tables.section} aria-labelledby="reviews-title">
        <h2 id="reviews-title" className={ui.sectionTitle}>
          {TEXT.reviewsTitle}
        </h2>
        <div className={styles.reviewsCard}>
          <div>
            <p className={styles.bigScore}>{provider.rating}</p>
            <p className={styles.meta}>{TEXT.fromReviews(provider.reviews)}</p>
            <dl className={styles.parts}>
              {TEXT.parts.map(([key, label]) => (
                <div key={key} className={styles.partRow}>
                  <dt>{label}</dt>
                  <dd>{`★ ${provider.ratings[key]}`}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            {/* filtering reviews is a "Could" in Figma; the pills are drawn but don't filter yet */}
            <div className={styles.reviewFilters}>
              <MaybeLink className={`${ui.rowButton} ${styles.filterChip}`}>{TEXT.filterService}</MaybeLink>
              <MaybeLink className={`${ui.rowButton} ${styles.filterChip}`}>{TEXT.filterEventType}</MaybeLink>
            </div>
            {provider.reviewList.length === 0 ? (
              <p className={styles.meta}>{TEXT.noReviews}</p>
            ) : (
              <ul className={styles.reviewList}>
                {provider.reviewList.map((r) => (
                  <li key={r.id} className={styles.review}>
                    <span className={styles.meta}>{[r.by, r.byRole, r.event, r.month].join(" · ")}</span>
                    <span className={styles.stars} role="img" aria-label={TEXT.stars(r.stars)}>
                      {"★".repeat(r.stars)}
                    </span>
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </Columns>
  );
}

// One white tile in the header card: the value big, the label under it.
function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className={events.tile}>
      <dt className={`${ui.muted} ${events.tileLabel}`}>{label}</dt>
      <dd className={events.tileValue}>{value}</dd>
    </div>
  );
}
