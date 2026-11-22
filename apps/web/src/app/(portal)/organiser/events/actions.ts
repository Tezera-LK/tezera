"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createMyEvent, getMyEvent, updateMyEvent } from "@/lib/data/portal";
import type { EventDraft } from "@/lib/data/portal-types";
import { checkEventDraft, readEventForm, type FieldErrors } from "@/lib/event-form";
import { routes } from "@/lib/routes";

// What the event form gets back when saving fails: the errors per field, a message for the top
// of the form, and what was typed, so nothing is lost.
// `nonce` changes on every failed save, so the form remounts with the returned values.
export type EventFormState = { errors?: FieldErrors; message?: string; values?: EventDraft; nonce?: number };

// "Save draft", "Publish" and "Preview event page" on the create form (O08).
// Publish checks every required field; a draft only needs a title. Preview saves a draft first,
// because the preview page reads the saved event.
export async function createEvent(_previous: EventFormState, form: FormData): Promise<EventFormState> {
  const session = await requireRole("organiser");
  const { draft, intent } = readEventForm(form);
  const publish = intent === "publish";

  const errors = checkEventDraft(draft, publish);
  if (Object.keys(errors).length > 0) return { errors, values: draft, message: FIX_FIRST, nonce: Date.now() };

  const result = await createMyEvent(session, draft, publish);
  if (!result.ok) return { message: result.error, values: draft, nonce: Date.now() };

  revalidatePath(routes.myEvents);
  revalidatePath(routes.dashboard);
  redirect(afterSave(result.event.id, intent));
}

// The same three buttons on the edit form (O54). Publishing a draft checks the required fields;
// an event that's already public keeps its status and has to stay complete.
export async function saveEvent(eventId: string, _previous: EventFormState, form: FormData): Promise<EventFormState> {
  const session = await requireRole("organiser");
  const existing = await getMyEvent(session, eventId);
  if (!existing) return { message: "That event doesn't exist any more." };

  const { draft, intent } = readEventForm(form);
  const isPublic = existing.status !== "draft";
  const publish = intent === "publish" || isPublic;

  const errors = checkEventDraft(draft, publish);
  // an event that has already happened keeps its date; only a new date has to be in the future
  if (errors.date && draft.date === existing.date) delete errors.date;
  if (Object.keys(errors).length > 0) return { errors, values: draft, message: FIX_FIRST, nonce: Date.now() };

  const becomesPublic = existing.status === "draft" && intent === "publish";
  const result = await updateMyEvent(session, eventId, {
    ...draft,
    ...(becomesPublic ? { status: "published", publishedAt: new Date().toISOString() } : {}),
  });
  if (!result.ok) return { message: result.error, values: draft, nonce: Date.now() };

  revalidatePath(routes.myEvents);
  revalidatePath(routes.dashboard);
  revalidatePath(routes.event(eventId));
  redirect(becomesPublic ? routes.eventPublished(eventId) : afterSave(eventId, intent, isPublic));
}

const FIX_FIRST = "Some details are missing. They're marked below.";

// Where each button goes after saving: publish → the "is live" page (O51), preview → the preview
// (O52), a draft → My events' Drafts tab. Saving changes to a public event goes to its overview.
function afterSave(eventId: string, intent: string, isPublic = false): string {
  if (intent === "preview") return routes.previewEvent(eventId);
  if (intent === "publish" && !isPublic) return routes.eventPublished(eventId);
  if (isPublic) return routes.manageEvent(eventId);
  return `${routes.myEvents}?tab=drafts`;
}

// ---------- One event's actions (O09, O10, O53, O56, O15) ----------
// Each reads the form, checks it, saves through lib/data/portal.ts and goes back to the event.
// They redirect with ?error=… when something's missing, so the page can say what.

// Reads one text field, trimmed.
function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// Clears every page that shows this event.
function refresh(eventId: string) {
  revalidatePath(routes.myEvents);
  revalidatePath(routes.dashboard);
  revalidatePath(routes.manageEvent(eventId));
  revalidatePath(routes.event(eventId));
}

