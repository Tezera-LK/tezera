import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import DocumentPicker from "@/components/portal/verification/DocumentPicker";
import styles from "@/components/portal/verification/Verification.module.css";
import { requireRole } from "@/lib/auth/session";
import { getVerification } from "@/lib/data/portal";
import type { Verification } from "@/lib/data/portal-types";
import { formatShortDate, formatTime, formatWhen } from "@/lib/format";
import { routes } from "@/lib/routes";
import { devDecide, devReset, submitDocuments } from "./actions";

export const metadata: Metadata = { title: "Verification" };

const TEXT = {
  title: "Verification",
  lede: "An admin checks your documents before you get the Verified badge.",
  getVerified: "Get verified",
  notYet: "Not verified yet",
  getText: "Once you're approved you get the Verified badge, and you can open stall slots, post jobs and send booking requests.",
  upload: "Upload your documents",
  none: "Choose at least one document.",
  sentTitle: "Documents sent for review",
  sentText: (when: string) => `Submitted ${when}. Most reviews take 1 to 2 working days.`,
  yourDocs: "Your documents",
  pending: "Pending",
  rejected: "Rejected",
  frozen: "You can't change them while they are being reviewed.",
  fixThis: "Fix this",
  ok: "OK",
  needsCopy: "needs a clearer copy",
  rejectedTitle: "Not approved this time",
  approve: "Admin approves",
  reject: "Admin rejects",
  devNote: "Development only: stands in for the admin's decision (EN-08).",
  verifiedTitle: "You're verified",
  verifiedText: (when: string) => `Approved ${when}. The badge shows on your profile, events and posts.`,
  verified: "Verified",
  unlocked: "Now unlocked",
  unlocks: [
    ["Open stall slots", "Let vendors apply for stalls at your events", routes.myEvents],
    ["Post jobs", "Get quotes from vendors and freelancers", routes.newJob],
    ["Send booking requests", "Book a provider straight from their profile", routes.hiring],
  ],
  startOver: "Start over (development only)",
  next: "What happens next",
  steps: [
    ["Upload documents", "You are here."],
    ["Pending", "An admin reviews your documents."],
    ["Approved or rejected", "Approved: you get the Verified badge. Rejected: you see the reason."],
  ],
  done: "Done",
  locked: "Locked until you're verified",
  lockedItems: ["Opening stall slots", "Posting jobs", "Sending booking requests"],
  approvedDoc: "Approved",
  adminsOnly: "Only Tezera admins can see them.",
  questions: "Questions?",
  questionsText: "Reply to the admin's note and they'll see it with your documents.",
  support: "Message support",
} as const;

const dev = process.env.NODE_ENV === "development";

// Verification (Figma O28 not started, O38 pending, O39 rejected, O40 approved): one page that
// shows wherever the organiser is.
export default async function VerificationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireRole("organiser");
  const error = (await searchParams).error;
  const v = await getVerification(session);
  if (!v) return <p className={ui.muted}>Verification needs the backend (EN-03), which isn&apos;t connected yet.</p>;
  const now = new Date();

  // where each of the three steps stands: done, current or still to come
  const step = v.status === "not-started" ? 0 : v.status === "pending" ? 1 : 2;

  const aside =
    v.status === "approved" ? (
      <Panel title={TEXT.yourDocs}>
        {v.documents.map((d) => (
          <div key={d.id} className={hiring.whiteRow}>
            <Thumb size={32} radius={4} />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{d.name}</span>
              <span className={hiring.sub}>{TEXT.approvedDoc}</span>
            </span>
          </div>
        ))}
        <p className={tables.panelText}>{TEXT.adminsOnly}</p>
      </Panel>
    ) : (
      <>
        <Panel title={TEXT.next}>
          {TEXT.steps.map(([title, detail], i) => (
            <div key={title} className={`${hiring.whiteRow} ${i === step ? styles.stepCurrent : ""}`} aria-current={i === step ? "step" : undefined}>
              <span className={`${styles.stepNumber} ${i < step ? styles.stepDone : ""}`} aria-hidden="true">
                {i < step ? "" : i + 1}
              </span>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{title}</span>
                <span className={hiring.sub}>{i < step ? TEXT.done : detail}</span>
              </span>
            </div>
          ))}
        </Panel>
        {v.status === "rejected" ? (
          <Panel title={TEXT.questions}>
            <p className={tables.panelText}>{TEXT.questionsText}</p>
            {/* support conversations are the Messages slice */}
            <MaybeLink className={`${ui.rowButton} ${ui.rowButtonWhite} ${tables.panelLink}`}>{TEXT.support}</MaybeLink>
          </Panel>
        ) : (
          <Panel title={TEXT.locked}>
            {TEXT.lockedItems.map((item) => (
              <div key={item} className={hiring.whiteRow}>
                <span className={styles.lockIcon} aria-hidden="true" />
                <span className={ui.rowTitle}>{item}</span>
              </div>
            ))}
          </Panel>
        )}
      </>
    );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.lede}</p>
      </header>
      {v.status === "not-started" && <NotStarted error={error} />}
      {v.status === "pending" && <Pending v={v} now={now} />}
      {v.status === "rejected" && <Rejected v={v} />}
      {v.status === "approved" && <Approved v={v} />}
    </Columns>
  );
}

