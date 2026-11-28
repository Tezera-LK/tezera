"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getProviderState, saveCommunity, saveThread } from "@/lib/data/provider";
import { newProviderId } from "@/lib/data/provider-store";
import { routes } from "@/lib/routes";

// Community actions for vendors and freelancers (V24, V94–V97): vote, reply, start a thread,
// join or leave a community, and report a thread.

const r = routes.vendorArea;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// only addresses inside the vendor area, so a form can't send someone off the site
const safe = (back: string) => (back.startsWith("/vendor/") ? back : r.community);

// ▲ on a thread or a reply: upvotes, or takes the upvote back.
export async function vote(threadId: string, replyId: string | null, back: string) {
  const session = await requireRole("vendor", "freelancer");
  const thread = (await getProviderState(session))?.threads.find((t) => t.id === threadId);
  if (thread) {
    if (replyId) {
      const replies = thread.replies.map((x) => (x.id === replyId ? { ...x, voted: !x.voted, upvotes: x.upvotes + (x.voted ? -1 : 1) } : x));
      await saveThread(session, { ...thread, replies });
    } else {
      await saveThread(session, { ...thread, voted: !thread.voted, upvotes: thread.upvotes + (thread.voted ? -1 : 1) });
    }
  }
  revalidatePath(r.community);
  redirect(safe(back));
}

// "Reply" on a thread (V94).
export async function replyToThread(threadId: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const thread = state?.threads.find((t) => t.id === threadId);
  const text = field(form, "text");
  if (!state || !thread) redirect(r.community);
  if (!text) redirect(`${r.thread(threadId)}?error=reply#reply`);
  const reply = { id: newProviderId("r"), author: state.profile.name, authorRole: state.kind === "vendor" ? "Vendor" : "Freelancer", verified: state.verification.status === "approved", at: new Date().toISOString(), text, upvotes: 0 };
  await saveThread(session, { ...thread, replies: [...thread.replies, reply], replyCount: thread.replyCount + 1 });
  revalidatePath(r.community);
  redirect(r.thread(threadId));
}

// "Post thread" (V95): into a community the provider joined, or onto an event's board.
export async function newThread(form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  if (!state) redirect(r.community);
  const where = field(form, "where");
  const title = field(form, "title");
  const body = field(form, "body");
  const community = state.communities.find((c) => c.id === where && c.joined);
  const event = state.events.find((e) => e.id === where);
  if (!(community || event) || !title) redirect(`${r.community}?dialog=new&error=fields&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`);
  const thread = {
    id: newProviderId("th"),
    eventId: event?.id ?? null,
    communityId: community?.id ?? null,
    title,
    body,
    author: state.profile.name,
    authorRole: state.kind === "vendor" ? "Vendor" : "Freelancer",
    verified: state.verification.status === "approved",
    at: new Date().toISOString(),
    upvotes: 0,
    replies: [],
    replyCount: 0,
    pinned: false,
    linkedEventId: null,
    reported: false,
  };
  await saveThread(session, thread);
  revalidatePath(r.community);
  redirect(r.thread(thread.id));
}

// "Join" and "Joined ✓" (V96).
export async function setJoined(communityId: string, join: boolean, back: string) {
  const session = await requireRole("vendor", "freelancer");
  const community = (await getProviderState(session))?.communities.find((c) => c.id === communityId);
  if (community) await saveCommunity(session, { ...community, joined: join, members: community.members + (join ? 1 : -1) });
  revalidatePath(r.community);
  redirect(safe(back));
}

// "Report this thread" (V94): an admin checks it against the rules (EN-08).
export async function reportThread(threadId: string) {
  const session = await requireRole("vendor", "freelancer");
  const thread = (await getProviderState(session))?.threads.find((t) => t.id === threadId);
  if (thread) await saveThread(session, { ...thread, reported: true });
  revalidatePath(r.community);
  redirect(r.thread(threadId));
}
