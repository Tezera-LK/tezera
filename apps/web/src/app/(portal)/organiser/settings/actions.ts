"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getAccountSettings, listConversations, saveAccountSettings, saveConversation } from "@/lib/data/portal";
import { routes } from "@/lib/routes";

// Settings actions (O32, O95–O97). Email, phone and password belong to sign-in (EN-04,
// Cognito): until it's connected these check the form and record the change, and no password is
// kept anywhere.

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const dialog = (name: string, extra = "") => `${routes.settings}?dialog=${name}${extra}`;

// The notification switches (O32). Bookings, quotes and verification are always on.
export async function saveNotifications(form: FormData) {
  const session = await requireRole("organiser");
  const on = (key: string) => form.get(key) === "on";
  await saveAccountSettings(session, {
    notify: { bookings: true, messages: on("messages"), stalls: on("stalls"), questions: on("questions"), likes: on("likes") },
  });
  revalidatePath(routes.settings);
  redirect(`${routes.settings}?saved=notifications`);
}

// "Send code" (O95): a code goes to the new email or phone (EN-04). The password confirms it's
// the account holder.
export async function startContactChange(form: FormData) {
  const session = await requireRole("organiser");
  const next = field(form, "contact");
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next);
  const isPhone = /^\+?[\d\s-]{9,15}$/.test(next);
  if (!isEmail && !isPhone) redirect(dialog("contact", "&error=contact"));
  if (!field(form, "password")) redirect(dialog("contact", "&error=password"));
  await saveAccountSettings(session, { pendingContact: next });
  revalidatePath(routes.settings);
  redirect(dialog("contact", "&step=code"));
}

// The code from the email or text (O95's second step). In `next dev` any six digits do, as no
// code is really sent.
export async function confirmContactChange(form: FormData) {
  const session = await requireRole("organiser");
  const settings = await getAccountSettings(session);
  if (!settings?.pendingContact) redirect(dialog("contact"));
  if (!/^\d{6}$/.test(field(form, "code"))) redirect(dialog("contact", "&step=code&error=code"));
  await saveAccountSettings(session, { email: settings.pendingContact, pendingContact: null });
  revalidatePath(routes.settings);
  redirect(`${routes.settings}?saved=contact`);
}

// "Change password" (O96). The rules match sign-up's (EN-04): 8 or more characters with a
// number. Only the date of the change is recorded.
export async function changePassword(form: FormData) {
  const session = await requireRole("organiser");
  const current = field(form, "current");
  const next = String(form.get("next") ?? "");
  const again = String(form.get("again") ?? "");
  if (!current) redirect(dialog("password", "&error=current"));
  if (next.length < 8 || !/\d/.test(next)) redirect(dialog("password", "&error=rules"));
  if (next !== again) redirect(dialog("password", "&error=match"));
  if (next === current) redirect(dialog("password", "&error=same"));
  await saveAccountSettings(session, { passwordChangedAt: new Date().toISOString() });
  revalidatePath(routes.settings);
  redirect(`${routes.settings}?saved=password`);
}

// "Unblock" (O97).
export async function unblock(conversationId: string) {
  const session = await requireRole("organiser");
  const conversation = (await listConversations(session)).find((c) => c.id === conversationId);
  if (conversation) await saveConversation(session, { ...conversation, blocked: false, blockedAt: undefined });
  revalidatePath(routes.blockedUsers);
  revalidatePath(routes.settings);
  revalidatePath(routes.messages);
  redirect(routes.blockedUsers);
}

// Language and theme (O32). Only English and the light theme exist so far; the others are
// recorded but not shown yet.
export async function savePreferences(form: FormData) {
  const session = await requireRole("organiser");
  const language = field(form, "language");
  const theme = field(form, "theme");
  await saveAccountSettings(session, {
    ...(language === "en" || language === "si" || language === "ta" ? { language } : {}),
    ...(theme === "light" || theme === "dark" || theme === "system" ? { theme } : {}),
  });
  revalidatePath(routes.settings);
  redirect(routes.settings);
}
