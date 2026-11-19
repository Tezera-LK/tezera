// Reading and checking the create and edit event forms (Figma O08, O54).
// Used by the server actions; the form's checklist (EventForm.tsx) uses `checklist` to show the
// same rules while the organiser types.
import type { AgeRating, EventDraft } from "@/lib/data/portal-types";

// The field names the form sends; one place, so the form and the parser can't drift apart.
export const FIELD = {
  title: "title",
  category: "category",
  ageRating: "ageRating",
  date: "date",
  startTime: "startTime",
  endTime: "endTime",
  venueName: "venueName",
  address: "address",
  description: "description",
  lineupTime: "lineupTime",
  lineupAct: "lineupAct",
  entry: "entry",
  price: "price",
  ticketUrl: "ticketUrl",
  dressCode: "dressCode",
  bring: "bring",
  parking: "parking",
  rules: "rules",
  foodPrices: "foodPrices",
  ifRains: "ifRains",
  // which button was pressed: "draft", "publish" or "preview"
  intent: "intent",
} as const;

export type Intent = "draft" | "publish" | "preview";

// The categories in the form's list. "Music · concert" is the Figma example.
export const CATEGORIES = [
  "Music · concert",
  "Music · club night",
  "Food · festival",
  "Arts · exhibition",
  "Theatre · show",
  "Sport · tournament",
  "Community · meetup",
  "Business · conference",
  "Family · kids",
  "Other",
];

export const AGE_RATINGS: { value: AgeRating; label: string }[] = [
  { value: "all", label: "All ages" },
  { value: "18+", label: "18+" },
  { value: "21+", label: "21+" },
];

// The fields that can show an error, and the field names of everything else
export type FieldErrors = Partial<Record<"title" | "category" | "date" | "startTime" | "venueName" | "price", string>>;

export const EMPTY_DRAFT: EventDraft = {
  title: "",
  category: "",
  ageRating: "all",
  date: "",
  startTime: "",
  endTime: "",
  venueName: "",
  address: "",
  description: "",
  lineup: [],
  entry: { kind: "free" },
  know: { dressCode: "", bring: "", parking: "", rules: "", foodPrices: "", ifRains: "" },
};

// One text field from the form, trimmed; "" when it's missing.
function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// Turns the submitted form into an EventDraft. Line-up rows with no act are dropped.
export function readEventForm(form: FormData): { draft: EventDraft; intent: Intent } {
  const times = form.getAll(FIELD.lineupTime).map(String);
  const acts = form.getAll(FIELD.lineupAct).map((value) => String(value).trim());
  const age = text(form, FIELD.ageRating);
  const intent = text(form, FIELD.intent);
  const price = Number(text(form, FIELD.price).replace(/[^\d]/g, ""));

  const draft: EventDraft = {
    title: text(form, FIELD.title),
    category: text(form, FIELD.category),
    ageRating: age === "18+" || age === "21+" ? age : "all",
    date: text(form, FIELD.date),
    startTime: text(form, FIELD.startTime),
    endTime: text(form, FIELD.endTime),
    venueName: text(form, FIELD.venueName),
    address: text(form, FIELD.address),
    description: text(form, FIELD.description),
    lineup: acts.flatMap((act, i) => (act ? [{ time: times[i] ?? "", act }] : [])),
    entry:
      text(form, FIELD.entry) === "paid"
        ? { kind: "paid", priceLkr: price > 0 ? price : null, ticketUrl: text(form, FIELD.ticketUrl) }
        : { kind: "free" },
    know: {
      dressCode: text(form, FIELD.dressCode),
      bring: text(form, FIELD.bring),
      parking: text(form, FIELD.parking),
      rules: text(form, FIELD.rules),
      foodPrices: text(form, FIELD.foodPrices),
      ifRains: text(form, FIELD.ifRains),
    },
  };
  return { draft, intent: intent === "publish" || intent === "preview" ? intent : "draft" };
}

// What has to be filled in. A draft only needs a title, so it can be found again; publishing
// needs everything people need to turn up: title, category, date, start time and venue, and a
// price for paid events.
export function checkEventDraft(draft: EventDraft, publish: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.title) errors.title = "Give the event a title.";
  if (!publish) return errors;
  if (!draft.category) errors.category = "Pick a category.";
  if (!draft.date) errors.date = "Pick the date.";
  else if (draft.date < new Date().toISOString().slice(0, 10)) errors.date = "Pick a date that hasn't passed.";
  if (!draft.startTime) errors.startTime = "Add the start time.";
  if (!draft.venueName) errors.venueName = "Add where it's happening.";
  if (draft.entry.kind === "paid" && !draft.entry.priceLkr) errors.price = "Add the ticket price, or choose free entry.";
  return errors;
}

// The right-hand checklist (O08): which sections are done. "Know before you go" is optional,
// so it's only ticked once something's in it.
export function checklist(draft: EventDraft) {
  return {
    basics: Boolean(draft.title && draft.category && draft.date && draft.startTime),
    venue: Boolean(draft.venueName),
    about: Boolean(draft.description),
    lineup: draft.lineup.length > 0,
    entry: draft.entry.kind === "free" || Boolean(draft.entry.priceLkr),
    know: Object.values(draft.know).some(Boolean),
  };
}
