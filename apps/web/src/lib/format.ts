// Dates are always shown in Sri Lanka time, whatever time zone the server runs in.
// EN-07-T4 (translations) will pick the locale per user; English for now.
const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Asia/Colombo",
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

// ["Kandy", "Colombo", "Galle"] → "Kandy, Colombo and Galle"
const list = new Intl.ListFormat("en-GB", { type: "conjunction" });

export function formatList(items: string[]): string {
  return list.format(items);
}

// ---------- Portal dates and numbers (Figma's formats) ----------
// All in Sri Lanka time, like formatDateTime above.
const zone = "Asia/Colombo";
const dayKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: zone });
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: zone });
const hourOnly = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: zone });
const dayMonth = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: zone });
const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: zone });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: zone });
const count = new Intl.NumberFormat("en-GB");

// The calendar day in Sri Lanka, e.g. "2026-12-12", so two times can be compared by day.
export function colomboDay(iso: string | Date): string {
  return dayKey.format(new Date(iso));
}

// How many calendar days `iso` is after `now` in Sri Lanka: 0 = same day, 1 = tomorrow, -1 = yesterday.
export function daysFrom(now: Date, iso: string): number {
  const toUtcMidnight = (day: string) => Date.parse(`${day}T00:00:00Z`);
  return Math.round((toUtcMidnight(colomboDay(iso)) - toUtcMidnight(colomboDay(now))) / 86_400_000);
}

// "4:12 PM"
export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

// "4:12": the notifications dropdown leaves out AM and PM
export function formatClock(iso: string): string {
  return time
    .formatToParts(new Date(iso))
    .filter((part) => part.type !== "dayPeriod")
    .map((part) => part.value)
    .join("")
    .trim();
}

// "Sat 12 Dec"
export function formatDayMonth(iso: string): string {
  return dayMonth.format(new Date(iso));
}

// "5 Dec"
export function formatShortDate(iso: string): string {
  return shortDate.format(new Date(iso));
}

// When something happened, as short as it can be: today "4:12 PM" (or "4:12" when compact),
// in the last six days "Mon", before that "2 Oct".
export function formatWhen(iso: string, now: Date, compact = false): string {
  const days = daysFrom(now, iso);
  if (days === 0) return compact ? formatClock(iso) : formatTime(iso);
  if (days >= -6 && days < 0) return weekday.format(new Date(iso));
  return shortDate.format(new Date(iso));
}

// When an event starts, as the dashboard's card says it: "Tonight" (today from 5 PM), "Today",
// "Tomorrow", otherwise "Sat 12 Dec".
export function formatStartsLabel(iso: string, now: Date): string {
  const days = daysFrom(now, iso);
  if (days === 0) return Number(hourOnly.format(new Date(iso))) >= 17 ? "Tonight" : "Today";
  if (days === 1) return "Tomorrow";
  return formatDayMonth(iso);
}

// 1284 → "1,284"
export function formatCount(n: number): string {
  return count.format(n);
}

// Sorts by time, newest or oldest first. Times are compared as dates, not text: samples are
// written "…+05:30" and new records "…Z", so comparing the text would put them in the wrong order.
// A missing time sorts last.
const instant = (iso: string | null | undefined) => (iso ? Date.parse(iso) : Number.NEGATIVE_INFINITY);
export const newestFirst = (a: string | null | undefined, b: string | null | undefined) => instant(b) - instant(a);
export const oldestFirst = (a: string | null | undefined, b: string | null | undefined) => instant(a) - instant(b);
