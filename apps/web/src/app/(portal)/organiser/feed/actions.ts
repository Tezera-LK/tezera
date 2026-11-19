"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createFeedPost, getFeedPost, getMyEvent, getMyOrganiserProfile, updateFeedPost } from "@/lib/data/portal";
import { routes } from "@/lib/routes";

// The feed's actions: post an image, poster or reel (O26, O99), reply to a comment and hide one
// (O94). Files stay in the browser: until storage is connected (EN-03) only the file's name,
// type and size come here, so nothing big is sent and nothing is kept but the name.

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const MAX_REEL_BYTES = 100 * 1024 * 1024;
const MAX_REEL_SECONDS = 60;

// "Post" and "Post when ready".
export async function createPost(form: FormData) {
  const session = await requireRole("organiser");
  const reel = field(form, "kind") === "reel";
  const back = (error: string) => redirect(`${routes.feed}?${reel ? "type=reel&" : ""}error=${error}`);

  const fileName = field(form, "fileName");
  const fileType = field(form, "fileType");
  const size = Number(field(form, "fileSize"));
  const seconds = Number(field(form, "duration"));
  const caption = field(form, "caption");
  if (!fileName) back("file");
  if (reel && (!fileType.startsWith("video/") || size > MAX_REEL_BYTES || seconds > MAX_REEL_SECONDS)) back("reel");
  if (!reel && !fileType.startsWith("image/")) back("image");
  if (!caption) back("caption");

  // a post links to one of the organiser's own events, or to none
  const eventId = field(form, "event");
  const event = eventId ? await getMyEvent(session, eventId) : null;
  const cover = Number(field(form, "cover"));

  const result = await createFeedPost(session, {
    kind: reel ? "reel" : "image",
    eventId: event?.id ?? null,
    caption,
    fileName,
    coverSeconds: reel && Number.isFinite(cover) ? cover : undefined,
    postedAt: new Date().toISOString(),
    likes: 0,
    views: 0,
    clicks: 0,
    comments: [],
  });
  if (!result.ok) back("save");
  revalidatePath(routes.feed);
  revalidatePath(routes.analytics);
  redirect(`${routes.feed}?posted=1`);
}

// "Post" in the comments dialog (O94): the organiser's reply, shown as theirs.
export async function postComment(postId: string, form: FormData) {
  const session = await requireRole("organiser");
  const post = await getFeedPost(session, postId);
  if (!post) redirect(routes.feed);
  const text = field(form, "text");
  const open = `${routes.feed}?comments=${encodeURIComponent(postId)}`;
  if (!text) redirect(`${open}&error=empty`);

  const profile = await getMyOrganiserProfile(session);
  const comment = { id: `cm-${Date.now().toString(36)}`, by: profile?.name ?? "You", text, at: new Date().toISOString(), mine: true, hidden: false };
  await updateFeedPost(session, postId, { comments: [...post.comments, comment] });
  revalidatePath(routes.feed);
  redirect(open);
}

// "Hide" and "Show" on someone else's comment (O94). Hidden comments stay for the organiser.
export async function toggleComment(postId: string, commentId: string) {
  const session = await requireRole("organiser");
  const post = await getFeedPost(session, postId);
  if (!post) redirect(routes.feed);
  await updateFeedPost(session, postId, {
    comments: post.comments.map((c) => (c.id === commentId && !c.mine ? { ...c, hidden: !c.hidden } : c)),
  });
  revalidatePath(routes.feed);
  redirect(`${routes.feed}?comments=${encodeURIComponent(postId)}`);
}
