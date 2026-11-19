import "server-only";
import { sampleManagedEvents } from "@/lib/data/portal-samples";
import type { EventDraft, ManagedEvent } from "@/lib/data/portal-types";

// STAND-IN for the Event model (EN-03, PG-05) while there's no backend: the organiser's events,
// kept in the dev server's memory so creating, publishing and editing work end to end in `next dev`.
//
// - Only used in `next dev`; lib/data/portal.ts never calls it in a production build.
// - Everything resets when the dev server restarts. Nothing is written to disk.
// - Kept on globalThis, because Next reloads changed modules in dev and a module-level variable
//   would be emptied on every edit.
//
// Phase B deletes this file: lib/data/portal.ts then reads and writes Amplify Data instead.

const globalStore = globalThis as typeof globalThis & { __tezeraDevEvents?: ManagedEvent[] };

function events(): ManagedEvent[] {
  globalStore.__tezeraDevEvents ??= sampleManagedEvents(new Date());
  return globalStore.__tezeraDevEvents;
}

// Every event in the store, as copies, so a caller can't change the store by accident.
export function allStoredEvents(): ManagedEvent[] {
  return events().map((event) => structuredClone(event));
}

export function findStoredEvent(id: string): ManagedEvent | null {
  const event = events().find((e) => e.id === id);
  return event ? structuredClone(event) : null;
}

// "18:00" on "2026-12-12" in Sri Lanka time → "2026-12-12T18:00:00+05:30"; null if either is missing.
export function toIso(date: string, time: string): string | null {
  return date && time ? `${date}T${time}:00+05:30` : null;
}

// The ISO start and end for a draft. An end time earlier than the start means the event runs
// past midnight, so the end moves to the next day.
export function startAndEnd(draft: Pick<EventDraft, "date" | "startTime" | "endTime">) {
  const startsAt = toIso(draft.date, draft.startTime);
  let endsAt = toIso(draft.date, draft.endTime);
  if (startsAt && endsAt && endsAt <= startsAt) {
    endsAt = new Date(Date.parse(endsAt) + 86_400_000).toISOString();
  }
  return { startsAt, endsAt };
}

// An id from the title: "Colombo Music Fest" → "evt-colombo-music-fest-k3f9"
function newId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `evt-${slug || "event"}-${Math.random().toString(36).slice(2, 6)}`;
}

// Adds a new event as a draft or published, and returns it.
export function insertStoredEvent(draft: EventDraft, publish: boolean): ManagedEvent {
  const now = new Date().toISOString();
  const event: ManagedEvent = {
    ...draft,
    ...startAndEnd(draft),
    id: newId(draft.title),
    status: publish ? "published" : "draft",
    going: 0,
    interested: 0,
    bookings: null,
    stalls: null,
    liveStatus: null,
    publishedAt: publish ? now : null,
    editedAt: now,
    unpublishedReason: null,
    postponedFrom: null,
    cancelReason: null,
    announcements: [],
    questions: [],
  };
  events().unshift(event);
  return structuredClone(event);
}

// Changes some fields of one event and returns the result; null if there's no such event.
// startsAt and endsAt follow date and times whenever those change.
export function updateStoredEvent(id: string, patch: Partial<ManagedEvent>): ManagedEvent | null {
  const list = events();
  const index = list.findIndex((e) => e.id === id);
  if (index === -1) return null;
  const merged = { ...list[index], ...patch, editedAt: new Date().toISOString() };
  const updated = { ...merged, ...startAndEnd(merged) };
  list[index] = updated;
  return structuredClone(updated);
}
