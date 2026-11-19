"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getProvider, listConversations, saveConversation } from "@/lib/data/portal";
import type { ChatMessage, Conversation } from "@/lib/data/portal-types";
import { routes } from "@/lib/routes";

// Messages actions (O23, O90–O92). Delivery to the other side is EP-09; here messages are only
// recorded. Files stay in the browser until storage is connected (EN-03): only names come here.

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const open = (id: string, extra = "") => `${routes.messages}?c=${encodeURIComponent(id)}${extra}`;

// Finds the conversation, or starts one with a provider ("new:<providerId>", from a Message
// button on their profile, a quote or a booking).
async function conversationFor(session: Awaited<ReturnType<typeof requireRole>>, key: string): Promise<Conversation | null> {
  const all = await listConversations(session);
  if (!key.startsWith("new:")) return all.find((c) => c.id === key) ?? null;
  const providerId = key.slice(4);
  const existing = all.find((c) => c.providerId === providerId);
  if (existing) return existing;
  const provider = await getProvider(session, providerId);
  if (!provider) return null;
  return {
    id: `c-${Date.now().toString(36)}`,
    name: provider.name,
    kind: provider.kind,
    detail: [provider.role, provider.verified ? "Verified" : ""].filter(Boolean).join(" · "),
    providerId,
    unread: 0,
    blocked: false,
    reported: null,
    messages: [],
  };
}

// "Send" (O23) and "Send" in Attach a file (O90).
export async function sendMessage(key: string, form: FormData) {
  const session = await requireRole("organiser");
  const conversation = await conversationFor(session, key);
  if (!conversation) redirect(routes.messages);
  if (conversation.blocked) redirect(open(conversation.id));

  const text = field(form, "text");
  const fileName = field(form, "fileName");
  if (!text && !fileName) redirect(open(conversation.id, fileName === "" && form.has("fileName") ? "&dialog=attach&error=file" : ""));

  const extension = fileName.split(".").pop()?.toUpperCase() ?? "";
  const message: ChatMessage = {
    id: `m-${Date.now().toString(36)}`,
    mine: true,
    at: new Date().toISOString(),
    text,
    file: fileName ? { name: fileName, label: extension ? `File · ${extension}` : "File" } : null,
    image: false,
  };
  await saveConversation(session, { ...conversation, unread: 0, messages: [...conversation.messages, message] });
  revalidatePath(routes.messages);
  redirect(open(conversation.id));
}

// "Block" (O91): they can't message or quote; bookings with them stay. Unblocking is in Settings.
export async function blockConversation(id: string) {
  const session = await requireRole("organiser");
  const conversation = await conversationFor(session, id);
  if (!conversation) redirect(routes.messages);
  await saveConversation(session, { ...conversation, blocked: true, blockedAt: new Date().toISOString() });
  revalidatePath(routes.messages);
  revalidatePath(routes.blockedUsers);
  redirect(open(conversation.id));
}

const REASONS: Record<string, string> = {
  spam: "Spam or scam",
  abuse: "Harassment or abuse",
  outside: "Asking to pay outside the agreed terms",
  else: "Something else",
};

// "Send report" (O92): an admin looks at the conversation and the booking history (EN-08).
// "Also block them" blocks as well.
export async function reportConversation(id: string, form: FormData) {
  const session = await requireRole("organiser");
  const conversation = await conversationFor(session, id);
  if (!conversation) redirect(routes.messages);
  const reason = REASONS[field(form, "reason")];
  if (!reason) redirect(open(conversation.id, "&dialog=report&error=reason"));
  const block = !conversation.blocked && form.get("block") === "on";
  await saveConversation(session, { ...conversation, reported: reason, ...(block ? { blocked: true, blockedAt: new Date().toISOString() } : {}) });
  revalidatePath(routes.messages);
  redirect(open(conversation.id, "&sent=report"));
}
