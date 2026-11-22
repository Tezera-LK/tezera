"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getReceivedReviews, getReviewTask, saveWrittenReview, updateReceivedReview } from "@/lib/data/portal";
import { REPLY_MAX, REPORT_REASONS, REVIEW_PARTS } from "@/lib/reviews";
import { routes } from "@/lib/routes";

// Review actions: reply to a review (O46), report one (O47), and write one (O30, O48).

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// Back to the tab the review is on.
async function tabOf(session: Awaited<ReturnType<typeof requireRole>>, reviewId: string): Promise<string> {
  const found = (await getReceivedReviews(session))?.reviews.find((r) => r.id === reviewId);
  return found?.from === "consumer" ? `${routes.reviews}?tab=consumers` : routes.reviews;
}

// "Post reply" (O46). One reply per review; it shows under the review.
export async function replyToReview(reviewId: string, form: FormData) {
  const session = await requireRole("organiser");
  const back = await tabOf(session, reviewId);
  const text = field(form, "reply");
  const join = back.includes("?") ? "&" : "?";
  if (!text || text.length > REPLY_MAX) redirect(`${back}${join}reply=${encodeURIComponent(reviewId)}&error=reply`);
  await updateReceivedReview(session, reviewId, { reply: text });
  revalidatePath(routes.reviews);
  redirect(back);
}

// "Send report" (O47). An admin checks it (EN-08); a low rating alone isn't a reason.
export async function reportReview(reviewId: string, form: FormData) {
  const session = await requireRole("organiser");
  const back = await tabOf(session, reviewId);
  const reason = REPORT_REASONS.find(([value]) => value === field(form, "reason"))?.[1];
  const join = back.includes("?") ? "&" : "?";
  if (!reason) redirect(`${back}${join}report=${encodeURIComponent(reviewId)}&error=reason`);
  await updateReceivedReview(session, reviewId, { reported: { reason, note: field(form, "note"), at: new Date().toISOString() } });
  revalidatePath(routes.reviews);
  redirect(back);
}

// "Submit review" and "Save for later" (O30). Submitting needs every score; a draft doesn't.
export async function submitReview(taskId: string, form: FormData) {
  const session = await requireRole("organiser");
  const task = await getReviewTask(session, taskId);
  if (!task) redirect(routes.reviews);
  const submit = field(form, "intent") !== "save";

  const scores: Record<string, number> = {};
  for (const part of REVIEW_PARTS) {
    const value = Number(field(form, part));
    if (value >= 1 && value <= 5) scores[part] = value;
  }
  if (submit && Object.keys(scores).length < REVIEW_PARTS.length) {
    redirect(`${routes.writeReview(taskId)}?error=scores`);
  }

  await saveWrittenReview(session, { taskId, about: task.name, scores, text: field(form, "text"), at: new Date().toISOString(), submitted: submit });
  revalidatePath(routes.reviews);
  redirect(submit ? routes.reviewSubmitted(taskId) : `${routes.reviews}?saved=1`);
}
