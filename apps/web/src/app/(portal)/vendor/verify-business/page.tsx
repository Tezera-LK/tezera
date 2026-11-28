import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import Choice from "@/components/portal/provider/Choice";
import FileName from "@/components/portal/provider/FileName";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { ProviderState } from "@/lib/data/provider-types";
import { colomboDay, formatDayMonth, formatShortDate } from "@/lib/format";
import { previewMode } from "@/lib/preview";
import { routes } from "@/lib/routes";
import { previewDecide, submitDocuments } from "./actions";

export const metadata: Metadata = { title: "Verification" };

const TEXT = {
  title: "Verification",
  verifyVendor: "Verify your business",
  verifyFreelancer: "Verify your identity",
  lede: "You need the verified badge before you can accept bookings.",
  steps: ["1 · Upload", "2 · Admin review", "3 · Verified badge"],
  step: { now: "Now", next: "Next", later: "Later", done: "Done" },
  // approved (V18)
  approvedTitle: "Approved · you have the verified badge",
  approvedOn: (on: string) => `Approved by a Tezera admin on ${on}`,
  upload: "1. Upload documents",
  review: "2. Admin review",
  badge: "3. Verified badge",
  badgeText: "Shown on your profile, in provider search, on quotes and next to your name in Community.",
  badgeChip: "✓ Verified",
  replace: "Replace",
  mainNote: "Business registration is proposed as the main document. Others may be asked for.",
  nicNote: "An NIC is proposed as the document for freelancers. A passport may be asked for instead.",
  // upload (V43)
  docType: "Document type",
  mainDoc: "Business registration certificate",
  mainDocHint: "Recommended for vendors (proposed)",
  nicDoc: "Owner NIC",
  nicHint: "If the business is not registered yet",
  // a freelancer proves who they are, not a business (F43)
  idDoc: "National identity card (NIC)",
  idDocHint: "Recommended for freelancers (proposed)",
  passportDoc: "Passport",
  passportHint: "If you do not have an NIC",
  idHint: "A clear photo of each side, JPG or PNG, up to 10 MB, with all four corners visible.",
  uploadTitle: "Upload",
  drop: "A scan or a clear photo",
  dropHint: "PDF, JPG or PNG · up to 10 MB · all four corners visible",
  nicTitleVendor: "Owner NIC, front and back",
  nicTitleFreelancer: "National identity card, front and back",
  front: "Front",
  back: "Back",
  imageHint: "JPG or PNG",
  mine: "These documents are mine and up to date",
  mineHint: "False documents get the account removed",
  submit: "Submit for review",
  later: "Save and finish later",
  errors: { files: "Add every document first.", mine: "Tick that the documents are yours." } as Record<string, string>,
  whyTitle: "Why verify?",
  whyVendor: "Verified vendors can accept bookings, get a badge on their profile, quotes and Community posts, and show up when organisers filter by Verified.",
  whyFreelancer: "Verified freelancers can accept bookings, get a badge on their profile, quotes and Community posts, and show up when organisers filter by Verified.",
  tipsTitle: "Tips for a quick approval",
  tips: (vendor: boolean) => [
    ["Scan, do not photograph", "Or take a photo in daylight, flat on a table"],
    ["Name must match", vendor ? "Business name on Tezera and on the certificate" : "Your name on Tezera and on the NIC"],
    ["Usually 2 working days", "We tell you by email and in the app"],
  ],
  // pending (V44)
  waiting: "Waiting for review",
  submitted: (on: string) => `Submitted ${on} · usually within 2 working days`,
  whatYouSent: "What you sent",
  cannotChange: "You cannot change documents while they are being reviewed.",
  whileWait: "While you wait",
  open: "Open",
  locked: "Locked",
  waitRows: (vendor: boolean) => [
    [vendor ? "Apply for stalls" : "Answer job posts", "Open to everyone", "open"],
    ["Send quotes and chat", "Organisers see “Verification pending”", "open"],
    ["Accept bookings", "Unlocks after approval", "locked"],
  ],
  backHome: "Back to home",
  helpTitle: "Need help?",
  helpText: "If it takes longer than 3 working days, message the Tezera team.",
  support: "Contact support",
  // rejected (V45)
  rejectedTitle: "Not approved this time",
  reviewedOn: (on: string) => `Reviewed ${on} by a Tezera admin`,
  reason: "Reason",
  uploadAgain: "Upload again",
  ask: "Ask the admin a question",
  nothingElse: "Nothing else changes",
  nothingElseText: (vendor: boolean) => `Your profile stays live. You can keep quoting and ${vendor ? "applying for stalls" : "answering job posts"}.`,
  history: "History",
  submittedOn: (on: string) => `Submitted · ${on}`,
  rejectedOn: (on: string) => `Rejected · ${on}`,
  approvedChip: "Approved",
  rejectedChip: "Rejected",
  pendingChip: "Pending",
  found: "Be found by organisers",
  foundText: "Provider search filters by category, district, rating, rank and verified. Your rank score orders the results.",
  verifiedChip: "Verified",
  leaderboard: "Leaderboard",
  boardRow: (rank: number, name: string) => `${rank} · ${name} ✓`,
  boardSub: (badge: string, rating: number, you: boolean) => `${badge} · ★ ${rating}${you ? " · you" : ""}`,
  notYet: "Not verified yet?",
  notYetText: (vendor: boolean) =>
    `You can still build your profile, ${vendor ? "apply for stalls" : "quote on job posts"} and chat. Accepting bookings unlocks after approval.`,
  previewTitle: "Preview only: the admin's side",
  previewText: "Until admin tools exist (EN-08), play the admin here.",
  approve: "Approve",
  reject: "Reject",
  reset: "Start again",
  emptyTitle: "Verification isn't available yet",
  emptyText: "It needs the backend (EN-03), which isn't connected yet.",
} as const;

