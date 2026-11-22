"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  getBookingRequest,
  getJobPost,
  getMyEvent,
  getProvider,
  isVerified,
  listProviders,
  saveBookingRequest,
  saveJobPost,
  updateBookingRequest,
  updateJobPost,
} from "@/lib/data/portal";
import type { Brief, PaymentPart } from "@/lib/data/portal-types";
import { DISTRICTS, PROVIDER_CATEGORIES, readLkr, totalOf } from "@/lib/hiring";
import { routes } from "@/lib/routes";

// The hiring actions: send a booking request (O19), answer a provider's own quote (O78), post a
// job (O20), close it (O79) and accept its quotes (O89). Each saves through lib/data/portal.ts.

// What the booking request and job forms get back when something's missing: a line per field,
// and a message for the top of the form. The forms keep what was typed.
export type HiringFormState = { errors?: Record<string, string>; message?: string };

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readBrief(form: FormData): Brief {
  return {
    service: field(form, "service"),
    duration: field(form, "duration"),
    audience: field(form, "audience"),
    deliverables: field(form, "deliverables"),
    runOfShow: field(form, "runOfShow"),
    equipment: field(form, "equipment"),
  };
}

// Clears the pages that show an event's hiring.
function refresh(eventId: string) {
  revalidatePath(routes.eventHiring(eventId));
  revalidatePath(routes.manageEvent(eventId));
  revalidatePath(routes.hiring);
  revalidatePath(routes.dashboard);
}

const FIX_FIRST = "Some details are missing. They're marked below.";

// sending requests and posting jobs need the Verified badge (O41)
const NOT_VERIFIED = "Get verified first: providers only take requests and quotes from verified organisers.";

// The organiser's event a form names, if it can still take bookings: published or postponed.
async function bookableEvent(session: Awaited<ReturnType<typeof requireRole>>, eventId: string) {
  const event = eventId ? await getMyEvent(session, eventId) : null;
  return event && (event.status === "published" || event.status === "postponed") ? event : null;
}

// "Send request" (O19). The payments have to add up to the budget, so both sides agree on what's
// owed and when.
export async function sendBookingRequest(providerId: string, _previous: HiringFormState, form: FormData): Promise<HiringFormState> {
  const session = await requireRole("organiser");
  if (!(await isVerified(session))) return { message: NOT_VERIFIED };
  const provider = await getProvider(session, providerId);
  if (!provider) return { message: "That provider isn't on Tezera any more." };

  const event = await bookableEvent(session, field(form, "event"));
  const date = field(form, "date");
  const startTime = field(form, "startTime");
  const budgetLkr = readLkr(field(form, "budget"));
  const amounts = form.getAll("payAmount").map((v) => readLkr(String(v)));
  const dues = form.getAll("payDue").map((v) => String(v));
  const payments: PaymentPart[] = amounts.map((amountLkr, i) => ({
    label: i === 0 ? "Deposit" : `Instalment ${i}`,
    amountLkr,
    due: dues[i] ?? "",
  }));

  const errors: Record<string, string> = {};
  if (!event) errors.event = "Pick one of your published events.";
  if (!date) errors.date = "Add the date.";
  if (!startTime) errors.startTime = "Add the start time.";
  if (!Number.isFinite(budgetLkr) || budgetLkr <= 0) errors.budget = "Add the budget in rupees.";
  if (payments.length === 0 || payments.some((p) => !Number.isFinite(p.amountLkr) || p.amountLkr <= 0 || !p.due)) {
    errors.payments = "Give every payment an amount and a due date.";
  } else if (Number.isFinite(budgetLkr) && totalOf(payments) !== budgetLkr) {
    errors.payments = `The payments add up to LKR ${totalOf(payments).toLocaleString("en-GB")}, but the budget is LKR ${budgetLkr.toLocaleString("en-GB")}.`;
  }
  if (!event || Object.keys(errors).length > 0) return { errors, message: FIX_FIRST };

  const result = await saveBookingRequest(session, {
    eventId: event.id,
    providerId,
    date,
    startTime,
    endTime: field(form, "endTime"),
    location: field(form, "location"),
    budgetLkr,
    brief: readBrief(form),
    payments,
    sentAt: new Date().toISOString(),
    status: "waiting",
    answeredAt: null,
    quote: null,
    fromJob: null,
  });
  if (!result.ok) return { message: result.error };
  refresh(event.id);
  redirect(routes.requestSent(result.value.id));
}

// "Accept quote" (O78): the provider's own price and terms become the booking.
export async function acceptQuote(requestId: string) {
  const session = await requireRole("organiser");
  const request = await getBookingRequest(session, requestId);
  if (!request || request.status !== "quoted") redirect(routes.bookingRequest(requestId));
  await updateBookingRequest(session, requestId, { status: "accepted", answeredAt: new Date().toISOString() });
  refresh(request.eventId);
  redirect(routes.eventHiring(request.eventId));
}

