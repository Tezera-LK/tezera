"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getProviderState, markNotificationsRead, setFollowing, updatePost } from "@/lib/data/provider";
import { routes } from "@/lib/routes";

// Home feed actions (V06, V85): follow an organiser, like a post, comment on one; and marking
// notifications read (V23).

// Only addresses inside the portal, so a form can't send someone off the site.
const safe = (back: string) => (back.startsWith("/") && !back.startsWith("//") ? back : routes.dashboard);

// "Follow" and "Following" (V06's "Organisers to follow", V54).
export async function followOrganiser(organiserId: string, follow: boolean, back: string) {
  const session = await requireRole("vendor", "freelancer");
  await setFollowing(session, organiserId, follow);
  revalidatePath(routes.dashboard);
  redirect(safe(back));
}

// "Like" on a feed post (V06).
export async function likePost(postId: string, back: string) {
  const session = await requireRole("vendor", "freelancer");
  const post = (await getProviderState(session))?.posts.find((p) => p.id === postId);
  if (post) await updatePost(session, postId, { liked: !post.liked });
  revalidatePath(routes.dashboard);
  redirect(safe(back));
}

// "Post" in the comments dialog (V85).
export async function commentOnPost(postId: string, back: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const post = state?.posts.find((p) => p.id === postId);
  const text = String(form.get("comment") ?? "").trim();
  if (post && state && text) {
    const by = `${state.profile.name} · ${state.kind === "vendor" ? "Vendor" : "Freelancer"}`;
    await updatePost(session, postId, { comments: [...post.comments, { id: `c-${Date.now().toString(36)}`, by, text, at: new Date().toISOString() }] });
  }
  revalidatePath(routes.dashboard);
  redirect(safe(back));
}

// "Mark all read" on the notifications page (V23, F23).
export async function markAllRead(back: string) {
  const session = await requireRole("vendor", "freelancer");
  await markNotificationsRead(session);
  // the bell's red dot is in the portal layout, on every page
  revalidatePath("/", "layout");
  redirect(safe(back));
}
