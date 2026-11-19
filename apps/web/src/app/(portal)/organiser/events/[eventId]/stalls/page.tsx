import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import EventHeader from "@/components/portal/events/EventHeader";
import InviteVendorForm from "@/components/portal/events/InviteVendorForm";
import StallNumberForm from "@/components/portal/events/StallNumberForm";
import StallSlotsForm, { type SlotValues } from "@/components/portal/events/StallSlotsForm";
import styles from "@/components/portal/events/Stalls.module.css";
import tables from "@/components/portal/tables.module.css";
import { hasEnded } from "@/components/portal/events/eventText";
import forms from "@/components/portal/forms.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getEventStalls, getMyEvent, getStallVendors, isVerified } from "@/lib/data/portal";
import LockedDialog from "@/components/portal/verification/LockedDialog";
import type { ApprovedStall, EventStalls, ManagedEvent, StallApplication, StallType, StallVendor } from "@/lib/data/portal-types";
import { formatCount, formatDayMonth, formatShortDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { STALL_TYPES, usedNumbers } from "@/lib/stalls";
import {
  approveApplication,
  inviteVendor,
  rejectApplication,
  saveStallSlots,
  setStallNumber,
  toggleListing,
  toggleListingItem,
} from "../../stall-actions";

export const metadata: Metadata = { title: "Stalls" };

const TEXT = {
  slots: "Stall slots",
  invite: "Invite a vendor",
  open: "Open stall slots",
  type: "Stall type",
  typeShort: "Type",
  count: "Slots",
  fee: "Fee",
  applyBy: "Apply by",
  applied: "Applied",
  approved: "Approved",
  edit: "Edit",
  editType: (type: string) => `Edit ${type.toLowerCase()} slots`,
  noSlots: "No stall slots yet. Open some so vendors can apply.",
  noSlotsClosed: "This event had no stall slots.",
  applications: (n: number) => `Applications and invitations · ${n}`,
  vendor: "Vendor",
  received: "Received",
  status: "Status",
  actions: "Actions",
  invited: "Invited",
  reject: "Reject",
  approve: "Approve",
  rejectWho: (name: string) => `Reject ${name}`,
  approveWho: (name: string) => `Approve ${name}`,
  waiting: "Waiting for the vendor",
  noApplications: "No applications waiting.",
  approvedVendors: "Approved vendors",
  openMapBuilder: "Open map builder",
  stallNo: "Stall no.",
  listing: "Listing",
  add: "Add",
  addFor: (name: string) => `Add a stall number for ${name}`,
  items: (n: number) => `${n} ${n === 1 ? "item" : "items"} with prices`,
  noListing: "No listing yet",
  hiddenByYou: "Hidden by you",
  paid: "Paid",
  paidOutside: "Paid outside",
  due: (when: string) => `Due ${when}`,
  view: "View",
  viewWho: (name: string) => `View ${name}'s listing`,
  hideListing: "Hide listing",
  showListing: "Show listing",
  giveNumber: "Give a number",
  noApproved: "No vendors approved yet.",
  verified: "Verified",
  stallFees: "Stall fees",
  collected: "Collected",
  collectedValue: (paid: number, of: number, amount: number) => `${paid} of ${of} · LKR ${formatCount(amount)}`,
  feesText: "Vendors pay in the app through your PayHere account (test), or outside Tezera and you mark it paid.",
  payments: "Payments",
  onMap: "On the venue map",
  onMapText: "Approved stalls get their number on the map and on the event page.",
  saveError: "That didn't save. Saving needs the backend (EN-03), which isn't connected yet.",
} as const;

type Query = { dialog?: string; type?: string; application?: string; stall?: string; error?: string };

type Props = { params: Promise<{ eventId: string }>; searchParams: Promise<Query> };

const lkr = (n: number) => `LKR ${formatCount(n)}`;

// "2026-11-27" → "Fri 27 Nov"; the noon time keeps it on the same day in any time zone
const day = (date: string) => (date ? formatDayMonth(`${date}T12:00:00+05:30`) : "–");

// "★ 4.4 · Verified"
const rating = (v: StallVendor) => [`★ ${v.rating}`, v.verified && TEXT.verified].filter(Boolean).join(" · ");

// The event's Stalls tab (Figma O13): the stall slots on offer, vendors waiting for an answer,
// and the approved vendors with their numbers, fees and listings. ?dialog= opens one of O72–O76
// over it: slots (open or edit), invite, approve, number, reject or listing.
export default async function EventStallsPage({ params, searchParams }: Props) {
  const session = await requireRole("organiser");
  const { eventId } = await params;
  const query = await searchParams;
  const [event, stalls] = await Promise.all([getMyEvent(session, eventId), getEventStalls(session, eventId)]);
  if (!event || event.status === "draft" || event.status === "unpublished") notFound();

  // a cancelled or finished event's stalls can be read but not changed
  const open = !hasEnded(event) && (event.status === "published" || event.status === "postponed");
  const base = routes.eventStalls(event.id);
  const href = (q: Record<string, string>) => `${base}?${new URLSearchParams(q)}`;
  const record = stalls ?? emptyStalls();
  const approvedTotal = record.slots.reduce((sum, s) => sum + s.approved, 0);

  const aside = (
    <>
      <Panel title={TEXT.stallFees}>
        <div className={styles.collected}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.collected}</span>
            <span className={tables.small}>
              {TEXT.collectedValue(record.collected.paid, approvedTotal, record.collected.amountLkr)}
            </span>
          </span>
          {record.collected.paid > 0 && <Chip tone="good">{TEXT.paid}</Chip>}
        </div>
        <p className={tables.panelText}>{TEXT.feesText}</p>
        <MaybeLink href={routes.payments} className={`${ui.rowButton} ${ui.rowButtonWhite} ${tables.panelLink}`}>{TEXT.payments}</MaybeLink>
      </Panel>
      <Panel title={TEXT.onMap}>
        <span className={styles.mapThumb}>
          <Thumb size={308} height={140} shape="image" />
        </span>
        <p className={tables.panelText}>{TEXT.onMapText}</p>
        {/* the map builder is its own slice (O11–O71) */}
        <MaybeLink className={`${ui.rowButton} ${ui.rowButtonWhite} ${tables.panelLink}`}>{TEXT.openMapBuilder}</MaybeLink>
      </Panel>
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <EventHeader event={event} current="stalls" />
        {query.error === "save" && (
          <p className={forms.alert} role="alert">
            {TEXT.saveError}
          </p>
        )}

        <section className={`${tables.section} ${tables.sectionTight}`} aria-labelledby="slots-title">
          <div className={tables.sectionHead}>
            <h2 id="slots-title" className={ui.sectionTitle}>
              {TEXT.slots}
            </h2>
            {open && (
              <div className={tables.headButtons}>
                <Link href={href({ dialog: "invite" })} scroll={false} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                  {TEXT.invite}
                </Link>
                <Link href={href({ dialog: "slots" })} scroll={false} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                  {TEXT.open}
                </Link>
              </div>
            )}
          </div>
          {record.slots.length === 0 ? (
            <p className={ui.muted}>{open ? TEXT.noSlots : TEXT.noSlotsClosed}</p>
          ) : (
            <div className={tables.tableCard}>
              <table className={`${tables.table} ${styles.slotsTable}`}>
                <thead>
                  <tr>
                    <th scope="col">{TEXT.type}</th>
                    <th scope="col">{TEXT.count}</th>
                    <th scope="col">{TEXT.fee}</th>
                    <th scope="col">{TEXT.applyBy}</th>
                    <th scope="col">{TEXT.applied}</th>
                    <th scope="col">{TEXT.approved}</th>
                    <th scope="col">
                      <span className={shell.srOnly}>{TEXT.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {record.slots.map((s) => (
                    <tr key={s.type}>
                      <th scope="row" className={tables.strong}>
                        {s.type}
                      </th>
                      <td>{s.slots}</td>
                      <td>{lkr(s.feeLkr)}</td>
                      <td>{day(s.closesOn)}</td>
                      <td>{s.applied}</td>
                      <td>{s.approved}</td>
                      <td className={tables.end}>
                        {open && (
                          <Link
                            href={href({ dialog: "slots", type: s.type })}
                            scroll={false}
                            className={`${ui.rowButton} ${ui.rowButtonWhite}`}
                            aria-label={TEXT.editType(s.type)}
                          >
                            {TEXT.edit}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={tables.section} aria-labelledby="applications-title">
          <h2 id="applications-title" className={ui.sectionTitle}>
            {TEXT.applications(record.applications.length)}
          </h2>
          {record.applications.length === 0 ? (
            <p className={ui.muted}>{TEXT.noApplications}</p>
          ) : (
            <div className={tables.tableCard}>
              <table className={`${tables.table} ${styles.applicationsTable}`}>
                <thead>
                  <tr>
                    <th scope="col">{TEXT.vendor}</th>
                    <th scope="col">{TEXT.type}</th>
                    <th scope="col">{TEXT.received}</th>
                    <th scope="col">{TEXT.status}</th>
                    <th scope="col">
                      <span className={shell.srOnly}>{TEXT.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {record.applications.map((a) => (
                    <tr key={a.id}>
                      <th scope="row">
                        <span className={tables.strong}>{a.vendor.name}</span>
                        <span className={tables.small}>{rating(a.vendor)}</span>
                      </th>
                      <td>{a.type}</td>
                      <td>{formatDayMonth(a.receivedAt)}</td>
                      <td>
                        {a.status === "applied" ? <Chip tone="soft">{TEXT.applied}</Chip> : <Chip tone="neutral">{TEXT.invited}</Chip>}
                      </td>
                      <td>
                        {a.status === "invited" ? (
                          <span className={tables.small}>{TEXT.waiting}</span>
                        ) : (
                          open && (
                            <span className={tables.rowActions}>
                              <Link
                                href={href({ dialog: "reject", application: a.id })}
                                scroll={false}
                                className={`${ui.rowButton} ${ui.rowButtonWhite}`}
                                aria-label={TEXT.rejectWho(a.vendor.name)}
                              >
                                {TEXT.reject}
                              </Link>
                              <Link
                                href={href({ dialog: "approve", application: a.id })}
                                scroll={false}
                                className={`${ui.rowButton} ${ui.rowButtonPrimary}`}
                                aria-label={TEXT.approveWho(a.vendor.name)}
                              >
                                {TEXT.approve}
                              </Link>
                            </span>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={tables.section} aria-labelledby="approved-title">
          <div className={tables.sectionHead}>
            <h2 id="approved-title" className={ui.sectionTitle}>
              {TEXT.approvedVendors}
            </h2>
            <MaybeLink className={ui.textLink}>{TEXT.openMapBuilder}</MaybeLink>
          </div>
          {record.approved.length === 0 ? (
            <p className={ui.muted}>{TEXT.noApproved}</p>
          ) : (
            <div className={tables.tableCard}>
              <table className={`${tables.table} ${styles.approvedTable}`}>
                <thead>
                  <tr>
                    <th scope="col">{TEXT.stallNo}</th>
                    <th scope="col">{TEXT.vendor}</th>
                    <th scope="col">{TEXT.typeShort}</th>
                    <th scope="col">{TEXT.listing}</th>
                    <th scope="col">{TEXT.fee}</th>
                    <th scope="col">
                      <span className={shell.srOnly}>{TEXT.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {record.approved.map((s) => (
                    <ApprovedRow key={s.id} event={event} stall={s} open={open} href={href} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </Columns>

      {open && <StallDialog event={event} stalls={record} query={query} />}
    </>
  );
}

// An event with no stall record (production, until EN-03).
function emptyStalls(): EventStalls {
  const none = { name: "", numbers: [], taken: [] };
  return {
    slots: [],
    applications: [],
    approved: [],
    collected: { paid: 0, amountLkr: 0 },
    zones: { Food: none, Drinks: none, Merchandise: none, Crafts: none, Other: none },
  };
}

// One approved vendor: their number (or "Add"), name, type, listing, fee, and the buttons.
function ApprovedRow({
  event,
  stall,
  open,
  href,
}: {
  event: ManagedEvent;
  stall: ApprovedStall;
  open: boolean;
  href: (q: Record<string, string>) => string;
}) {
  const numberHref = href({ dialog: "number", stall: stall.id });
  const fee =
    stall.fee === "paid" ? (
      <Chip tone="good">{TEXT.paid}</Chip>
    ) : stall.fee === "paid-outside" ? (
      <Chip tone="good">{TEXT.paidOutside}</Chip>
    ) : (
      <Chip tone="warn">{TEXT.due(stall.feeDue ? formatShortDate(`${stall.feeDue}T12:00:00+05:30`) : "")}</Chip>
    );

  return (
    <tr>
      <td>
        {stall.number ? (
          <span className={styles.stallNo}>{stall.number}</span>
        ) : open ? (
          <Link href={numberHref} scroll={false} className={`${styles.stallNo} ${styles.stallNoAdd}`} aria-label={TEXT.addFor(stall.vendor.name)}>
            {TEXT.add}
          </Link>
        ) : (
          "–"
        )}
      </td>
      <th scope="row" className={tables.strong}>
        {stall.vendor.name}
      </th>
      <td>{stall.type}</td>
      <td>
        {!stall.listing ? (
          <span className={ui.muted}>{TEXT.noListing}</span>
        ) : stall.hidden ? (
          <Chip tone="neutral">{TEXT.hiddenByYou}</Chip>
        ) : (
          TEXT.items(stall.listing.items.length)
        )}
      </td>
      <td>{fee}</td>
      <td className={tables.end}>
        <span className={tables.rowActions}>
          {stall.listing ? (
            <>
              <Link
                href={href({ dialog: "listing", stall: stall.id })}
                scroll={false}
                className={`${ui.rowButton} ${ui.rowButtonWhite}`}
                aria-label={TEXT.viewWho(stall.vendor.name)}
              >
                {TEXT.view}
              </Link>
              {open && (
                <form action={toggleListing.bind(null, event.id, stall.id)}>
                  <button type="submit" className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                    {stall.hidden ? TEXT.showListing : TEXT.hideListing}
                  </button>
                </form>
              )}
            </>
          ) : (
            open &&
            !stall.number && (
              <Link href={numberHref} scroll={false} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                {TEXT.giveNumber}
              </Link>
            )
          )}
        </span>
      </td>
    </tr>
  );
}

// ---------- Dialogs (O72–O76) ----------

const DIALOG_TEXT = {
  close: "Close",
  openTitle: "Open stall slots",
  editTitle: (type: string) => `${type} slots`,
  openSubtitle: (title: string) => `${title} · vendors only, freelancers cannot apply`,
  inviteTitle: "Invite a vendor to a stall",
  inviteSubtitle: "Accepting counts as approval",
  approveTitle: (name: string) => `Approve ${name}`,
  approveSubtitle: (type: string, fee: number | null) => `${type} stall${fee === null ? "" : ` · LKR ${formatCount(fee)} fee`}`,
  approveVerb: "Approve as",
  approveNote: "The number shows on the venue map and the event page. The vendor can pay the fee in the app (test) or outside it.",
  numberTitle: (name: string) => `Give ${name} a number`,
  numberSubtitle: (type: string) => `${type} stall`,
  numberVerb: "Give number",
  numberNote: "The number shows on the venue map and the event page.",
  rejectTitle: (name: string) => `Reject ${name}?`,
  rejectSubtitle: (type: string) => `${type} stall · they are told`,
  reasons: [
    { value: "full", label: "Slots are full" },
    { value: "fit", label: "Does not fit the event" },
    { value: "other", label: "Other" },
  ],
  reasonLabel: "Why",
  reasonError: "Pick a reason.",
  note: "Note to the vendor (optional)",
  notePlaceholder: "We are keeping merchandise to music brands this year. Hope to see you at Jazz on the Green!",
  cancel: "Cancel",
  reject: "Reject",
  listingSubtitle: (type: string) => `${type} · what people see on the map`,
  hide: "Hide",
  show: "Show",
  hideItem: (name: string) => `Hide ${name}`,
  showItem: (name: string) => `Show ${name}`,
  hidden: "hidden",
  hideAll: "Hide whole listing",
  showAll: "Show whole listing",
  hiddenNote: "Hidden from the event page and the map.",
  done: "Done",
} as const;

// Picks the dialog ?dialog= asks for. Anything it can't find (an old link, say) shows no dialog.
async function StallDialog({ event, stalls, query }: { event: ManagedEvent; stalls: EventStalls; query: Query }) {
  const close = routes.eventStalls(event.id);
  const application = stalls.applications.find((a) => a.id === query.application && a.status === "applied");
  const stall = stalls.approved.find((s) => s.id === query.stall);

  // opening slots and inviting vendors need the Verified badge (O41)
  if (query.dialog === "slots" || query.dialog === "invite" || query.dialog === "locked") {
    const session = await requireRole("organiser");
    if (!(await isVerified(session))) return <LockedDialog title="Get verified to open stall slots" closeHref={close} />;
    if (query.dialog === "locked") return null;
  }

  switch (query.dialog) {
    case "slots":
      return <SlotsDialog event={event} stalls={stalls} type={query.type} close={close} error={query.error} />;
    case "invite": {
      const session = await requireRole("organiser");
      const busy = new Set([...stalls.applications, ...stalls.approved].map((x) => x.vendor.id));
      const vendors = (await getStallVendors(session)).filter((v) => !busy.has(v.id));
      const fees = Object.fromEntries(stalls.slots.map((s) => [s.type, s.feeLkr]));
      return (
        <Dialog title={DIALOG_TEXT.inviteTitle} subtitle={DIALOG_TEXT.inviteSubtitle} closeHref={close} closeLabel={DIALOG_TEXT.close} narrow>
          <InviteVendorForm action={inviteVendor.bind(null, event.id)} vendors={vendors} fees={fees} closeHref={close} error={query.error} />
        </Dialog>
      );
    }
    case "approve":
      return application ? <ApproveDialog event={event} stalls={stalls} application={application} close={close} error={query.error} /> : null;
    case "number":
      return stall ? <NumberDialog event={event} stalls={stalls} stall={stall} close={close} error={query.error} /> : null;
    case "reject":
      return application ? <RejectDialog event={event} application={application} close={close} error={query.error} /> : null;
    case "listing":
      return stall?.listing ? <ListingDialog event={event} stall={stall} close={close} /> : null;
    default:
      return null;
  }
}

// "Open stall slots" (O72), or the same form for one row's "Edit".
function SlotsDialog({
  event,
  stalls,
  type,
  close,
  error,
}: {
  event: ManagedEvent;
  stalls: EventStalls;
  type?: string;
  close: string;
  error?: string;
}) {
  const editing = stalls.slots.find((s) => s.type === type);
  const picked = (STALL_TYPES.includes(type as StallType) ? type : undefined) as StallType | undefined;
  // a new type starts with the first type that has no slots yet, and the rules already set
  const firstFree = STALL_TYPES.find((t) => !stalls.slots.some((s) => s.type === t)) ?? "Food";
  const initial: SlotValues = editing ?? {
    type: picked ?? firstFree,
    slots: null,
    feeLkr: null,
    closesOn: "",
    feeDue: "",
    rules: stalls.slots[0]?.rules ?? "",
  };

  return (
    <Dialog
      title={editing ? DIALOG_TEXT.editTitle(editing.type) : DIALOG_TEXT.openTitle}
      subtitle={DIALOG_TEXT.openSubtitle(event.title)}
      closeHref={close}
      closeLabel={DIALOG_TEXT.close}
      narrow
    >
      <StallSlotsForm
        action={saveStallSlots.bind(null, event.id)}
        initial={initial}
        editing={Boolean(editing)}
        lastDay={event.date}
        closeHref={close}
        error={error}
      />
    </Dialog>
  );
}

// The squares of one area of the map, each free or taken. `own` is the stall's current number,
// which stays pickable.
function numbersFor(stalls: EventStalls, type: StallType, own?: string | null) {
  const used = usedNumbers(stalls);
  return stalls.zones[type].numbers.map((value) => ({ value, free: value === own || !used.has(value) }));
}

// "Approve Kottu Corner" (O75): pick the stall number, then approve.
function ApproveDialog({
  event,
  stalls,
  application,
  close,
  error,
}: {
  event: ManagedEvent;
  stalls: EventStalls;
  application: StallApplication;
  close: string;
  error?: string;
}) {
  const numbers = numbersFor(stalls, application.type);
  const fee = application.feeLkr ?? stalls.slots.find((s) => s.type === application.type)?.feeLkr ?? null;
  return (
    <Dialog
      title={DIALOG_TEXT.approveTitle(application.vendor.name)}
      subtitle={DIALOG_TEXT.approveSubtitle(application.type, fee)}
      closeHref={close}
      closeLabel={DIALOG_TEXT.close}
      narrow
    >
      <StallNumberForm
        action={approveApplication.bind(null, event.id, application.id)}
        numbers={numbers}
        zone={stalls.zones[application.type].name}
        initial={numbers.find((n) => n.free)?.value ?? ""}
        verb={DIALOG_TEXT.approveVerb}
        note={DIALOG_TEXT.approveNote}
        closeHref={close}
        error={error}
      />
    </Dialog>
  );
}

// "Give a number" and "Add": O75's number picker for a vendor approved without one.
function NumberDialog({
  event,
  stalls,
  stall,
  close,
  error,
}: {
  event: ManagedEvent;
  stalls: EventStalls;
  stall: ApprovedStall;
  close: string;
  error?: string;
}) {
  const numbers = numbersFor(stalls, stall.type, stall.number);
  return (
    <Dialog
      title={DIALOG_TEXT.numberTitle(stall.vendor.name)}
      subtitle={DIALOG_TEXT.numberSubtitle(stall.type)}
      closeHref={close}
      closeLabel={DIALOG_TEXT.close}
      narrow
    >
      <StallNumberForm
        action={setStallNumber.bind(null, event.id, stall.id)}
        numbers={numbers}
        zone={stalls.zones[stall.type].name}
        initial={stall.number ?? numbers.find((n) => n.free)?.value ?? ""}
        verb={DIALOG_TEXT.numberVerb}
        note={DIALOG_TEXT.numberNote}
        closeHref={close}
        error={error}
      />
    </Dialog>
  );
}

// "Reject Lanka Threads?" (O76): a reason, an optional note, and the red Reject.
function RejectDialog({
  event,
  application,
  close,
  error,
}: {
  event: ManagedEvent;
  application: StallApplication;
  close: string;
  error?: string;
}) {
  return (
    <Dialog
      title={DIALOG_TEXT.rejectTitle(application.vendor.name)}
      subtitle={DIALOG_TEXT.rejectSubtitle(application.type)}
      closeHref={close}
      closeLabel={DIALOG_TEXT.close}
      narrow
    >
      <form action={rejectApplication.bind(null, event.id, application.id)} className={tables.dialogForm}>
        <fieldset className={styles.reasons}>
          <legend className={shell.srOnly}>{DIALOG_TEXT.reasonLabel}</legend>
          {DIALOG_TEXT.reasons.map((r) => (
            <label key={r.value} className={`${forms.choice} ${styles.reason}`}>
              <input type="radio" name="reason" value={r.value} required />
              <span className={forms.choiceTitle}>{r.label}</span>
              <span className={forms.choiceDot} aria-hidden="true" />
            </label>
          ))}
        </fieldset>
        {error === "reason" && (
          <p className={forms.error} role="alert">
            {DIALOG_TEXT.reasonError}
          </p>
        )}
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG_TEXT.note}</span>
          <textarea name="note" rows={2} placeholder={DIALOG_TEXT.notePlaceholder} className={`${forms.input} ${styles.rules}`} />
        </label>
        <div className={tables.dialogActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {DIALOG_TEXT.cancel}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
            {DIALOG_TEXT.reject}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// "B-14 · Spice Route Catering" (O74): the vendor's listing as people see it, with Hide on each
// item. An item that breaks the event's rules is tinted so it stands out.
function ListingDialog({ event, stall, close }: { event: ManagedEvent; stall: ApprovedStall; close: string }) {
  const listing = stall.listing!;
  const title = [stall.number, stall.vendor.name].filter(Boolean).join(" · ");
  return (
    <Dialog title={title} subtitle={DIALOG_TEXT.listingSubtitle(stall.type)} closeHref={close} closeLabel={DIALOG_TEXT.close} narrow>
      <p className={styles.blurb}>{listing.blurb}</p>
      {stall.hidden && <p className={styles.note}>{DIALOG_TEXT.hiddenNote}</p>}
      <ul className={styles.items}>
        {listing.items.map((item) => (
          <li key={item.id} className={`${styles.item} ${item.note && !item.hidden ? styles.itemFlagged : ""} ${item.hidden ? styles.itemHidden : ""}`}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{item.name}</span>
              <span className={styles.itemMeta}>
                {[item.kind, item.note, item.hidden && DIALOG_TEXT.hidden].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className={styles.price}>{lkr(item.priceLkr)}</span>
            <form action={toggleListingItem.bind(null, event.id, stall.id, item.id)}>
              <button
                type="submit"
                className={`${styles.itemButton} ${item.note && !item.hidden ? styles.itemButtonOn : ""}`}
                aria-label={item.hidden ? DIALOG_TEXT.showItem(item.name) : DIALOG_TEXT.hideItem(item.name)}
              >
                {item.hidden ? DIALOG_TEXT.show : DIALOG_TEXT.hide}
              </button>
            </form>
          </li>
        ))}
      </ul>
      <div className={styles.listingActions}>
        <form action={toggleListing.bind(null, event.id, stall.id)}>
          <input type="hidden" name="back" value="listing" />
          <button type="submit" className={`${forms.bigButton} ${stall.hidden ? forms.bigButtonQuiet : forms.bigButtonDanger}`}>
            {stall.hidden ? DIALOG_TEXT.showAll : DIALOG_TEXT.hideAll}
          </button>
        </form>
        <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonPrimary} ${styles.done}`}>
          {DIALOG_TEXT.done}
        </Link>
      </div>
    </Dialog>
  );
}