// O28: what the badge does, and the upload.
function NotStarted({ error }: { error?: string }) {
  return (
    <>
      <section className={styles.card} aria-labelledby="get-title">
        <div className={styles.cardHead}>
          <h2 id="get-title" className={hiring.cardTitle}>
            {TEXT.getVerified}
          </h2>
          <Chip tone="neutral">{TEXT.notYet}</Chip>
        </div>
        <p className={styles.hint}>{TEXT.getText}</p>
      </section>
      <section className={styles.card} aria-labelledby="upload-title">
        <h2 id="upload-title" className={hiring.cardTitle}>
          {TEXT.upload}
        </h2>
        {error === "none" && <p className={styles.error}>{TEXT.none}</p>}
        <DocumentPicker action={submitDocuments} again={false} />
      </section>
    </>
  );
}

// O38: sent, waiting for an admin. In `next dev` the two buttons play the admin.
function Pending({ v, now }: { v: Verification; now: Date }) {
  const when = v.submittedAt ? `${formatWhen(v.submittedAt, now) === formatTime(v.submittedAt) ? "today" : formatShortDate(v.submittedAt)}, ${formatTime(v.submittedAt)}` : "";
  return (
    <>
      <div className={styles.softNotice}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.sentTitle}</span>
          <span className={styles.hint}>{TEXT.sentText(when)}</span>
        </span>
      </div>
      <Documents v={v} chip={<Chip tone="warn">{TEXT.pending}</Chip>} note={TEXT.frozen} />
      {dev && (
        <div className={styles.devRow}>
          <form action={devDecide.bind(null, "approve")}>
            <button type="submit" className={`${ui.rowButton} ${ui.rowButtonPrimary} ${styles.devButton}`}>
              {TEXT.approve}
            </button>
          </form>
          <form action={devDecide.bind(null, "reject")}>
            <button type="submit" className={`${ui.rowButton} ${ui.rowButtonWhite} ${styles.devButton}`}>
              {TEXT.reject}
            </button>
          </form>
          <span className={styles.hint}>{TEXT.devNote}</span>
        </div>
      )}
    </>
  );
}

// O39: why it wasn't approved, which document to fix, and the upload again.
function Rejected({ v }: { v: Verification }) {
  return (
    <>
      <div className={styles.dangerNotice} role="status">
        <span className={styles.dangerDot} aria-hidden="true" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{TEXT.rejectedTitle}</span>
          <span className={styles.hint}>{v.reason}</span>
        </span>
      </div>
      <section className={styles.card} aria-labelledby="docs-title">
        <div className={styles.cardHead}>
          <h2 id="docs-title" className={hiring.cardTitle}>
            {TEXT.yourDocs}
          </h2>
          <Chip tone="danger">{TEXT.rejected}</Chip>
        </div>
        <DocumentRows v={v} />
        <DocumentPicker action={submitDocuments} again />
      </section>
    </>
  );
}

// O40: verified, and what that unlocks.
function Approved({ v }: { v: Verification }) {
  return (
    <>
      <section className={hiring.hero} aria-labelledby="verified-title">
        <span className={hiring.heroDot} aria-hidden="true" />
        <h2 id="verified-title" className={hiring.heroTitle}>
          {TEXT.verifiedTitle}
        </h2>
        <p className={hiring.heroText}>{TEXT.verifiedText(v.decidedAt ? formatShortDate(v.decidedAt) : "")}</p>
        <div className={`${hiring.chipRow} ${hiring.heroChips}`}>
          <Chip tone="good">{TEXT.verified}</Chip>
        </div>
      </section>
      <section className={tables.section} aria-labelledby="unlocked-title">
        <h2 id="unlocked-title" className={ui.sectionTitle}>
          {TEXT.unlocked}
        </h2>
        <ul className={ui.rows}>
          {TEXT.unlocks.map(([title, detail, href]) => (
            <li key={title}>
              <Link href={href} className={styles.unlockRow}>
                <span className={styles.greenDot} aria-hidden="true" />
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{title}</span>
                  <span className={hiring.sub}>{detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {dev && (
        <form action={devReset}>
          <button type="submit" className={`${ui.rowButton} ${styles.plain}`}>
            {TEXT.startOver}
          </button>
        </form>
      )}
    </>
  );
}

// "Your documents" with a chip in the corner and a note under the list (O38).
function Documents({ v, chip, note }: { v: Verification; chip: React.ReactNode; note: string }) {
  return (
    <section className={styles.card} aria-labelledby="docs-title">
      <div className={styles.cardHead}>
        <h2 id="docs-title" className={hiring.cardTitle}>
          {TEXT.yourDocs}
        </h2>
        {chip}
      </div>
      <DocumentRows v={v} />
      <p className={styles.hint}>{note}</p>
    </section>
  );
}

function DocumentRows({ v }: { v: Verification }) {
  return (
    <>
      {v.documents.map((d) => (
        <div key={d.id} className={styles.docRow}>
          <span className={styles.docIcon} aria-hidden="true" />
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{d.name}</span>
            <span className={styles.hint}>{d.state === "fix" ? `${d.kind} · ${TEXT.needsCopy}` : d.kind}</span>
          </span>
          {d.state === "fix" && <Chip tone="danger">{TEXT.fixThis}</Chip>}
          {d.state === "ok" && v.status === "rejected" && <Chip tone="good">{TEXT.ok}</Chip>}
        </div>
      ))}
    </>
  );
}
