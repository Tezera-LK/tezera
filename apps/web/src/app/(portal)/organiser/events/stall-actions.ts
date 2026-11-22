"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, type Session } from "@/lib/auth/session";
import { getEventStalls, getMyEvent, getStallVendors, isVerified, saveEventStalls } from "@/lib/data/portal";
import type { EventStalls, StallType } from "@/lib/data/portal-types";
import { routes } from "@/lib/routes";
import { STALL_TYPES, usedNumbers } from "@/lib/stalls";

// The Stalls tab's actions (O13, O72–O76). Each reads the form, checks it, saves the event's
// stalls through lib/data/portal.ts and goes back to the tab. When something's wrong they
// reopen the dialog with ?error=…, so the page can say what.

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// "LKR 15,000" → 15000; NaN when there are no digits
function lkr(value: string): number {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : NaN;
}

// The tab's address, with a dialog and its details when given.
function tab(eventId: string, query?: Record<string, string>): string {
  const base = routes.eventStalls(eventId);
  return query ? `${base}?${new URLSearchParams(query)}` : base;
}

// Loads the event's stalls, or goes back to the tab if the event isn't the organiser's.
async function load(eventId: string) {
  const session = await requireRole("organiser");
  const [event, stalls] = await Promise.all([getMyEvent(session, eventId), getEventStalls(session, eventId)]);
  if (!event || !stalls) redirect(tab(eventId));
  return { session, event, stalls };
}

// Saves, clears every page that shows the counts, and goes back to the tab, or to the listing
// dialog of `listingOf` when given.
async function save(session: Session, eventId: string, stalls: EventStalls, listingOf?: string | null) {
  const result = await saveEventStalls(session, eventId, stalls);
  if (!result.ok) redirect(tab(eventId, { error: "save" }));
  revalidatePath(routes.eventStalls(eventId));
  revalidatePath(routes.manageEvent(eventId));
  revalidatePath(routes.dashboard);
  redirect(listingOf ? tab(eventId, { dialog: "listing", stall: listingOf }) : tab(eventId));
}

// "Open … slots" (O72), and "Edit" on a row of Stall slots. Opening a type that already has
// slots changes that row. There can't be fewer slots than stalls already given out.
export async function saveStallSlots(eventId: string, form: FormData) {
  const { session, event, stalls } = await load(eventId);
  // opening stall slots needs the Verified badge (O41)
  if (!(await isVerified(session))) redirect(tab(eventId, { dialog: "locked" }));
  const type = field(form, "type") as StallType;
  const slots = Number(field(form, "slots"));
  const feeLkr = lkr(field(form, "fee"));
  const closesOn = field(form, "closesOn");
  const feeDue = field(form, "feeDue");
  const rules = field(form, "rules");
  const existing = stalls.slots.find((s) => s.type === type);
  const again = (error: string) => redirect(tab(eventId, { dialog: "slots", type, error }));

  if (!STALL_TYPES.includes(type)) again("type");
  if (!Number.isInteger(slots) || slots < 1 || slots < (existing?.approved ?? 0)) again("slots");
  if (!Number.isFinite(feeLkr)) again("fee");
  // applications have to close by the day of the event
  if (!closesOn || (event.date && closesOn > event.date)) again("closes");
  if (!feeDue) again("due");

  if (existing) {
    Object.assign(existing, { slots, feeLkr, closesOn, feeDue, rules });
  } else {
    stalls.slots.push({ type, slots, feeLkr, closesOn, feeDue, rules, applied: 0, approved: 0 });
  }
  await save(session, eventId, stalls);
}

// "Send invitation" (O73). The vendor shows under "Applications and invitations" as Invited
// until they accept; accepting counts as approval (the vendor's side, a later slice).
export async function inviteVendor(eventId: string, form: FormData) {
  const { session, stalls } = await load(eventId);
  if (!(await isVerified(session))) redirect(tab(eventId, { dialog: "locked" }));
  const vendors = await getStallVendors(session);
  const vendor = vendors.find((v) => v.id === field(form, "vendor"));
  const type = field(form, "type") as StallType;
  const feeLkr = lkr(field(form, "fee"));
  const busy = new Set([...stalls.applications.map((a) => a.vendor.id), ...stalls.approved.map((a) => a.vendor.id)]);

  if (!vendor || busy.has(vendor.id)) redirect(tab(eventId, { dialog: "invite", error: "vendor" }));
  if (!STALL_TYPES.includes(type)) redirect(tab(eventId, { dialog: "invite", error: "type" }));
  if (!Number.isFinite(feeLkr)) redirect(tab(eventId, { dialog: "invite", error: "fee" }));

  stalls.applications.push({
    id: `app-${Date.now().toString(36)}`,
    vendor,
    type,
    receivedAt: new Date().toISOString(),
    status: "invited",
    message: field(form, "message"),
    feeLkr,
  });
  await save(session, eventId, stalls);
}

