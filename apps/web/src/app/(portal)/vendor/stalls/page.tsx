import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import Choice from "@/components/portal/provider/Choice";
import OrganiserPanel from "@/components/portal/provider/OrganiserPanel";
import styles from "@/components/portal/provider/Provider.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { ProviderState, StallCall, StallType } from "@/lib/data/provider-types";
import { formatShortDate } from "@/lib/format";
import { STALL_TYPES, day, lkr, organiserName, shortDay } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { acceptInvitation, applyForStall, declineInvitation, reportPaidNoStall, withdrawStall } from "./actions";

export const metadata: Metadata = { title: "Stalls" };

const TEXT = {
  title: "Stalls",
  lede: "Apply for stall slots at events. Organisers approve or reject each application.",
  tabsLabel: "Which stalls",
  tabs: { open: "Open slots", applications: "My applications", invitations: "Invitations" },
  invited: (who: string, type: string) => `${who} invited you to a ${type.toLowerCase()} stall`,
  invitedLine: (event: string, date: string, fee: string) => `${event} · ${date} · fee ${fee} · accepting counts as approval`,
  seeInvitation: "See invitation",
  decline: "Decline",
  stallType: "Stall type",
  fee: "Fee",
  applyBy: "Apply by",
  slotsLeftLabel: "Slots left",
  slotsLeft: (n: number) => `${n} slot${n === 1 ? "" : "s"} left`,
  apply: "Apply",
  viewEvent: "View event",
  seeStatus: "See status",
  myListing: "My stall listing",
  venueMap: "Venue map",
  withdraw: "Withdraw",
  pending: "Pending",
  approved: (stall: string | null) => (stall ? `Approved · ${stall}` : "Approved · number soon"),
  rejected: "Rejected",
  sentLine: (who: string, date: string, type: string, sent: string) => `${who} · ${date} · ${type.toLowerCase()} · sent ${sent}`,
  stallLine: (who: string, date: string, stall: string) => `${who} · ${date} · stall ${stall}`,
  rejectedLine: (who: string, date: string, on: string) => `${who} · ${date} · rejected ${on}`,
  vendorsOnly: "Stall slots are for vendors only. Freelancers cannot apply.",
  none: "Nothing here right now.",
  noneOfType: "No open slots of these types. Pick another type.",
  stallFees: "Stall fees",
  paid: "Paid",
  pay: "Pay",
  notDue: "Not due",
  paidLine: (on: string) => `Paid in the app (test) · ${on}`,
  dueLine: (amount: string, on: string) => `${amount} · due ${on}`,
  notDueLine: (amount: string) => `${amount} · due once numbered`,
  noFees: "Fees show up here once a stall is approved.",
  feesNote: "Fees are shown here and usually paid outside the app. Paying in the test sandbox marks the stall paid and confirmed.",
  paidNoStall: "Paid but no stall?",
  paidNoStallText: "If you paid a fee and did not get a stall, report it and an admin handles the dispute.",
  report: "Report a problem",
  reported: "Sent to an admin. They look at the payment and the stall records and get back to you.",
  emptyTitle: "No stall calls yet",
  emptyText: "Events that open stall slots show up here.",
  // dialogs
  close: "Close",
  applyTitle: "Apply for a stall",
  applySub: (event: string, who: string, date: string) => `${event} · ${who} · ${date}`,
  feeAfter: (amount: string) => `${amount} · paid after approval`,
  whatSell: "What you will sell",
  rules: "I have read the event rules",
  rulesText: "No glass bottles, lights off by 1 AM",
  cancel: "Cancel",
  send: "Send application",
  errors: { type: "Pick a stall type.", note: "Say what you will sell.", rules: "Tick that you have read the event rules." } as Record<string, string>,
  inviteTitle: (who: string) => `${who} invited you to a stall`,
  inviteSub: (event: string, date: string, venue: string) => `${event} · ${date} · ${venue}`,
  yourCalendar: "Your calendar",
  alsoBooked: (what: string) => `Also booked: ${what}`,
  sameEvent: "Same event",
  freeThatDay: "Free that day",
  theOffer: "The offer",
  dueOn: (amount: string, on: string) => `${amount} · due ${on}`,
  offerRows: { type: "Stall type", fee: "Fee", setup: "Setup", power: "Power", crowd: "Expected crowd" },
  theirMessage: "Their message",
  acceptInvite: "Accept invitation",
  ask: "Ask a question",
  acceptNote: "Accepting counts as approval. You can then pay the fee in the app or outside it.",
  paidTitle: "Paid but no stall",
  paidSub: "An admin looks at the payment and the stall records",
  paidFacts: (fee: string, paidOn: string, rejectedOn: string) => `Fee ${fee} paid ${paidOn} · application rejected ${rejectedOn}`,
  whatHappened: "What happened",
  receipt: (id: string) => `Receipt ${id}`,
  sendAdmin: "Send to an admin",
  textError: "Say what happened.",
} as const;

