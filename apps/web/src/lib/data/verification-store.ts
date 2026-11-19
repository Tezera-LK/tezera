import "server-only";
import { sampleVerification } from "@/lib/data/portal-samples";
import type { Verification } from "@/lib/data/portal-types";

// STAND-IN for the organiser's verification record (EN-03, EN-08) while there's no backend, kept
// in the dev server's memory like event-store.ts. Only lib/data/portal.ts uses it, and only in
// `next dev`.

const globalStore = globalThis as typeof globalThis & { __tezeraDevVerification?: Verification };

export function storedVerification(): Verification {
  globalStore.__tezeraDevVerification ??= sampleVerification(new Date());
  return structuredClone(globalStore.__tezeraDevVerification);
}

export function saveStoredVerification(next: Verification) {
  globalStore.__tezeraDevVerification = structuredClone(next);
}
