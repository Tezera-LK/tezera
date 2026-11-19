import "server-only";
import { sampleFeedPosts } from "@/lib/data/portal-samples";
import { newestFirst } from "@/lib/format";
import type { FeedPost } from "@/lib/data/portal-types";

// STAND-IN for the organiser's feed posts (EN-03) while there's no backend, kept in the dev
// server's memory like event-store.ts. Only lib/data/portal.ts uses it, and only in `next dev`.

const globalStore = globalThis as typeof globalThis & { __tezeraDevFeed?: FeedPost[] };

function posts(): FeedPost[] {
  globalStore.__tezeraDevFeed ??= sampleFeedPosts(new Date());
  return globalStore.__tezeraDevFeed;
}

// Every post, newest first, as copies.
export function allStoredPosts(): FeedPost[] {
  return structuredClone(posts()).sort((a, b) => newestFirst(a.postedAt, b.postedAt));
}

export function insertStoredPost(post: Omit<FeedPost, "id">): FeedPost {
  const saved = { ...post, id: `post-${Date.now().toString(36)}` };
  posts().push(saved);
  return structuredClone(saved);
}

export function updateStoredPost(id: string, patch: Partial<FeedPost>): FeedPost | null {
  const list = posts();
  const index = list.findIndex((p) => p.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], ...patch };
  return structuredClone(list[index]);
}
