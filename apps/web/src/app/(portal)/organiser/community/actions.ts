"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getMyEvent, getMyOrganiserProfile, getThread, listCommunities, saveCommunity, saveThread } from "@/lib/data/portal";
import { routes } from "@/lib/routes";

// Community actions (O16, O24, O25, O93): post a thread, reply, upvote, report, join and leave.
// Everything is recorded here; telling people is EP-09.

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function refresh(threadId?: string) {
  revalidatePath(routes.community);
  if (threadId) revalidatePath(routes.thread(threadId));
}

// The organiser as an author: their name, "Organiser" and their badge.
async function me(session: Awaited<ReturnType<typeof requireRole>>) {
  const profile = await getMyOrganiserProfile(session);
  return { author: profile?.name ?? "You", authorRole: "Organiser", verified: profile?.verified ?? false };
}

// "Post thread" (O93). "Post in" is "event:<id>" for an event's board or "community:<id>".
export async function createThread(form: FormData) {
  const session = await requireRole("organiser");
  const where = field(form, "in");
  const title = field(form, "title");
  const body = field(form, "body");
  const back = (error: string) => redirect(`${routes.community}?dialog=new&in=${encodeURIComponent(where)}&error=${error}`);

  const [kind, id] = where.split(":");
  const event = kind === "event" ? await getMyEvent(session, id) : null;
  const community = kind === "community" ? (await listCommunities(session)).find((c) => c.id === id && c.joined) : null;
  if (!event && !community) back("where");
  if (!title) back("title");

  const linked = field(form, "link");
  const linkedEvent = linked ? await getMyEvent(session, linked) : null;
  const threadId = `th-${Date.now().toString(36)}`;
  await saveThread(session, {
    id: threadId,
    eventId: event?.id ?? null,
    communityId: community?.id ?? null,
    title,
    body,
    ...(await me(session)),
    at: new Date().toISOString(),
    upvotes: 0,
    replies: [],
    replyCount: 0,
    pinned: false,
    linkedEventId: linkedEvent?.id ?? null,
    reported: false,
  });
  refresh();
  if (event) revalidatePath(routes.eventBoard(event.id));
  redirect(routes.thread(threadId));
}

// "Reply" under a thread (O25).
export async function replyToThread(threadId: string, form: FormData) {
  const session = await requireRole("organiser");
  const thread = await getThread(session, threadId);
  if (!thread) redirect(routes.community);
  const text = field(form, "text");
  if (!text) redirect(`${routes.thread(threadId)}?error=reply#reply`);
  const reply = { id: `rp-${Date.now().toString(36)}`, ...(await me(session)), at: new Date().toISOString(), text, upvotes: 0 };
  await saveThread(session, { ...thread, replies: [...thread.replies, reply], replyCount: thread.replyCount + 1 });
  refresh(threadId);
  redirect(`${routes.thread(threadId)}#${reply.id}`);
}

// The ▲ on a thread or a reply: one upvote from the organiser, again to take it back.
export async function vote(threadId: string, replyId: string | null, back: string) {
  const session = await requireRole("organiser");
  const thread = await getThread(session, threadId);
  if (!thread) redirect(routes.community);
  if (replyId) {
    thread.replies = thread.replies.map((r) => (r.id === replyId ? { ...r, voted: !r.voted, upvotes: r.upvotes + (r.voted ? -1 : 1) } : r));
  } else {
    thread.upvotes += thread.voted ? -1 : 1;
    thread.voted = !thread.voted;
  }
  await saveThread(session, thread);
  refresh(threadId);
  redirect(back);
}

// "Report" on a thread (O25): an admin checks it (EN-08).
export async function reportThread(threadId: string) {
  const session = await requireRole("organiser");
  const thread = await getThread(session, threadId);
  if (!thread) redirect(routes.community);
  await saveThread(session, { ...thread, reported: true });
  refresh(threadId);
  redirect(routes.thread(threadId));
}

// "Join" and "Leave" on a community (O24, O25).
export async function setMembership(communityId: string, join: boolean, back: string) {
  const session = await requireRole("organiser");
  const community = (await listCommunities(session)).find((c) => c.id === communityId);
  if (!community) redirect(routes.community);
  await saveCommunity(session, { ...community, joined: join, members: community.members + (join === community.joined ? 0 : join ? 1 : -1) });
  refresh();
  redirect(back);
}
