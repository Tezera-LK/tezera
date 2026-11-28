"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getProviderState, saveVerification } from "@/lib/data/provider";
import type { VerificationDocument } from "@/lib/data/portal-types";
import { previewMode } from "@/lib/preview";
import { routes } from "@/lib/routes";

// Verification actions (V43–V45): send documents for review, and in preview mode only, play the
// admin's part (approve or reject) so the whole flow can be shown before EN-08 exists.

const r = routes.vendorArea;

// the reasons Figma's rejected screens give (V45, F45)
const REJECTED_VENDOR = "The certificate photo was too blurry to read the registration number. Please upload a scan or a sharper photo.";
const REJECTED_FREELANCER = "The photo of the back of your NIC was too blurry to read the number. Please upload a sharper photo.";

// the picked file's name (FileName.tsx sends names, not files), or "" when none was picked
function fileName(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

// "Submit for review" (V43, V45). Files aren't stored until EN-03; only their names are kept.
export async function submitDocuments(form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  if (!state || state.verification.status === "pending" || state.verification.status === "approved") redirect(r.verification);
  const vendor = state.kind === "vendor";
  // vendors send the business registration, or only the owner's NIC when the business isn't
  // registered yet; freelancers send their NIC, or a passport (V43, F43)
  const docType = String(form.get("docType") ?? "");
  const withCertificate = vendor && docType !== "nic";
  const main = fileName(form, "main");
  const front = fileName(form, "front");
  const back = fileName(form, "back");
  const error = (withCertificate && !main) || !front || !back ? "files" : form.get("mine") !== "yes" ? "mine" : "";
  if (error) redirect(`${r.verification}?error=${error}`);
  const idName = vendor ? "Owner NIC, front and back" : docType === "passport" ? "Passport, photo page and back" : "National identity card, front and back";
  const documents: VerificationDocument[] = [
    ...(withCertificate ? [{ id: "doc-1", name: "Business registration certificate", kind: main, state: "sent" as const }] : []),
    { id: "doc-2", name: idName, kind: `${front}, ${back}`, state: "sent" },
  ];
  await saveVerification(session, { status: "pending", documents, submittedAt: new Date().toISOString(), decidedAt: null, reason: "" });
  revalidatePath(r.verification);
  redirect(r.verification);
}

// Preview only: what a Tezera admin does (EN-08).
export async function previewDecide(decision: "approved" | "rejected" | "not-started") {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  if (!previewMode || !state) redirect(r.verification);
  const v = state.verification;
  if (decision === "not-started") {
    await saveVerification(session, { status: "not-started", documents: [], submittedAt: null, decidedAt: null, reason: "" });
  } else {
    await saveVerification(session, {
      ...v,
      status: decision,
      decidedAt: new Date().toISOString(),
      reason: decision === "rejected" ? (state.kind === "vendor" ? REJECTED_VENDOR : REJECTED_FREELANCER) : "",
      documents: v.documents.map((d) => ({ ...d, state: decision === "approved" ? "ok" : "fix" })),
    });
  }
  revalidatePath(r.verification);
  redirect(r.verification);
}
