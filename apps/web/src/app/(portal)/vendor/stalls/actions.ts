"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getStall, updateStall } from "@/lib/data/provider";
import type { StallType } from "@/lib/data/provider-types";
import { STALL_TYPES } from "@/lib/provider";
import { routes } from "@/lib/routes";

// Stall actions (vendors only): apply for a slot (V74), withdraw, answer an invitation (V76) and
// report a fee paid with no stall (V83).

const r = routes.vendorArea;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function done(tab = "") {
  revalidatePath(r.stalls);
  redirect(tab ? `${r.stalls}?tab=${tab}` : r.stalls);
}

// "Send application" (V74): a stall type, what they'll sell, and the event rules ticked.
export async function applyForStall(stallId: string, form: FormData) {
  const session = await requireRole("vendor");
  const stall = await getStall(session, stallId);
  if (!stall || stall.application?.status === "pending" || stall.application?.status === "approved") done();
  const type = STALL_TYPES.find((t) => t === field(form, "type")) as StallType | undefined;
  const note = field(form, "note");
  const error = !type ? "type" : !note ? "note" : field(form, "rules") !== "yes" ? "rules" : "";
  if (error || !stall || !type) redirect(`${r.stalls}?dialog=apply&stall=${stallId}&error=${error}&note=${encodeURIComponent(note)}`);
  await updateStall(session, stallId, {
    application: {
      status: "pending",
      stall: null,
      zone: "",
      type,
      note,
      sentAt: new Date().toISOString(),
      decidedAt: null,
      fee: { paidAt: null, due: stall.applyBy, receipt: null },
    },
  });
  done("applications");
}

// "Withdraw" on a pending application (V75).
export async function withdrawStall(stallId: string) {
  const session = await requireRole("vendor");
  const stall = await getStall(session, stallId);
  if (stall?.application?.status === "pending") await updateStall(session, stallId, { application: null });
  done("applications");
}

// "Accept invitation" (V76): accepting counts as approval; the organiser gives the number.
export async function acceptInvitation(stallId: string) {
  const session = await requireRole("vendor");
  const stall = await getStall(session, stallId);
  if (stall?.invited && !stall.application) {
    const now = new Date().toISOString();
    await updateStall(session, stallId, {
      invited: false,
      application: { status: "approved", stall: null, zone: "", type: stall.types[0] ?? "Food", note: "", sentAt: now, decidedAt: now, fee: { paidAt: null, due: stall.applyBy, receipt: null } },
    });
  }
  done("applications");
}

// "Decline" on an invitation (V14).
export async function declineInvitation(stallId: string) {
  const session = await requireRole("vendor");
  await updateStall(session, stallId, { invited: false });
  done();
}

// "Send to an admin" (V83): a fee paid for a stall that was rejected. An admin handles it (EN-08),
// which has no records yet, so nothing is stored; the page confirms it was sent.
export async function reportPaidNoStall(stallId: string, form: FormData) {
  await requireRole("vendor");
  if (!field(form, "text")) redirect(`${r.stalls}?dialog=paid&stall=${stallId}&error=text`);
  redirect(`${r.stalls}?tab=applications&reported=1`);
}
