"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getJob, updateJob } from "@/lib/data/provider";
import { routes } from "@/lib/routes";

// Job post actions: save a post (V10), apply with a quote (V11, V58) and withdraw it (V58, V59).

const r = routes.vendorArea;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const amount = (form: FormData, name: string) => {
  const digits = field(form, name).replace(/[^\d]/g, "");
  return digits ? Number(digits) : Number.NaN;
};

// "Save" and "Saved" on a post (V10, V57).
export async function toggleSaved(jobId: string, back: string) {
  const session = await requireRole("vendor", "freelancer");
  const job = await getJob(session, jobId);
  if (job) await updateJob(session, jobId, { saved: !job.saved });
  revalidatePath(r.jobs);
  redirect(back.startsWith("/vendor/") ? back : r.jobs);
}

// "Send application" (V11). The deposit and the final instalment must add up to the price, and the
// final instalment must be due before the event.
export async function applyToJob(jobId: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const job = await getJob(session, jobId);
  if (!job || (job.application && job.application.status !== "withdrawn")) redirect(r.job(jobId));
  if (Date.parse(job.quotesBy) < Date.now()) redirect(`${r.job(jobId)}?error=closed`);

  const back = new URLSearchParams();
  for (const [key, value] of form.entries()) if (typeof value === "string" && !key.startsWith("$")) back.set(key, value);
  const fail = (error: string) => redirect(`${r.apply(jobId)}?error=${error}&${back.toString()}`);

  const price = amount(form, "price");
  const percent = amount(form, "depositPercent");
  const finalLkr = amount(form, "final");
  const due = field(form, "due");
  if (!(price > 0)) fail("price");
  if (!(percent >= 0 && percent <= 100)) fail("deposit");
  if (!(finalLkr >= 0) || !due) fail("final");
  if (due >= job.date) fail("due");
  if (Math.round((price * percent) / 100) + finalLkr !== price) fail("total");

  await updateJob(session, jobId, {
    quotes: job.quotes + 1,
    application: {
      priceLkr: price,
      message: field(form, "message"),
      availableOnDate: true,
      sentAt: new Date().toISOString(),
      status: "waiting",
      decidedAt: null,
      bookingId: null,
    },
  });
  revalidatePath(r.jobs);
  redirect(r.applied(jobId));
}

// "Withdraw" (V58, V59): only while the organiser hasn't decided.
export async function withdrawApplication(jobId: string) {
  const session = await requireRole("vendor", "freelancer");
  const job = await getJob(session, jobId);
  if (job?.application?.status === "waiting") {
    await updateJob(session, jobId, { quotes: Math.max(0, job.quotes - 1), application: { ...job.application, status: "withdrawn", decidedAt: new Date().toISOString() } });
  }
  revalidatePath(r.jobs);
  redirect(r.applications);
}