// "Decline" (O78): the provider is told (EN-09); the request shows as declined.
export async function declineQuote(requestId: string) {
  const session = await requireRole("organiser");
  const request = await getBookingRequest(session, requestId);
  if (!request || request.status !== "quoted") redirect(routes.bookingRequest(requestId));
  await updateBookingRequest(session, requestId, { status: "declined", answeredAt: new Date().toISOString() });
  refresh(request.eventId);
  redirect(routes.eventHiring(request.eventId));
}

// "Post job" (O20). Quotes have to close before the event starts.
export async function postJob(_previous: HiringFormState, form: FormData): Promise<HiringFormState> {
  const session = await requireRole("organiser");
  if (!(await isVerified(session))) return { message: NOT_VERIFIED };
  const event = await bookableEvent(session, field(form, "event"));
  const title = field(form, "title");
  const category = field(form, "category");
  const district = field(form, "district");
  const date = field(form, "date");
  const startTime = field(form, "startTime");
  const min = readLkr(field(form, "budgetMin"));
  const max = readLkr(field(form, "budgetMax"));
  const closesOn = field(form, "closesOn");
  const closesTime = field(form, "closesTime") || "18:00";
  const closesAt = closesOn ? `${closesOn}T${closesTime}:00+05:30` : "";

  const errors: Record<string, string> = {};
  if (!title) errors.title = "Give the job a title.";
  if (!event) errors.event = "Pick one of your published events.";
  if (!PROVIDER_CATEGORIES.includes(category)) errors.category = "Pick a provider category.";
  if (!date) errors.date = "Add the date.";
  if (!startTime) errors.startTime = "Add the start time.";
  if (!DISTRICTS.includes(district)) errors.district = "Pick a district.";
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) {
    errors.budget = "Add a budget range, the smaller number first.";
  }
  const startsAt = date && startTime ? `${date}T${startTime}:00+05:30` : "";
  if (!closesAt) errors.closes = "Add when quotes close.";
  else if (Date.parse(closesAt) <= Date.now()) errors.closes = "Pick a time that hasn't passed.";
  else if (startsAt && closesAt >= startsAt) errors.closes = "Quotes have to close before the event starts.";
  if (!event || Object.keys(errors).length > 0) return { errors, message: FIX_FIRST };

  // everyone in the category who serves the district sees the post
  const seenBy = (
    await listProviders(session, { q: "", category, district, minRating: 0, verifiedOnly: false, freeOn: "", sort: "rank" })
  ).length;
  const result = await saveJobPost(session, {
    eventId: event.id,
    title,
    category,
    date,
    startTime,
    endTime: field(form, "endTime"),
    district,
    brief: readBrief(form),
    budgetMinLkr: min,
    budgetMaxLkr: max,
    closesAt,
    status: "open",
    postedAt: new Date().toISOString(),
    seenBy,
    quotes: [],
  });
  if (!result.ok) return { message: result.error };
  refresh(event.id);
  redirect(routes.jobPosted(result.value.id));
}

// "Close early" (O79): no new quotes; the ones already in can still be accepted.
export async function closeJob(jobId: string) {
  const session = await requireRole("organiser");
  const job = await getJobPost(session, jobId);
  if (!job) redirect(routes.hiring);
  await updateJobPost(session, jobId, { status: "closed" });
  refresh(job.eventId);
  redirect(routes.job(jobId));
}

// "Create … bookings" (O89): a booking per picked quote, on that provider's price and terms.
// Closing the post tells everyone else they weren't chosen (EN-09).
export async function acceptJobQuotes(jobId: string, form: FormData) {
  const session = await requireRole("organiser");
  const job = await getJobPost(session, jobId);
  if (!job) redirect(routes.hiring);
  const event = await getMyEvent(session, job.eventId);
  const picked = new Set(form.getAll("pick").map(String));
  const chosen = job.quotes.filter((q) => picked.has(q.id) && q.status === "open");
  if (chosen.length === 0) redirect(`${routes.job(jobId)}?error=none`);

  const now = new Date().toISOString();
  for (const quote of chosen) {
    await saveBookingRequest(session, {
      eventId: job.eventId,
      providerId: quote.providerId,
      date: job.date,
      startTime: job.startTime,
      endTime: job.endTime,
      location: event?.address || event?.venueName || job.district,
      budgetLkr: quote.priceLkr,
      brief: job.brief,
      payments: [],
      sentAt: now,
      status: "accepted",
      answeredAt: now,
      quote: null,
      fromJob: job.id,
    });
  }

  const close = form.get("close") === "on";
  await updateJobPost(session, jobId, {
    status: close ? "closed" : job.status,
    quotes: job.quotes.map((q) =>
      picked.has(q.id) && q.status === "open" ? { ...q, status: "accepted" } : close && q.status === "open" ? { ...q, status: "not-chosen" } : q,
    ),
  });
  refresh(job.eventId);
  revalidatePath(routes.job(jobId));
  redirect(routes.eventHiring(job.eventId));
}