// A typed stall number in capitals, or null when it is empty or another stall already has it.
function checkNumber(stalls: EventStalls, typed: string, stallId?: string): string | null {
  const number = typed.toUpperCase();
  const own = stalls.approved.find((s) => s.id === stallId)?.number;
  if (!number || (number !== own && usedNumbers(stalls).has(number))) return null;
  // a number outside the type's area of the map is allowed; the map builder places it later
  return number;
}

// "Approve as B-15" (O75): the vendor gets the stall and its number, and their fee is due.
export async function approveApplication(eventId: string, applicationId: string, form: FormData) {
  const { session, stalls } = await load(eventId);
  const application = stalls.applications.find((a) => a.id === applicationId && a.status === "applied");
  if (!application) redirect(tab(eventId));

  const number = checkNumber(stalls, field(form, "number") || field(form, "pick"));
  if (!number) redirect(tab(eventId, { dialog: "approve", application: applicationId, error: "number" }));
  const slot = stalls.slots.find((s) => s.type === application.type);
  if (slot && slot.approved >= slot.slots) {
    redirect(tab(eventId, { dialog: "approve", application: applicationId, error: "full" }));
  }

  stalls.applications = stalls.applications.filter((a) => a.id !== applicationId);
  stalls.approved.push({
    id: `stall-${Date.now().toString(36)}`,
    vendor: application.vendor,
    type: application.type,
    number,
    fee: "due",
    feeDue: slot?.feeDue ?? "",
    listing: null,
    hidden: false,
  });
  if (slot) slot.approved += 1;
  await save(session, eventId, stalls);
}

// "Give a number" and "Add" on an approved vendor without one (O13), in O75's dialog.
export async function setStallNumber(eventId: string, stallId: string, form: FormData) {
  const { session, stalls } = await load(eventId);
  const stall = stalls.approved.find((s) => s.id === stallId);
  if (!stall) redirect(tab(eventId));

  const number = checkNumber(stalls, field(form, "number") || field(form, "pick"), stall.id);
  if (!number) redirect(tab(eventId, { dialog: "number", stall: stallId, error: "number" }));
  stall.number = number;
  await save(session, eventId, stalls);
}

const REJECT_REASONS = ["full", "fit", "other"];

// "Reject" (O76): the vendor is told why, with the organiser's note if there is one (EN-09
// sends it; here the application is only removed).
export async function rejectApplication(eventId: string, applicationId: string, form: FormData) {
  const { session, stalls } = await load(eventId);
  if (!REJECT_REASONS.includes(field(form, "reason"))) {
    redirect(tab(eventId, { dialog: "reject", application: applicationId, error: "reason" }));
  }
  stalls.applications = stalls.applications.filter((a) => a.id !== applicationId);
  await save(session, eventId, stalls);
}

// "Hide listing" and "Show listing" (O13), and "Hide whole listing" (O74): the vendor's menu
// leaves the event page and the map, or comes back. `back` reopens the listing dialog.
export async function toggleListing(eventId: string, stallId: string, form: FormData) {
  const { session, stalls } = await load(eventId);
  const stall = stalls.approved.find((s) => s.id === stallId);
  if (stall) stall.hidden = !stall.hidden;
  await save(session, eventId, stalls, field(form, "back") === "listing" ? stallId : null);
}

// "Hide" or "Show" on one item of a listing (O74), e.g. a drink that breaks the event's rules.
export async function toggleListingItem(eventId: string, stallId: string, itemId: string) {
  const { session, stalls } = await load(eventId);
  const item = stalls.approved.find((s) => s.id === stallId)?.listing?.items.find((i) => i.id === itemId);
  if (item) item.hidden = !item.hidden;
  await save(session, eventId, stalls, stallId);
}

