"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { findConversation, getProviderState, saveConversation, setBlocked } from "@/lib/data/provider";
import type { ChatMessage } from "@/lib/data/portal-types";
import type { ProviderConversation, ProviderState } from "@/lib/data/provider-types";
import { routes } from "@/lib/routes";

// Messages actions for vendors and freelancers (V22, V90–V92), like the organiser's
// (organiser/messages/actions.ts). Delivery to the other side is EP-09; messages are only recorded
// here. Files stay in the browser until storage is connected (EN-03): only their names come here.

const r = routes.vendorArea;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const open = (id: string, extra = "") => `${r.messages}?c=${encodeURIComponent(id)}${extra}`;

// "Send" (V22) and sending a file (V90).
export async function sendMessage(key: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const conversation = state && findConversation(state, key);
  if (!conversation) redirect(r.messages);
  if (conversation.blocked) redirect(open(conversation.id));
  const text = field(form, "text");
  const fileName = field(form, "fileName");
  if (!text && !fileName) redirect(open(conversation.id, form.has("fileName") ? "&dialog=attach&error=file" : ""));
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
  revalidatePath(r.messages);
  redirect(open(conversation.id));
}

// Blocks the organiser: no messages or booking requests from them; bookings stay (V91).
async function block(session: Awaited<ReturnType<typeof requireRole>>, state: ProviderState, conversation: ProviderConversation) {
  const at = new Date().toISOString();
  await saveConversation(session, { ...conversation, blocked: true, blockedAt: at });
  if (!state.blocked.some((b) => b.id === conversation.organiserId)) {
    await setBlocked(session, [...state.blocked, { id: conversation.organiserId, name: conversation.name, at }]);
  }
}

// "Block" (V91). Unblocking is in Settings (V103).
export async function blockConversation(id: string) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const conversation = state && findConversation(state, id);
  if (!state || !conversation) redirect(r.messages);
  await block(session, state, conversation);
  revalidatePath(r.messages);
  redirect(open(conversation.id));
}

const REASONS = ["Scam or fake event", "Harassment or abuse", "Asked to pay outside agreed terms", "Something else"];

// "Send report" (V92): an admin looks at the chat and the booking history (EN-08).
export async function reportConversation(id: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const conversation = state && findConversation(state, id);
  if (!state || !conversation) redirect(r.messages);
  const reason = REASONS.find((x) => x === field(form, "reason"));
  if (!reason) redirect(open(conversation.id, "&dialog=report&error=reason"));
  await saveConversation(session, { ...conversation, reported: reason });
  if (form.get("block") === "yes" && !conversation.blocked) await block(session, state, { ...conversation, reported: reason });
  revalidatePath(r.messages);
  redirect(open(conversation.id));
}