// Verification (Figma V18 approved, V43 upload, V44 pending, V45 rejected; F18, F43–F45). One page
// that shows where the provider's verification stands.
export default async function VerificationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const { error } = await searchParams;
  if (!state) return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />;
  const v = state.verification;
  const vendor = state.kind === "vendor";

  const preview = previewMode && (
    <Panel title={TEXT.previewTitle}>
      <p className={styles.foot}>{TEXT.previewText}</p>
      <div className={styles.postButtons}>
        {v.status === "pending" && (
          <>
            <form action={previewDecide.bind(null, "approved")}>
              <button type="submit" className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                {TEXT.approve}
              </button>
            </form>
            <form action={previewDecide.bind(null, "rejected")}>
              <button type="submit" className={ui.rowButton}>
                {TEXT.reject}
              </button>
            </form>
          </>
        )}
        <form action={previewDecide.bind(null, "not-started")}>
          <button type="submit" className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
            {TEXT.reset}
          </button>
        </form>
      </div>
    </Panel>
  );

  const header = (title: string) => (
    <header className={hiring.pageHeadText}>
      <h1 className={hiring.pageTitle}>{title}</h1>
      <p className={hiring.lede}>{TEXT.lede}</p>
    </header>
  );

  if (v.status === "approved") {
    return (
      <Columns
        aside={
          <>
            <Panel title={TEXT.found} link={{ label: TEXT.leaderboard, href: routes.vendorArea.leaderboard }}>
              <p className={styles.foot}>{TEXT.foundText}</p>
              <ul className={ui.chipList}>
                {[state.profile.rankCategory, state.profile.districts[0], TEXT.verifiedChip].map((c) => (
                  <li key={c} className={`${styles.pill} ${styles.pillGrey}`}>
                    {c}
                  </li>
                ))}
              </ul>
              {state.leaderboard
                .filter((r) => r.rank === 1 || r.you)
                .map((r) => (
                  <div key={r.rank} className={hiring.whiteRow}>
                    <span className={ui.rowText}>
                      <span className={ui.rowTitle}>{TEXT.boardRow(r.rank, r.name)}</span>
                      <span className={hiring.sub}>{TEXT.boardSub(r.badge, r.rating, r.you)}</span>
                    </span>
                  </div>
                ))}
            </Panel>
            <Panel title={TEXT.notYet}>
              <p className={styles.foot}>{TEXT.notYetText(vendor)}</p>
            </Panel>
            {preview}
          </>
        }
      >
        {header(TEXT.title)}
        <div className={styles.banner}>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.bannerText}>
            <span className={ui.rowTitle}>{TEXT.approvedTitle}</span>
            <span className={hiring.sub}>{TEXT.approvedOn(v.decidedAt ? `${formatShortDate(v.decidedAt)} ${colomboDay(v.decidedAt).slice(0, 4)}` : "")}</span>
          </span>
        </div>
        <section className={events.card} aria-labelledby="step-upload">
          <div className={hiring.cardHead}>
            <h2 id="step-upload" className={hiring.cardTitle}>
              {TEXT.upload}
            </h2>
            <Chip tone="good">{TEXT.step.done}</Chip>
          </div>
          <Documents state={state} />
          <p className={styles.foot}>{vendor ? TEXT.mainNote : TEXT.nicNote}</p>
        </section>
        <section className={events.card} aria-labelledby="step-review">
          <div className={hiring.cardHead}>
            <h2 id="step-review" className={hiring.cardTitle}>
              {TEXT.review}
            </h2>
            <Chip tone="good">{TEXT.approvedChip}</Chip>
          </div>
          {v.submittedAt && (
            <div className={styles.greyRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{TEXT.submittedOn(formatShortDate(v.submittedAt))}</span>
              </span>
              <Chip tone="neutral">{TEXT.pendingChip}</Chip>
            </div>
          )}
          {v.decidedAt && (
            <div className={styles.greyRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{`Approved · ${formatShortDate(v.decidedAt)}`}</span>
                <span className={hiring.sub}>Verified badge added to your profile</span>
              </span>
              <Chip tone="good">{TEXT.approvedChip}</Chip>
            </div>
          )}
        </section>
        <section className={events.card} aria-labelledby="step-badge">
          <div className={hiring.cardHead}>
            <h2 id="step-badge" className={hiring.cardTitle}>
              {TEXT.badge}
            </h2>
            <Chip tone="good">{TEXT.badgeChip}</Chip>
          </div>
          <p className={styles.foot}>{TEXT.badgeText}</p>
        </section>
      </Columns>
    );
  }

  if (v.status === "pending") {
    return (
      <Columns
        aside={
          <>
            <Panel title={TEXT.helpTitle}>
              <p className={styles.foot}>{TEXT.helpText}</p>
              <Link href={routes.vendorArea.messages} className={ui.wideButton}>
                {TEXT.support}
              </Link>
            </Panel>
            {preview}
          </>
        }
      >
        {header(TEXT.title)}
        <div className={`${styles.banner} ${styles.warnBanner}`}>
          <span className={styles.bannerText}>
            <span className={ui.rowTitle}>{TEXT.waiting}</span>
            <span className={hiring.sub}>{TEXT.submitted(v.submittedAt ? `${formatDayMonth(v.submittedAt)}` : "")}</span>
          </span>
        </div>
        <Steps current={1} />
        <section className={events.card} aria-labelledby="sent-title">
          <h2 id="sent-title" className={hiring.cardTitle}>
            {TEXT.whatYouSent}
          </h2>
          <Documents state={state} />
          <p className={styles.foot}>{TEXT.cannotChange}</p>
        </section>
        <section className={events.card} aria-labelledby="wait-title">
          <h2 id="wait-title" className={hiring.cardTitle}>
            {TEXT.whileWait}
          </h2>
          {TEXT.waitRows(vendor).map(([title, sub, s]) => (
              <div key={title} className={styles.greyRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{title}</span>
                  <span className={hiring.sub}>{sub}</span>
                </span>
                <Chip tone={s === "open" ? "good" : "neutral"}>{s === "open" ? TEXT.open : TEXT.locked}</Chip>
              </div>
            ))}
        </section>
        <Link href={routes.dashboard} className={forms.bigButton}>
          {TEXT.backHome}
        </Link>
      </Columns>
    );
  }

  // not started (V43) or rejected (V45): the upload form
  const rejected = v.status === "rejected";
  return (
    <Columns
      aside={
        <>
          {rejected ? (
            <>
              <Panel title={TEXT.history}>
                {v.submittedAt && (
                  <div className={hiring.whiteRow}>
                    <span className={ui.rowText}>
                      <span className={ui.rowTitle}>{TEXT.submittedOn(formatShortDate(v.submittedAt))}</span>
                      <span className={hiring.sub}>{`${v.documents.length} file${v.documents.length === 1 ? "" : "s"}`}</span>
                    </span>
                  </div>
                )}
                {v.decidedAt && (
                  <div className={hiring.whiteRow}>
                    <span className={ui.rowText}>
                      <span className={ui.rowTitle}>{TEXT.rejectedOn(formatShortDate(v.decidedAt))}</span>
                    </span>
                    <Chip tone="danger">{TEXT.rejectedChip}</Chip>
                  </div>
                )}
              </Panel>
              <Panel title={TEXT.nothingElse}>
                <p className={styles.foot}>{TEXT.nothingElseText(vendor)}</p>
              </Panel>
            </>
          ) : (
            <>
              <Panel title={TEXT.whyTitle}>
                <p className={styles.foot}>{vendor ? TEXT.whyVendor : TEXT.whyFreelancer}</p>
              </Panel>
              <Panel title={TEXT.tipsTitle}>
                {TEXT.tips(vendor).map(([title, sub]) => (
                  <div key={title} className={hiring.whiteRow}>
                    <span className={ui.rowText}>
                      <span className={ui.rowTitle}>{title}</span>
                      <span className={hiring.sub}>{sub}</span>
                    </span>
                  </div>
                ))}
              </Panel>
            </>
          )}
          {preview}
        </>
      }
    >
      {header(rejected ? TEXT.title : vendor ? TEXT.verifyVendor : TEXT.verifyFreelancer)}
      {rejected ? (
        <section className={events.card} aria-labelledby="rejected-title">
          <div className={hiring.cardHead}>
            <span className={ui.rowText}>
              <h2 id="rejected-title" className={hiring.cardTitle}>
                {TEXT.rejectedTitle}
              </h2>
              <span className={hiring.sub}>{TEXT.reviewedOn(v.decidedAt ? formatDayMonth(v.decidedAt) : "")}</span>
            </span>
            <Chip tone="danger">{TEXT.rejectedChip}</Chip>
          </div>
          <div className={`${styles.banner} ${styles.dangerBanner}`}>
            <span className={styles.bannerText}>
              <span className={ui.rowTitle}>{TEXT.reason}</span>
              <span className={hiring.sub}>{v.reason}</span>
            </span>
          </div>
          <Documents state={state} />
        </section>
      ) : (
        <Steps current={0} />
      )}
      {error && TEXT.errors[error] && (
        <p className={forms.error} role="alert">
          {TEXT.errors[error]}
        </p>
      )}
      <form action={submitDocuments} className={styles.stack}>
        <section className={forms.card} aria-labelledby="type-title">
          <h2 id="type-title" className={hiring.cardTitle}>
            {TEXT.docType}
          </h2>
          {vendor ? (
            <>
              <Choice type="radio" name="docType" value="registration" title={TEXT.mainDoc} hint={TEXT.mainDocHint} defaultChecked />
              <Choice type="radio" name="docType" value="nic" title={TEXT.nicDoc} hint={TEXT.nicHint} />
            </>
          ) : (
            <>
              <Choice type="radio" name="docType" value="nic" title={TEXT.idDoc} hint={TEXT.idDocHint} defaultChecked />
              <Choice type="radio" name="docType" value="passport" title={TEXT.passportDoc} hint={TEXT.passportHint} />
            </>
          )}
        </section>
        <section className={forms.card} aria-labelledby="upload-title">
          <h2 id="upload-title" className={hiring.cardTitle}>
            {rejected ? TEXT.uploadAgain : TEXT.uploadTitle}
          </h2>
          {vendor && (
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.drop}</span>
              <FileName name="main" accept=".pdf,image/jpeg,image/png" label={TEXT.drop} />
              <span className={forms.hint}>{TEXT.dropHint}</span>
            </label>
          )}
          <p className={forms.label}>{vendor ? TEXT.nicTitleVendor : TEXT.nicTitleFreelancer}</p>
          {!vendor && <p className={forms.hint}>{TEXT.idHint}</p>}
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.front}</span>
              <FileName name="front" accept="image/jpeg,image/png" label={TEXT.front} />
              <span className={forms.hint}>{TEXT.imageHint}</span>
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.back}</span>
              <FileName name="back" accept="image/jpeg,image/png" label={TEXT.back} />
              <span className={forms.hint}>{TEXT.imageHint}</span>
            </label>
          </div>
          <Choice type="checkbox" name="mine" value="yes" title={TEXT.mine} hint={TEXT.mineHint} />
        </section>
        <div className={styles.pair}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.submit}
          </button>
          {rejected ? (
            <Link href={routes.vendorArea.messages} className={forms.bigButton}>
              {TEXT.ask}
            </Link>
          ) : (
            <Link href={routes.dashboard} className={forms.bigButton}>
              {TEXT.later}
            </Link>
          )}
        </div>
      </form>
    </Columns>
  );
}

// "1 · Upload  2 · Admin review  3 · Verified badge" with where the provider is (V43, V44).
function Steps({ current }: { current: number }) {
  return (
    <ol className={styles.pills} aria-label="Steps">
      {TEXT.steps.map((s, i) => (
        <li key={s} className={`${styles.pill} ${i === current ? styles.pillOn : ""}`}>
          {`${s} · ${i < current ? TEXT.step.done : i === current ? TEXT.step.now : i === current + 1 ? TEXT.step.next : TEXT.step.later}`}
        </li>
      ))}
    </ol>
  );
}

function Documents({ state }: { state: ProviderState }) {
  return (
    <>
      {state.verification.documents.map((d) => (
        <div key={d.id} className={styles.greyRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{d.name}</span>
            <span className={hiring.sub}>{d.kind}</span>
          </span>
          {d.state === "fix" && <Chip tone="danger">{TEXT.rejectedChip}</Chip>}
        </div>
      ))}
    </>
  );
}
