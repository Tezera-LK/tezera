import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { day } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { followOrganiser } from "../../home-actions";

export const metadata: Metadata = { title: "Organiser" };

const TEXT = {
  follow: "Follow",
  following: "Following",
  message: "Message",
  verified: "✓ Verified organiser",
  notVerified: "Not verified yet",
  fromProviders: (r: number) => `★ ${r} from providers`,
  paid: (pct: number) => `${pct}% paid on time`,
  pastEvents: (n: number) => `${n} past events`,
  reviewsTitle: "Reviews from providers",
  payment: "Payment",
  communication: "Communication",
  planning: "Planning",
  reviews: (n: number) => `${n} reviews`,
  noReviews: "No reviews from providers yet.",
  upcoming: "Upcoming events",
  noUpcoming: "Nothing announced yet.",
  paymentRecord: "Payment record",
  paidNote: "Share of bookings paid by the due date",
  lateTitle: (n: number) => (n === 0 ? "No late cancellations" : `${n} late cancellation${n === 1 ? "" : "s"}`),
  onRecord: "On record",
} as const;

const stars = (n: number) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));

// An organiser as vendors and freelancers see them (Figma V54, F54): how they pay and plan, what
// providers say about them, and what they have coming up.
export default async function OrganiserPage({ params }: { params: Promise<{ organiserId: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const { organiserId } = await params;
  const state = await getProviderState(session);
  const o = state?.organisers.find((x) => x.id === organiserId);
  if (!state || !o) notFound();
  const following = state.following.includes(o.id);

  const aside = (
    <>
      <Panel title={TEXT.upcoming} empty={o.upcoming.length === 0 ? TEXT.noUpcoming : undefined}>
        {o.upcoming.length > 0 &&
          o.upcoming.map((e) => (
            <div key={e.title} className={hiring.whiteRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{e.title}</span>
                <span className={hiring.sub}>{`${day(e.date)} · ${e.note}`}</span>
              </span>
            </div>
          ))}
      </Panel>
      <Panel title={TEXT.paymentRecord}>
        <div className={styles.tintRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.paid(o.paidOnTime)}</span>
            <span className={hiring.sub}>{TEXT.paidNote}</span>
          </span>
        </div>
        <div className={styles.tintRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.lateTitle(o.lateCancellations)}</span>
            <span className={hiring.sub}>{TEXT.onRecord}</span>
          </span>
        </div>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <section className={events.card} aria-labelledby="org-name">
        <div className={hiring.cardHead}>
          <span className={styles.inline}>
            <Thumb size={64} shape="round" />
            <span className={ui.rowText}>
              <h1 id="org-name" className={hiring.pageTitle}>
                {o.name}
              </h1>
              <span className={hiring.sub}>{o.about}</span>
            </span>
          </span>
          <span className={styles.inline}>
            <form action={followOrganiser.bind(null, o.id, !following, routes.vendorArea.organiser(o.id))}>
              <button type="submit" className={`${ui.rowButton} ${following ? "" : ui.rowButtonPrimary}`}>
                {following ? TEXT.following : TEXT.follow}
              </button>
            </form>
            <Link href={`${routes.vendorArea.messages}?to=${o.id}`} className={ui.rowButton}>
              {TEXT.message}
            </Link>
          </span>
        </div>
        <ul className={ui.chipList}>
          <li>
            <Chip tone={o.verified ? "good" : "warn"}>{o.verified ? TEXT.verified : TEXT.notVerified}</Chip>
          </li>
          <li>
            <Chip tone="soft">{TEXT.fromProviders(o.rating)}</Chip>
          </li>
          <li>
            <Chip tone="soft">{TEXT.paid(o.paidOnTime)}</Chip>
          </li>
          <li>
            <Chip tone="soft">{TEXT.pastEvents(o.pastEvents)}</Chip>
          </li>
        </ul>
      </section>

      <section className={events.card} aria-labelledby="reviews-title">
        <h2 id="reviews-title" className={hiring.cardTitle}>
          {TEXT.reviewsTitle}
        </h2>
        <dl className={events.tiles}>
          <Score value={String(o.rating)} label={`${stars(o.rating)} · ${TEXT.reviews(o.reviews)}`} />
          <Score value={String(o.scores.payment)} label={TEXT.payment} />
          <Score value={String(o.scores.communication)} label={TEXT.communication} />
          <Score value={String(o.scores.planning)} label={TEXT.planning} />
        </dl>
        {o.reviewList.length === 0 ? (
          <p className={ui.muted}>{TEXT.noReviews}</p>
        ) : (
          <ul className={ui.rows}>
            {o.reviewList.map((r) => (
              <li key={r.id} className={styles.greyRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{`${r.by} · ${r.byKind}`}</span>
                  <span className={hiring.sub}>{`${stars(r.stars)} · ${r.event}`}</span>
                  <span className={styles.foot}>{r.text}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Link href={routes.vendorArea.requests} className={forms.bigButton}>
        Back to booking requests
      </Link>
    </Columns>
  );
}

function Score({ value, label }: { value: string; label: string }) {
  return (
    <div className={`${events.tile} ${styles.greyTile}`}>
      <dt className={`${ui.muted} ${events.tileLabel}`}>{label}</dt>
      <dd className={events.tileValue}>{value}</dd>
    </div>
  );
}
