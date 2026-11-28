"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getStall, payStallFee, savePayout } from "@/lib/data/provider";
import { routes } from "@/lib/routes";

// Payment actions: connect or disconnect the PayHere account (V71, V25) and pay a stall fee in
// the sandbox (V78–V80). No real money moves: PayHere's sandbox stands in until EN-10.

const r = routes.vendorArea;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// "Connect account" (V71). The merchant ID is digits; the secret is never stored here.
export async function connectPayout(form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const merchant = field(form, "merchant").replace(/\s/g, "");
  const name = field(form, "name");
  if (!/^\d{6,}$/.test(merchant) || !field(form, "secret") || !name) redirect(`${r.connect}?error=fields&merchant=${encodeURIComponent(merchant)}&name=${encodeURIComponent(name)}`);
  await savePayout(session, { bank: "PayHere merchant · sandbox", accountName: name, last4: `${merchant.slice(0, 4)}···${merchant.slice(-2)}`, connectedAt: new Date().toISOString() });
  revalidatePath(r.payments);
  redirect(`${r.payments}?connected=1`);
}

// "Disconnect" (V25, V71): payments then happen outside the app and are marked by hand.
export async function disconnectPayout(back: string) {
  const session = await requireRole("vendor", "freelancer");
  await savePayout(session, null);
  revalidatePath(r.payments);
  redirect(back === r.settings ? r.settings : r.payments);
}

// "Pay LKR … (test)" (V78). "Try a failed payment" shows the failure page instead (V80).
export async function payStall(stallId: string, fail: boolean, form: FormData) {
  const session = await requireRole("vendor");
  const stall = await getStall(session, stallId);
  if (!stall?.application || stall.application.fee.paidAt) redirect(r.stalls);
  if (fail) redirect(`${r.stallPayFailed(stallId)}?reason=declined`);
  const method = field(form, "method") || "Card";
  const card = field(form, "card").replace(/\s/g, "");
  if (method === "Card" && !/^\d{12,19}$/.test(card)) redirect(`${r.payStall(stallId)}?error=card`);
  await payStallFee(session, stallId, method === "Card" ? `PayHere sandbox · card ending ${card.slice(-4)}` : `PayHere sandbox · ${method}`);
  revalidatePath(r.payments);
  revalidatePath(r.stalls);
  redirect(r.stallPaid(stallId));
}
