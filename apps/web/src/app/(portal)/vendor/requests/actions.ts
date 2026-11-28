"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { acceptRequest, getProviderState, getRequest, isVerified, updateRequest } from "@/lib/data/provider";
import type { ProviderPayment } from "@/lib/data/provider-types";
import { DECLINE_REASONS } from "@/lib/provider";
import { routes } from "@/lib/routes";

// Booking request actions: accept (V48), decline (V50), send or withdraw your own quote (V09, V51).

const r = routes.vendorArea;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// "LKR 195,000" or "195000" → 195000; NaN when it isn't a whole amount
function amount(form: FormData, name: string): number {
  const digits = field(form, name).replace(/[^\d]/g, "");
  return digits ? Number(digits) : Number.NaN;
}

// "Accept booking" (V48). Needs the verified badge (V46) and the terms ticked.
export async function acceptBooking(requestId: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  if (!state || !isVerified(state)) redirect(r.request(requestId));
  if (field(form, "agree") !== "yes") redirect(`${r.request(requestId)}?dialog=accept&error=agree`);
  const saved = await acceptRequest(session, requestId);
  revalidatePath(r.requests);
  redirect(saved.ok ? r.accepted(requestId) : r.request(requestId));
}

// "Decline request" (V50). The organiser is told; the reason stays private unless a note is added.
export async function declineRequest(requestId: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const reason = DECLINE_REASONS.find((x) => x === field(form, "reason"));
  if (!reason) redirect(`${r.request(requestId)}?dialog=decline&error=reason`);
  await updateRequest(session, requestId, { status: "declined", declined: { reason, note: field(form, "note"), at: new Date().toISOString() } });
  revalidatePath(r.requests);
  redirect(`${r.requests}?tab=declined`);
}

// "Withdraw quote" (V51): the request goes back to New, so they can still accept or decline it.
export async function withdrawQuote(requestId: string) {
  const session = await requireRole("vendor", "freelancer");
  const request = await getRequest(session, requestId);
  if (request?.status === "quoted") await updateRequest(session, requestId, { status: "new", quote: null });
  revalidatePath(r.requests);
  redirect(r.request(requestId));
}

// "Send quote" (V09). The deposit and instalments must add up to the price (V55), and every
// instalment must be due before the event.
export async function sendQuote(requestId: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const request = await getRequest(session, requestId);
  if (!request || request.status === "accepted") redirect(r.requests);

  const price = amount(form, "price");
  const depositPercent = amount(form, "depositPercent");
  const instalments: ProviderPayment[] = [];
  for (let i = 1; i <= 3; i++) {
    const value = amount(form, `instalment${i}`);
    const due = field(form, `due${i}`);
    if (Number.isNaN(value) && !due) continue;
    instalments.push({ label: i === 1 ? "Instalment 1" : `Instalment ${i}`, amountLkr: value, percent: null, due: due || null, receivedAt: null });
  }

  // the form keeps what was typed when it comes back with an error
  const back = new URLSearchParams();
  // Next adds hidden "$ACTION_…" fields to the form; they don't belong in the address
  for (const [key, value] of form.entries()) if (typeof value === "string" && !key.startsWith("$")) back.set(key, value);
  const fail = (error: string) => redirect(`${r.quote(requestId)}?error=${error}&${back.toString()}`);

  if (!(price > 0)) fail("price");
  if (!(depositPercent >= 0 && depositPercent <= 100)) fail("deposit");
  const depositLkr = Math.round((price * depositPercent) / 100);
  if (instalments.some((p) => !(p.amountLkr > 0) || !p.due)) fail("instalment");
  if (instalments.some((p) => (p.due ?? "") >= request.date)) fail("due");
  const total = depositLkr + instalments.reduce((sum, p) => sum + p.amountLkr, 0);
  if (total !== price) fail("total");

  const cancellation = [field(form, "cancel7"), field(form, "cancel72"), field(form, "cancelYou")].filter(Boolean);
  await updateRequest(session, requestId, {
    status: "quoted",
    quote: {
      priceLkr: price,
      includes: field(form, "includes"),
      payments: [{ label: "Deposit", amountLkr: depositLkr, percent: depositPercent, due: null, receivedAt: null }, ...instalments],
      cancellation,
      message: field(form, "message"),
      sentAt: new Date().toISOString(),
      decidedAt: null,
      note: "",
    },
  });
  revalidatePath(r.requests);
  redirect(r.request(requestId));
}
