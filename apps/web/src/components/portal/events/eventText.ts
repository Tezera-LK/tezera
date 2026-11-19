// Words and formats shared by the organiser's event pages (My events, the event's own pages,
// the published and preview pages), in one place for the translation files (EN-07-T4).
import type { ManagedEvent, ManagedEventStatus } from "@/lib/data/portal-types";
import { formatCount, formatDayMonth, formatTime } from "@/lib/format";
import type { ChipTone } from "../Chip";

export const EVENT_STATUS: Record<ManagedEventStatus, { label: string; tone: ChipTone }> = {
  published: { label: "Published", tone: "good" },
  postponed: { label: "Postponed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  draft: { label: "Draft", tone: "soft" },
  unpublished: { label: "Unpublished by an admin", tone: "danger" },
};

export const AGE_LABEL: Record<ManagedEvent["ageRating"], string> = {
  all: "All ages",
  "18+": "18+",
  "21+": "21+",
};

// True once the event has finished (its end, or its start when it has no end, is in the past).
export function hasEnded(event: ManagedEvent, now = Date.now()): boolean {
  const end = event.endsAt ?? event.startsAt;
  return end !== null && Date.parse(end) < now;
}

// "Sat 12 Dec · 6:00 PM" — the date and start time, or "No date yet" for a draft without one.
export function whenShort(event: ManagedEvent): string {
  return event.startsAt ? `${formatDayMonth(event.startsAt)} · ${formatTime(event.startsAt)}` : "No date yet";
}

// "Sat 12 Dec · 6:00 PM – 11:30 PM"
export function whenLong(event: ManagedEvent): string {
  if (!event.startsAt) return "No date yet";
  return event.endsAt ? `${whenShort(event)} – ${formatTime(event.endsAt)}` : whenShort(event);
}

// "1,284 going · 3,402 interested"
export function turnout(event: ManagedEvent): string {
  return `${formatCount(event.going)} going · ${formatCount(event.interested)} interested`;
}

// "LKR 3,500", "Free entry", or "" while a paid event has no price yet
export function entryLabel(event: Pick<ManagedEvent, "entry">): string {
  if (event.entry.kind === "free") return "Free entry";
  return event.entry.priceLkr ? `LKR ${formatCount(event.entry.priceLkr)}` : "";
}

// "1.2k" for 1,200; plain numbers under 1,000
export function compactCount(n: number): string {
  return n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n);
}
