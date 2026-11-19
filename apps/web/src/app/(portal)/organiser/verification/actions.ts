"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getVerification, saveVerification } from "@/lib/data/portal";
import type { VerificationDocument } from "@/lib/data/portal-types";
import { previewMode } from "@/lib/preview";
import { routes } from "@/lib/routes";

// Verification actions (O28, O38, O39). Files stay in the browser until storage is connected
// (EN-03): only each document's name and kind come here.

const KINDS = ["Business registration", "NIC or passport", "NIC, front and back", "Other"];

function refresh() {
  revalidatePath(routes.verification);
  revalidatePath(routes.myProfile);
  revalidatePath(routes.dashboard);
}

// "Submit for review" (O28) and "Submit again" (O39). Sending again keeps the documents the
// admin was happy with and replaces the ones marked "Fix this".
export async function submitDocuments(form: FormData) {
  const session = await requireRole("organiser");
  const current = await getVerification(session);
  if (!current || current.status === "pending" || current.status === "approved") redirect(routes.verification);

  const names = form.getAll("docName").map((v) => String(v).trim()).filter(Boolean);
  const kinds = form.getAll("docKind").map(String);
  if (names.length === 0) redirect(`${routes.verification}?error=none`);

  const added: VerificationDocument[] = names.map((name, i) => ({
    id: `doc-${Date.now().toString(36)}-${i}`,
    name,
    kind: KINDS.includes(kinds[i]) ? kinds[i] : "Other",
    state: "sent",
  }));
  const kept = current.status === "rejected" ? current.documents.filter((d) => d.state === "ok").map((d) => ({ ...d, state: "sent" as const })) : [];

  await saveVerification(session, {
    status: "pending",
    documents: [...kept, ...added],
    submittedAt: new Date().toISOString(),
    decidedAt: null,
    reason: "",
  });
  refresh();
  redirect(routes.verification);
}

// "Admin approves" and "Admin rejects" on O38: Figma's way of showing what happens next. The
// real decision is the admin's (EN-08), so these only exist in preview mode (lib/preview.ts).
export async function devDecide(decision: "approve" | "reject") {
  const session = await requireRole("organiser");
  if (!previewMode) redirect(routes.verification);
  const current = await getVerification(session);
  if (!current || current.status !== "pending") redirect(routes.verification);

  await saveVerification(session, {
    ...current,
    status: decision === "approve" ? "approved" : "rejected",
    decidedAt: new Date().toISOString(),
    reason: decision === "approve" ? "" : "The business registration is cut off at the bottom and the number can't be read.",
    documents: current.documents.map((d, i) => ({ ...d, state: decision === "approve" || i > 0 ? "ok" : "fix" })),
  });
  refresh();
  redirect(routes.verification);
}

// "Start over" in preview mode: back to no documents, so O28 can be seen again.
export async function devReset() {
  const session = await requireRole("organiser");
  if (!previewMode) redirect(routes.verification);
  await saveVerification(session, { status: "not-started", documents: [], submittedAt: null, decidedAt: null, reason: "" });
  refresh();
  redirect(routes.verification);
}
