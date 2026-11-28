"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getProviderState, saveConversation, saveSettings, setBlocked } from "@/lib/data/provider";
import { routes } from "@/lib/routes";

// Settings actions for vendors and freelancers (V25, V101–V103), like the organiser's
// (organiser/settings/actions.ts). Email, phone and password belong to sign-in (EN-04, Cognito):
// until it's connected these check the form and record the change; no password is kept anywhere.

const r = routes.vendorArea;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const dialog = (name: string, extra = "") => `${r.settings}?dialog=${name}${extra}`;

// The notification switches (V25). Booking requests and event changes are always on.
export async function saveNotifications(form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const on = (key: string) => form.get(key) === "on";
  await saveSettings(session, { notify: { bookings: true, messages: on("messages"), stalls: on("stalls"), questions: on("questions"), likes: on("likes") } });
  revalidatePath(r.settings);
  redirect(`${r.settings}?saved=notifications`);
}

// "Send code" (V101): a code goes to the new email or phone (EN-04).
export async function startContactChange(form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const next = field(form, "contact");
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next);
  const isPhone = /^\+?[\d\s-]{9,15}$/.test(next);
  if (!isEmail && !isPhone) redirect(dialog("contact", "&error=contact"));
  if (!field(form, "password")) redirect(dialog("contact", "&error=password"));
  await saveSettings(session, { pendingContact: next });
  revalidatePath(r.settings);
  redirect(dialog("contact", "&step=code"));
}

// "Verify and save" (V101's code). In preview any six digits do, as no code is really sent.
export async function confirmContactChange(form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const settings = (await getProviderState(session))?.settings;
  if (!settings?.pendingContact) redirect(dialog("contact"));
  if (!/^\d{6}$/.test(field(form, "code"))) redirect(dialog("contact", "&step=code&error=code"));
  await saveSettings(session, { email: settings.pendingContact, pendingContact: null });
  revalidatePath(r.settings);
  redirect(`${r.settings}?saved=contact`);
}

// "Save password" (V102): 8 or more characters with a number, as at sign-up (EN-04). Only the
// date of the change is recorded.
export async function changePassword(form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const current = field(form, "current");
  const next = String(form.get("next") ?? "");
  const again = String(form.get("again") ?? "");
  if (!current) redirect(dialog("password", "&error=current"));
  if (next.length < 8 || !/\d/.test(next)) redirect(dialog("password", "&error=rules"));
  if (next !== again) redirect(dialog("password", "&error=match"));
  if (next === current) redirect(dialog("password", "&error=same"));
  await saveSettings(session, { passwordChangedAt: new Date().toISOString() });
  revalidatePath(r.settings);
  redirect(`${r.settings}?saved=password`);
}

// Language and theme (V25). Only English and the light theme exist so far.
export async function savePreferences(form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const language = field(form, "language");
  const theme = field(form, "theme");
  await saveSettings(session, {
    ...(language === "en" || language === "si" || language === "ta" ? { language } : {}),
    ...(theme === "light" || theme === "dark" || theme === "system" ? { theme } : {}),
  });
  revalidatePath(r.settings);
  redirect(r.settings);
}

// "Unblock" (V103): their chat opens again; nothing else changes.
export async function unblock(organiserId: string) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  if (state) {
    await setBlocked(session, state.blocked.filter((b) => b.id !== organiserId));
    for (const c of state.conversations.filter((x) => x.organiserId === organiserId && x.blocked)) {
      await saveConversation(session, { ...c, blocked: false, blockedAt: undefined });
    }
  }
  revalidatePath(r.blocked);
  revalidatePath(r.messages);
  redirect(r.blocked);
}
