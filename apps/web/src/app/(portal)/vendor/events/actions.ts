"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { askQuestion } from "@/lib/data/provider";
import { routes } from "@/lib/routes";

// Event page actions: ask the organiser a public question (V89).
export async function askOrganiser(eventId: string, form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const text = String(form.get("question") ?? "").trim();
  const page = `${routes.vendorArea.event(eventId)}?tab=qa`;
  if (!text || text.length > 300) redirect(`${page}&error=question`);
  await askQuestion(session, eventId, text);
  revalidatePath(routes.vendorArea.event(eventId));
  redirect(page);
}