// "Update status" in the overview's Live status panel (O09). On time clears the status; running
// late needs the new start time; postponed and cancelled open their dialog instead.
export async function updateLiveStatus(eventId: string, form: FormData) {
  const session = await requireRole("organiser");
  const status = field(form, "status");
  if (status === "postponed") redirect(routes.eventDialog(eventId, "postpone"));
  if (status === "cancelled") redirect(routes.eventDialog(eventId, "cancel"));

  const event = await getMyEvent(session, eventId);
  if (!event?.startsAt) redirect(routes.manageEvent(eventId));

  if (status === "late") {
    const time = field(form, "lateTime");
    if (!time) redirect(`${routes.manageEvent(eventId)}?error=late-time`);
    const newStartAt = `${event.startsAt.slice(0, 10)}T${time}:00+05:30`;
    await updateMyEvent(session, eventId, { liveStatus: { kind: "late", newStartAt } });
  } else {
    await updateMyEvent(session, eventId, { liveStatus: null });
  }
  refresh(eventId);
  redirect(routes.manageEvent(eventId));
}

// "Postpone event" (O10): moves the event to a new date and time, keeps the end time, and
// remembers the old start so pages can say "New date". Everyone going is told (EN-09).
export async function postponeEvent(eventId: string, form: FormData) {
  const session = await requireRole("organiser");
  const event = await getMyEvent(session, eventId);
  if (!event?.startsAt) redirect(routes.manageEvent(eventId));

  const date = field(form, "date");
  const time = field(form, "time");
  const today = new Date().toISOString().slice(0, 10);
  if (!date || !time || date < today) redirect(`${routes.eventDialog(eventId, "postpone")}&error=date`);

  await updateMyEvent(session, eventId, {
    status: "postponed",
    postponedFrom: event.postponedFrom ?? event.startsAt,
    date,
    startTime: time,
    liveStatus: null,
  });
  refresh(eventId);
  redirect(routes.manageEvent(eventId));
}

// "Cancel event" (O53): can't be undone. The reason shows on the event page.
export async function cancelEvent(eventId: string, form: FormData) {
  const session = await requireRole("organiser");
  const reason = field(form, "reason");
  if (!reason) redirect(`${routes.eventDialog(eventId, "cancel")}&error=reason`);

  await updateMyEvent(session, eventId, { status: "cancelled", cancelReason: reason, liveStatus: null });
  refresh(eventId);
  redirect(routes.manageEvent(eventId));
}

// "Send to … people" (O56): adds the announcement to the event, newest first. Delivery by push
// and in the app is EN-09's; here it's only recorded.
export async function sendAnnouncement(eventId: string, form: FormData) {
  const session = await requireRole("organiser");
  const event = await getMyEvent(session, eventId);
  if (!event) redirect(routes.myEvents);

  const text = field(form, "message");
  const audience = (["going", "interested", "followers"] as const).filter((who) => form.get(who) === "on");
  if (!text || audience.length === 0) {
    redirect(`${routes.eventDialog(eventId, "announce")}&message=${encodeURIComponent(text)}&error=audience`);
  }

  const announcement = { id: `ann-${Date.now().toString(36)}`, text, sentAt: new Date().toISOString(), audience };
  await updateMyEvent(session, eventId, { announcements: [announcement, ...event.announcements] });
  refresh(eventId);
  redirect(routes.manageEvent(eventId));
}

// "Post answer" on the Q&A tab (O15). Answers are public on the event page.
export async function answerQuestion(eventId: string, questionId: string, form: FormData) {
  const session = await requireRole("organiser");
  const event = await getMyEvent(session, eventId);
  if (!event) redirect(routes.myEvents);

  const answer = field(form, "answer");
  if (!answer) redirect(`${routes.eventQa(eventId)}?answer=${questionId}&error=empty`);

  const questions = event.questions.map((q) =>
    q.id === questionId ? { ...q, answer, answeredAt: new Date().toISOString() } : q,
  );
  await updateMyEvent(session, eventId, { questions });
  refresh(eventId);
  revalidatePath(routes.eventQa(eventId));
  redirect(routes.eventQa(eventId));
}