type Tab = keyof typeof TEXT.tabs;
const TABS = Object.keys(TEXT.tabs) as Tab[];

type Props = { searchParams: Promise<{ tab?: string; type?: string; dialog?: string; stall?: string; error?: string; note?: string; reported?: string }> };

// Stalls (Figma V14, vendors only): open slots, the vendor's applications (V75) and invitations,
// with the stall fees on the right. Applying (V74), an invitation (V76) and a fee paid with no
// stall (V83) open as dialogs with ?dialog=.
export default async function StallsPage({ searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  // freelancers don't take stalls (PRD section 3); the sidebar doesn't show this page to them
  if (session.role === "freelancer") redirect(routes.vendorArea.requests);
  const state = await getProviderState(session);
  const q = await searchParams;
  const now = new Date();

  if (!state) {
    return (
      <>
        <Header />
        <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />
      </>
    );
  }

  const tab: Tab = TABS.find((t) => t === q.tab) ?? "open";
  const picked = (q.type ?? "").split(",").filter((t): t is StallType => (STALL_TYPES as readonly string[]).includes(t));
  const types = picked.length ? picked : (["Food", "Drinks"] as StallType[]);
  const typeLink = (t: StallType) => {
    const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    return `${routes.vendorArea.stalls}${next.length ? `?type=${next.join(",")}` : "?type="}`;
  };
  const open = state.stalls.filter((s) => s.slotsLeft > 0 && !s.invited && s.application?.status !== "rejected" && Date.parse(`${s.applyBy}T23:59:00+05:30`) >= now.getTime());
  const applications = state.stalls.filter((s) => s.application && s.application.status !== "declined");
  const invitations = state.stalls.filter((s) => s.invited && !s.application);
  const shownOpen = open.filter((s) => s.types.some((t) => types.includes(t)));
  const invitation = invitations[0];
  const counts: Record<Tab, number> = { open: open.length, applications: applications.length, invitations: invitations.length };
  const dialogStall = state.stalls.find((s) => s.id === q.stall);

  const fees = state.stalls.filter((s) => s.application?.status === "approved" || s.application?.status === "pending");
  const rejectedPaid = state.stalls.find((s) => s.application?.status === "rejected" && s.application.fee.paidAt);

  const aside = (
    <>
      <Panel title={TEXT.stallFees} empty={fees.length === 0 ? TEXT.noFees : undefined}>
        {fees.length > 0 &&
          fees.map((s) => {
            const a = s.application;
            if (!a) return null;
            const paid = Boolean(a.fee.paidAt);
            const numbered = a.status === "approved";
            return (
              <div key={s.id} className={hiring.whiteRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{a.stall ? `${s.eventTitle} · ${a.stall}` : s.eventTitle}</span>
                  <span className={hiring.sub}>
                    {paid ? TEXT.paidLine(formatShortDate(a.fee.paidAt ?? "")) : numbered ? TEXT.dueLine(lkr(s.feeLkr), shortDay(a.fee.due)) : TEXT.notDueLine(lkr(s.feeLkr))}
                  </span>
                </span>
                {paid ? (
                  <Chip tone="good">{TEXT.paid}</Chip>
                ) : numbered ? (
                  <Link href={routes.vendorArea.payStall(s.id)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                    {TEXT.pay}
                  </Link>
                ) : (
                  <Chip tone="neutral">{TEXT.notDue}</Chip>
                )}
              </div>
            );
          })}
        <p className={styles.foot}>{TEXT.feesNote}</p>
      </Panel>
      <Panel title={TEXT.paidNoStall}>
        <p className={styles.foot}>{TEXT.paidNoStallText}</p>
        {/* only a rejected application with its fee paid can be reported here */}
        {rejectedPaid && (
          <Link href={`${routes.vendorArea.stalls}?dialog=paid&stall=${rejectedPaid.id}`} scroll={false} className={ui.wideButton}>
            {TEXT.report}
          </Link>
        )}
      </Panel>
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <Header />
        <Tabs
          label={TEXT.tabsLabel}
          current={tab}
          tabs={TABS.map((t) => ({ key: t, label: `${TEXT.tabs[t]} · ${counts[t]}`, href: t === "open" ? routes.vendorArea.stalls : `${routes.vendorArea.stalls}?tab=${t}` }))}
        />
        {q.reported && (
          <p className={styles.foot} role="status">
            {TEXT.reported}
          </p>
        )}

        {invitation && tab !== "applications" && (
          <>
            <div className={styles.banner}>
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.bannerText}>
                <span className={ui.rowTitle}>{TEXT.invited(organiserName(state, invitation.organiserId), invitation.types[0] ?? "Food")}</span>
                <span className={hiring.sub}>{TEXT.invitedLine(invitation.eventTitle, day(invitation.date), lkr(invitation.feeLkr))}</span>
              </span>
            </div>
            <div className={styles.pair}>
              <Link href={`${routes.vendorArea.stalls}?dialog=invitation&stall=${invitation.id}`} scroll={false} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                {TEXT.seeInvitation}
              </Link>
              <form action={declineInvitation.bind(null, invitation.id)} className={styles.formFill}>
                <button type="submit" className={forms.bigButton}>
                  {TEXT.decline}
                </button>
              </form>
            </div>
          </>
        )}

        {tab === "open" && (
          <>
            <div className={styles.pills}>
              <span className={hiring.sub}>{TEXT.stallType}</span>
              {STALL_TYPES.map((t) => (
                <Link key={t} href={typeLink(t)} scroll={false} className={`${styles.pill} ${types.includes(t) ? styles.pillOn : ""}`} aria-pressed={types.includes(t)}>
                  {t}
                </Link>
              ))}
            </div>
            {shownOpen.length === 0 ? (
              <p className={ui.muted}>{TEXT.noneOfType}</p>
            ) : (
              <ul className={ui.rows}>
                {shownOpen.map((s) => (
                  <li key={s.id}>
                    <StallCard stall={s} state={state} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "applications" &&
          (applications.length === 0 ? (
            <p className={ui.muted}>{TEXT.none}</p>
          ) : (
            <ul className={ui.rows}>
              {applications.map((s) => (
                <li key={s.id}>
                  <ApplicationRow stall={s} state={state} />
                </li>
              ))}
            </ul>
          ))}

        {tab === "invitations" && invitations.length === 0 && <p className={ui.muted}>{TEXT.none}</p>}
        <p className={styles.foot}>{TEXT.vendorsOnly}</p>
      </Columns>

      {q.dialog === "apply" && dialogStall && !dialogStall.application && (
        <ApplyDialog stall={dialogStall} state={state} error={q.error} note={q.note} />
      )}
      {q.dialog === "invitation" && dialogStall?.invited && <InvitationDialog stall={dialogStall} state={state} />}
      {q.dialog === "paid" && dialogStall?.application?.fee.paidAt && (
        <Dialog title={TEXT.paidTitle} subtitle={TEXT.paidSub} closeHref={routes.vendorArea.stalls} closeLabel={TEXT.close} narrow>
          <form action={reportPaidNoStall.bind(null, dialogStall.id)} className={tables.dialogForm}>
            <div className={styles.greyRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{`${dialogStall.eventTitle} · ${organiserName(state, dialogStall.organiserId)}`}</span>
                <span className={hiring.sub}>
                  {TEXT.paidFacts(lkr(dialogStall.feeLkr), shortDay(dialogStall.application.fee.paidAt.slice(0, 10)), shortDay((dialogStall.application.decidedAt ?? dialogStall.applyBy).slice(0, 10)))}
                </span>
              </span>
            </div>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.whatHappened}</span>
              <textarea name="text" rows={3} required className={forms.input} />
            </label>
            {dialogStall.application.fee.receipt && <span className={`${styles.pill} ${styles.pillGrey}`}>{TEXT.receipt(dialogStall.application.fee.receipt)}</span>}
            {q.error === "text" && <p className={forms.error}>{TEXT.textError}</p>}
            <div className={tables.dialogActions}>
              <Link href={routes.vendorArea.stalls} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
                {TEXT.cancel}
              </Link>
              <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                {TEXT.sendAdmin}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}

function Header() {
  return (
    <header className={hiring.pageHeadText}>
      <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
      <p className={hiring.lede}>{TEXT.lede}</p>
    </header>
  );
}

// One stall call (V14): the event, its stall types, the fee and deadline, and what to do.
function StallCard({ stall: s, state }: { stall: StallCall; state: ProviderState }) {
  const a = s.application;
  return (
    <article className={styles.stallCard} aria-labelledby={`stall-${s.id}`}>
      <Thumb size={112} height={84} radius={12} />
      <div className={styles.stack}>
        <span className={ui.rowText}>
          <span id={`stall-${s.id}`} className={styles.postTitle}>
            {s.eventTitle}
          </span>
          <span className={hiring.sub}>{`${organiserName(state, s.organiserId)} · ${day(s.date)}`}</span>
        </span>
        <ul className={ui.chipList}>
          {s.types.map((t) => (
            <li key={t} className={`${styles.pill} ${styles.pillGrey}`}>
              {t}
            </li>
          ))}
        </ul>
        <p className={styles.postFacts}>
          <span>
            {`${TEXT.fee} `}
            <strong>{lkr(s.feeLkr)}</strong>
          </span>
          <span>
            {`${TEXT.applyBy} `}
            <strong>{day(s.applyBy)}</strong>
          </span>
          <span>{TEXT.slotsLeft(s.slotsLeft)}</span>
        </p>
      </div>
      <div className={styles.stallButtons}>
        {a?.status === "approved" && <Chip tone="good">{TEXT.approved(a.stall)}</Chip>}
        {a?.status === "pending" && <Chip tone="warn">{TEXT.pending}</Chip>}
        {a?.status === "approved" ? (
          <Link href={routes.vendorArea.listing} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
            {TEXT.myListing}
          </Link>
        ) : a?.status === "pending" ? (
          <Link href={`${routes.vendorArea.stalls}?tab=applications`} className={ui.rowButton}>
            {TEXT.seeStatus}
          </Link>
        ) : (
          <Link href={routes.vendorArea.applyForStall(s.id)} scroll={false} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
            {TEXT.apply}
          </Link>
        )}
        {s.eventId && (
          <Link href={routes.vendorArea.event(s.eventId)} className={ui.rowButton}>
            {TEXT.viewEvent}
          </Link>
        )}
      </div>
    </article>
  );
}

// One application on My applications (V75).
function ApplicationRow({ stall: s, state }: { stall: StallCall; state: ProviderState }) {
  const a = s.application;
  if (!a) return null;
  const who = organiserName(state, s.organiserId);
  return (
    <div className={styles.post}>
      <div className={styles.postHead}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{s.eventTitle}</span>
          <span className={hiring.sub}>
            {a.status === "rejected"
              ? TEXT.rejectedLine(who, day(s.date), formatShortDate(a.decidedAt ?? a.sentAt))
              : a.stall
                ? TEXT.stallLine(who, day(s.date), a.stall)
                : TEXT.sentLine(who, day(s.date), a.type, formatShortDate(a.sentAt))}
          </span>
        </span>
        {a.status === "pending" && <Chip tone="warn">{TEXT.pending}</Chip>}
        {a.status === "approved" && <Chip tone="good">{TEXT.approved(a.stall)}</Chip>}
        {a.status === "rejected" && <Chip tone="danger">{TEXT.rejected}</Chip>}
      </div>
      {a.status === "rejected" && a.note && <p className={styles.foot}>{`“${a.note}”`}</p>}
      <div className={styles.postButtons}>
        {a.status === "pending" && (
          <form action={withdrawStall.bind(null, s.id)}>
            <button type="submit" className={ui.rowButton}>
              {TEXT.withdraw}
            </button>
          </form>
        )}
        {a.status === "approved" && a.stall && (
          <>
            <Link href={routes.vendorArea.listing} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
              {TEXT.myListing}
            </Link>
            <Link href={routes.vendorArea.venueMap} className={ui.rowButton}>
              {TEXT.venueMap}
            </Link>
          </>
        )}
        {a.status !== "rejected" && s.eventId && (
          <Link href={routes.vendorArea.event(s.eventId)} className={ui.rowButton}>
            {TEXT.viewEvent}
          </Link>
        )}
      </div>
    </div>
  );
}

// "Apply for a stall" (V74).
function ApplyDialog({ stall: s, state, error, note }: { stall: StallCall; state: ProviderState; error?: string; note?: string }) {
  return (
    <Dialog title={TEXT.applyTitle} subtitle={TEXT.applySub(s.eventTitle, organiserName(state, s.organiserId), day(s.date))} closeHref={routes.vendorArea.stalls} closeLabel={TEXT.close} narrow>
      <form action={applyForStall.bind(null, s.id)} className={tables.dialogForm}>
        <dl className={events.facts}>
          <dt>{TEXT.fee}</dt>
          <dd>{TEXT.feeAfter(lkr(s.feeLkr))}</dd>
          <dt>{TEXT.applyBy}</dt>
          <dd>{day(s.applyBy)}</dd>
          <dt>{TEXT.slotsLeftLabel}</dt>
          <dd>{s.slotsLeft}</dd>
        </dl>
        <fieldset className={hiring.plainFieldset}>
          <legend className={forms.label}>{TEXT.stallType}</legend>
          <div className={styles.pills}>
            {s.types.map((t, i) => (
              <Choice key={t} type="radio" name="type" value={t} title={t} defaultChecked={i === 0} required />
            ))}
          </div>
        </fieldset>
        <label className={forms.field}>
          <span className={forms.label}>{TEXT.whatSell}</span>
          <textarea name="note" rows={2} required defaultValue={note ?? ""} className={forms.input} />
        </label>
        <Choice type="checkbox" name="rules" value="yes" title={TEXT.rules} hint={TEXT.rulesText} required />
        {error && TEXT.errors[error] && <p className={forms.error}>{TEXT.errors[error]}</p>}
        <div className={tables.dialogActions}>
          <Link href={routes.vendorArea.stalls} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {TEXT.cancel}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.send}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// "Hill Events invited you to a stall" (V76): the offer, the vendor's calendar that day, and the organiser.
function InvitationDialog({ stall: s, state }: { stall: StallCall; state: ProviderState }) {
  const who = organiserName(state, s.organiserId);
  const organiser = state.organisers.find((o) => o.id === s.organiserId);
  const sameDay = state.bookings.find((b) => b.date === s.date && !b.cancelled);
  return (
    <Dialog title={TEXT.inviteTitle(who)} subtitle={TEXT.inviteSub(s.eventTitle, day(s.date), s.venue)} closeHref={routes.vendorArea.stalls} closeLabel={TEXT.close}>
      <div className={styles.pair}>
        <div className={styles.stack}>
          <div className={styles.greyRow}>
            <span className={ui.rowText}>
              <span className={hiring.sub}>{TEXT.yourCalendar}</span>
              <span className={ui.rowTitle}>{day(s.date)}</span>
              <span className={hiring.sub}>{sameDay ? TEXT.alsoBooked(`${sameDay.eventTitle} ${sameDay.service}`) : TEXT.freeThatDay}</span>
            </span>
            {sameDay?.eventTitle === s.eventTitle && <Chip tone="soft">{TEXT.sameEvent}</Chip>}
          </div>
          {s.offer?.message && (
            <div className={styles.greyRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{TEXT.theirMessage}</span>
                <span className={styles.foot}>{s.offer.message}</span>
              </span>
            </div>
          )}
        </div>
        {organiser && <OrganiserPanel organiser={organiser} short />}
      </div>
      <section className={events.card} aria-labelledby="offer-title">
        <h3 id="offer-title" className={hiring.cardTitle}>
          {TEXT.theOffer}
        </h3>
        <dl className={events.facts}>
          <dt>{TEXT.offerRows.type}</dt>
          <dd>{s.types[0]}</dd>
          <dt>{TEXT.offerRows.fee}</dt>
          <dd>{TEXT.dueOn(lkr(s.feeLkr), day(s.applyBy))}</dd>
          {s.offer && (
            <>
              <dt>{TEXT.offerRows.setup}</dt>
              <dd>{s.offer.setup}</dd>
              <dt>{TEXT.offerRows.power}</dt>
              <dd>{s.offer.power}</dd>
              <dt>{TEXT.offerRows.crowd}</dt>
              <dd>{s.offer.crowd}</dd>
            </>
          )}
        </dl>
      </section>
      {/* Figma's order: Accept invitation, Decline, Ask a question */}
      <div className={styles.decide}>
        <form action={acceptInvitation.bind(null, s.id)} className={styles.formFill}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.acceptInvite}
          </button>
        </form>
        <form action={declineInvitation.bind(null, s.id)} className={styles.formFill}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
            {TEXT.decline}
          </button>
        </form>
        <Link href={`${routes.vendorArea.messages}?to=${s.organiserId}`} className={forms.bigButton}>
          {TEXT.ask}
        </Link>
      </div>
      <p className={styles.foot}>{TEXT.acceptNote}</p>
    </Dialog>
  );
}
