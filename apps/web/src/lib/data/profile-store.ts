import "server-only";
import { sampleProfile } from "@/lib/data/portal-samples";
import type { OrganiserProfile } from "@/lib/data/portal-types";

// STAND-IN for the organiser's profile record (EN-03) while there's no backend, kept in the dev
// server's memory like event-store.ts. Only lib/data/portal.ts uses it, and only in `next dev`.

const globalStore = globalThis as typeof globalThis & { __tezeraDevProfile?: OrganiserProfile };

export function storedProfile(): OrganiserProfile {
  globalStore.__tezeraDevProfile ??= sampleProfile(new Date());
  return structuredClone(globalStore.__tezeraDevProfile);
}

export function saveStoredProfile(patch: Partial<OrganiserProfile>): OrganiserProfile {
  globalStore.__tezeraDevProfile = { ...storedProfile(), ...patch };
  return structuredClone(globalStore.__tezeraDevProfile);
}
