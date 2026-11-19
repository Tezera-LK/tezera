import type { HireProvider, ProviderBadge } from "@/lib/data/portal-types";
import Chip from "../Chip";
import Thumb from "../Thumb";
import ui from "../ui.module.css";
import styles from "./Hiring.module.css";

// Small pieces the hiring pages share.

// "Top Rated" dark, "Rising" pale, "New" grey (O17, O18).
export function BadgeChip({ badge }: { badge: ProviderBadge | null }) {
  if (!badge) return null;
  return <Chip tone={badge === "Top Rated" ? "strong" : badge === "Rising" ? "soft" : "neutral"}>{badge}</Chip>;
}

// The provider at the top of the right-hand column on a booking request (O19) and a quote (O78):
// a white row with their picture, a title and one line, then their chips. O78 puts their name
// above the row as a heading and "DJ · Freelancer" in it.
export function ProviderSummary({ provider, line, heading }: { provider: HireProvider; line: string; heading?: boolean }) {
  return (
    <section className={`${styles.providerBox} ${styles.profileCard}`} aria-label={provider.name}>
      {heading && <h2 className={styles.cardTitle}>{provider.name}</h2>}
      <div className={styles.whiteRow}>
        <Thumb size={44} shape="round" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{heading ? `${provider.role} · ${provider.kind}` : provider.name}</span>
          <span className={styles.sub}>{line}</span>
        </span>
      </div>
      <div className={styles.chipRow}>
        {provider.verified && <Chip tone="good">Verified</Chip>}
        <BadgeChip badge={provider.badge} />
      </div>
    </section>
  );
}
