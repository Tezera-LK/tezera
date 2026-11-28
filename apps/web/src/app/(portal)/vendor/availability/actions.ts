"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { setDays } from "@/lib/data/provider";
import { routes } from "@/lib/routes";

// Availability actions (V17, V42): mark days busy by hand, or clear them. Days with a booking, a
// stall or a quote follow their record and can't be changed here.

const r = routes.vendorArea;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// every calendar day from `from` to `to`, both included; at most 31
function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`) && days.length < 31; t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

// "Mark dates" (V42): booked elsewhere or unavailable, with a note only the provider sees.
export async function markDates(month: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const from = field(form, "from");
  const to = field(form, "to") || from;
  const kind = field(form, "kind") === "booked" ? "booked" : "unavailable";
  const back = `${r.availability}?month=${month}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) redirect(`${back}&dialog=mark&kind=${kind}&error=dates`);
  const note = field(form, "note");
  await setDays(session, daysBetween(from, to), {
    kind,
    label: kind === "booked" ? "Booked elsewhere" : "Unavailable",
    detail: note || (kind === "booked" ? "An event outside Tezera" : "Marked unavailable by you"),
    auto: false,
  });
  revalidatePath(r.availability);
  redirect(back);
}

// "Clear" on days marked by hand (V17's "On your calendar").
export async function clearDates(month: string, dates: string[]) {
  const session = await requireRole("vendor", "freelancer");
  await setDays(session, dates, null);
  revalidatePath(r.availability);
  redirect(`${r.availability}?month=${month}`);
}
