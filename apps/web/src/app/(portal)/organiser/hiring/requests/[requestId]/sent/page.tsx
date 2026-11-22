import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import forms from "@/components/portal/forms.module.css";
import styles from "@/components/portal/hiring/Hiring.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getBookingRequest, getMyEvent, getProvider } from "@/lib/data/portal";
import { formatCount } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Request sent" };

const TEXT = {
  title: (first: string) => `Request sent to ${first}`,
  line: (service: string, event: string, budget: number) => [service, event, `LKR ${formatCount(budget)}`].filter(Boolean).join(" · "),
  note: (first: string) =>
    `${first} can accept, decline or send their own quote. Most providers reply within 48 hours. We tell you either way.`,
  back: "Back to event hiring",
  message: (first: string) => `Message ${first}`,
  next: "What happens next",
  steps: [
    ["Accepts", "Booking confirmed"],
    ["Sends own quote", "You accept or decline"],
    ["Declines", "Pick another provider"],
  ],
} as const;

// "Request sent to Tharindu" (Figma O77), after sending a booking request.
export default async function RequestSentPage({ params }: { params: Promise<{ requestId: string }> }) {
  const session = await requireRole("organiser");
  const request = await getBookingRequest(session, (await params).requestId);
  if (!request) notFound();
  const [provider, event] = await Promise.all([getProvider(session, request.providerId), getMyEvent(session, request.eventId)]);
  if (!provider) notFound();
  const first = provider.kind === "Freelancer" ? provider.name.split(" ")[0] : provider.name;

  const aside = (
    <Panel title={TEXT.next}>
      {TEXT.steps.map(([title, detail]) => (
        <div key={title} className={styles.whiteRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{title}</span>
            <span className={styles.sub}>{detail}</span>
          </span>
        </div>
      ))}
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <section className={styles.hero} aria-labelledby="sent-title">
        <span className={styles.heroDot} aria-hidden="true" />
        <h1 id="sent-title" className={styles.heroTitle}>
          {TEXT.title(first)}
        </h1>
        <p className={styles.heroText}>{TEXT.line(request.brief.service || provider.role, event?.title ?? "", request.budgetLkr)}</p>
        <p className={styles.heroNote}>{TEXT.note(first)}</p>
        <div className={styles.heroActions}>
          <Link href={routes.eventHiring(request.eventId)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.back}
          </Link>
          <MaybeLink href={`${routes.messages}?to=${encodeURIComponent(provider.id)}`} className={`${forms.bigButton} ${styles.plainButton}`}>
            {TEXT.message(first)}
          </MaybeLink>
        </div>
      </section>
    </Columns>
  );
}
