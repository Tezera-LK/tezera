"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getProviderState, updateReview, updateReviewTask } from "@/lib/data/provider";
import { ORGANISER_REVIEW_PARTS, PROVIDER_REPORT_REASONS } from "@/lib/provider";
import { REPLY_MAX } from "@/lib/reviews";
import { routes } from "@/lib/routes";

// Review actions for vendors and freelancers: reply to a review (V99), report one (V100) and
// review an organiser (V20, V98).

const r = routes.vendorArea;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// "Post reply" (V99): one public reply per review.
export async function replyToReview(reviewId: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const text = field(form, "reply");
  if (!text || text.length > REPLY_MAX) redirect(`${r.reviews}?reply=${reviewId}&error=reply`);
  await updateReview(session, reviewId, { reply: text });
  revalidatePath(r.reviews);
  redirect(r.reviews);
}

// "Send report" (V100). An admin hides it if it breaks the rules (EN-08).
export async function reportReview(reviewId: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const reason = PROVIDER_REPORT_REASONS.find((x) => x === field(form, "reason"));
  if (!reason) redirect(`${r.reviews}?report=${reviewId}&error=reason`);
  await updateReview(session, reviewId, { reported: { reason, note: field(form, "note"), at: new Date().toISOString() } });
  revalidatePath(r.reviews);
  redirect(r.reviews);
}

// "Submit review" (V20). Every score is needed; "Later" keeps nothing.
export async function reviewOrganiser(taskId: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const task = (await getProviderState(session))?.reviewTasks.find((t) => t.id === taskId);
  if (!task || task.submitted) redirect(r.reviews);
  const scores: Record<string, number> = {};
  for (const part of ORGANISER_REVIEW_PARTS) {
    const value = Number(field(form, part));
    if (value >= 1 && value <= 5) scores[part] = value;
  }
  if (Object.keys(scores).length < ORGANISER_REVIEW_PARTS.length) redirect(`${r.reviewOrganiser(taskId)}?error=scores&text=${encodeURIComponent(field(form, "text"))}`);
  await updateReviewTask(session, taskId, { submitted: { scores, text: field(form, "text"), at: new Date().toISOString() } });
  revalidatePath(r.reviews);
  redirect(r.reviewSent(taskId));
}
