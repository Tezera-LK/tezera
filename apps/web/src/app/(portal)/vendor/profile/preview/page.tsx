import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { lkr, noon, shortDay, stars } from "@/lib/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Your profile as organisers see it" };

const TEXT = {
  banner: "Preview: this is what organisers see",
  bannerText: "Edit buttons are hidden. Book and Message are what they press.",
  back: "Back to my profile",
  book: "Send booking request",
  message: "Message",
  verified: "✓ Verified",
  reviews: (r: number, n: number) => `★ ${r} · ${n} reviews`,
  rank: (n: number, cat: string, district: string) => `#${n} ${cat} · ${district}`,
  noLate: "No late cancellations",
  services: "Services and indicative prices",
  from: (p: string) => `from ${p}`,
  freeOn: "Free on",
  hidden: "Booked and unavailable dates are hidden.",
  fromOrganisers: "Reviews from organisers",
  organiserReviews: (n: number) => `${n} organiser review${n === 1 ? "" : "s"}`,
  track: "Track record",
  completed: (n: number) => `${n} completed booking${n === 1 ? "" : "s"}`,
  since: (when: string) => `Since ${when}`,
  onRecord: "On record",
  emptyTitle: "No profile yet",
  emptyText: "Your profile shows up here once it's set up.",
} as const;

// The provider's profile as organisers see it (Figma V39, F39): no edit buttons, free dates only.
export default async function ProfilePreviewPage() {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  if (!state) return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />;
  const p = state.profile;
  const busy = new Set(state.calendar.map((m) => m.date));
  const now = new Date();
  // the next three weekend days with nothing on the calendar
  const free: string[] = [];
  for (let i = 1; i <= 60 && free.length < 3; i++) {
    const date = new Date(now.getTime() + i * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
    const weekday = new Date(noon(date)).getUTCDay();
    if ((weekday === 0 || weekday === 6) && !busy.has(date)) free.push(date);
  }
  const fromOrganisers = state.reviews.filter((r) => r.from === "organiser");

  const aside = (
    <>
      <Panel title={TEXT.freeOn}>
        <ul className={ui.chipList}>
          {free.map((d) => (
            <li key={d} className={styles.pill}>
              {shortDay(d)}
            </li>
          ))}
        </ul>
        <p className={styles.foot}>{TEXT.hidden}</p>
      </Panel>
      <Panel title={TEXT.fromOrganisers}>
        <span className={styles.inline}>
          <span className={hiring.pageTitle}>{p.rating}</span>
          <span className={hiring.sub}>{`${stars(p.rating)} · ${TEXT.organiserReviews(p.reviewSplit.organisers)}`}</span>
        </span>
        {fromOrganisers[0] && (
          <div className={hiring.whiteRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{`“${fromOrganisers[0].text.split(",")[0]}.”`}</span>
              <span className={hiring.sub}>{fromOrganisers[0].by}</span>
            </span>
          </div>
        )}
      </Panel>
      <Panel title={TEXT.track}>
        <div className={hiring.whiteRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.completed(p.completedBookings)}</span>
            <span className={hiring.sub}>{TEXT.since(p.since)}</span>
          </span>
        </div>
        <div className={hiring.whiteRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.noLate}</span>
            <span className={hiring.sub}>{TEXT.onRecord}</span>
          </span>
        </div>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <div className={`${styles.banner} ${styles.infoBanner}`}>
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{TEXT.banner}</span>
          <span className={hiring.sub}>{TEXT.bannerText}</span>
        </span>
        <Link href={routes.vendorArea.profile} className={ui.textLink}>
          {TEXT.back}
        </Link>
      </div>
      <section className={events.card} aria-labelledby="name">
        <div className={hiring.cardHead}>
          <span className={styles.inline}>
            <Thumb size={72} shape="round" />
            <span className={ui.rowText}>
              <h1 id="name" className={hiring.pageTitle}>
                {p.name}
              </h1>
              <span className={hiring.sub}>{`${p.category} · ${p.districts.join(", ")}`}</span>
            </span>
          </span>
          <span className={styles.inline}>
            <span className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>{TEXT.book}</span>
            <span className={ui.rowButton}>{TEXT.message}</span>
          </span>
        </div>
        <ul className={ui.chipList}>
          {state.verification.status === "approved" && (
            <li>
              <Chip tone="good">{TEXT.verified}</Chip>
            </li>
          )}
          <li>
            <Chip tone="soft">{p.badge}</Chip>
          </li>
          <li className={styles.pill}>{TEXT.reviews(p.rating, p.reviews)}</li>
          {p.rank && <li className={styles.pill}>{TEXT.rank(p.rank, p.rankCategory, p.districts[0])}</li>}
          {p.lateCancellations === 0 && (
            <li>
              <Chip tone="good">{TEXT.noLate}</Chip>
            </li>
          )}
        </ul>
        <p className={styles.foot}>{p.bio}</p>
      </section>
      <section className={events.card} aria-labelledby="services-title">
        <h2 id="services-title" className={hiring.cardTitle}>
          {TEXT.services}
        </h2>
        {p.services.map((s) => (
          <div key={s.id} className={styles.greyRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{s.name}</span>
              <span className={hiring.sub}>{s.detail}</span>
            </span>
            <span className={styles.amount}>{s.from ? TEXT.from(lkr(s.priceLkr)) : lkr(s.priceLkr)}</span>
          </div>
        ))}
      </section>
      <ul className={styles.grid3}>
        {p.portfolio.slice(0, 6).map((x) => (
          <li key={x.id} className={styles.fluid}>
            <Thumb size={240} height={150} shape="image" />
            <p className={styles.tileCaption}>{x.title}</p>
          </li>
        ))}
      </ul>
      <Link href={routes.vendorArea.profile} className={forms.bigButton}>
        {TEXT.back}
      </Link>
    </Columns>
  );
}
