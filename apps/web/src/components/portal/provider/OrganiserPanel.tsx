import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import ui from "@/components/portal/ui.module.css";
import type { OrganiserCard } from "@/lib/data/provider-types";
import { routes } from "@/lib/routes";
import styles from "./Provider.module.css";

const TEXT = {
  title: "Check the organiser first",
  short: "Check the organiser",
  verified: (district: string) => `Verified organiser · ${district}`,
  notVerified: (district: string) => `Not verified yet · ${district}`,
  pastEvents: (n: number) => `${n} past events`,
  last: (event: string) => `Last: ${event}`,
  rating: (r: number) => `★ ${r} from providers`,
  scores: (n: number, p: number, pl: number) => `${n} reviews · payment ${p} · planning ${pl}`,
  paid: (pct: number) => `${pct}% paid on time`,
  paidNote: "Share of bookings paid on time",
  low: "Low",
} as const;

// "Check the organiser first" (V08, V57, V76): who they are and how they've paid other providers,
// so a provider can decide before saying yes. The name opens their profile (V54).
export default function OrganiserPanel({ organiser: o, short }: { organiser: OrganiserCard; short?: boolean }) {
  return (
    <Panel title={short ? TEXT.short : TEXT.title}>
      <Link href={routes.vendorArea.organiser(o.id)} className={hiring.whiteRow}>
        <Thumb size={40} shape="round" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{o.verified ? `${o.name} ✓` : o.name}</span>
          <span className={hiring.sub}>{o.verified ? TEXT.verified(o.district) : TEXT.notVerified(o.district)}</span>
        </span>
      </Link>
      <div className={styles.tintRow}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.pastEvents(o.pastEvents)}</span>
          <span className={hiring.sub}>{TEXT.last(o.lastEvent)}</span>
        </span>
      </div>
      <div className={styles.tintRow}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.rating(o.rating)}</span>
          <span className={hiring.sub}>{TEXT.scores(o.reviews, o.scores.payment, o.scores.planning)}</span>
        </span>
      </div>
      <div className={styles.tintRow}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.paid(o.paidOnTime)}</span>
          <span className={hiring.sub}>{TEXT.paidNote}</span>
        </span>
        {o.paidOnTime < 80 && <Chip tone="warn">{TEXT.low}</Chip>}
      </div>
    </Panel>
  );
}
