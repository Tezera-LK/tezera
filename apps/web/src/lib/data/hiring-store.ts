import "server-only";
import { sampleHiring } from "@/lib/data/portal-samples";
import type { BookingRequest, JobPost } from "@/lib/data/portal-types";

// STAND-IN for the booking request and job post records (EN-03) while there's no backend, kept
// in the dev server's memory like event-store.ts. Only lib/data/portal.ts uses it, and only in
// `next dev`. Resets when the dev server restarts.

type Hiring = { requests: BookingRequest[]; jobs: JobPost[] };

const globalStore = globalThis as typeof globalThis & { __tezeraDevHiring?: Hiring };

function hiring(): Hiring {
  globalStore.__tezeraDevHiring ??= sampleHiring(new Date());
  return globalStore.__tezeraDevHiring;
}

// "req-k3f9a" — short and unique enough for a dev store
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

// Every booking request, as copies.
export function allStoredRequests(): BookingRequest[] {
  return structuredClone(hiring().requests);
}

export function allStoredJobs(): JobPost[] {
  return structuredClone(hiring().jobs);
}

export function insertStoredRequest(request: Omit<BookingRequest, "id">): BookingRequest {
  const saved = { ...request, id: newId("req") };
  hiring().requests.push(saved);
  return structuredClone(saved);
}

export function updateStoredRequest(id: string, patch: Partial<BookingRequest>): BookingRequest | null {
  const list = hiring().requests;
  const index = list.findIndex((r) => r.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], ...patch };
  return structuredClone(list[index]);
}

export function insertStoredJob(job: Omit<JobPost, "id">): JobPost {
  const saved = { ...job, id: newId("job") };
  hiring().jobs.push(saved);
  return structuredClone(saved);
}

export function updateStoredJob(id: string, patch: Partial<JobPost>): JobPost | null {
  const list = hiring().jobs;
  const index = list.findIndex((j) => j.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], ...patch };
  return structuredClone(list[index]);
}
