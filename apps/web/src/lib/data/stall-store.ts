import "server-only";
import { sampleStallZones, sampleStalls } from "@/lib/data/portal-samples";
import type { EventStalls } from "@/lib/data/portal-types";

// STAND-IN for the stall records (EN-03) while there's no backend: each event's stall slots,
// applications and approved vendors, kept in the dev server's memory like event-store.ts.
// Only lib/data/portal.ts uses it, and only in `next dev`. Resets when the dev server restarts.

const globalStore = globalThis as typeof globalThis & { __tezeraDevStalls?: Record<string, EventStalls> };

function stalls(): Record<string, EventStalls> {
  globalStore.__tezeraDevStalls ??= sampleStalls(new Date());
  return globalStore.__tezeraDevStalls;
}

// One event's stalls, as a copy. An event nobody has opened slots for gets an empty record.
export function findStoredStalls(eventId: string): EventStalls {
  const found = stalls()[eventId];
  return structuredClone(
    found ?? { slots: [], applications: [], approved: [], collected: { paid: 0, amountLkr: 0 }, zones: sampleStallZones },
  );
}

// Replaces one event's stalls.
export function saveStoredStalls(eventId: string, record: EventStalls) {
  stalls()[eventId] = structuredClone(record);
}
