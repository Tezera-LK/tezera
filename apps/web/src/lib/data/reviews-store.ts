import "server-only";
import { sampleReceivedReviews } from "@/lib/data/portal-samples";
import { newestFirst } from "@/lib/format";
import type { ReceivedReview, WrittenReview } from "@/lib/data/portal-types";

// STAND-IN for reviews (EN-03) while there's no backend: the reviews of the organiser, with
// their replies and reports, and the reviews the organiser wrote. Kept in the dev server's
// memory like event-store.ts; only lib/data/portal.ts uses it, and only in `next dev`.

type Reviews = { received: ReceivedReview[]; written: WrittenReview[] };

const globalStore = globalThis as typeof globalThis & { __tezeraDevReviews?: Reviews };

function reviews(): Reviews {
  globalStore.__tezeraDevReviews ??= { received: sampleReceivedReviews(new Date()), written: [] };
  return globalStore.__tezeraDevReviews;
}

export function allStoredReceived(): ReceivedReview[] {
  return structuredClone(reviews().received).sort((a, b) => newestFirst(a.at, b.at));
}

export function updateStoredReceived(id: string, patch: Partial<ReceivedReview>): ReceivedReview | null {
  const list = reviews().received;
  const index = list.findIndex((r) => r.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], ...patch };
  return structuredClone(list[index]);
}

export function allStoredWritten(): WrittenReview[] {
  return structuredClone(reviews().written);
}

// Saves a written review or a draft, replacing an earlier one for the same task.
export function saveStoredWritten(review: WrittenReview) {
  const store = reviews();
  store.written = [...store.written.filter((w) => w.taskId !== review.taskId), structuredClone(review)];
}
