import "server-only";
import { sampleCommunities2, sampleConversations, sampleThreads } from "@/lib/data/portal-samples";
import type { Community, CommunityThread, Conversation } from "@/lib/data/portal-types";

// STAND-IN for messages, communities and threads (EN-03, EP-09) while there's no backend, kept in
// the dev server's memory like event-store.ts. Only lib/data/portal.ts uses it, and only in
// `next dev`.

type People = { conversations: Conversation[]; communities: Community[]; threads: CommunityThread[] };

const globalStore = globalThis as typeof globalThis & { __tezeraDevPeople?: People };

function people(): People {
  const now = new Date();
  globalStore.__tezeraDevPeople ??= {
    conversations: sampleConversations(now),
    communities: structuredClone(sampleCommunities2),
    threads: sampleThreads(now),
  };
  return globalStore.__tezeraDevPeople;
}

export const storedConversations = () => structuredClone(people().conversations);
export const storedCommunities = () => structuredClone(people().communities);
export const storedThreads = () => structuredClone(people().threads);

// Replaces one record by id, or adds it when it's new.
function upsert<T extends { id: string }>(list: T[], item: T) {
  const index = list.findIndex((x) => x.id === item.id);
  if (index === -1) list.push(structuredClone(item));
  else list[index] = structuredClone(item);
}

export const saveStoredConversation = (c: Conversation) => upsert(people().conversations, c);
export const saveStoredCommunity = (c: Community) => upsert(people().communities, c);
export const saveStoredThread = (t: CommunityThread) => upsert(people().threads, t);
