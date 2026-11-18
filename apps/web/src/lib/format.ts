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
